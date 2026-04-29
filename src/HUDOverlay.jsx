import React, { useState, useEffect } from 'react';

const HUD_COLOR = '#e8a030'; // Amber
const HUD_COLOR_DIM = 'rgba(232, 160, 48, 0.2)';
const HUD_COLOR_GLOW = 'rgba(232, 160, 48, 0.08)';

export default function HUDOverlay({ active, settings, tabCount, torStatus }) {
  const [time, setTime] = useState(new Date());
  const [randomStats, setRandomStats] = useState({ cpu: 12, ram: 44, ping: 24 });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const statsTimer = setInterval(() => {
      setRandomStats({
        cpu: Math.floor(Math.random() * 20) + 5,
        ram: Math.floor(Math.random() * 10) + 40,
        ping: Math.floor(Math.random() * 30) + 15
      });
    }, 3000);
    return () => {
      clearInterval(timer);
      clearInterval(statsTimer);
    };
  }, []);

  if (!active) return null;

  const vpnStatus = settings?.proxy?.enabled ? (settings?.proxy?.preset || 'Custom') : 'DIRECT';
  const torActive = settings?.darkWebMode;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10000,
      pointerEvents: 'none', padding: 40,
      display: 'flex', flexDirection: 'column',
      color: HUD_COLOR, fontFamily: 'var(--font-mono)',
      animation: 'fadeIn 0.5s ease',
      textTransform: 'uppercase',
      fontSize: 10,
    }}>
      {/* Corner Brackets */}
      <div style={{ position: 'absolute', top: 20, left: 20, width: 60, height: 60, borderTop: `2px solid ${HUD_COLOR}`, borderLeft: `2px solid ${HUD_COLOR}`, opacity: 0.5 }} />
      <div style={{ position: 'absolute', top: 20, right: 20, width: 60, height: 60, borderTop: `2px solid ${HUD_COLOR}`, borderRight: `2px solid ${HUD_COLOR}`, opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: 20, left: 20, width: 60, height: 60, borderBottom: `2px solid ${HUD_COLOR}`, borderLeft: `2px solid ${HUD_COLOR}`, opacity: 0.5 }} />
      <div style={{ position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderBottom: `2px solid ${HUD_COLOR}`, borderRight: `2px solid ${HUD_COLOR}`, opacity: 0.5 }} />

      {/* Top Bar Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 2 }}>OBSIDIAN_OS v1.0.4</div>
          <div style={{ opacity: 0.7 }}>CORE_TEMP: 42°C | UPTIME: {Math.floor(performance.now() / 1000)}s</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 300, letterSpacing: -1 }}>{time.toLocaleTimeString()}</div>
          <div style={{ opacity: 0.7 }}>{new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Center Frame */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ 
          width: '70%', height: '50%', 
          border: `1px solid ${HUD_COLOR_DIM}`,
          background: 'radial-gradient(circle, rgba(232, 160, 48, 0.03) 0%, transparent 70%)',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* Scanning Line */}
          <div style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: 2, 
            background: `linear-gradient(90deg, transparent, ${HUD_COLOR}, transparent)`,
            boxShadow: `0 0 10px ${HUD_COLOR}`,
            animation: 'slideInTop 4s infinite linear' 
          }} />
          
          <div style={{ textAlign: 'center', opacity: 0.4 }}>
            <div style={{ fontSize: 14, letterSpacing: 4, marginBottom: 8 }}>VISUAL_FEED_ACTIVE</div>
            <div style={{ fontSize: 8 }}>NO_THREATS_DETECTED // AUTO_ENCRYPTION_ENABLED</div>
          </div>
        </div>
      </div>

      {/* Bottom Interface */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 20, alignItems: 'end' }}>
        {/* Left Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatGauge label="CPU_LOAD" value={randomStats.cpu} />
          <StatGauge label="MEM_USAGE" value={randomStats.ram} />
          <div style={{ padding: 10, border: `1px solid ${HUD_COLOR_DIM}`, borderRadius: 4 }}>
            <div style={{ opacity: 0.5, marginBottom: 4 }}>NETWORK_LATENCY</div>
            <div style={{ fontSize: 14 }}>{randomStats.ping} MS</div>
          </div>
        </div>

        {/* Center Technical Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{ 
                width: 4, height: 12, 
                background: Math.random() > 0.3 ? HUD_COLOR : HUD_COLOR_DIM,
                animation: `pulse ${Math.random() * 2 + 1}s infinite`
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 700, color: torActive ? '#a855f7' : HUD_COLOR }}>
            {torActive ? '!!! ONION_NETWORK_SHIELD_ACTIVE !!!' : 'STANDARD_ENCRYPTION_ACTIVE'}
          </div>
        </div>

        {/* Right Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'right' }}>
          <div style={{ padding: 10, border: `1px solid ${HUD_COLOR_DIM}`, borderRadius: 4 }}>
            <div style={{ opacity: 0.5, marginBottom: 4 }}>TAB_INDEX</div>
            <div style={{ fontSize: 14 }}>{tabCount.toString().padStart(2, '0')} ACTIVE</div>
          </div>
          <div style={{ padding: 10, border: `1px solid ${HUD_COLOR_DIM}`, borderRadius: 4 }}>
            <div style={{ opacity: 0.5, marginBottom: 4 }}>VPN_ENDPOINT</div>
            <div style={{ fontSize: 12, color: settings?.proxy?.enabled ? '#5cb87a' : HUD_COLOR }}>{vpnStatus}</div>
          </div>
          <div style={{ fontSize: 8, opacity: 0.4 }}>SECURE_ENCLAVE_ACTIVE // BIP_004</div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInTop {
          from { top: 0%; }
          to { top: 100%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}} />
    </div>
  );
}

function StatGauge({ label, value }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ opacity: 0.5 }}>{label}</span>
        <span>{value}%</span>
      </div>
      <div style={{ height: 4, background: HUD_COLOR_DIM, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: HUD_COLOR, width: `${value}%`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}
