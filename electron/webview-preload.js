const { ipcRenderer, webFrame, contextBridge } = require('electron');

// ── 1. Fix Dialog Overrides (Main World Injection) ──────────────────────────
// Because contextIsolation is usually 'yes', we must expose a bridge and then
// use executeJavaScript to hook the native functions in the page's context.

contextBridge.exposeInMainWorld('_obsidianBridge', {
    sendAlert: (msg) => ipcRenderer.sendToHost('page-alert', msg),
    sendSync: (data) => ipcRenderer.sendSync('page-dialog-sync', data)
});

// Inject the overrides directly into the page context
webFrame.executeJavaScript(`
  (function() {
    window.alert = (msg) => {
      window._obsidianBridge.sendAlert(String(msg));
    };
    window.confirm = (msg) => {
      return window._obsidianBridge.sendSync({ type: 'confirm', message: String(msg) });
    };
    window.prompt = (msg, def) => {
      window._obsidianBridge.sendAlert('PROMPT:' + String(msg) + '|||' + String(def || ''));
      return null;
    };
  })();
`);

// ── 2. Link Hover Bubbles (5 second timer) ──────────────────────────────────
let hoverTimer = null;
let currentHoverUrl = null;

let clearTimer = null;

function stopHover() {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  currentHoverUrl = null;
  
  // Don't clear the bubble immediately on mouse out. 
  // Give the user 2 seconds to reach it.
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    ipcRenderer.sendToHost('hover-link-bubble', null);
  }, 2000);
}

window.addEventListener('mouseover', (e) => {
  let target = e.target;
  while (target && target.tagName !== 'A') {
    target = target.parentElement;
  }

  if (target && target.tagName === 'A') {
    const href = target.href;
    if (!href || href.startsWith('javascript:')) return;
    
    if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }

    // Always update status bar immediately
    ipcRenderer.sendToHost('hover-link', href);

    // If it's a new link, start the 5 second bubble timer
    if (href !== currentHoverUrl) {
      if (hoverTimer) clearTimeout(hoverTimer);
      currentHoverUrl = href;
      
      // Store current coordinates
      const x = e.clientX;
      const y = e.clientY;

      hoverTimer = setTimeout(() => {
        ipcRenderer.sendToHost('hover-link-bubble', { 
            url: href, 
            x: x, 
            y: y 
        });
      }, 5000);
    }
  } else {
    // Delay clearing the hovered URL for 1 second 
    // so Ctrl+Shift+X still works if mouse just left the link.
    if (!clearTimer) {
        clearTimer = setTimeout(() => {
            ipcRenderer.sendToHost('hover-link', null);
            stopHover();
        }, 5000);
    }
  }
});

window.addEventListener('mouseout', (e) => {
  // We handle clearing in mouseover with a delay, so just ensure 
  // we don't clear instantly here unless we're actually leaving to a non-link.
  let target = e.relatedTarget;
  while (target && target.tagName !== 'A') {
    target = target.parentElement;
  }
  if (!target || target.href !== currentHoverUrl) {
    // Start the delayed clear
    if (!clearTimer) {
        clearTimer = setTimeout(() => {
            ipcRenderer.sendToHost('hover-link', null);
            stopHover();
        }, 5000);
    }
  }
});

// Keep track of mouse movement to update bubble position or cancel if moved too much
window.addEventListener('mousemove', (e) => {
    // Optional: could cancel timer if mouse moves significantly, 
    // but usually 5s hover implies relative stillness.
});

// ── 3. Double Click to Zoom Image ──────────────────────────────────────────
window.addEventListener('dblclick', (e) => {
  let target = e.target;
  if (target && target.tagName === 'IMG') {
    ipcRenderer.sendToHost('zoom-image-request', target.src);
  }
});
