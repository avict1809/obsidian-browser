const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog, webContents, nativeTheme, globalShortcut } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// ── Suppress internal Electron webview errors ──────────────────────────────
// GUEST_VIEW_MANAGER_CALL and ERR_ABORTED (-3) errors are internal to Electron's
// webview implementation. They occur during normal SPA navigation (e.g. Grok, ChatGPT)
// when a previous navigation is cancelled by a new one. These are harmless.
const _origErr = console.error;
const _origWarn = console.warn;
console.error = function (...args) {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('GUEST_VIEW_MANAGER_CALL') || msg.includes('ERR_ABORTED')) return;
  // Also suppress the Error objects that Electron logs for webview navigation
  if (args[0] instanceof Error && (args[0].code === 'ERR_ABORTED' || args[0].errno === -3)) return;
  _origErr.apply(console, args);
};
console.warn = function (...args) {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('GUEST_VIEW_MANAGER_CALL') || msg.includes('ERR_ABORTED')) return;
  _origWarn.apply(console, args);
};

const isDev = process.env.NODE_ENV === 'development';

console.log('Is dev mode:', isDev);
console.log('NODE_ENV:', process.env.NODE_ENV);

let mainWindow = null;

// ── Settings Persistence ──────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  alwaysOnTop: true,
  skipTaskbar: true,
  defaultSearchEngine: 'https://www.google.com/search?q=',
  shortcuts: {
    'new-tab':          { key: 't', ctrl: true,  shift: false, alt: false },
    'close-tab':        { key: 'w', ctrl: true,  shift: false, alt: false },
    'reload':           { key: 'r', ctrl: true,  shift: false, alt: false },
    'focus-urlbar':     { key: 'l', ctrl: true,  shift: false, alt: false },
    'toggle-history':   { key: 'h', ctrl: true,  shift: false, alt: false },
    'toggle-downloads': { key: 'j', ctrl: true,  shift: false, alt: false },
    'toggle-console':   { key: 'k', ctrl: true,  shift: false, alt: false },
    'lock-browser':     { key: 'l', ctrl: true,  shift: true,  alt: false },
    'prev-tab':         { key: 'tab', ctrl: true,  shift: true,  alt: false },
    'next-tab':         { key: 'tab', ctrl: true,  shift: false, alt: false },
    'peek-link':        { key: 'x', ctrl: true,  shift: true,  alt: false },
    'toggle-devtools':  { key: 'i', ctrl: true,  shift: true,  alt: false },
    'open-file':        { key: 'o', ctrl: true,  shift: false, alt: false },
    'load-subtitles':   { key: 'u', ctrl: true,  shift: false, alt: false },
    'go-back':          { key: 'arrowleft',  ctrl: false, shift: false, alt: true },
    'go-forward':       { key: 'arrowright', ctrl: false, shift: false, alt: true },
    'toggle-visibility':{ key: 'g', ctrl: true,  shift: true,  alt: false },
  },
  startHidden: false,
};

let settings = { ...DEFAULT_SETTINGS };

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      settings = { ...DEFAULT_SETTINGS, ...data, shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...data.shortcuts } };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8');
    // Notify renderer if window exists
    mainWindow?.webContents.send('settings-updated', settings);
    // Update global shortcuts
    registerGlobalShortcuts();
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();
  
  const v = settings.shortcuts['toggle-visibility'];
  if (v) {
    const accel = `${v.ctrl ? 'CommandOrControl+' : ''}${v.shift ? 'Shift+' : ''}${v.alt ? 'Alt+' : ''}${v.key.toUpperCase()}`;
    const success = globalShortcut.register(accel, () => {
      console.log(`Global shortcut ${accel} pressed`);
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          console.log('Hiding window');
          mainWindow.hide();
        } else {
          console.log('Showing window');
          mainWindow.show();
          mainWindow.focus();
        }
      } else {
        console.log('Shortcut pressed but mainWindow is null');
      }
    });
    console.log(`Registration of ${accel}: ${success ? 'SUCCESS' : 'FAILED'}`);
  }
}

