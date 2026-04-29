import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './components.jsx';

export default function CommandPalette({ isOpen, onClose, onAction, tabs, currentTabId }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = [
    { id: 'new-tab', label: 'New Tab', icon: 'search', action: () => onAction('new-tab') },
    { id: 'history', label: 'Show History', icon: 'history', action: () => onAction('toggle-history') },
    { id: 'downloads', label: 'Show Downloads', icon: 'download', action: () => onAction('toggle-downloads') },
    { id: 'settings', label: 'Open Settings', icon: 'globe', action: () => onAction('new-tab', 'about:settings') },
    { id: 'game', label: 'Play Obsidian Defender', icon: 'zoom', action: () => onAction('new-tab', 'about:game') },
    { id: 'lock', label: 'Lock Browser', icon: 'lock', action: () => onAction('lock-browser') },
  ];

  const filteredTabs = tabs.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.url.toLowerCase().includes(query.toLowerCase())
  ).map(t => ({
    id: `tab-${t.id}`,
    label: t.title || t.url,
    sublabel: t.url,
    icon: 'globe',
    action: () => onAction('switch-tab', t.id)
  }));

  const filteredCommands = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const results = [...filteredCommands, ...filteredTabs];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 20000,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '15vh', animation: 'fadeIn 0.2s ease',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 600, background: 'var(--bg-elevated)',
        borderRadius: 16, border: '1px solid var(--border-hover)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        overflow: 'hidden', animation: 'modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }} onClick={e => e.stopPropagation()}>
        
        {/* Search Input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <Icon name="search" size={18} color="var(--amber)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or tab name..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 16, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)',
            }}
          />
          <div style={{
            fontSize: 10, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)',
            padding: '4px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)',
          }}>ESC</div>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px 0' }}>
          {results.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No results found for "{query}"
            </div>
          ) : results.map((item, i) => {
            const isSelected = i === selectedIndex;
            return (
              <div
                key={item.id || item.label}
                onClick={() => { item.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
                style={{
                  padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  background: isSelected ? 'rgba(232, 160, 48, 0.15)' : 'none',
                  cursor: 'pointer', transition: 'background 0.1s',
                  borderLeft: `3px solid ${isSelected ? 'var(--amber)' : 'transparent'}`,
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: isSelected ? 'var(--amber)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.1s',
                }}>
                  <Icon name={item.icon} size={14} color={isSelected ? '#000' : 'var(--text-secondary)'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  {item.sublabel && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.sublabel}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div style={{ fontSize: 18, color: 'var(--amber)', fontWeight: 'bold' }}>↵</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 20, fontSize: 10, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 2 }}>↑↓</span> Navigate
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 2 }}>Enter</span> Select
          </div>
        </div>
      </div>
    </div>
  );
}
