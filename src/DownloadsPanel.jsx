import React from 'react';
import { Icon } from './components.jsx';

function formatBytes(b) {
  if (!b || b === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DownloadsPanel({ downloads, onDismiss, onClear, onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: 340,
      background: 'var(--bg-elevated)',
      borderLeft: '1px solid var(--border-hover)',
      display: 'flex', flexDirection: 'column',
      zIndex: 50,
      animation: 'slideInRight 0.2s ease',
      boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="download" size={14} color="var(--amber)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            Downloads
          </span>
          {downloads.length > 0 && (
            <span style={{
              fontSize: 10, background: 'var(--amber-dim)', color: 'var(--amber)',
              borderRadius: 20, padding: '1px 7px', fontFamily: 'var(--font-mono)',
            }}>
              {downloads.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {downloads.length > 0 && (
            <button
              onClick={onClear}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 6, padding: '3px 10px', fontSize: 11,
                color: 'var(--text-secondary)', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,85,85,0.1)'; e.currentTarget.style.color = 'var(--red)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 4, display: 'flex',
            }}
          >
            <Icon name="close" size={13} color="currentColor" />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {downloads.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', gap: 12,
          }}>
            <Icon name="download" size={32} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No downloads yet</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', textAlign: 'center', maxWidth: 200, lineHeight: 1.6 }}>
              Files you download will appear here
            </span>
          </div>
        ) : (
          downloads.map((d, i) => (
            <div key={i} style={{
              borderRadius: 10, padding: '11px 13px', marginBottom: 6,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'flex-start', gap: 11,
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: d.done
                  ? 'rgba(92,184,122,0.1)'
                  : d.error
                    ? 'rgba(224,85,85,0.1)'
                    : 'rgba(232,160,48,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon
                  name="download"
                  size={16}
                  color={d.done ? 'var(--green)' : d.error ? 'var(--red)' : 'var(--amber)'}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 4,
                }}>
                  {d.filename}
                </div>

                {/* Progress bar */}
                {!d.done && !d.error && d.total > 0 && (
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 4 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${Math.round((d.received / d.total) * 100)}%`,
                      background: 'linear-gradient(90deg, var(--amber), #f0c060)',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                )}

                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'flex', gap: 8 }}>
                  {d.done ? (
                    <span style={{ color: 'var(--green)' }}>✓ Complete</span>
                  ) : d.error ? (
                    <span style={{ color: 'var(--red)' }}>✕ Failed</span>
                  ) : (
                    <>
                      <span>{formatBytes(d.received)}</span>
                      {d.total > 0 && <span>/ {formatBytes(d.total)}</span>}
                      {d.total > 0 && <span>{Math.round((d.received / d.total) * 100)}%</span>}
                    </>
                  )}
                </div>
                {d.done && d.savePath && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.savePath}
                  </div>
                )}
              </div>

              {/* Dismiss */}
              <button
                onClick={() => onDismiss(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 2, borderRadius: 4,
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Icon name="close" size={11} color="currentColor" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'rgba(255,255,255,0.18)',
        fontFamily: 'var(--font-mono)',
        flexShrink: 0,
      }}>
        Ctrl+J to toggle · downloads saved to system folder
      </div>
    </div>
  );
}