// ── Persist user sessions across restarts ──────────────────────────────────
// Electron uses a named session partition — 'persist:obsidian' means cookies,
// localStorage, IndexedDB and login tokens are all saved to disk between sessions.
// Without this every restart would log you out of every site.
const PARTITION = 'persist:obsidian';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,           // custom titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0b',
    show: false,            // show only once ready-to-show fires
    icon: path.join(__dirname, '../assets/icon.png'),
    hasShadow: false,
    skipTaskbar: settings.skipTaskbar,      // Dynamic from settings
    alwaysOnTop: settings.alwaysOnTop,      // Dynamic from settings
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,       // CRITICAL — enables <webview> in renderer
      preload: path.join(__dirname, 'preload.js'),
      session: session.fromPartition(PARTITION),
      plugins: true,          // Enable PDF viewer and other plugins
    },

  });

  // Make window invisible to screen captures and screen sharing
  mainWindow.setContentProtection(true);

  // Stay invisible on startup if 'startHidden' is enabled
  mainWindow.once('ready-to-show', () => {
    if (settings.startHidden) {
      console.log('Window ready-to-show (staying hidden for stealth mode)');
    } else {
      mainWindow.show();
    }
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Forward window state to renderer for titlebar controls
  mainWindow.on('maximize',   () => mainWindow.webContents.send('window-state', 'maximized'));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-state', 'normal'));
  mainWindow.on('focus',      () => mainWindow.webContents.send('window-focus', true));
  mainWindow.on('blur',       () => mainWindow.webContents.send('window-focus', false));

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC: Window controls ───────────────────────────────────────────────────
ipcMain.on('window-minimize',  () => mainWindow?.minimize());
ipcMain.on('window-maximize',  () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize());
ipcMain.on('window-close',     () => mainWindow?.close());
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);
ipcMain.on('window-toggle-devtools', () => mainWindow?.webContents.toggleDevTools());

// ── IPC: Settings ──────────────────────────────────────────────────────────
ipcMain.handle('settings-get', () => settings);
ipcMain.handle('settings-set', (_, newSettings) => {
  const oldAlwaysOnTop = settings.alwaysOnTop;
  const oldSkipTaskbar = settings.skipTaskbar;
  
  settings = { ...settings, ...newSettings };
  
  if (mainWindow) {
    if (settings.alwaysOnTop !== oldAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop, 'screen-saver');
    }
    if (settings.skipTaskbar !== oldSkipTaskbar) {
      mainWindow.setSkipTaskbar(settings.skipTaskbar);
    }
  }
  
  saveSettings();
  return settings;
});
ipcMain.handle('settings-reset', () => {
  settings = { ...DEFAULT_SETTINGS };
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(settings.alwaysOnTop, 'screen-saver');
    mainWindow.setSkipTaskbar(settings.skipTaskbar);
  }
  saveSettings();
  return settings;
});

// ── IPC: Open external links in system browser ─────────────────────────────
ipcMain.on('open-external', (_, url) => shell.openExternal(url));
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Media & Documents', extensions: ['pdf', 'mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (canceled) return null;
  return filePaths[0];
});
ipcMain.handle('get-webview-preload-path', () => {
  return `file://${path.join(__dirname, 'webview-preload.js')}`;
});

ipcMain.handle('read-file-text', async (_, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('Failed to read file:', err);
    return null;
  }
});

ipcMain.handle('check-matching-subtitle', async (_, videoPath) => {
  try {
    // videoPath is a file path (not URI)
    const dir = path.dirname(videoPath);
    const ext = path.extname(videoPath);
    const base = path.basename(videoPath, ext);
    
    const possibleSubtitles = ['.vtt', '.srt'];
    for (const subExt of possibleSubtitles) {
      const subPath = path.join(dir, base + subExt);
      if (fs.existsSync(subPath)) {
        return { path: subPath, content: fs.readFileSync(subPath, 'utf8'), type: subExt.substring(1) };
      }
    }
  } catch (err) {
    console.error('Auto-detect error:', err);
  }
  return null;
});

