const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize:      ()  => ipcRenderer.send('window-minimize'),
  maximize:      ()  => ipcRenderer.send('window-maximize'),
  close:         ()  => ipcRenderer.send('window-close'),
  isMaximized:   ()  => ipcRenderer.invoke('window-is-maximized'),
  openExternal:  (u) => ipcRenderer.send('open-external', u),

  // Webview session setup
  setupWebviewSession: (id) => ipcRenderer.send('setup-webview-session', id),

  // History
  historyAdd:   (e)  => ipcRenderer.send('history-add', e),
  historyGet:   ()   => ipcRenderer.invoke('history-get'),
  historyClear: ()   => ipcRenderer.send('history-clear'),

  // Data
  clearData: () => ipcRenderer.invoke('clear-data'),

  // Auth / PIN lock
  authHasPassword: ()      => ipcRenderer.invoke('auth-has-password'),
  authVerify:      (pin)   => ipcRenderer.invoke('auth-verify', pin),
  authSetPassword: (pin)   => ipcRenderer.invoke('auth-set-password', pin),

  // Events from main → renderer
  on: (channel, cb) => {
    const allowed = [
      'window-state', 'window-focus',
      'webview-navigated', 'webview-title', 'webview-favicon',
      'webview-loading', 'webview-error',
      'open-new-tab',
      'download-progress', 'download-done',
      'browser-shortcut',
    ];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => cb(...args));
    }
  },
  off: (channel) => ipcRenderer.removeAllListeners(channel),
});
