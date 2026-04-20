const { ipcRenderer } = require('electron');

// Sync/Async dialog bridge
window.alert = (message) => {
  // Alert is async to the host for a beautiful tab-modal UI
  ipcRenderer.sendToHost('page-alert', String(message));
};
window.confirm = (message) => {
  // Confirm and Prompt must be sync for script execution to wait
  return ipcRenderer.sendSync('page-dialog-sync', { type: 'confirm', message: String(message) });
};
window.prompt = (message, defaultValue) => {
  return ipcRenderer.sendSync('page-dialog-sync', { type: 'prompt', message: String(message), defaultValue: String(defaultValue || '') });
};



window.addEventListener('DOMContentLoaded', () => {
  const handleMouseOver = (e) => {
    let target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A') {
      const href = target.href;
      if (href) {
        ipcRenderer.sendToHost('hover-link', href);
      }
    }
  };

  const handleMouseOut = (e) => {
    let target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    if (target && target.tagName === 'A') {
      ipcRenderer.sendToHost('hover-link', null);
    }
  };

  window.addEventListener('mouseover', handleMouseOver);
  window.addEventListener('mouseout', handleMouseOut);
});