// ── IPC: Download handling ─────────────────────────────────────────────────
// Use a WeakSet to track which sessions already have download listeners
// to prevent the MaxListenersExceededWarning memory leak.
const sessionsWithDownloadHandlers = new WeakSet();

ipcMain.on('setup-webview-session', (_, webContentsId) => {
  try {
    const wc = webContents.fromId(webContentsId);
    if (!wc || !wc.session) return;
    if (sessionsWithDownloadHandlers.has(wc.session)) return;
    sessionsWithDownloadHandlers.add(wc.session);

    wc.session.on('will-download', (event, item) => {
      // Let the download proceed to default Downloads folder
      item.on('updated', (e, state) => {
        if (state === 'progressing') {
          mainWindow?.webContents.send('download-progress', {
            filename: item.getFilename(),
            received: item.getReceivedBytes(),
            total: item.getTotalBytes(),
          });
        }
      });
      item.once('done', (e, state) => {
        mainWindow?.webContents.send('download-done', {
          filename: item.getFilename(),
          state,
          savePath: item.getSavePath(),
        });
      });
    });
  } catch (err) {
    // webContentsId may refer to a destroyed webContents — just ignore
  }
});

// ── IPC: History persistence (simple in-memory for now, easy to extend) ────
let history = [];
ipcMain.on('history-add', (_, entry) => {
  history.unshift(entry);
  if (history.length > 500) history = history.slice(0, 500);
});
ipcMain.handle('history-get', () => history);
ipcMain.on('history-clear', () => { history = []; });

// ── IPC: Clear all browsing data ───────────────────────────────────────────
ipcMain.handle('clear-data', async () => {
  const ses = session.fromPartition(PARTITION);
  await ses.clearCache();
  await ses.clearStorageData();
  history = [];
  return true;
});

// ── IPC: Page Dialogs (Synchronous) ────────────────────────────────────────
ipcMain.on('page-dialog-sync', (event, { type, message, defaultValue }) => {
  if (type === 'confirm') {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Cancel', 'OK'],
      defaultId: 1,
      cancelId: 0,
      title: 'Obsidian Browser',
      message: message,
      noLink: true,
    });
    event.returnValue = (choice === 1);
  } else if (type === 'prompt') {
    // Forward to renderer for a "Good Prompt" integrated into the shell
    mainWindow?.webContents.send('page-dialog-request', { type, message, defaultValue, id: contents.id });
    event.returnValue = defaultValue || ''; // Non-blocking return for custom UI
  } else {
    event.returnValue = null;
  }
});


