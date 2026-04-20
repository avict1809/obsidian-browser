import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeUrl, displayUrl, isSecure, getFaviconUrl, Icon, Spinner, Tab, UrlBar, TBtn } from './components.jsx';
import NewTabPage from './NewTabPage.jsx';
import LockScreen from './LockScreen.jsx';
import DownloadsPanel from './DownloadsPanel.jsx';

// ─── Tab factory ──────────────────────────────────────────────────────────────

let tabIdCounter = 1;
function createTab(url = 'about:newtab') {
  return {
    id: tabIdCounter++,
    url,
    initialUrl: url,
    title: url === 'about:newtab' ? 'New Tab' : '',
    favicon: null,
    loading: url !== 'about:newtab',
    canGoBack: false,
    canGoForward: false,
    error: null,
    hasVideo: false,
    videoTracks: [], // { id, label, language, active }
  };
}

// ─── Subtitle Utils ───────────────────────────────────────────────────────────

function srtToVtt(srtText) {
  let vtt = 'WEBVTT\n\n' + srtText;
  // Replace all commas in timestamps like 00:00:20,000 with dots 00:00:20.000
  vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return vtt;
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({ onNavigate, onClose }) {
  const [history, setHistory] = useState([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    window.electronAPI?.historyGet().then(h => setHistory(h || []));
  }, []);

  const clearAll = async () => {
    setClearing(true);
    await window.electronAPI?.clearData();
    setHistory([]);
    setClearing(false);
  };

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 360,
      background: 'var(--bg-elevated)',
      borderLeft: '1px solid var(--border-hover)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50,
      animation: 'slideInRight 0.2s ease',
      boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="history" size={14} color="var(--amber)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>History</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={clearAll} disabled={clearing} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 6,
            padding: '3px 10px', fontSize: 11, color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,85,85,0.1)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >Clear all</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex' }}>
            <Icon name="close" size={13} color="currentColor" />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {history.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12,
          }}>
            <Icon name="history" size={32} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No history yet</span>
          </div>
        ) : history.map((item, i) => (
          <button key={i} onClick={() => { onNavigate(item.url); onClose(); }} style={{
            width: '100%', background: 'none', border: 'none', padding: '9px 16px',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(item.url).hostname; } catch { return ''; } })()}&sz=32`}
              width={14} height={14} style={{ flexShrink: 0, objectFit: 'contain', borderRadius: 2 }}
              onError={e => e.target.style.display = 'none'} alt=""
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title || item.url}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.url}
              </div>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
              {item.time}
            </span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'rgba(255,255,255,0.18)', fontFamily: 'var(--font-mono)', flexShrink: 0,
      }}>
        Ctrl+H to toggle
      </div>
    </div>
  );
}

// ─── Browser Window ───────────────────────────────────────────────────────────

export default function App() {
  const [locked, setLocked]           = useState(true);   // starts locked until auth check
  const [tabs, setTabs]               = useState([createTab('about:newtab')]);
  const [activeId, setActiveId]       = useState(tabs[0].id);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [downloads, setDownloads]     = useState([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredUrl, setHoveredUrl]   = useState(null);
  const [peek, setPeek]               = useState({ show: false, url: '' });
  const [webviewPreload, setWebviewPreload] = useState('');
  const [showTrackMenu, setShowTrackMenu]   = useState(false);
  const [pageAlert, setPageAlert]           = useState(null); // { message, tabId }


  const webviewRefs     = useRef({});
  const attachedWebviews = useRef(new Set());

  const activeTab = tabs.find(t => t.id === activeId) || tabs[0];

  // ── Tab helpers ────────────────────────────────────────────────────────────

  const updateTab = useCallback((id, patch) => {
    setTabs(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  }, []);

  const addTab = useCallback((url = 'about:newtab') => {
    const tab = createTab(url);
    setTabs(ts => [...ts, tab]);
    setActiveId(tab.id);
    return tab;
  }, []);

  const closeTab = useCallback((id) => {
    attachedWebviews.current.delete(id);
    delete webviewRefs.current[id];

    setTabs(ts => {
      if (ts.length === 1) {
        const t = createTab('about:newtab');
        setActiveId(t.id);
        return [t];
      }
      const next = ts.filter(t => t.id !== id);
      setActiveId(prev => {
        if (prev !== id) return prev;
        const idx = ts.findIndex(t => t.id === id);
        return (next[idx] || next[idx - 1] || next[0]).id;
      });
      return next;
    });
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigate = useCallback((url, tabId) => {
    const tid = tabId ?? activeId;
    const normalized = normalizeUrl(url);
    setTabs(ts => ts.map(t => {
      if (t.id === tid && (t.url === 'about:newtab' || t.url === 'about:blank')) {
        return { ...t, url: normalized, initialUrl: normalized, loading: true, error: null };
      }
      return t;
    }));
    const wv = webviewRefs.current[tid];
    if (wv) {
      updateTab(tid, { loading: true, error: null });
      try { wv.loadURL(normalized); } catch {}
    }
  }, [activeId, updateTab]);

  const goBack = useCallback(() => {
    const wv = webviewRefs.current[activeId];
    if (wv && activeTab.canGoBack) wv.goBack();
  }, [activeId, activeTab]);

  const goForward = useCallback(() => {
    const wv = webviewRefs.current[activeId];
    if (wv && activeTab.canGoForward) wv.goForward();
  }, [activeId, activeTab]);

  const goHome = useCallback(() => {
    updateTab(activeId, { url: 'about:newtab', initialUrl: 'about:newtab', title: 'New Tab', favicon: null, loading: false, canGoBack: false, canGoForward: false, error: null });
    attachedWebviews.current.delete(activeId);
    delete webviewRefs.current[activeId];
  }, [activeId, updateTab]);

  const stop = useCallback(() => {
    const wv = webviewRefs.current[activeId];
    if (wv) { wv.stop(); updateTab(activeId, { loading: false }); }
  }, [activeId, updateTab]);

  const reload = useCallback(() => {
    const wv = webviewRefs.current[activeId];
    if (wv) wv.reload();
  }, [activeId]);

  const openFile = useCallback(async () => {
    const filePath = await window.electronAPI?.openFileDialog();
    if (filePath) {
      const url = `file://${filePath}`;
      navigate(url, activeId);
      // Give it a moment to load then try auto-detect
      setTimeout(() => autoDetectSubtitles(filePath, activeId), 1000);
    }
  }, [activeId, navigate]);

  const loadSubtitles = useCallback(async (tabId) => {
    const tid = tabId ?? activeId;
    const wv = webviewRefs.current[tid];
    if (!wv) return;

    const filePath = await window.electronAPI?.openFileDialog();
    if (!filePath) return;

    let content = await window.electronAPI?.readFileText(filePath);
    if (!content) return;

    if (filePath.toLowerCase().endsWith('.srt')) {
      content = srtToVtt(content);
    }
    
    applySubtitles(wv, content);
  }, [activeId]);

  const autoDetectSubtitles = useCallback(async (videoPath, tabId) => {
    const res = await window.electronAPI?.checkMatchingSubtitle(videoPath);
    if (res && res.content) {
      const wv = webviewRefs.current[tabId];
      if (wv) {
        let content = res.content;
        if (res.type === 'srt') content = srtToVtt(content);
        applySubtitles(wv, content);
      }
    }
  }, []);

  const applySubtitles = (wv, vttContent) => {
    const base64 = btoa(unescape(encodeURIComponent(vttContent)));
    const dataUri = `data:text/vtt;base64,${base64}`;
    const code = `
      (function() {
        const v = document.querySelector('video');
        if (!v) return false;
        const existing = v.querySelectorAll('track[label="External"]');
        existing.forEach(t => t.remove());
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = 'External';
        track.srclang = 'en';
        track.src = '${dataUri}';
        track.default = true;
        v.appendChild(track);
        if (v.textTracks && v.textTracks.length > 0) {
          for (let i=0; i<v.textTracks.length; i++) {
            v.textTracks[i].mode = (v.textTracks[i].label === 'External') ? 'showing' : 'disabled';
          }
        }
        return true;
      })()
    `;
    wv.executeJavaScript(code);
  };

  const selectInternalTrack = useCallback((trackId) => {
    const wv = webviewRefs.current[activeId];
    if (!wv) return;
    const code = `
      (function() {
        const v = document.querySelector('video');
        if (!v) return;
        for (let i=0; i<v.textTracks.length; i++) {
          v.textTracks[i].mode = (i === ${trackId}) ? 'showing' : 'disabled';
        }
      })()
    `;
    wv.executeJavaScript(code);
    setShowTrackMenu(false);
  }, [activeId]);

  const triggerPeek = useCallback(() => {
    if (hoveredUrl) {
      setPeek({ show: true, url: hoveredUrl });
    }
  }, [hoveredUrl]);

  // ── Electron IPC listeners ─────────────────────────────────────────────────

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.getWebviewPreloadPath().then(setWebviewPreload);
    api.isMaximized().then(setIsMaximized);
    api.on('window-state', state => setIsMaximized(state === 'maximized'));
    api.on('open-new-tab', url => addTab(url));

    api.on('download-progress', ({ filename, received, total }) => {
      setDownloads(ds => {
        const i = ds.findIndex(d => d.filename === filename && !d.done);
        if (i >= 0) { const n = [...ds]; n[i] = { ...n[i], received, total }; return n; }
        return [...ds, { filename, received, total, done: false }];
      });
    });

    api.on('download-done', ({ filename, state, savePath }) => {
      setDownloads(ds => {
        const i = ds.findIndex(d => d.filename === filename && !d.done);
        if (i >= 0) { const n = [...ds]; n[i] = { ...n[i], done: true, savePath }; return n; }
        return [...ds, { filename, done: true, savePath }];
      });
      // Auto-open downloads panel when something finishes
      setShowDownloads(true);
    });

    api.on('browser-shortcut', action => {
      switch (action) {
        case 'new-tab':          addTab(); break;
        case 'close-tab':        closeTab(activeId); break;
        case 'reload':           reload(); break;
        case 'focus-urlbar':     document.dispatchEvent(new CustomEvent('focus-urlbar')); break;
        case 'toggle-history':   setShowHistory(v => !v); setShowDownloads(false); break;
        case 'toggle-downloads': setShowDownloads(v => !v); setShowHistory(false); break;
        case 'lock-browser':     setLocked(true); break;
        case 'go-back':          goBack(); break;
        case 'go-forward':       goForward(); break;
        case 'prev-tab': {
          setTabs(ts => {
            const idx = ts.findIndex(t => t.id === activeId);
            const n = (idx - 1 + ts.length) % ts.length;
            setActiveId(ts[n].id);
            return ts;
          });
          break;
        }
        case 'next-tab': {
          setTabs(ts => {
            const idx = ts.findIndex(t => t.id === activeId);
            const n = (idx + 1) % ts.length;
            setActiveId(ts[n].id);
            return ts;
          });
          break;
        }
        case 'peek-link':       triggerPeek(); break;
        case 'open-file':       openFile(); break;
        case 'load-subtitles':  loadSubtitles(activeId); break;
      }
    });

    return () => {
      ['window-state','open-new-tab','download-progress','download-done', 'browser-shortcut'].forEach(c => api.off(c));
    };
  }, [addTab, activeId, closeTab, reload, goBack, goForward]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (locked) return;
    const handler = e => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 't') { e.preventDefault(); addTab(); }
      if (mod && e.key === 'w') { e.preventDefault(); closeTab(activeId); }
      if (mod && e.key === 'r') { e.preventDefault(); reload(); }
      if (mod && e.key === 'o') { e.preventDefault(); openFile(); }
      if (mod && e.key === 'u') { e.preventDefault(); loadSubtitles(activeId); }
      if (mod && e.key === 'l') { e.preventDefault(); document.dispatchEvent(new CustomEvent('focus-urlbar')); }
      if (mod && e.key === 'h') { e.preventDefault(); setShowHistory(v => !v); setShowDownloads(false); }
      if (mod && e.key === 'j') { e.preventDefault(); setShowDownloads(v => !v); setShowHistory(false); }
      if (mod && e.shiftKey && e.key === 'L') { e.preventDefault(); setLocked(true); }
      if (mod && e.shiftKey && e.key === 'H') { e.preventDefault(); goBack(); }
      if (mod && e.shiftKey && e.key === 'L') { e.preventDefault(); goForward(); }
      if (e.altKey && e.key === 'ArrowLeft') goBack();
      if (e.altKey && e.key === 'ArrowRight') goForward();

      if (mod && e.key === 'Tab') {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeId);
        const next = e.shiftKey ? (idx - 1 + tabs.length) % tabs.length : (idx + 1) % tabs.length;
        setActiveId(tabs[next].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [locked, activeId, tabs, addTab, closeTab, reload, goBack, goForward]);

  // ── Webview event wiring ───────────────────────────────────────────────────

  const attachWebviewEvents = useCallback((wv, tabId) => {
    if (!wv || attachedWebviews.current.has(tabId)) return;
    attachedWebviews.current.add(tabId);

    let lastUrl   = '';
    let lastTitle = '';

    wv.addEventListener('did-start-loading', () => updateTab(tabId, { loading: true, error: null, hasVideo: false }));
    wv.addEventListener('did-stop-loading',  () => {
      updateTab(tabId, { loading: false });
      // Check for video element and internal tracks after load
      const checkCode = `
        (function() {
          const v = document.querySelector('video');
          if (!v) return { hasVideo: false, tracks: [] };
          const tracks = Array.from(v.textTracks).map((t, i) => ({
            id: i,
            label: t.label || 'Track ' + (i + 1),
            language: t.language,
            mode: t.mode
          }));
          return { hasVideo: true, tracks };
        })()
      `;
      wv.executeJavaScript(checkCode).then(res => {
        updateTab(tabId, { hasVideo: res.hasVideo, videoTracks: res.tracks });
      });
    });

    wv.addEventListener('did-finish-load', () => {
      const url = wv.getURL();
      updateTab(tabId, { url, canGoBack: wv.canGoBack(), canGoForward: wv.canGoForward(), loading: false });
      if (url && !url.startsWith('about:') && url !== lastUrl) {
        lastUrl = url;
        try {
          const domain = new URL(url).hostname;
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          window.electronAPI?.historyAdd({ url, title: wv.getTitle() || url, domain, time });
        } catch {}
      }
    });

    wv.addEventListener('page-title-updated', e => {
      if (e.title !== lastTitle) { lastTitle = e.title; updateTab(tabId, { title: e.title }); }
    });

    wv.addEventListener('page-favicon-updated', e => updateTab(tabId, { favicon: e.favicons?.[0] || null }));

    wv.addEventListener('did-navigate', e => {
      if (e.url !== lastUrl) lastUrl = e.url;
      updateTab(tabId, { url: e.url, canGoBack: wv.canGoBack(), canGoForward: wv.canGoForward() });
    });

    wv.addEventListener('did-navigate-in-page', e => {
      if (e.url !== lastUrl) {
        lastUrl = e.url;
        updateTab(tabId, { url: e.url, canGoBack: wv.canGoBack(), canGoForward: wv.canGoForward() });
        if (e.url && !e.url.startsWith('about:')) {
          try {
            const domain = new URL(e.url).hostname;
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            window.electronAPI?.historyAdd({ url: e.url, title: wv.getTitle() || e.url, domain, time });
          } catch {}
        }
      }
    });

    wv.addEventListener('did-fail-load', e => {
      if (e.errorCode !== -3) {
        updateTab(tabId, { loading: false, error: { code: e.errorCode, desc: e.errorDescription, url: e.validatedURL } });
      }
    });

    wv.addEventListener('new-window', e => addTab(e.url));

    wv.addEventListener('ipc-message', e => {
      if (e.channel === 'hover-link') {
        setHoveredUrl(e.args[0]);
      } else if (e.channel === 'page-alert') {
        setPageAlert({ message: e.args[0], tabId });
      }
    });


    wv.addEventListener('dom-ready', () => {
      const id = wv.getWebContentsId?.();
      if (id) window.electronAPI?.setupWebviewSession(id);
    });
  }, [updateTab, addTab]);

  // ── Panel side-close helper ────────────────────────────────────────────────
  const closeAllPanels = () => { setShowHistory(false); setShowDownloads(false); };

  // ── Lock Screen ────────────────────────────────────────────────────────────

  if (locked) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  // ── Change PIN button (exposed via Settings-like gear click area) ──────────
  // We allow the user to change the PIN from inside the browser — triggered
  // by a dedicated toolbar button that renders the LockScreen in 'change' mode.

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const hasActivePanelRight = showHistory || showDownloads;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ── Titlebar ── */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 8px', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag', appRegion: 'drag',
        flexShrink: 0,
      }}>
        {/* Window controls */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', WebkitAppRegion: 'no-drag', appRegion: 'no-drag', marginRight: 4 }}>
          <button onClick={() => window.electronAPI?.close()}
            style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#e05555', cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title="Close" />
          <button onClick={() => window.electronAPI?.minimize()}
            style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#e8a030', cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title="Minimize" />
          <button onClick={() => window.electronAPI?.maximize()}
            style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#5cb87a', cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title={isMaximized ? 'Restore' : 'Maximize'} />
        </div>

        {/* Tabs container - no-drag because we want clicks to work */}
        <div style={{ display: 'flex', gap: 4, overflow: 'hidden', alignItems: 'center', WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }}>
          {tabs.map(tab => (
            <Tab key={tab.id} tab={tab} isActive={tab.id === activeId}
              onActivate={() => setActiveId(tab.id)}
              onClose={() => closeTab(tab.id)} />
          ))}
        </div>

        {/* Draggable spacer to fill empty space and allow window dragging */}
        <div style={{ flex: 1, height: '100%', WebkitAppRegion: 'drag', appRegion: 'drag' }} />

        {/* New tab button */}
        <div style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }}>
          <TBtn icon="plus" onClick={() => addTab()} title="New tab (Ctrl+T)" size={13} />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        height: 46, display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 12px', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        position: 'relative',
      }}>
        <TBtn icon="back"    onClick={goBack}    disabled={!activeTab.canGoBack}    title="Back (Alt+←)" />
        <TBtn icon="forward" onClick={goForward} disabled={!activeTab.canGoForward} title="Forward (Alt+→)" />
        <TBtn icon="home"    onClick={goHome}    title="New Tab" />

        <UrlBar
          url={activeTab.url}
          loading={activeTab.loading}
          onNavigate={url => navigate(url, activeId)}
          onStop={stop}
          onReload={reload}
        />

        {/* Right toolbar buttons */}
        <TBtn
          icon="history"
          onClick={() => { setShowHistory(v => !v); setShowDownloads(false); }}
          title="History (Ctrl+H)"
          active={showHistory}
        />
        <TBtn
          icon="download"
          onClick={() => { setShowDownloads(v => !v); setShowHistory(false); }}
          title="Downloads (Ctrl+J)"
          active={showDownloads}
        />
        {/* Subtitles button (conditional) */}
        {activeTab.hasVideo && (
          <div style={{ position: 'relative' }}>
            <TBtn
              icon="subtitles"
              onClick={() => setShowTrackMenu(v => !v)}
              title="Subtitle settings (Ctrl+U)"
              active={showTrackMenu}
            />
            
            {showTrackMenu && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                width: 220, background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)',
                borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100,
                padding: '6px 0', animation: 'slideDown 0.15s ease'
              }}>
                <div style={{ padding: '8px 14px', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Internal Tracks
                </div>
                {activeTab.videoTracks.length === 0 ? (
                  <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>None detected</div>
                ) : activeTab.videoTracks.map(t => (
                  <button key={t.id} onClick={() => selectInternalTrack(t.id)} style={{
                    width: '100%', padding: '8px 14px', background: 'none', border: 'none',
                    textAlign: 'left', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8
                  }} 
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <Icon name="globe" size={12} color="var(--text-muted)" />
                    {t.label} {t.language ? `(${t.language})` : ''}
                  </button>
                ))}
                
                <div style={{ margin: '6px 0', borderTop: '1px solid var(--border)' }} />
                
                <button onClick={() => { loadSubtitles(activeId); setShowTrackMenu(false); }} style={{
                  width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                  textAlign: 'left', color: 'var(--amber)', fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Icon name="plus" size={12} color="currentColor" /> Load External File...
                </button>
              </div>
            )}
          </div>
        )}
        {/* Lock button */}
        <TBtn
          icon="lock"
          onClick={() => setLocked(true)}
          title="Lock browser"
        />
      </div>

      {/* ── Content area (browser + optional right panel) ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>

        {/* Webview area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {tabs.map(tab => (
            <div key={tab.id} style={{
              position: 'absolute', inset: 0,
              visibility: tab.id === activeId ? 'visible' : 'hidden',
              zIndex: tab.id === activeId ? 1 : 0,
            }}>
              {(tab.url === 'about:newtab' || tab.url === 'about:blank') ? (
                <NewTabPage onNavigate={url => navigate(url, tab.id)} />
              ) : tab.error ? (
                <div style={{
                  width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40,
                  background: 'var(--bg-base)', animation: 'fadeIn 0.3s ease',
                }}>
                  <div style={{ fontSize: 48, opacity: 0.3 }}>⚠</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Page couldn't load</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 380, lineHeight: 1.6 }}>
                    {tab.error.desc || 'The page failed to load.'}<br />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                      {tab.error.code && `Error ${tab.error.code}`}
                    </span>
                  </div>
                  <button onClick={reload} style={{
                    background: 'var(--amber)', border: 'none', borderRadius: 8, padding: '8px 20px',
                    fontSize: 13, fontWeight: 600, color: '#000', cursor: 'pointer',
                    fontFamily: 'var(--font-ui)', transition: 'opacity 0.12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >Try again</button>
                </div>
              ) : (
                <webview
                  ref={wv => {
                    if (wv && !webviewRefs.current[tab.id]) {
                      webviewRefs.current[tab.id] = wv;
                      attachWebviewEvents(wv, tab.id);
                    }
                    if (!wv) delete webviewRefs.current[tab.id];
                  }}
                  src={tab.initialUrl}
                  partition="persist:obsidian"
                  preload={webviewPreload}
                  plugins="true"
                  style={{ width: '100%', height: '100%', border: 'none', display: 'flex', background: '#fff' }}
                  allowpopups="true"
                  webpreferences="contextIsolation=yes"
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Peek Overlay ── */}
        {peek.show && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.2s ease',
          }} onClick={() => setPeek({ show: false, url: '' })}>
            <div style={{
              width: '85%', height: '80%', background: '#0a0a0b',
              borderRadius: 16, border: '1px solid var(--border-hover)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              animation: 'peekIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1 }}>
                  <Icon name="globe" size={14} color="var(--amber)" />
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{peek.url}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { addTab(peek.url); setPeek({ show: false, url: '' }); }} style={{
                    background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6,
                    padding: '4px 12px', fontSize: 11, color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <Icon name="plus" size={12} color="currentColor" /> Open in Tab
                  </button>
                  <button onClick={() => setPeek({ show: false, url: '' })} style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6, display: 'flex'
                  }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    <Icon name="close" size={16} color="currentColor" />
                  </button>
                </div>
              </div>
              {/* Content */}
              <div style={{ flex: 1, position: 'relative' }}>
                <webview
                  src={peek.url}
                  partition="persist:obsidian"
                  plugins="true"
                  style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                  webpreferences="contextIsolation=yes"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Right side panels ── */}
        {showHistory && (
          <HistoryPanel
            onNavigate={url => navigate(url)}
            onClose={() => setShowHistory(false)}
          />
        )}
        {showDownloads && (
          <DownloadsPanel
            downloads={downloads}
            onDismiss={i => setDownloads(ds => ds.filter((_, j) => j !== i))}
            onClear={() => setDownloads([])}
            onClose={() => setShowDownloads(false)}
          />
        )}

        {/* Click-outside overlay to close panels */}
        {hasActivePanelRight && (
          <div
            style={{ position: 'absolute', inset: 0, zIndex: 49 }}
            onClick={closeAllPanels}
          />
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{
        height: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
          {activeTab.loading ? (
            <span style={{ color: 'var(--amber)' }}>Loading…</span>
          ) : activeTab.url && activeTab.url !== 'about:newtab' ? (
            activeTab.url
          ) : (
            <span style={{ opacity: 0.5 }}>Obsidian Browser</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {isSecure(activeTab.url) && (
            <span style={{ fontSize: 9, color: 'var(--amber)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              Secure
            </span>
          )}
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
          </span>
          {downloads.filter(d => !d.done).length > 0 && (
            <span style={{ fontSize: 9, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
              ↓ {downloads.filter(d => !d.done).length} downloading
            </span>
          )}
        </div>
        {/* ── Page Alert (Custom Browser Alert) ── */}
        {pageAlert && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
          }} onClick={() => setPageAlert(null)}>
            <div style={{
              width: 400, background: 'var(--bg-elevated)', borderRadius: 16,
              border: '1px solid var(--border-hover)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
              animation: 'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(232, 160, 48, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)'
                }}>
                  <Icon name="history" size={18} color="currentColor" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: 0.5 }}>Page Message</span>
              </div>
              
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {pageAlert.message}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setPageAlert(null)} style={{
                  padding: '8px 24px', background: 'var(--amber)', color: '#000',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >OK</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

