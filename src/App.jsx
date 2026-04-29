import React, { useState, useEffect, useRef, useCallback } from 'react';
import { normalizeUrl, displayUrl, isSecure, getFaviconUrl, Icon, Spinner, Tab, UrlBar, TBtn } from './components.jsx';
import NewTabPage from './NewTabPage.jsx';
import SettingsPage from './SettingsPage.jsx';
import LockScreen from './LockScreen.jsx';
import DownloadsPanel from './DownloadsPanel.jsx';
import NoirGame from './NoirGame.jsx';
import CommandPalette from './CommandPalette.jsx';
import HUDOverlay from './HUDOverlay.jsx';

// ─── Tab factory ──────────────────────────────────────────────────────────────

let tabIdCounter = 1;
function createTab(url = 'about:newtab') {
  let title = 'New Tab';
  if (url === 'about:settings') title = 'Settings';
  if (url === 'about:game') title = 'Obsidian Racer';
  
  return {
    id: tabIdCounter++,
    url,
    initialUrl: url,
    title,
    favicon: null,
    loading: url !== 'about:newtab' && url !== 'about:settings',
    canGoBack: false,
    canGoForward: false,
    error: null,
    hasVideo: false,
    videoTracks: [],
    logs: [],
    pinned: false,
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

// ─── Console Panel ────────────────────────────────────────────────────────────

function ConsolePanel({ height, onResizeStart, logs, onExecute, onClear, onClose }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (endRef.current) {
        endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleSubmit = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      onExecute(input);
      setInput('');
    }
  };

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: height, background: 'var(--bg-base)', borderTop: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 110,
      animation: height === 260 ? 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
    }}>
      {/* Resize Handle */}
      <div 
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          cursor: 'ns-resize', zIndex: 120, background: 'transparent',
          transition: 'background 0.2s',
        }} 
        onMouseEnter={e => e.currentTarget.style.background = 'var(--amber)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      />

      {/* Console Header */}
      <div style={{
        padding: '6px 12px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="search" size={12} color="var(--amber)" />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Console</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onClear} style={{
            background: 'none', border: 'none', padding: '2px 8px', fontSize: 10,
            color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)'
          }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            clear()
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
            <Icon name="close" size={12} color="currentColor" />
          </button>
        </div>
      </div>

      {/* Logs Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', opacity: 0.5, fontStyle: 'italic' }}>No logs recorded.</div>
        ) : logs.map((log, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '4px 0',
            borderBottom: '1px solid rgba(255,255,255,0.02)',
            color: log.type === 'error' ? '#ff6b6b' : log.type === 'warn' ? '#ffd43b' : 'var(--text-secondary)',
            alignItems: 'flex-start'
          }}>
            <span style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0, width: 75 }}>[{log.time}]</span>
            <span style={{ 
                flex: 1, 
                wordBreak: 'break-word', 
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5
            }}>{log.message}</span>
            <span style={{ 
                color: 'var(--text-muted)', 
                opacity: 0.3, 
                fontSize: 10, 
                flexShrink: 0,
                width: 120,
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }} title={`${log.source}:${log.line}`}>{log.source}:{log.line}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '8px 12px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <span style={{ color: 'var(--amber)', fontSize: 14, fontWeight: 'bold' }}>›</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleSubmit}
          placeholder="Execute JavaScript..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)',
          }}
          autoFocus
        />
      </div>
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({ x, y, params, onAction, onClose }) {
  const containerStyle = {
    position: 'absolute', top: y, left: x, zIndex: 11000,
    minWidth: 200, background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)',
    borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
    padding: '6px 0', animation: 'fadeIn 0.1s ease', pointerEvents: 'auto'
  };

  const itemStyle = {
    padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s',
    border: 'none', background: 'none', width: '100%', textAlign: 'left',
  };

  const MenuItem = ({ icon, label, onClick, disabled }) => (
    <button
      onClick={() => { onClick(); onClose(); }}
      disabled={disabled}
      style={{ ...itemStyle, opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'var(--bg-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      <Icon name={icon} size={14} color="currentColor" />
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );

  return (
    <div style={containerStyle} onClick={e => e.stopPropagation()}>
      <MenuItem icon="back" label="Back" onClick={() => onAction('back')} />
      <MenuItem icon="forward" label="Forward" onClick={() => onAction('forward')} />
      <MenuItem icon="reload" label="Reload" onClick={() => onAction('reload')} />
      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
      {params.linkURL && (
        <>
          <MenuItem icon="search" label="Open in New Tab" onClick={() => onAction('new-tab', params.linkURL)} />
          <MenuItem icon="history" label="Copy Link Address" onClick={() => onAction('copy-link', params.linkURL)} />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
        </>
      )}
      {params.selectionText && (
        <MenuItem icon="history" label="Copy Selection" onClick={() => onAction('copy')} />
      )}
      {params.srcURL && (
        <>
          <MenuItem icon="zoom" label="Zoom Image" onClick={() => onAction('zoom-image', params.srcURL)} />
          <MenuItem icon="search" label="Open Image in New Tab" onClick={() => onAction('new-tab', params.srcURL)} />
          <MenuItem icon="download" label="Save Image As..." onClick={() => onAction('download', params.srcURL)} />
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
        </>
      )}

      <MenuItem icon="search" label="Inspect" onClick={() => onAction('inspect', { x: params.x, y: params.y })} />
    </div>
  );
}

// ─── Zoom Overlay ─────────────────────────────────────────────────────────────

function ZoomOverlay({ url, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.2, Math.min(15, z * delta)));
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setPos(p => ({ x: p.x + dx, y: p.y + dy }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div 
      style={{
        position: 'absolute', inset: 0, zIndex: 12000,
        background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
        overflow: 'hidden'
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={onClose}
    >
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 12, zIndex: 10, alignItems: 'center' }}>
         <div style={{ 
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', 
            padding: '6px 16px', borderRadius: 20, fontSize: 11, color: 'var(--text-secondary)', 
            backdropFilter: 'blur(10px)', fontFamily: 'var(--font-mono)',
            transition: 'all 0.3s ease',
            cursor: 'default'
         }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'rgba(232,160,48,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
         >
            {Math.round(zoom * 100)}%
         </div>
         <button onClick={onClose} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
         >
            <Icon name="close" size={18} />
         </button>
      </div>

      <div 
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${zoom})`,
          transition: dragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)',
          cursor: dragging ? 'grabbing' : 'grab',
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <img 
          src={url} 
          style={{ maxWidth: '90vw', maxHeight: '90vh', boxShadow: '0 30px 100px rgba(0,0,0,0.8)', borderRadius: 8, userSelect: 'none' }}
          draggable={false}
          alt="Zoomed"
        />
      </div>
      
      <div style={{ 
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', 
        color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
        pointerEvents: 'none', background: 'rgba(255,255,255,0.03)', padding: '8px 20px', borderRadius: 30,
        border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(5px)'
      }}>
        Scroll to zoom • Drag to pan • Click outside to exit
      </div>
    </div>
  );
}

// ─── Browser Window ───────────────────────────────────────────────────────────

export default function App() {
  const [locked, setLocked]           = useState(true);   // starts locked until auth check
  const [glitch, setGlitch]           = useState(false);
  const [tabs, setTabs]               = useState([createTab('about:newtab')]);
  const [activeId, setActiveId]       = useState(tabs[0].id);

  // Tab glitch effect
  useEffect(() => {
    if (activeId) {
      setGlitch(true);
      const t = setTimeout(() => setGlitch(false), 200);
      return () => clearTimeout(t);
    }
  }, [activeId]);
  const [showHistory, setShowHistory] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [downloads, setDownloads]     = useState([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const hoveredUrlRef                 = useRef(null);
  const [hoverBubble, setHoverBubble] = useState(null); // { url, x, y }
  const [peek, setPeek]               = useState({ show: false, url: '' });
  const [webviewPreload, setWebviewPreload] = useState('');
  const [showTrackMenu, setShowTrackMenu]   = useState(false);
  const [pageAlert, setPageAlert]           = useState(null); // { message, tabId }
  const [pagePrompt, setPagePrompt]         = useState(null); // { message, defaultValue, tabId, resolve }
  const [dialogQueue, setDialogQueue]       = useState([]);   // [{ type, message, defaultValue, tabId, resolve }]
  const [showConsole, setShowConsole]       = useState(false);
  const [consoleHeight, setConsoleHeight]   = useState(260);
  const [isResizing, setIsResizing]         = useState(false);
  const [contextMenu, setContextMenu]       = useState(null); // { x, y, tabId, params, type: 'webview'|'tab' }
  const [dragTabId, setDragTabId]           = useState(null);
  const [promptValue, setPromptValue]       = useState(''); // for controlled prompt input
  const [settings, setSettings]             = useState(null);
  const [zoomImage, setZoomImage]           = useState(null); // URL of image to zoom
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [hudActive, setHudActive]           = useState(false);
  const [torStatus, setTorStatus]           = useState('offline');

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
    console.log('Closing tab:', id);
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

  const togglePin = useCallback((id) => {
    setTabs(ts => {
      const updated = ts.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t);
      const pinned = updated.filter(t => t.pinned);
      const unpinned = updated.filter(t => !t.pinned);
      return [...pinned, ...unpinned];
    });
  }, []);


  const moveTab = useCallback((dragId, hoverId) => {
    setTabs(ts => {
      const dragIdx = ts.findIndex(t => t.id === dragId);
      const hoverIdx = ts.findIndex(t => t.id === hoverId);
      const newTabs = [...ts];
      const [removed] = newTabs.splice(dragIdx, 1);
      newTabs.splice(hoverIdx, 0, removed);
      return newTabs;
    });
  }, []);


  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigate = useCallback((url, tabId) => {
    const tid = tabId ?? activeId;
    const normalized = normalizeUrl(url);
    setTabs(ts => ts.map(t => {
      if (t.id === tid && (t.url === 'about:newtab' || t.url === 'about:blank' || normalized.startsWith('about:'))) {
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

  const openSettings = useCallback(() => {
    const existing = tabs.find(t => t.url === 'about:settings');
    if (existing) {
      setActiveId(existing.id);
    } else {
      addTab('about:settings');
    }
  }, [tabs, addTab]);

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
    if (hoveredUrlRef.current) {
      setPeek({ show: true, url: hoveredUrlRef.current });
      setHoverBubble(null);
    }
  }, []);

  // ── Electron IPC listeners ─────────────────────────────────────────────────

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.getWebviewPreloadPath().then(setWebviewPreload);
    api.settingsGet().then(setSettings);
    api.isMaximized().then(setIsMaximized);
    api.on('window-state', state => setIsMaximized(state === 'maximized'));
    api.on('open-new-tab', url => addTab(url));
    api.on('settings-updated', s => setSettings(s));
    api.on('tor-status', info => setTorStatus(info.status));
    api.torStatusGet().then(info => setTorStatus(info.status));

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
      console.log('[DEBUG] Shortcut received from main:', action);
      handleShortcutAction(action);
    });

    api.on('page-dialog-request', ({ type, message, defaultValue, id }) => {
      setDialogQueue(q => [...q, { type, message, defaultValue, tabId: activeId, resolve: (val) => {
         // This is a bridge for main process triggered dialogs
      }}]);
    });

    return () => {
      ['window-state', 'open-new-tab', 'download-progress', 'download-done', 'browser-shortcut', 'page-dialog-request', 'settings-updated'].forEach(c => api.off(c));
    };
  }, [addTab, activeId, closeTab, reload, goBack, goForward, triggerPeek, openFile, loadSubtitles]);

  const handleShortcutAction = useCallback((action) => {
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
      case 'command-palette': {
        if (settings?.coolFeatures?.commandPalette) setCommandPaletteOpen(v => !v);
        break;
      }
      case 'toggle-hud': {
        if (settings?.coolFeatures?.holographicHUD) setHudActive(v => !v);
        break;
      }
      case 'peek-link':       triggerPeek(); break;
      case 'open-file':       openFile(); break;
      case 'load-subtitles':  loadSubtitles(activeId); break;
      case 'toggle-console':  setShowConsole(v => !v); setContextMenu(null); break;
      case 'toggle-devtools': {
        const wv = webviewRefs.current[activeId];
        if (wv) wv.openDevTools();
        break;
      }
      case 'new-window': {
        window.electronAPI?.newWindow();
        break;
      }
    }
  }, [addTab, activeId, closeTab, reload, goBack, goForward, triggerPeek, openFile, loadSubtitles]);


  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    if (locked) return;
    const handler = e => {
      const ctrl  = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt   = e.altKey;
      const key   = e.key.toLowerCase();

      if (!settings?.shortcuts) return;

      for (const [action, combo] of Object.entries(settings.shortcuts)) {
        if (key === combo.key.toLowerCase() && 
            ctrl === !!combo.ctrl && 
            shift === !!combo.shift && 
            alt === !!combo.alt) {
          e.preventDefault();
          handleShortcutAction(action);
          return;
        }
      }
    };
    const clickHandler = (e) => {
      // Don't clear if clicking the bubble or context menu
      if (e.target.closest('.hover-bubble-btn')) return;
      setHoverBubble(null);
      setContextMenu(null);
    };
    window.addEventListener('keydown', handler);
    window.addEventListener('mousedown', clickHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('mousedown', clickHandler);
    }
  }, [locked, activeId, tabs, addTab, closeTab, reload, goBack, goForward, triggerPeek, openFile, loadSubtitles]);

  // Handle the dialog queue
  useEffect(() => {
    if (pageAlert || pagePrompt || dialogQueue.length === 0) return;
    
    const next = dialogQueue[0];
    setDialogQueue(q => q.slice(1));

    if (next.type === 'alert') {
      setPageAlert({ 
        message: next.message, 
        tabId: next.tabId, 
        resolve: () => { setPageAlert(null); if (next.resolve) next.resolve(); }
      });
    } else {
      setPromptValue(next.defaultValue || '');
      setPagePrompt({ 
        message: next.message, 
        defaultValue: next.defaultValue, 
        tabId: next.tabId, 
        resolve: (val) => { setPagePrompt(null); if (next.resolve) next.resolve(val); }
      });
    }
  }, [pageAlert, pagePrompt, dialogQueue]);

  // Handle console resizing
  useEffect(() => {
    if (!isResizing) return;
    const move = (e) => {
      const newHeight = window.innerHeight - e.clientY;
      setConsoleHeight(Math.max(100, Math.min(window.innerHeight * 0.8, newHeight)));
    };
    const up = () => setIsResizing(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isResizing]);

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
        hoveredUrlRef.current = e.args[0];
      } else if (e.channel === 'hover-link-bubble') {
        // Only show if we're not already peeking
        if (!peek.show) setHoverBubble(e.args[0]);
      } else if (e.channel === 'zoom-image-request') {
        setZoomImage(e.args[0]);
      } else if (e.channel === 'page-alert') {
        const msg = String(e.args[0]);
        if (msg.startsWith('PROMPT:')) {
           const parts = msg.replace('PROMPT:', '').split('|||');
           setDialogQueue(q => [...q, { type: 'prompt', message: parts[0], defaultValue: parts[1] || '', tabId, resolve: (val) => {
             // Sync-like resolution would notify bridge here
           }}]);
        } else {
           setDialogQueue(q => [...q, { type: 'alert', message: msg, tabId }]);
        }
      } else if (e.channel === 'page-prompt') {
        setDialogQueue(q => [...q, { type: 'prompt', message: e.args[0], defaultValue: e.args[1], tabId, resolve: (val) => {
           // Sync-like resolution
        }}]);
      }
    });

    wv.addEventListener('context-menu', (e) => {
      e.preventDefault();
      setContextMenu({ x: e.params.x, y: e.params.y, tabId, params: e.params });
    });

    wv.addEventListener('console-message', e => {
      const type = ['log', 'info', 'warn', 'error'][e.level] || 'log';
      const log = {
        type,
        message: e.message,
        source: e.sourceId?.split('/').pop() || 'vm',
        line: e.line,
        time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setTabs(ts => ts.map(t => t.id === tabId ? { ...t, logs: [...(t.logs || []), log].slice(-500) } : t));
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

          <button onClick={() => window.electronAPI?.maximize()}
            style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#5cb87a', cursor: 'pointer', transition: 'opacity 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            title={isMaximized ? 'Restore' : 'Maximize'} />
        </div>

        {/* Tabs container - no-drag because we want clicks to work */}
        <div 
          style={{ display: 'flex', gap: 4, overflow: 'hidden', alignItems: 'center', WebkitAppRegion: 'no-drag', appRegion: 'no-drag' }}
          onDragOver={e => e.preventDefault()}
        >
          {tabs.map(tab => (
            <Tab 
              key={tab.id} 
              tab={tab} 
              isActive={tab.id === activeId}
              onActivate={() => setActiveId(tab.id)}
              onClose={() => closeTab(tab.id)}
              onPin={() => togglePin(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, tabId: tab.id, type: 'tab', pinned: tab.pinned });
              }}
              onDragStart={() => setDragTabId(tab.id)}
              onDragEnter={() => {
                if (dragTabId && dragTabId !== tab.id) moveTab(dragTabId, tab.id);
              }}
              onDragEnd={() => setDragTabId(null)}
            />
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
          settings={settings}
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
        {/* Settings button */}
        <TBtn
          icon="settings"
          onClick={openSettings}
          title="Settings"
          active={activeTab.url === 'about:settings'}
        />
        {/* Lock button */}
        <TBtn
          icon="lock"
          onClick={() => setLocked(true)}
          title="Lock browser"
        />
      </div>

      {/* ── Content area (browser + optional right panel) ── */}
      <div className={glitch ? 'tab-glitch' : ''} style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>

        {/* Webview area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {tabs.map(tab => (
            <div key={tab.id} style={{
              position: 'absolute', inset: 0,
              visibility: tab.id === activeId ? 'visible' : 'hidden',
              zIndex: tab.id === activeId ? 1 : 0,
              animation: (settings?.coolFeatures?.glitchTransitions && tab.id === activeId) ? 'pulse 0.1s steps(2)' : 'none'
            }}>
              {tab.url === 'about:settings' ? (
                <SettingsPage />
              ) : tab.url === 'about:game' ? (
                <NoirGame onExit={() => goHome()} />
              ) : (tab.url === 'about:newtab' || tab.url === 'about:blank') ? (
                <NewTabPage onNavigate={url => navigate(url, tab.id)} settings={settings} />
              ) : (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  {tab.error && (
                    <div style={{
                      position: 'absolute', inset: 0, zIndex: 10,
                      display: 'flex', flexDirection: 'column',
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
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={reload} style={{
                          background: 'var(--amber)', border: 'none', borderRadius: 8, padding: '8px 20px',
                          fontSize: 13, fontWeight: 600, color: '#000', cursor: 'pointer',
                          fontFamily: 'var(--font-ui)', transition: 'opacity 0.12s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >Try again</button>
                        <button onClick={() => navigate('about:game', tab.id)} style={{
                          background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 20px',
                          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                          fontFamily: 'var(--font-ui)', transition: 'all 0.12s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                        >Play Obsidian Racer</button>
                      </div>
                    </div>
                  )}
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
                    style={{ width: '100%', height: '100%', border: 'none', display: tab.error ? 'none' : 'flex', background: '#fff' }}
                    allowpopups="true"
                    webpreferences="contextIsolation=yes"
                  />
                </div>
              )}

              {/* HUD nested inside the active tab container */}
              {tab.id === activeId && (
                <HUDOverlay 
                  active={hudActive} 
                  settings={settings}
                  tabCount={tabs.length}
                  torStatus={torStatus}
                  opacity={settings?.coolFeatures?.hudOpacity ?? 0.8}
                  activeUrl={tab.url}
                />
              )}
            </div>
          ))}

          {/* Integrated Console Panel */}
          {showConsole && (
            <ConsolePanel
              height={consoleHeight}
              onResizeStart={() => setIsResizing(true)}
              logs={activeTab.logs || []}
              onExecute={code => {
                const wv = webviewRefs.current[activeId];
                if (wv) wv.executeJavaScript(code);
                // Also add to console logs locally to show it was sent
                setTabs(ts => ts.map(t => t.id === activeId ? { ...t, logs: [...(t.logs || []), { type: 'info', message: '> ' + code, source: 'shell', time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) }] } : t));
              }}
              onClear={() => setTabs(ts => ts.map(t => t.id === activeId ? { ...t, logs: [] } : t))}
              onClose={() => setShowConsole(false)}
            />
          )}
        </div>

        {/* ── Peek Overlay ── */}
        {peek.show && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease forwards',
          }} onClick={() => setPeek({ show: false, url: '' })}>
            <div style={{
              width: '85%', height: '80%', background: '#0a0a0b',
              borderRadius: 16, border: '1px solid var(--border-hover)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              animation: 'peekIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
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
            style={{ position: 'absolute', inset: 0, zIndex: 40 }}
            onClick={closeAllPanels}
          />
        )}

        {/* ── Hover Preview Bubble ── */}
        {hoverBubble && !peek.show && (
          <button
            className="hover-bubble-btn"
            onMouseDown={e => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setPeek({ show: true, url: hoverBubble.url });
              setHoverBubble(null);
            }}
            style={{
              position: 'absolute',
              left: hoverBubble.x - 16,
              top: hoverBubble.y - 16,
              zIndex: 9999,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--amber)',
              border: '2px solid rgba(0,0,0,0.3)',
              boxShadow: '0 4px 15px rgba(0,0,0,0.4), 0 0 0 1px rgba(232,160,48,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              animation: 'dotScale 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transition: 'transform 0.15s, background 0.15s',
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.background = '#f1b34d';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'var(--amber)';
            }}
            title="Preview link"
          >
            <Icon name="eye" size={14} color="#000" />
            <div style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: '1px solid var(--amber)',
              animation: 'pulse 2s infinite',
            }} />
          </button>
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
          {settings?.darkWebMode && (
            <span style={{ 
              fontSize: 9, color: '#a855f7', letterSpacing: 1, textTransform: 'uppercase', 
              fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', animation: 'pulsePurple 2s infinite' }} />
              Onion Active
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
        {/* ── Custom Modals (Alert & Prompt) ── */}
        
        {pageAlert && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
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

        {pagePrompt && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease',
          }} onClick={() => pagePrompt.resolve(null)}>
            <div style={{
              width: 440, background: 'var(--bg-elevated)', borderRadius: 16,
              border: '1px solid var(--border-hover)', boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              padding: 28, display: 'flex', flexDirection: 'column', gap: 20,
              animation: 'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(232, 160, 48, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)'
                }}>
                  <Icon name="search" size={18} color="currentColor" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.5 }}>User Input Required</span>
              </div>
              
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                {pagePrompt.message}
              </div>

              <input 
                autoFocus
                value={promptValue}
                onChange={e => setPromptValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') pagePrompt.resolve(promptValue);
                  if (e.key === 'Escape') pagePrompt.resolve(null);
                }}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '12px 16px', color: 'var(--text-primary)',
                  fontSize: 14, outline: 'none', fontFamily: 'var(--font-ui)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
                }}
              />

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => pagePrompt.resolve(null)} style={{
                  padding: '8px 20px', background: 'none', color: 'var(--text-muted)',
                  border: '1px solid var(--border)', borderRadius: 8, fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
                >Cancel</button>
                 <button onClick={() => pagePrompt.resolve(promptValue)} 
                style={{
                  padding: '8px 32px', background: 'var(--amber)', color: '#000',
                  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >OK</button>
              </div>
            </div>
          </div>
        )}

        {contextMenu && (
          <div 
            style={{
              position: 'absolute', top: contextMenu.y, left: contextMenu.x, zIndex: 11000,
              minWidth: 180, background: 'var(--bg-elevated)', border: '1px solid var(--border-hover)',
              borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
              padding: '6px 0', animation: 'fadeIn 0.1s ease', pointerEvents: 'auto'
            }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >

            {contextMenu.type === 'tab' ? (
              <>
                <button 
                  onClick={() => { togglePin(contextMenu.tabId); setContextMenu(null); }}
                  style={{
                    padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s',
                    border: 'none', background: 'none', width: '100%', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Icon name="lock" size={14} color="currentColor" />
                  <span style={{ flex: 1 }}>{contextMenu.pinned ? 'Unpin Tab' : 'Pin Tab'}</span>
                </button>
                <button 
                  onClick={() => { closeTab(contextMenu.tabId); setContextMenu(null); }}
                  style={{
                    padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.1s',
                    border: 'none', background: 'none', width: '100%', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Icon name="close" size={14} color="currentColor" />
                  <span style={{ flex: 1 }}>Close Tab</span>
                </button>
              </>
            ) : (
              <ContextMenu
                x={0} y={0} // Position is handled by parent
                params={contextMenu.params}
                onClose={() => setContextMenu(null)}
                onAction={(action, data) => {
                  const wv = webviewRefs.current[activeId];
                  console.log('Context menu action:', action, 'Active WV:', !!wv, 'Target Data:', data);
                  if (!wv) return;
                  switch (action) {
                    case 'back':    wv.goBack(); break;
                    case 'forward': wv.goForward(); break;
                    case 'reload':  wv.reload(); break;
                    case 'new-tab': addTab(data); break;
                    case 'copy':    wv.copy(); break;
                    case 'copy-link': navigator.clipboard.writeText(data); break;
                    case 'download': window.electronAPI?.downloadURL(data); break;
                    case 'zoom-image': setZoomImage(data); break;
                    case 'inspect': wv.inspectElement(data.x, data.y); break;
                  }

                }}
              />
            )}
          </div>
        )}

        {/* ── Zoom Image Overlay ── */}
        {zoomImage && (
          <ZoomOverlay url={zoomImage} onClose={() => setZoomImage(null)} />
        )}

        <CommandPalette 
          isOpen={commandPaletteOpen} 
          onClose={() => setCommandPaletteOpen(false)}
          onAction={(action, data) => {
            if (action === 'switch-tab') setActiveId(data);
            else if (action === 'new-tab') addTab(data);
            else handleShortcutAction(action);
          }}
          tabs={tabs}
          currentTabId={activeId}
        />
      </div>
    </div>
  );
}