// ── IPC: Auth / PIN lock ───────────────────────────────────────────────────
let _authFilePath = null;
function getAuthFilePath() {
  if (!_authFilePath) _authFilePath = path.join(app.getPath('userData'), '.auth');
  return _authFilePath;
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function getStoredHash() {
  try {
    const p = getAuthFilePath();
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  } catch {}
  return null;
}

function saveHash(hash) {
  fs.writeFileSync(getAuthFilePath(), hash, 'utf8');
}

ipcMain.handle('auth-has-password', () => getStoredHash() !== null);

ipcMain.handle('auth-verify', (_, pin) => {
  const stored = getStoredHash();
  if (!stored) return false;
  return stored === hashPin(pin);
});

ipcMain.handle('auth-set-password', (_, pin) => {
  saveHash(hashPin(pin));
  return true;
});

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  loadSettings();

  // Set default theme to light so that web content (prefers-color-scheme) 
  // doesn't automatically switch to dark mode. The browser shell remains dark.
  nativeTheme.themeSource = 'light';

  // Remove the default application menu entirely.
  // This prevents Electron's built-in Ctrl+W from closing the whole window.
  // Our renderer handles Ctrl+W to close only the active tab.
  Menu.setApplicationMenu(null);

  // Suppress unhandled errors from webview internals
  process.on('uncaughtException', (error) => {
    if (error && (
      (error.message && error.message.includes('GUEST_VIEW_MANAGER_CALL')) ||
      error.code === 'ERR_ABORTED' ||
      error.errno === -3
    )) {
      return; // Suppress these internal webview errors
    }
    _origErr('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (reason) => {
    if (reason && (
      (reason.message && reason.message.includes('GUEST_VIEW_MANAGER_CALL')) ||
      reason.code === 'ERR_ABORTED' ||
      reason.errno === -3
    )) {
      return; // Suppress rejected promises from webview navigation
    }
    _origErr('Unhandled Rejection:', reason);
  });

  // Allow webview to use the same persistent session
  app.on('web-contents-created', (_, contents) => {
    if (contents.getType() === 'webview') {
      // Handle new windows: allow popups (needed for OAuth) but route link clicks to tabs
      contents.setWindowOpenHandler(({ url, disposition, features }) => {
        // Popup windows (window.open with features, or 'new-window' disposition)
        // These are typically OAuth flows, payment modals, consent forms, etc.
        // They MUST open as real windows so window.opener/postMessage works.
        if (disposition === 'new-window' || (features && features.length > 0)) {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              backgroundColor: '#0a0a0b',
              autoHideMenuBar: true,
              webPreferences: {
                partition: PARTITION,  // Share cookies/sessions with main webviews
              },
            },
          };
        }
        // Regular link clicks (target="_blank") → open in a new tab
        mainWindow?.webContents.send('open-new-tab', url);
        return { action: 'deny' };
      });

      // When a popup window is created, apply content protection to it too
      contents.on('did-create-window', (newWindow) => {
        newWindow.setContentProtection(true);
        newWindow.setMenuBarVisibility(false);
      });

      // ── Intercept browser shortcuts while webview has focus ────────────────
      // When a <webview> has keyboard focus, Electron's renderer window never
      // receives keydown events, so shortcuts like Ctrl+T stop working.
      // before-input-event fires in the MAIN process before the page sees the
      // key, letting us forward our shortcuts to the renderer.
      contents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        const ctrl  = input.control || input.meta;
        const shift = input.shift;
        const key   = input.key.toLowerCase();

        // ── Dynamic shortcuts from settings ──
        const s = settings.shortcuts;
        for (const [name, combo] of Object.entries(s)) {
          if (key === combo.key.toLowerCase() && 
              ctrl === !!combo.ctrl && 
              shift === !!combo.shift && 
              !!input.alt === !!combo.alt) {
            event.preventDefault();
            mainWindow?.webContents.send('browser-shortcut', name);
            return;
          }
        }
      });

      // Forward navigation events to renderer for URL bar updates
      contents.on('did-navigate', (e, url) => {
        mainWindow?.webContents.send('webview-navigated', { url, id: contents.id });
      });
      contents.on('did-navigate-in-page', (e, url) => {
        mainWindow?.webContents.send('webview-navigated', { url, id: contents.id });
      });
      contents.on('page-title-updated', (e, title) => {
        mainWindow?.webContents.send('webview-title', { title, id: contents.id });
      });
      contents.on('page-favicon-updated', (e, favicons) => {
        mainWindow?.webContents.send('webview-favicon', { favicon: favicons[0], id: contents.id });
      });
      contents.on('did-start-loading', () => {
        mainWindow?.webContents.send('webview-loading', { loading: true, id: contents.id });
      });
      contents.on('did-stop-loading', () => {
        mainWindow?.webContents.send('webview-loading', { loading: false, id: contents.id });
      });
      contents.on('did-fail-load', (e, errCode, errDesc, url) => {
        if (errCode !== -3) { // -3 = aborted (user navigation), ignore
          mainWindow?.webContents.send('webview-error', { errCode, errDesc, url, id: contents.id });
        }
      });
    }
  });

  createWindow();

  // Register global shortcuts from settings
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (!mainWindow) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
