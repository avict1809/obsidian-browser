import React, { useState, useEffect, useRef } from 'react';
import { Icon, TBtn } from './components.jsx';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const proxyTestBtnRef = useRef(null);

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

        <button onClick={() => setActiveTab('proxy')} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: activeTab === 'proxy' ? 'var(--amber-dim)' : 'none',
          color: activeTab === 'proxy' ? 'var(--amber)' : 'var(--text-secondary)',
          textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'proxy' ? 600 : 400, transition: 'all 0.12s'
        }}>
          <Icon name="lock" size={14} color="currentColor" /> Proxy / VPN
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

          {activeTab === 'proxy' && (
            <>
              <Section title="VPN / Proxy Settings">
                <Toggle 
                  label="Enable Proxy" 
                  desc="Route all browsing traffic through a proxy server."
                  value={settings.proxy.enabled} 
                  onChange={v => updateSettings({ proxy: { ...settings.proxy, enabled: v } })} 
                />

                <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)', marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Proxy Server Address</div>
                    <button 
                      ref={proxyTestBtnRef}
                      onClick={async () => {
                        if (!settings.proxy.server) return;
                        const btn = proxyTestBtnRef.current;
                        const originalText = btn.innerText;
                        const originalColor = btn.style.color;
                        
                        try {
                          btn.innerText = 'Testing...';
                          btn.disabled = true;
                          console.log('Starting proxy test for:', settings.proxy.server);
                          
                          const res = await window.electronAPI?.proxyTest(settings.proxy.server);
                          console.log('Proxy test result:', res);
                          
                          btn.innerText = res?.success ? 'Success!' : 'Failed';
                          btn.style.color = res?.success ? 'var(--amber)' : 'var(--red)';
                        } catch (err) {
                          console.error('Proxy test error:', err);
                          btn.innerText = 'Error';
                          btn.style.color = 'var(--red)';
                        } finally {
                          setTimeout(() => {
                            if (btn) {
                              btn.innerText = originalText;
                              btn.disabled = false;
                              btn.style.color = originalColor || 'var(--text-secondary)';
                            }
                          }, 3000);
                        }
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '2px 8px', fontSize: 10, color: 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.12s'
                      }}
                    >Test Connection</button>

                  </div>
                  <input 
                    value={settings.proxy.server}
                    onChange={e => updateSettings({ proxy: { ...settings.proxy, server: e.target.value, preset: 'custom' } })}
                    placeholder="protocol://host:port (e.g. socks5://1.2.3.4:1080)"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '10px 12px', color: 'var(--text-primary)',
                      fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>

                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', height: 400 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Proxy Cloud</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text" 
                        placeholder="Search country..." 
                        onChange={(e) => {
                          const term = e.target.value.toLowerCase();
                          document.querySelectorAll('.proxy-item').forEach(el => {
                            const country = el.getAttribute('data-country').toLowerCase();
                            el.style.display = country.includes(term) ? 'flex' : 'none';
                          });
                        }}
                        style={{
                          background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                          padding: '4px 8px', fontSize: 10, color: 'var(--text-secondary)', outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ 
                    flex: 1, overflowY: 'auto', paddingRight: 8,
                    display: 'flex', flexDirection: 'column', gap: 6,
                    scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent'
                  }}>
                    {[
                      { ip: '168.144.75.9:3128', country: 'United States', type: 'Elite (Priority)', protocol: 'http' },
                      { ip: '174.138.119.88:80', country: 'United States', type: 'Elite', protocol: 'http' },
                      { ip: '83.168.74.163:8080', country: 'Poland', type: 'Elite', protocol: 'http' },
                      { ip: '212.127.95.235:8081', country: 'Poland', type: 'Elite', protocol: 'http' },
                      { ip: '79.110.202.131:8081', country: 'Poland', type: 'Elite', protocol: 'http' },
                      { ip: '203.95.197.116:8080', country: 'Cambodia', type: 'Elite', protocol: 'http' },
                      { ip: '47.238.134.126:808', country: 'Hong Kong', type: 'Elite', protocol: 'http' },
                      { ip: '39.102.214.208:10002', country: 'China', type: 'Elite', protocol: 'socks5' },
                      { ip: '8.211.42.167:8005', country: 'Germany', type: 'Elite', protocol: 'http' },
                      { ip: '104.238.130.121:443', country: 'United States', type: 'Elite', protocol: 'socks5' },
                      { ip: '192.252.208.70:14282', country: 'United States', type: 'Elite', protocol: 'socks5' },
                      { ip: '45.56.126.176:1080', country: 'United States', type: 'Elite', protocol: 'socks5' },
                      { ip: '47.250.155.254:4145', country: 'Malaysia', type: 'Elite', protocol: 'socks5' },
                      { ip: '39.102.213.187:8181', country: 'China', type: 'Elite', protocol: 'http' },
                      { ip: '8.221.141.88:9507', country: 'Japan', type: 'Elite', protocol: 'socks5' },
                      { ip: '47.74.46.81:8047', country: 'Japan', type: 'Elite', protocol: 'http' },
                      { ip: '47.250.51.11:5007', country: 'Malaysia', type: 'Elite', protocol: 'http' },
                      { ip: '47.90.149.238:3128', country: 'United States', type: 'Elite', protocol: 'http' },
                      { ip: '8.137.38.48:8080', country: 'China', type: 'Elite', protocol: 'http' },
                      { ip: '47.237.92.86:1025', country: 'Singapore', type: 'Elite', protocol: 'http' },
                      { ip: '8.213.197.208:1081', country: 'Thailand', type: 'Elite', protocol: 'socks5' },
                      { ip: '47.250.155.254:3129', country: 'Malaysia', type: 'Elite', protocol: 'http' },
                      { ip: '8.148.23.202:80', country: 'China', type: 'Elite', protocol: 'http' },
                      { ip: '129.150.39.242:8118', country: 'Singapore', type: 'Elite', protocol: 'http' },
                      { ip: '101.200.158.109:8800', country: 'China', type: 'Elite', protocol: 'http' },
                      { ip: '47.238.60.156:8080', country: 'Hong Kong', type: 'Elite', protocol: 'http' },
                    ].map(p => {
                      const fullUrl = `${p.protocol}://${p.ip}`;
                      const isSelected = settings.proxy.server === fullUrl;
                      const isPriority = p.type.includes('Priority');
                      
                      return (
                        <div 
                          key={p.ip}
                          className="proxy-item"
                          data-country={p.country}
                          onClick={() => updateSettings({ proxy: { ...settings.proxy, server: fullUrl, preset: p.country } })}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                            background: isSelected ? 'var(--amber-dim)' : 'var(--bg-surface)',
                            border: '1px solid', borderColor: isSelected ? 'var(--amber)' : (isPriority ? 'rgba(232, 160, 48, 0.3)' : 'var(--border)'),
                            borderRadius: 10, cursor: 'pointer', transition: 'all 0.12s',
                            position: 'relative',
                            boxShadow: isPriority ? '0 0 15px rgba(232, 160, 48, 0.05)' : 'none'
                          }}
                          onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = 'var(--border-hover)')}
                          onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = isPriority ? 'rgba(232, 160, 48, 0.3)' : 'var(--border)')}
                        >
                          <div style={{ 
                            width: 32, height: 22, background: isPriority ? 'rgba(232, 160, 48, 0.1)' : 'rgba(255,255,255,0.05)', 
                            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: isPriority ? 'var(--amber)' : 'var(--text-muted)'
                          }}>
                            {p.country.substring(0, 2).toUpperCase()}
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? 'var(--amber)' : 'var(--text-primary)' }}>
                              {p.country} {isPriority && <span style={{ color: 'var(--amber)', fontSize: 8, verticalAlign: 'middle', marginLeft: 4 }}>★</span>}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {p.ip} <span style={{ opacity: 0.5 }}>({p.protocol})</span>
                            </div>
                          </div>

                          <div style={{ 
                            fontSize: 9, padding: '2px 6px', borderRadius: 4,
                            background: 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                            border: '1px solid rgba(34, 197, 94, 0.2)'
                          }}>
                            {p.type}
                          </div>
                        </div>
                      );
                    })}
                  </div>





                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 12, fontStyle: 'italic' }}>
                    Note: Free proxies can be unstable. If a site fails to load, try a different preset or disable the proxy.
                  </div>
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
              <ShortcutRow action="new-window" label="New Window" combo={settings.shortcuts['new-window']} />
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
