import React, { useState, useEffect, useRef } from 'react';
import { Icon, TBtn } from './components.jsx';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const proxyTestBtnRef = useRef(null);

  const [activeTab, setActiveTab] = useState('general');
  const [recording, setRecording] = useState(null); // { action, combo }
  const [torInfo, setTorInfo] = useState({ status: 'offline', log: [] });
  const [updateStatus, setUpdateStatus] = useState({ state: 'idle' });
  const torLogRef = useRef(null);

  useEffect(() => {
    window.electronAPI?.settingsGet().then(setSettings);
    window.electronAPI?.torStatusGet().then(setTorInfo);
    
    window.electronAPI?.on('tor-status', info => {
      setTorInfo(prev => ({ ...prev, status: info.status }));
    });

    window.electronAPI?.on('tor-log-entry', line => {
      setTorInfo(prev => ({ ...prev, log: [...prev.log, line].slice(-100) }));
    });

    window.electronAPI?.on('update-status', status => {
      setUpdateStatus(status);
    });
  }, []);

  useEffect(() => {
    if (torLogRef.current) {
      torLogRef.current.scrollTop = torLogRef.current.scrollHeight;
    }
  }, [torInfo.log]);

  const updateSettings = (patch) => {
    const newSettings = { ...settings, ...patch };
    setSettings(newSettings);
    window.electronAPI?.settingsSet(newSettings);

    // Auto-start TOR if enabling Dark Web mode and it's offline
    if (patch.darkWebMode === true && torInfo.status === 'offline') {
      window.electronAPI?.torStart();
      setTorInfo(prev => ({ ...prev, status: 'bootstrapping' }));
    }
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

        <button onClick={() => setActiveTab('darkweb')} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: activeTab === 'darkweb' ? 'rgba(168, 85, 247, 0.1)' : 'none',
          color: activeTab === 'darkweb' ? '#a855f7' : 'var(--text-secondary)',
          textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'darkweb' ? 600 : 400, transition: 'all 0.12s'
        }}>
          <Icon name="eye" size={14} color="currentColor" /> Dark Web
        </button>

        <button onClick={() => setActiveTab('visuals')} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: activeTab === 'visuals' ? 'var(--amber-dim)' : 'none',
          color: activeTab === 'visuals' ? 'var(--amber)' : 'var(--text-secondary)',
          textAlign: 'left', fontSize: 13, fontWeight: activeTab === 'visuals' ? 600 : 400, transition: 'all 0.12s'
        }}>
          <Icon name="zoom" size={14} color="currentColor" /> Visuals
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
                <Toggle 
                  label="Win+R Access (obsidian)" 
                  desc="Type 'obsidian' in the Windows Run dialog (Win+R) to launch the browser instantly."
                  value={settings.winRShortcut} 
                  onChange={v => updateSettings({ winRShortcut: v })} 
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

              <Section title="Software Updates">
                <div style={{ padding: '20px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>Obsidian Browser</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Version 1.0.4</div>
                    </div>
                    
                    {updateStatus.state === 'idle' || updateStatus.state === 'not-available' || updateStatus.state === 'error' ? (
                      <button 
                        onClick={() => window.electronAPI?.updateCheck()}
                        style={{
                          background: 'var(--amber-dim)', border: '1px solid var(--amber)',
                          borderRadius: 6, padding: '4px 12px', fontSize: 11, color: 'var(--amber)',
                          cursor: 'pointer', fontWeight: 600
                        }}
                      >Check for Updates</button>
                    ) : updateStatus.state === 'checking' ? (
                      <div style={{ fontSize: 11, color: 'var(--amber)' }}>Checking...</div>
                    ) : updateStatus.state === 'downloaded' ? (
                      <button 
                        onClick={() => window.electronAPI?.updateInstall()}
                        style={{
                          background: 'var(--amber)', border: 'none',
                          borderRadius: 6, padding: '4px 12px', fontSize: 11, color: '#000',
                          cursor: 'pointer', fontWeight: 700
                        }}
                      >Restart & Install</button>
                    ) : null}
                  </div>

                  {updateStatus.state === 'downloading' && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Downloading update...</span>
                        <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{Math.round(updateStatus.progress?.percent || 0)}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--amber)', width: `${updateStatus.progress?.percent || 0}%`, transition: 'width 0.2s' }} />
                      </div>
                    </div>
                  )}

                  {updateStatus.state === 'available' && (
                    <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>
                      New version found! Downloading now...
                    </div>
                  )}

                  {updateStatus.state === 'not-available' && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                      You are running the latest version.
                    </div>
                  )}

                  {updateStatus.state === 'error' && (
                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>
                      Update error: {updateStatus.error}
                    </div>
                  )}
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
              <ShortcutRow action="command-palette" label="Command Palette" combo={settings.shortcuts['command-palette']} />
              <ShortcutRow action="toggle-hud" label="Toggle HUD Overlay" combo={settings.shortcuts['toggle-hud']} />
              <ShortcutRow action="toggle-visibility" label="Global Visibility Toggle" combo={settings.shortcuts['toggle-visibility']} />
              <div style={{ height: 40 }} />
            </Section>
          )}

          {activeTab === 'darkweb' && (
            <>
              <div style={{ 
                padding: '40px', borderRadius: 24, 
                background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.2) 0%, rgba(15, 23, 42, 0.4) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                position: 'relative', overflow: 'hidden', marginBottom: 30,
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
              }}>
                <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'rgba(168, 85, 247, 0.1)', filter: 'blur(80px)', borderRadius: '50%' }} />
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="eye" size={24} color="#a855f7" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: -0.5 }}>Dark Web Mode</h2>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Anonymous browsing via TOR network</div>
                  </div>
                </div>

                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', maxWidth: 500, marginBottom: 30 }}>
                  Dark Web Mode routes all traffic through the TOR (The Onion Router) network. 
                  This hides your identity and allows access to .onion websites.
                </p>

                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: 16, border: '1px solid rgba(168, 85, 247, 0.2)' 
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Activate TOR Mode</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {torInfo.status === 'ready' 
                        ? 'Connected to embedded TOR instance'
                        : `TOR Service: ${torInfo.status.toUpperCase()}`}
                    </div>
                  </div>
                  <button 
                    onClick={() => updateSettings({ darkWebMode: !settings.darkWebMode })}
                    disabled={torInfo.status !== 'ready'}
                    style={{
                      padding: '10px 24px', borderRadius: 12, 
                      background: settings.darkWebMode ? '#a855f7' : 'rgba(255,255,255,0.05)',
                      border: 'none', color: settings.darkWebMode ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontSize: 14, fontWeight: 600, cursor: (torInfo.status !== 'ready') ? 'not-allowed' : 'pointer', 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: settings.darkWebMode ? '0 0 20px rgba(168, 85, 247, 0.4)' : 'none',
                      transform: settings.darkWebMode ? 'scale(1.05)' : 'scale(1)',
                      opacity: (torInfo.status !== 'ready') ? 0.5 : 1
                    }}
                  >
                    {torInfo.status === 'bootstrapping' ? 'STARTING...' : (settings.darkWebMode ? 'ACTIVE' : 'ACTIVATE')}
                  </button>
                </div>
              </div>

              <Section title="Embedded TOR Status">
                <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 10, height: 10, borderRadius: '50%', 
                          background: torInfo.status === 'ready' ? '#22c55e' : (torInfo.status === 'bootstrapping' ? 'var(--amber)' : 'var(--red)'),
                          boxShadow: torInfo.status === 'ready' ? '0 0 10px #22c55e' : 'none'
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {torInfo.status}
                        </span>
                      </div>
                      
                      {torInfo.status === 'offline' && (
                        <button 
                          onClick={() => {
                            window.electronAPI?.torStart();
                            setTorInfo(prev => ({ ...prev, status: 'bootstrapping' }));
                          }}
                          style={{
                            padding: '4px 12px', background: 'var(--amber-dim)', border: '1px solid var(--amber)',
                            borderRadius: 6, color: 'var(--amber)', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                          }}
                        >Start Service</button>
                      )}
                      
                      {torInfo.status !== 'offline' && (
                        <button 
                          onClick={() => window.electronAPI?.torStop()}
                          style={{
                            padding: '4px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
                            borderRadius: 6, color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                          }}
                        >Stop Service</button>
                      )}
                   </div>

                   <div 
                     ref={torLogRef}
                     style={{ 
                     height: 120, overflowY: 'auto', background: '#000', borderRadius: 8, padding: 12,
                     fontFamily: 'var(--font-mono)', fontSize: 10, color: '#22c55e', lineHeight: 1.4,
                     border: '1px solid rgba(34, 197, 94, 0.2)'
                   }}>
                     {torInfo.log?.length > 0 ? torInfo.log.map((l, i) => <div key={i}>{l}</div>) : <div style={{ opacity: 0.3 }}>Waiting for TOR logs...</div>}
                   </div>
                </div>
              </Section>

              <Section title="Connection Details">
                <div style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status</span>
                    <span style={{ fontSize: 12, color: settings.darkWebMode ? '#a855f7' : 'var(--text-muted)', fontWeight: 600 }}>
                      {settings.darkWebMode ? 'Routing through Local Onion' : 'Disconnected'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Proxy Address</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>127.0.0.1:9050</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Encryption</span>
                    <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Multi-layer Onion</span>
                  </div>
                </div>
              </Section>

              <div style={{ 
                marginTop: 20, padding: '16px', borderRadius: 12, background: 'rgba(239, 68, 68, 0.05)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: 12 
              }}>
                <Icon name="stop" size={16} color="#ef4444" style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Security Note</div>
                  <div style={{ fontSize: 12, color: 'rgba(239, 68, 68, 0.8)', marginTop: 4, lineHeight: 1.5 }}>
                    Ensure you have the TOR Browser or TOR Expert Bundle installed and running in the background. 
                    Obsidian Browser connects to the local TOR proxy automatically.
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'visuals' && (
            <>
              <Section title="Environment Effects">
                <Toggle 
                  label="Starfield Background" 
                  desc="Show an interactive animated starfield on the New Tab page."
                  value={settings.coolFeatures?.starfield} 
                  onChange={v => updateSettings({ coolFeatures: { ...settings.coolFeatures, starfield: v } })} 
                />
                <Toggle 
                  label="Glitch Transitions" 
                  desc="Subtle glitch effect when switching between browser tabs."
                  value={settings.coolFeatures?.glitchTransitions} 
                  onChange={v => updateSettings({ coolFeatures: { ...settings.coolFeatures, glitchTransitions: v } })} 
                />
              </Section>

              <Section title="Interface Features">
                <Toggle 
                  label="Command Palette (Ctrl+Shift+P)" 
                  desc="Quick access to search, tabs, and commands via a terminal-like interface."
                  value={settings.coolFeatures?.commandPalette} 
                  onChange={v => updateSettings({ coolFeatures: { ...settings.coolFeatures, commandPalette: v } })} 
                />
                <Toggle 
                  label="Privacy Pulse" 
                  desc="Animated glowing indicator around the URL bar for security status."
                  value={settings.coolFeatures?.privacyPulse} 
                  onChange={v => updateSettings({ coolFeatures: { ...settings.coolFeatures, privacyPulse: v } })} 
                />
                <Toggle 
                  label="Holographic HUD" 
                  desc="A floating heads-up display with system and session diagnostics."
                  value={settings.coolFeatures?.holographicHUD} 
                  onChange={v => updateSettings({ coolFeatures: { ...settings.coolFeatures, holographicHUD: v } })} 
                />
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
