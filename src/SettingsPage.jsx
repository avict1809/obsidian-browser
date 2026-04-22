import React, { useState, useEffect } from 'react';
import { Icon, TBtn } from './components.jsx';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [recording, setRecording] = useState(null); // { action, combo }

  useEffect(() => {
    window.electronAPI?.settingsGet().then(setSettings);
  }, []);

  const updateSettings = (patch) => {
    const newSettings = { ...settings, ...patch };
    setSettings(newSettings);
    window.electronAPI?.settingsSet(newSettings);
  };

  const resetSettings = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      const defaults = await window.electronAPI?.settingsReset();
      setSettings(defaults);
    }
  };

  const handleRecord = (action) => {
    setRecording({ action, combo: { key: '', ctrl: false, shift: false, alt: false } });
  };

  useEffect(() => {
    if (!recording) return;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const key = e.key.toLowerCase();
      if (['control', 'shift', 'alt', 'meta'].includes(key)) return;

      const newCombo = {
        key: key,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
        alt: e.altKey
      };

      const newShortcuts = { ...settings.shortcuts, [recording.action]: newCombo };
      updateSettings({ shortcuts: newShortcuts });
      setRecording(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [recording, settings]);

  if (!settings) return null;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );

  const Toggle = ({ label, value, onChange, desc }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>}
      </div>
      <button 
        onClick={() => onChange(!value)}
        style={{
          width: 40, height: 20, borderRadius: 10, background: value ? 'var(--amber)' : 'rgba(255,255,255,0.1)',
          border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s'
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: value ? '#000' : 'var(--text-secondary)',
          position: 'absolute', top: 2, left: value ? 22 : 2, transition: 'all 0.2s'
        }} />
      </button>
    </div>
  );

  const ShortcutRow = ({ action, label, combo }) => {
    const isRecording = recording?.action === action;
    const comboStr = isRecording ? 'Recording...' : `${combo.ctrl ? 'Ctrl+' : ''}${combo.shift ? 'Shift+' : ''}${combo.alt ? 'Alt+' : ''}${combo.key.toUpperCase()}`;
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>
        <button 
          onClick={() => handleRecord(action)}
          style={{
            background: isRecording ? 'var(--amber-dim)' : 'rgba(255,255,255,0.05)',
            border: '1px solid',
            borderColor: isRecording ? 'var(--amber)' : 'var(--border)',
            padding: '6px 12px', borderRadius: 8, color: isRecording ? 'var(--amber)' : 'var(--text-secondary)',
            fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', minWidth: 100, textAlign: 'center'
          }}
        >
          {comboStr}
        </button>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-base)', display: 'flex', animation: 'fadeIn 0.3s ease' }}>
      {/* Sidebar */}
      <div style={{ width: 240, borderRight: '1px solid var(--border)', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 30, paddingLeft: 12 }}>Settings</div>
        
        <button onClick={() => setActiveTab('general')} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: activeTab === 'general' ? 'var(--amber-dim)' : 'none',
          color: activeTab === 'general' ? 'var(--amber)' : 'var(--text-secondary)',
          textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'general' ? 600 : 400, transition: 'all 0.12s'
        }}>
          <Icon name="globe" size={14} color="currentColor" /> General
        </button>
        
        <button onClick={() => setActiveTab('shortcuts')} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: activeTab === 'shortcuts' ? 'var(--amber-dim)' : 'none',
          color: activeTab === 'shortcuts' ? 'var(--amber)' : 'var(--text-secondary)',
          textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'shortcuts' ? 600 : 400, transition: 'all 0.12s'
        }}>
          <Icon name="history" size={14} color="currentColor" /> Shortcuts
        </button>

        <div style={{ flex: 1 }} />
        
        <button onClick={resetSettings} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'none', color: 'var(--red)', opacity: 0.7,
          textAlign: 'left', fontSize: 12, transition: 'all 0.12s'
        }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
          <Icon name="trash" size={14} color="currentColor" /> Reset Defaults
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '60px 80px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 640 }}>
          {activeTab === 'general' && (
            <>
              <Section title="Window Behavior">
                <Toggle 
                  label="Always on Top" 
                  desc="Keep the browser visible above all other applications."
                  value={settings.alwaysOnTop} 
                  onChange={v => updateSettings({ alwaysOnTop: v })} 
                />
                <Toggle 
                  label="Hide from Taskbar" 
                  desc="Remove the app from the system taskbar and Alt+Tab menu."
                  value={settings.skipTaskbar} 
                  onChange={v => updateSettings({ skipTaskbar: v })} 
                />
                <Toggle 
                  label="Start Hidden" 
                  desc="Browser stays invisible on launch until you use the toggle shortcut."
                  value={settings.startHidden} 
                  onChange={v => updateSettings({ startHidden: v })} 
                />
              </Section>
              
              <Section title="Search">
                <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 8 }}>Default Search Engine</div>
                  <input 
                    value={settings.defaultSearchEngine}
                    onChange={e => updateSettings({ defaultSearchEngine: e.target.value })}
                    placeholder="https://www.google.com/search?q="
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)',
                      fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)'
                    }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Must include "%s" or end with a query parameter.</div>
                </div>
              </Section>
            </>
          )}

          {activeTab === 'shortcuts' && (
            <Section title="Keyboard Shortcuts">
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontStyle: 'italic' }}>
                Click a shortcut to record a new key combination.
              </div>
              <ShortcutRow action="new-tab" label="New Tab" combo={settings.shortcuts['new-tab']} />
              <ShortcutRow action="close-tab" label="Close Tab" combo={settings.shortcuts['close-tab']} />
              <ShortcutRow action="reload" label="Reload Page" combo={settings.shortcuts['reload']} />
              <ShortcutRow action="focus-urlbar" label="Focus URL Bar" combo={settings.shortcuts['focus-urlbar']} />
              <ShortcutRow action="toggle-history" label="Toggle History" combo={settings.shortcuts['toggle-history']} />
              <ShortcutRow action="toggle-downloads" label="Toggle Downloads" combo={settings.shortcuts['toggle-downloads']} />
              <ShortcutRow action="toggle-console" label="Toggle Console" combo={settings.shortcuts['toggle-console']} />
              <ShortcutRow action="lock-browser" label="Lock Browser (PIN)" combo={settings.shortcuts['lock-browser']} />
              <ShortcutRow action="peek-link" label="Peek Link Overlay" combo={settings.shortcuts['peek-link']} />
              <ShortcutRow action="open-file" label="Open Local File" combo={settings.shortcuts['open-file']} />
              <ShortcutRow action="toggle-visibility" label="Global Visibility Toggle" combo={settings.shortcuts['toggle-visibility']} />
              <div style={{ height: 40 }} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
