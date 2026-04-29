const { app, BrowserWindow, ipcMain, session, Menu, shell, dialog, webContents, nativeTheme, globalShortcut } = require('electron');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging for updates
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.forceDevUpdateConfig = true;

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
const PARTITION = 'persist:obsidian';
const CUSTOM_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Aggressively ignore certificate errors for proxy compatibility

app.commandLine.appendSwitch('ignore-certificate-errors');
app.commandLine.appendSwitch('allow-insecure-localhost');
app.commandLine.appendSwitch('disable-http2');
app.commandLine.appendSwitch('disable-quic');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'UserAgentClientHint');
app.commandLine.appendSwitch('enable-blink-features', 'SharedArrayBuffer');



console.log('Is dev mode:', isDev);
console.log('NODE_ENV:', process.env.NODE_ENV);

let mainWindow = null;
let torProcess = null;
let torStatus = 'offline'; // 'offline', 'bootstrapping', 'ready'
let torLog = [];

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
    'new-window':       { key: 'n', ctrl: true,  shift: false, alt: false },
    'command-palette':  { key: 'p', ctrl: true,  shift: true,  alt: false },
    'toggle-hud':       { key: 'h', ctrl: true,  shift: true,  alt: false },
  },
  coolFeatures: {
    starfield: false,
    commandPalette: false,
    glitchTransitions: false,
    privacyPulse: false,
    holographicHUD: false,
    hudOpacity: 0.8,
  },
  startHidden: false,
  winRShortcut: false,
  darkWebMode: false,
  screenCaptureProtection: true,
  proxy: {
    enabled: false,
    server: '',
    preset: 'none'
  }
};

let settings = { ...DEFAULT_SETTINGS };
let windows = new Set();

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      settings = { ...DEFAULT_SETTINGS, ...data, 
        shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...data.shortcuts },
        proxy: { ...DEFAULT_SETTINGS.proxy, ...data.proxy },
        coolFeatures: { ...DEFAULT_SETTINGS.coolFeatures, ...data.coolFeatures },
        // Always force screen capture protection to true on launch
        screenCaptureProtection: true
      };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function saveSettings() {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8');
    // Notify all renderers
    for (const win of windows) {
      win.webContents.send('settings-updated', settings);
      if (!win.isDestroyed()) win.setContentProtection(settings.screenCaptureProtection);
    }
    // Update global shortcuts
    registerGlobalShortcuts();
    // Update proxy for the shared session
    applyProxyToSession();
    // Update Win+R shortcut
    if (process.platform === 'win32') {
      registerAppPath(settings.winRShortcut);
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function registerAppPath(enable) {
  if (process.platform !== 'win32') return;
  const { exec } = require('child_process');
  const exePath = app.getPath('exe');
  const exeDir = path.dirname(exePath);
  const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\obsidian.exe';

  if (enable) {
    const cmd1 = `reg add "${regKey}" /ve /t REG_SZ /d "${exePath}" /f`;
    const cmd2 = `reg add "${regKey}" /v Path /t REG_SZ /d "${exeDir}" /f`;
    exec(cmd1, (err) => {
      if (err) console.error('Failed to register Win+R shortcut (1):', err);
    });
    exec(cmd2, (err) => {
      if (err) console.error('Failed to register Win+R shortcut (2):', err);
    });
  } else {
    const cmd = `reg delete "${regKey}" /f`;
    exec(cmd, (err) => {
      // Ignore error if key doesn't exist
    });
  }
}

function startTor() {
  if (torProcess) return;
  
  const isDev = process.env.NODE_ENV === 'development';
  // In dev, we look in the root resources folder. In production, Electron puts extraResources in process.resourcesPath.
  const torDir = isDev 
    ? path.join(__dirname, '..', 'resources', 'tor')
    : path.join(process.resourcesPath, 'resources', 'tor');
  
  const torBinary = process.platform === 'win32' ? 'tor.exe' : 'tor';
  const torPath = path.join(torDir, torBinary);

  console.log('Starting TOR from:', torPath);
  
  if (!fs.existsSync(torPath)) {
    console.error('TOR binary not found at:', torPath);
    torStatus = 'error';
    return;
  }

  torStatus = 'bootstrapping';
  
  // Start TOR with custom ports to avoid conflicts with system TOR
  torProcess = spawn(torPath, [
    '--SocksPort', '9050',
    '--ControlPort', '9051',
    '--DataDirectory', path.join(app.getPath('userData'), 'tor-data')
  ]);

  torProcess.stdout.on('data', (data) => {
    const line = data.toString().trim();
    console.log('Tor:', line);
    torLog.push(line);
    if (torLog.length > 100) torLog.shift();

    // Send new log entry to all windows
    for (const win of windows) {
      win.webContents.send('tor-log-entry', line);
    }

    if (line.includes('Bootstrapped 100%')) {
      console.log('TOR is ready!');
      torStatus = 'ready';
      // Notify all windows
      for (const win of windows) {
        win.webContents.send('tor-status', { status: 'ready' });
      }
    }
  });

  torProcess.stderr.on('data', (data) => {
    console.error('Tor Error:', data.toString());
  });

  torProcess.on('close', (code) => {
    console.log(`Tor process exited with code ${code}`);
    torProcess = null;
    torStatus = 'offline';
    // Notify all windows
    for (const win of windows) {
      win.webContents.send('tor-status', { status: 'offline' });
    }
  });
}

function stopTor() {
  if (torProcess) {
    torProcess.kill();
    torProcess = null;
  }
}

async function applyProxyToSession() {
  const ses = session.fromPartition(PARTITION);
  
  if (settings.darkWebMode) {
    // We now only use the embedded local TOR service for Dark Web mode
    const proxyUrl = 'socks5://127.0.0.1:9050';
    console.log('Applying Embedded TOR Proxy:', proxyUrl);
    await ses.setProxy({ proxyRules: proxyUrl });
  } else if (settings.proxy.enabled && settings.proxy.server) {
    console.log('Applying user proxy:', settings.proxy.server);
    await ses.setProxy({ proxyRules: settings.proxy.server });
  } else {
    console.log('Disabling proxy (direct connection)');
    await ses.setProxy({ proxyRules: 'direct://' });
  }
}

function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();
  
  const v = settings.shortcuts['toggle-visibility'];
  if (v) {
    const accel = `${v.ctrl ? 'CommandOrControl+' : ''}${v.shift ? 'Shift+' : ''}${v.alt ? 'Alt+' : ''}${v.key.toUpperCase()}`;
    const success = globalShortcut.register(accel, () => {
      console.log(`Global shortcut ${accel} pressed`);
      for (const win of windows) {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
      }
    });
    console.log(`Registration of ${accel}: ${success ? 'SUCCESS' : 'FAILED'}`);
  }
}

// ── Persist user sessions across restarts ──────────────────────────────────

function createWindow() {
  let win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0b',
    show: false,
    icon: path.join(__dirname, '../assets/icon.png'),
    hasShadow: false,
    skipTaskbar: settings.skipTaskbar,
    alwaysOnTop: settings.alwaysOnTop,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
      session: session.fromPartition(PARTITION),
      plugins: true,
    },
  });

  // Apply User Agent to the whole session
  session.fromPartition(PARTITION).setUserAgent(CUSTOM_UA);


  windows.add(win);
  win.setContentProtection(settings.screenCaptureProtection);

  if (!mainWindow) mainWindow = win;

  win.once('ready-to-show', () => {
    if (settings.startHidden && windows.size === 1) {
      console.log('First window ready-to-show (staying hidden for stealth mode)');
    } else {
      win.show();
    }
  });

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  win.loadURL(startUrl);

  win.on('maximize',   () => win.webContents.send('window-state', 'maximized'));
  win.on('unmaximize', () => win.webContents.send('window-state', 'normal'));
  win.on('focus',      () => win.webContents.send('window-focus', true));
  win.on('blur',       () => win.webContents.send('window-focus', false));

  win.on('closed', () => { 
    windows.delete(win); 
    if (win === mainWindow) mainWindow = Array.from(windows)[0] || null;
  });

  // Apply initial proxy
  applyProxyToSession();

  return win;
}

