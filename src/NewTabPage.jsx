import React, { useState, useEffect } from 'react';
import { normalizeUrl, QUICK_SITES, Icon } from './components.jsx';
import Starfield from './Starfield.jsx';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getDate() {
  return new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function NewTabPage({ onNavigate, settings }) {
  const [query, setQuery]   = useState('');
  const [time,  setTime]    = useState(getTime());
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setTime(getTime()), 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    window.electronAPI?.historyGet().then(h => setHistory((h || []).slice(0, 6)));
  }, []);

  const submit = () => {
    if (query.trim()) onNavigate(normalizeUrl(query, settings?.defaultSearchEngine));
  };

  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 40, padding: 40, overflowY: 'auto',
      animation: 'fadeIn 0.3s ease',
      position: 'relative'
    }}>
      {settings?.coolFeatures?.starfield && <Starfield />}
      {/* Clock + greeting */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, fontWeight: 300, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: -2, lineHeight: 1 }}>
          {time}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, letterSpacing: 0.5 }}>
          {getDate()}
        </div>
        <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
          {getGreeting()}
        </div>
      </div>

      {/* Search bar */}
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '10px 16px',
          transition: 'all 0.15s',
        }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--amber-glow)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Icon name="search" size={16} color="var(--text-muted)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Search the web or enter a URL"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
              caretColor: 'var(--amber)',
            }}
            autoFocus
            spellCheck={false}
          />
          {query && (
            <button onClick={submit} style={{
              background: 'var(--amber)', border: 'none', borderRadius: 6,
              padding: '4px 12px', cursor: 'pointer', fontSize: 12,
              fontWeight: 600, color: '#000', fontFamily: 'var(--font-ui)',
              transition: 'opacity 0.12s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Go
            </button>
          )}
        </div>
      </div>

      {/* Quick sites grid */}
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 2 }}>
          Quick access
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {QUICK_SITES.map(site => (
            <button key={site.url} onClick={() => onNavigate(site.url)} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '14px 8px',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=32`}
                width={20} height={20} style={{ objectFit: 'contain', borderRadius: 4 }}
                onError={e => e.target.style.display = 'none'}
                alt=""
              />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-ui)' }}>
                {site.name}
              </span>
            </button>
          ))}

          {/* Internal Game Link - MATCHING OTHER BUTTONS */}
          <button onClick={() => onNavigate('about:game')} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px 8px',
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 8, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', borderRadius: 4 }}>
              <Icon name="zoom" size={13} color="var(--text-muted)" />
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.2, fontFamily: 'var(--font-ui)' }}>
              Obsidian Defender
            </span>
          </button>
        </div>
      </div>

      {/* Recent history */}
      {history.length > 0 && (
        <div style={{ width: '100%', maxWidth: 640 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, paddingLeft: 2 }}>
            Recent
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {history.map((item, i) => (
              <button key={i} onClick={() => onNavigate(item.url)} style={{
                background: 'none', border: 'none', borderRadius: 8, padding: '7px 10px',
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <img
                  src={`https://www.google.com/s2/favicons?domain=${(() => { try { return new URL(item.url).hostname; } catch { return ''; } })()}&sz=32`}
                  width={14} height={14} style={{ objectFit: 'contain', borderRadius: 2, flexShrink: 0 }}
                  onError={e => e.target.style.display = 'none'}
                  alt=""
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {item.title || item.url}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                  {item.domain}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
