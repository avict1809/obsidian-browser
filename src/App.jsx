import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeUrl, displayUrl, isSecure, getFaviconUrl, Icon, Spinner, Tab, UrlBar, TBtn } from './components.jsx';
import NewTabPage from './NewTabPage.jsx';

// ─── Tab factory ──────────────────────────────────────────────────────────────

let tabIdCounter = 1;
function createTab(url = 'about:newtab') {
  return {
    id: tabIdCounter++,
    url,                     // Current URL displayed in URL bar
    initialUrl: url,         // The URL to set as webview src (only used on first mount)
    title: url === 'about:newtab' ? 'New Tab' : '',
    favicon: null,
    loading: url !== 'about:newtab',
    canGoBack: false,
    canGoForward: false,
    error: null,
  };
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
      position: 'absolute', top: 44, right: 0, width: 360, maxHeight: '70vh',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)',
      borderRadius: 'var(--radius-lg)', zIndex: 100, overflow: 'hidden',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)', animation: 'slideDown 0.15s ease',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>History</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={clearAll} disabled={clearing} style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 6,
            padding: '3px 10px', fontSize: 11, color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.12s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,85,85,0.1)'; e.currentTarget.style.borderColor = 'rgba(224,85,85,0.3)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Clear all
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex' }}>
            <Icon name="close" size={13} color="currentColor" />
          </button>
        </div>
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {history.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No history yet</div>
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
              onError={e => e.target.style.display = 'none'}
              alt=""
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
    </div>
  );
}

// ─── Download Toast ───────────────────────────────────────────────────────────