// ── IPC: Window controls ───────────────────────────────────────────────────
ipcMain.on('window-minimize',  (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
ipcMain.on('window-maximize',  (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('window-close',     (event) => BrowserWindow.fromWebContents(event.sender)?.close());
ipcMain.handle('window-is-maximized', (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false);
ipcMain.on('window-toggle-devtools', (event) => BrowserWindow.fromWebContents(event.sender)?.webContents.toggleDevTools());
ipcMain.on('window-new', () => createWindow());

// ── IPC: Settings ──────────────────────────────────────────────────────────
ipcMain.handle('settings-get', () => settings);
ipcMain.handle('settings-set', (_, newSettings) => {
  const oldAlwaysOnTop = settings.alwaysOnTop;
  const oldSkipTaskbar = settings.skipTaskbar;
  
  settings = { ...settings, ...newSettings };
  
  for (const win of windows) {
    if (settings.alwaysOnTop !== oldAlwaysOnTop) {
      win.setAlwaysOnTop(settings.alwaysOnTop, 'screen-saver');
    }
    if (settings.skipTaskbar !== oldSkipTaskbar) {
      win.setSkipTaskbar(settings.skipTaskbar);
    }
    if (!win.isDestroyed()) win.setContentProtection(settings.screenCaptureProtection);
  }
  
  saveSettings();
  for (const w of windows) {
    w.webContents.send('settings-updated', settings);
  }
  return settings;
});
ipcMain.handle('settings-reset', () => {
  settings = { ...DEFAULT_SETTINGS };
  for (const win of windows) {
    win.setAlwaysOnTop(settings.alwaysOnTop, 'screen-saver');
    win.setSkipTaskbar(settings.skipTaskbar);
  }
  saveSettings();
  return settings;
});

ipcMain.handle('tor-status-get', () => ({ status: torStatus, log: torLog }));
ipcMain.on('tor-start', () => startTor());
ipcMain.on('tor-stop', () => stopTor());

// ── IPC: Updates ───────────────────────────────────────────────────────────
ipcMain.on('update-check', () => {
  console.log('Main: Manual update check requested');
  try {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      console.error('Update Check Error (Catch):', err.message);
      broadcastUpdateStatus({ state: 'error', error: err.message });
    });
  } catch (err) {
    console.error('Update Check Error (Sync):', err.message);
    broadcastUpdateStatus({ state: 'error', error: err.message });
  }
});
ipcMain.on('update-install', () => {
  console.log('Main: Quitting and installing update');
  autoUpdater.quitAndInstall();
});

// ── AutoUpdater Events ─────────────────────────────────────────────────────
function broadcastUpdateStatus(payload) {
  for (const win of windows) {
    if (!win.isDestroyed()) win.webContents.send('update-status', payload);
  }
}

autoUpdater.on('checking-for-update', () => {
  broadcastUpdateStatus({ state: 'checking' });
});
autoUpdater.on('update-available', (info) => {
  broadcastUpdateStatus({ state: 'available', info });
});
autoUpdater.on('update-not-available', (info) => {
  broadcastUpdateStatus({ state: 'not-available', info });
  // Reset to idle after 5 seconds
  setTimeout(() => {
    broadcastUpdateStatus({ state: 'idle' });
  }, 5000);
});
autoUpdater.on('error', (err) => {
  broadcastUpdateStatus({ state: 'error', error: err.message });
});
autoUpdater.on('download-progress', (progress) => {
  broadcastUpdateStatus({ state: 'downloading', progress });
});
autoUpdater.on('update-downloaded', (info) => {
  broadcastUpdateStatus({ state: 'downloaded', info });
});

// ── IPC: Open external links in system browser ─────────────────────────────
ipcMain.handle('proxy-test', async (_, proxyServer) => {
  console.log('Main: Testing proxy:', proxyServer);
  try {
    const { net } = require('electron');
    return new Promise((resolve) => {
      const testSession = session.fromPartition('temp-proxy-test-' + Date.now());
      testSession.setProxy({ proxyRules: proxyServer }).then(() => {
        const testRequest = net.request({
          url: 'https://www.google.com',
          session: testSession,
          method: 'GET'
        });
        
        testRequest.on('response', (response) => {
          console.log('Main: Proxy test response:', response.statusCode);
          resolve({ success: response.statusCode === 200, status: response.statusCode });
        });
        testRequest.on('error', (err) => {
          console.log('Main: Proxy test error:', err.message);
          resolve({ success: false, error: err.message });
        });
        testRequest.end();
        
        // Faster timeout for a better UX
        setTimeout(() => resolve({ success: false, error: 'Connection timed out' }), 4000);
      });
    });
  } catch (err) {
    console.error('Main: Proxy test crash:', err);
    return { success: false, error: err.message };
  }
});


// Initialize session listeners
function initSession() {
  const sess = session.fromPartition(PARTITION);
  sess.on('will-download', (event, item, webContents) => {
    console.log('Main: Download starting:', item.getFilename());
    
    // If we don't set a save path, Electron prompts the user (Save As)
    // We can also suggest a filename
    const filename = item.getFilename();
    const extension = filename.split('.').pop();
    
    // Optional: add listener for progress
    item.on('updated', (event, state) => {
      if (state === 'interrupted') console.log('Download interrupted');
      else if (state === 'progressing') {
        if (item.isPaused()) console.log('Download paused');
        else {
          // Send progress to renderer if needed
          const win = BrowserWindow.getFocusedWindow();
          if (win) win.webContents.send('download-progress', {
            filename: item.getFilename(),
            received: item.getReceivedBytes(),
            total: item.getTotalBytes()
          });
        }
      }
    });
    
    item.once('done', (event, state) => {
      console.log('Main: Download done:', state);
      const win = BrowserWindow.getFocusedWindow();
      if (win) win.webContents.send('download-done', {
        filename: item.getFilename(),
        state,
        savePath: item.getSavePath()
      });
    });
  });
}

ipcMain.on('download-url', (event, url) => {
  console.log('Main: Triggering download for:', url);
  const sess = session.fromPartition(PARTITION);
  sess.downloadURL(url);
});



ipcMain.on('open-external', (_, url) => shell.openExternal(url));

ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(null, {
    title: 'Open File',
    properties: ['openFile'],
    filters: [
      { name: 'Browser Supported Files', extensions: ['html', 'htm', 'pdf', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mp3', 'wav', 'ogg', 'svg'] },
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
  initSession();
  
  // Check for updates on startup
  autoUpdater.checkForUpdatesAndNotify();

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 4 * 60 * 60 * 1000);

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
  stopTor();
});


app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // If user wants to ignore cert errors, we could check a setting here.
  // For now, let's allow it if the user is using a proxy, as it's common for them to have cert issues.
  if (settings.proxy.enabled) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
