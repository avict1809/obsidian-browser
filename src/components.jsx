import React, { useState, useEffect, useRef, useCallback, useId } from 'react';

// ─── URL Utilities ────────────────────────────────────────────────────────────

function normalizeUrl(input) {
  const s = input.trim();
  if (!s) return 'about:blank';
  // Already has protocol
  if (/^(https?|file|about|data):/.test(s)) return s;
  // Looks like a domain (has dot, no spaces)
  if (!s.includes(' ') && (s.includes('.') || s.startsWith('localhost'))) {
    return 'https://' + s;
  }
  // Treat as search query
  return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
}

function displayUrl(url) {
  if (!url || url === 'about:blank' || url === 'about:newtab') return '';
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '') + u.search;
  } catch { return url; }
}

function isSecure(url) {
  return url?.startsWith('https://');
}

function getFaviconUrl(url) {
  if (!url || url.startsWith('about:')) return null;
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch { return null; }
}

// ─── Quick Sites (New Tab) ────────────────────────────────────────────────────

const QUICK_SITES = [
  { name: 'Google',    url: 'https://www.google.com',    color: '#4285f4' },
  { name: 'GitHub',    url: 'https://github.com',        color: '#f0f6ff' },
  { name: 'YouTube',   url: 'https://www.youtube.com',   color: '#ff0000' },
  { name: 'X / Twitter', url: 'https://x.com',          color: '#1d9bf0' },
  { name: 'Ahmia',     url: 'https://ahmia.fi',          color: '#ffffff' },
  { name: 'Reddit',    url: 'https://www.reddit.com',    color: '#ff4500' },
  { name: 'ChatGPT',   url: 'https://chatgpt.com',       color: '#10a37f' },
  { name: 'Gmail',     url: 'https://mail.google.com',   color: '#ea4335' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org',  color: '#ffffff' },
  { name: 'Claude',    url: 'https://claude.ai',         color: '#d97706' },
];

// ─── Icons (inline SVG to avoid external deps) ───────────────────────────────

const Icon = ({ name, size = 14, color = 'currentColor', style = {} }) => {
  const s = { width: size, height: size, display: 'inline-block', flexShrink: 0, ...style };
  const paths = {
    back:    <path d="M15 8H3m0 0 5-5M3 8l5 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    forward: <path d="M9 8h12m0 0-5-5m5 5-5 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    reload:  <path d="M4 4a8 8 0 0 1 13.5 3M20 4v4h-4M20 20a8 8 0 0 1-13.5-3M4 20v-4h4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    stop:    <path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>,
    home:    <><path d="M3 12 12 3l9 9" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    plus:    <path d="M12 4v16M4 12h16" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>,
    close:   <path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>,
    lock:    <><rect x="5" y="11" width="14" height="10" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    globe:   <><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 3c-2 3-3 5.5-3 9s1 6 3 9M12 3c2 3 3 5.5 3 9s-1 6-3 9M3 12h18" stroke={color} strokeWidth="1.5" fill="none"/></>,
    search:  <><circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.6" fill="none"/><path d="m21 21-4.35-4.35" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    history: <><circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 7v5l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    settings:<><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    min:     <path d="M5 12h14" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>,
    max:     <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="1.5" fill="none"/>,
    x:       <path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>,
    download:<><path d="M12 3v12m0 0-4-4m4 4 4-4" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    trash:   <><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
    subtitles:<><rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth="1.6" fill="none"/><path d="M7 15h3M14 15h3M7 11h10" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/></>,
    eye:      <><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" fill="none"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
    pin:      <path d="M12 2v8m0 0 4 4m-4-4-4 4m4 8v-8M5 10h14" stroke={color} strokeWidth="1.6" strokeLinecap="round" fill="none"/>,
    zoom:     <><circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.5" fill="none"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" style={s} aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
};

// ─── Loading Spinner ──────────────────────────────────────────────────────────

function Spinner({ size = 14, color = 'var(--amber)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="15" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Tab Component ────────────────────────────────────────────────────────────

function Tab({ tab, isActive, onActivate, onClose, onPin, onContextMenu, onDragStart, onDragEnter, onDragEnd }) {
  const isPinned = tab.pinned;
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onClick={onActivate}
      onContextMenu={onContextMenu}
      draggable={!isPinned}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: isPinned ? 0 : 7,
        padding: isPinned ? '0' : '0 10px', height: 36,
        maxWidth: isPinned ? 44 : 220, 
        minWidth: isPinned ? 44 : 120, 
        flex: isPinned ? '0 0 auto' : '1 1 0',
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        border: '1px solid',
        borderColor: isActive ? 'var(--border-hover)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
        justifyContent: isPinned ? 'center' : 'flex-start',
      }}
      onMouseEnter={() => { setIsHovered(true); if (!isActive) {} }}
      onMouseLeave={() => { setIsHovered(false); if (!isActive) {} }}
    >
      {/* Favicon or spinner */}
      <div style={{ width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {tab.loading ? (
          <Spinner size={13} />
        ) : tab.favicon ? (
          <img src={tab.favicon} width={13} height={13} style={{ objectFit: 'contain', borderRadius: 2, opacity: (isPinned && isHovered) ? 0.2 : 1 }}
            onError={e => e.target.style.display = 'none'} alt="" />
        ) : (
          <Icon name="globe" size={13} color="var(--text-muted)" style={{ opacity: (isPinned && isHovered) ? 0.2 : 1 }} />
        )}
        
        {isPinned && isHovered && (
          <button onClick={(e) => { e.stopPropagation(); onPin(); }} style={{ position: 'absolute', inset: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <Icon name="pin" size={10} color="var(--amber)" />
          </button>
        )}
      </div>

      {/* Title (Hidden if pinned) */}
      {!isPinned && (
        <span style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontSize: 12, fontWeight: isActive ? 500 : 400,
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          transition: 'color 0.15s',
        }}>
          {tab.title || 'New Tab'}
        </span>
      )}

      {/* Action Buttons (Hidden if pinned) */}
      {!isPinned && isHovered && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            onClick={e => { e.stopPropagation(); onPin(); }}
            style={{
              width: 18, height: 18, borderRadius: 4, border: 'none', background: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, padding: 0,
              color: 'var(--text-muted)', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--amber)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="Pin Tab"
          >
            <Icon name="pin" size={10} color="currentColor" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            style={{
              width: 18, height: 18, borderRadius: 4, border: 'none', background: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, padding: 0,
              color: 'var(--text-muted)', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="Close Tab"
          >
            <Icon name="close" size={10} color="currentColor" />
          </button>
        </div>
      )}

      {/* Pin indicator dot */}
      {isPinned && !isHovered && (
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
          width: 4, height: 4, borderRadius: '50%', background: isActive ? 'var(--amber)' : 'var(--text-muted)',
          opacity: isActive ? 1 : 0.5
        }} />
      )}
    </div>
  );
}



// ─── URL Bar ──────────────────────────────────────────────────────────────────

function UrlBar({ url, loading, onNavigate, onStop, onReload }) {
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState('');
  const inputRef = useRef(null);
  const secure = isSecure(url);
  const display = displayUrl(url);

  const startEdit = () => {
    setValue(url && url !== 'about:blank' && url !== 'about:newtab' ? url : '');
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 10);
  };

  useEffect(() => {
    const handler = () => startEdit();
    document.addEventListener('focus-urlbar', handler);
    return () => document.removeEventListener('focus-urlbar', handler);
  }, [url]);

  const commit = () => {
    setEditing(false);
    if (value.trim()) onNavigate(normalizeUrl(value));
  };

  return (
    <div style={{
      flex: 1, height: 34, display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--bg-base)', border: '1px solid',
      borderColor: editing ? 'var(--border-focus)' : 'var(--border)',
      borderRadius: 'var(--radius-md)', padding: '0 12px',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      boxShadow: editing ? '0 0 0 3px rgba(232,160,48,0.08)' : 'none',
    }}>
      {/* Security icon */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {editing ? (
          <Icon name="search" size={13} color="var(--text-muted)" />
        ) : secure ? (
          <Icon name="lock" size={13} color="var(--amber)" />
        ) : url && url !== 'about:blank' ? (
          <Icon name="globe" size={13} color="var(--text-muted)" />
        ) : (
          <Icon name="search" size={13} color="var(--text-muted)" />
        )}
      </div>

      {/* Input or display */}
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { setEditing(false); }
          }}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)',
            caretColor: 'var(--amber)',
          }}
          placeholder="Search or enter a URL"
          autoFocus
          spellCheck={false}
        />
      ) : (
        <div
          onClick={startEdit}
          style={{
            flex: 1, cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', fontSize: 13, fontFamily: 'var(--font-mono)',
            color: display ? 'var(--text-secondary)' : 'var(--text-muted)',
          }}
        >
          {display || 'Search or enter a URL'}
        </div>
      )}

      {/* Stop/reload button */}
      <button
        onClick={loading ? onStop : onReload}
        style={{
          flexShrink: 0, width: 22, height: 22, borderRadius: 5, border: 'none',
          background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        title={loading ? 'Stop' : 'Reload'}
      >
        {loading ? <Spinner size={13} /> : <Icon name="reload" size={13} color="currentColor" />}
      </button>
    </div>
  );
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function TBtn({ icon, onClick, disabled, title, active, size = 14 }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: 'none',
        background: active ? 'var(--amber-dim)' : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
        color: disabled ? 'var(--text-muted)' : active ? 'var(--amber)' : 'var(--text-secondary)',
        transition: 'all 0.12s', opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = active ? 'var(--amber-dim)' : 'var(--bg-hover)'; e.currentTarget.style.color = active ? 'var(--amber)' : 'var(--text-primary)'; }}}
      onMouseLeave={e => { e.currentTarget.style.background = active ? 'var(--amber-dim)' : 'none'; e.currentTarget.style.color = disabled ? 'var(--text-muted)' : active ? 'var(--amber)' : 'var(--text-secondary)'; }}
    >
      <Icon name={icon} size={size} color="currentColor" />
    </button>
  );
}

export { normalizeUrl, displayUrl, isSecure, getFaviconUrl, QUICK_SITES, Icon, Spinner, Tab, UrlBar, TBtn };