function DownloadToast({ downloads, onDismiss }) {
  if (downloads.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 200,
    }}>
      {downloads.map((d, i) => (
        <div key={i} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)',
          borderRadius: 10, padding: '10px 14px', minWidth: 260,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideDown 0.2s ease',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <Icon name="download" size={14} color={d.done ? 'var(--green)' : 'var(--amber)'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
              {d.filename}
            </div>
            {!d.done && d.total > 0 && (
              <div style={{ marginTop: 4, height: 2, background: 'var(--border)', borderRadius: 1 }}>
                <div style={{ height: '100%', background: 'var(--amber)', borderRadius: 1, width: `${Math.round((d.received / d.total) * 100)}%`, transition: 'width 0.3s' }} />
              </div>
            )}
            {d.done && <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2 }}>Download complete</div>}
          </div>
          {d.done && (
            <button onClick={() => onDismiss(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, display: 'flex', borderRadius: 4 }}>
              <Icon name="close" size={11} color="currentColor" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Browser Window ───────────────────────────────────────────────────────────

export default function App() {
  const [tabs, setTabs]           = useState([createTab('about:newtab')]);
  const [activeId, setActiveId]   = useState(tabs[0].id);
  const [showHistory, setShowHistory] = useState(false);
  const [downloads, setDownloads] = useState([]);
  const [isMaximized, setIsMaximized] = useState(false);

  const webviewRefs = useRef({});
  // Track which webviews have had events attached to prevent duplicate listeners
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
    // Clean up refs when closing a tab
    attachedWebviews.current.delete(id);
    delete webviewRefs.current[id];

    setTabs(ts => {
      if (ts.length === 1) {
        const newTab = createTab('about:newtab');
        setActiveId(newTab.id);
        return [newTab];
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

  // ── Navigation helpers ─────────────────────────────────────────────────────
  // KEY FIX: navigate() only calls wv.loadURL() — it does NOT update tab.url state.
  // The URL state is updated ONLY by webview navigation events (did-navigate, etc).
  // This prevents the cycle: navigate → state update → React re-render → webview src change → reload.

  const navigate = useCallback((url, tabId) => {
    const tid = tabId ?? activeId;
    const normalized = normalizeUrl(url);

    // If this is a newtab page being navigated away from, update the url
    // and initialUrl so the webview mounts with the correct src
    setTabs(ts => ts.map(t => {
      if (t.id === tid && (t.url === 'about:newtab' || t.url === 'about:blank')) {
        return { ...t, url: normalized, initialUrl: normalized, loading: true, error: null };
      }
      return t;
    }));

    // If there's already a webview mounted, navigate it programmatically
    const wv = webviewRefs.current[tid];
    if (wv) {
      updateTab(tid, { loading: true, error: null });
      try { wv.loadURL(normalized); } catch (e) { /* ignore load errors */ }
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
    // Remove the webview ref so it unmounts
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

  // ── Electron IPC listeners ─────────────────────────────────────────────────

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.isMaximized().then(setIsMaximized);

    api.on('window-state', state => setIsMaximized(state === 'maximized'));

    api.on('open-new-tab', url => addTab(url));

    api.on('download-progress', ({ filename, received, total }) => {
      setDownloads(ds => {
        const i = ds.findIndex(d => d.filename === filename && !d.done);
        if (i >= 0) {
          const next = [...ds]; next[i] = { ...next[i], received, total };
          return next;
        }
        return [...ds, { filename, received, total, done: false }];
      });
    });

    api.on('download-done', ({ filename, state }) => {
      setDownloads(ds => {
        const i = ds.findIndex(d => d.filename === filename && !d.done);
        if (i >= 0) {
          const next = [...ds]; next[i] = { ...next[i], done: true };
          return next;
        }
        return [...ds, { filename, done: true }];
      });
      setTimeout(() => setDownloads(ds => ds.filter(d => !d.done || d.filename !== filename)), 5000);
    });

    return () => {
      ['window-state','open-new-tab','download-progress','download-done'].forEach(c => api.off(c));
    };
  }, [addTab]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = e => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 't') { e.preventDefault(); addTab(); }
      if (mod && e.key === 'w') { e.preventDefault(); closeTab(activeId); }
      if (mod && e.key === 'r') { e.preventDefault(); reload(); }
      if (mod && e.key === 'l') { e.preventDefault(); /* focus url bar via event */ document.dispatchEvent(new CustomEvent('focus-urlbar')); }
      if (mod && e.shiftKey && e.key === 'H') { e.preventDefault(); goBack(); }
      if (mod && e.shiftKey && e.key === 'L') { e.preventDefault(); goForward(); }
      if (e.altKey && e.key === 'ArrowLeft') goBack();
      if (e.altKey && e.key === 'ArrowRight') goForward();
      // Cycle tabs
      if (mod && e.key === 'Tab') {
        e.preventDefault();
        const idx = tabs.findIndex(t => t.id === activeId);
        const next = e.shiftKey ? (idx - 1 + tabs.length) % tabs.length : (idx + 1) % tabs.length;
        setActiveId(tabs[next].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId, tabs, addTab, closeTab, reload, goBack, goForward]);

  // ── Webview event wiring ───────────────────────────────────────────────────
  // KEY FIX: Events are attached once per webview via the attachedWebviews set.
  // We use closure-based lastUrl/lastTitle tracking to deduplicate events.
  // Navigation events ONLY update the tab's `url` state (for the URL bar display),
  // they do NOT change `initialUrl` or `src`, so no reload occurs.

  const attachWebviewEvents = useCallback((wv, tabId) => {
    if (!wv || attachedWebviews.current.has(tabId)) return;
    attachedWebviews.current.add(tabId);

    // Track URLs to avoid duplicate updates from SPA navigation events
    let lastUrl = '';
    let lastTitle = '';

    wv.addEventListener('did-start-loading', () => updateTab(tabId, { loading: true, error: null }));
    wv.addEventListener('did-stop-loading',  () => updateTab(tabId, { loading: false }));

    wv.addEventListener('did-finish-load', () => {
      const url = wv.getURL();
      updateTab(tabId, {
        url,
        canGoBack: wv.canGoBack(),
        canGoForward: wv.canGoForward(),
        loading: false,
      });
      // Record in history only if URL changed
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
      if (e.title !== lastTitle) {
        lastTitle = e.title;
        updateTab(tabId, { title: e.title });
      }
    });

    wv.addEventListener('page-favicon-updated', e => updateTab(tabId, { favicon: e.favicons?.[0] || null }));

    wv.addEventListener('did-navigate', e => {
      const url = e.url;
      if (url !== lastUrl) {
        lastUrl = url;
      }
      // Always update nav state even if URL didn't change (canGoBack/Forward may have)
      updateTab(tabId, { url, canGoBack: wv.canGoBack(), canGoForward: wv.canGoForward() });
    });

    wv.addEventListener('did-navigate-in-page', e => {
      // SPA navigation — only update if URL actually changed
      if (e.url !== lastUrl) {
        lastUrl = e.url;
        updateTab(tabId, { url: e.url, canGoBack: wv.canGoBack(), canGoForward: wv.canGoForward() });
        // Record SPA navigation in history
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
      // Ignore ERR_ABORTED (-3) which happens when navigation is cancelled (normal for SPAs)
      if (e.errorCode !== -3) {
        updateTab(tabId, { loading: false, error: { code: e.errorCode, desc: e.errorDescription, url: e.validatedURL } });
      }
    });

    wv.addEventListener('new-window', e => addTab(e.url));

    wv.addEventListener('dom-ready', () => {
      // Setup download handling via webContentsId
      const id = wv.getWebContentsId?.();
      if (id) window.electronAPI?.setupWebviewSession(id);
    });
  }, [updateTab, addTab]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ── Titlebar ── */}
      <div
        style={{
          height: 44, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 8px', background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          WebkitAppRegion: 'drag', appRegion: 'drag',
          flexShrink: 0,
        }}
      >
        {/* Window controls (macOS style on the left) */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', WebkitAppRegion: 'no-drag', appRegion: 'no-drag', marginRight: 4 }}>
          <button onClick={() => window.electronAPI?.close()}
            style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#e05555', cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title="Close"
          />
          <button onClick={() => window.electronAPI?.minimize()}
            style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#e8a030', cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title="Minimize"
          />
          <button onClick={() => window.electronAPI?.maximize()}
            style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#5cb87a', cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title={isMaximized ? 'Restore' : 'Maximize'}
          />
        </div>

        {/* Tabs */}
        <div style={{
          flex: 1, display: 'flex', gap: 4, overflow: 'hidden', alignItems: 'center',
          WebkitAppRegion: 'no-drag', appRegion: 'no-drag',
        }}>
          {tabs.map(tab => (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeId}
              onActivate={() => setActiveId(tab.id)}
              onClose={() => closeTab(tab.id)}
            />
          ))}
        </div>

        {/* New tab button */}
        <div style={{ WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }}>
          <TBtn icon="plus" onClick={() => addTab()} title="New tab (⌘T)" size={13} />
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        height: 46, display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 12px', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
        position: 'relative',
      }}>
        {/* Nav buttons */}
        <TBtn icon="back"    onClick={goBack}    disabled={!activeTab.canGoBack}    title="Back (Alt+←)" />
        <TBtn icon="forward" onClick={goForward} disabled={!activeTab.canGoForward} title="Forward (Alt+→)" />
        <TBtn icon="home"    onClick={goHome}    title="New Tab" />

        {/* URL Bar */}
        <UrlBar
          url={activeTab.url}
          loading={activeTab.loading}
          onNavigate={url => navigate(url, activeId)}
          onStop={stop}
          onReload={reload}
        />

        {/* Right controls */}
        <TBtn icon="history" onClick={() => setShowHistory(v => !v)} title="History" active={showHistory} />

        {/* History dropdown */}
        {showHistory && (
          <div style={{ position: 'absolute', top: '100%', right: 12, zIndex: 200 }}>
            <HistoryPanel
              onNavigate={url => navigate(url)}
              onClose={() => setShowHistory(false)}
            />
          </div>
        )}
      </div>

      {/* ── Content area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {tabs.map(tab => (
          <div
            key={tab.id}
            style={{
              position: 'absolute', inset: 0,
              visibility: tab.id === activeId ? 'visible' : 'hidden',
              zIndex: tab.id === activeId ? 1 : 0,
            }}
          >
            {/* New Tab page */}
            {(tab.url === 'about:newtab' || tab.url === 'about:blank') ? (
              <NewTabPage onNavigate={url => navigate(url, tab.id)} />
            ) : tab.error ? (
              // Error page
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
                <button onClick={() => reload()} style={{
                  background: 'var(--amber)', border: 'none', borderRadius: 8, padding: '8px 20px',
                  fontSize: 13, fontWeight: 600, color: '#000', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', transition: 'opacity 0.12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Try again
                </button>
              </div>
            ) : (
              // Webview — use initialUrl as src to prevent re-navigation on re-render
              <webview
                ref={wv => {
                  if (wv && !webviewRefs.current[tab.id]) {
                    webviewRefs.current[tab.id] = wv;
                    attachWebviewEvents(wv, tab.id);
                  }
                  if (!wv) {
                    delete webviewRefs.current[tab.id];
                    // Don't remove from attachedWebviews here — the tab might just be hidden
                  }
                }}
                src={tab.initialUrl}
                partition="persist:obsidian"
                style={{ width: '100%', height: '100%', border: 'none', display: 'flex' }}
                allowpopups="true"
                webpreferences="contextIsolation=yes"
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Status bar ── */}
      <div style={{
        height: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
          {activeTab.loading ? (
            <span style={{ color: 'var(--amber)' }}>Loading...</span>
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
        </div>
      </div>

      {/* ── Download toasts ── */}
      <DownloadToast downloads={downloads} onDismiss={i => setDownloads(ds => ds.filter((_, j) => j !== i))} />

      {/* ── Click-outside to close panels ── */}
      {showHistory && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
