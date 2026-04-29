import React, { useState, useEffect } from 'react';

// ─── Design tokens ──────────────────────────────────────────────────────────
// ─── Design tokens ──────────────────────────────────────────────────────────
// ─── Design tokens ──────────────────────────────────────────────────────────
const A = '#ffb443'; // Brighter Amber
const A2 = 'rgba(255,180,67,0.85)';
const A3 = 'rgba(255,180,67,0.45)';
const A4 = 'rgba(0,0,0,0.85)'; // Much darker, more opaque background for contrast
const RED = '#ff5f40';
const GREEN = '#40ffb4';
const MONO = 'var(--font-mono)';

function pad(n, len = 2) { return String(n).padStart(len, '0'); }

// ─── Arc gauge ───────────────────────────────────────────────────────────────
function ArcGauge({ value = 0, max = 100, label, unit = '%', warn = false, size = 132 }) {
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arcSpan = circ * 0.78;
  const fgOff = arcSpan - (Math.min(value, max) / max) * arcSpan;
  const numTicks = 32;
  const ticks = Array.from({ length: numTicks }, (_, i) => {
    const angle = (i / numTicks) * 280 - 140;
    const rad = (angle * Math.PI) / 180;
    const inner = r + 6;
    const outer = r + (i % 8 === 0 ? 17 : i % 4 === 0 ? 12 : 8);
    return {
      x1: cx + inner * Math.cos(rad), y1: cy + inner * Math.sin(rad),
      x2: cx + outer * Math.cos(rad), y2: cy + outer * Math.sin(rad),
      major: i % 8 === 0,
    };
  });
  const hot = warn && value > 80;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        position: 'absolute', inset: -12,
        border: `1px solid ${A3}`,
        borderTopColor: hot ? RED : A,
        borderRadius: '50%',
        animation: 'spinCW 12s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: -5,
        border: `1px dashed ${A4}`,
        borderRadius: '50%',
        animation: 'spinCCW 18s linear infinite',
      }} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <filter id={`glw-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={A} strokeWidth={t.major ? 1.5 : 0.6}
            opacity={t.major ? 0.5 : 0.18} />
        ))}
        {/* BG arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={A} strokeWidth={2.5} opacity={0.1}
          strokeDasharray={`${arcSpan} ${circ - arcSpan}`}
          transform={`rotate(130 ${cx} ${cy})`} />
        {/* Active arc */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={hot ? RED : A} strokeWidth={2.5}
          strokeDasharray={`${arcSpan} ${circ - arcSpan}`}
          strokeDashoffset={fgOff}
          strokeLinecap="butt"
          transform={`rotate(130 ${cx} ${cy})`}
          filter={`url(#glw-${label})`}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }} />
        {/* Inner rings */}
        <circle cx={cx} cy={cy} r={r - 12} fill="none" stroke={A} strokeWidth={0.5} opacity={0.12} />
        <circle cx={cx} cy={cy} r={r - 22} fill="none" stroke={A} strokeWidth={0.5} opacity={0.07} />
        {/* Value */}
        <text x={cx} y={cy - 4} textAnchor="middle"
          fill={hot ? RED : A} fontFamily={MONO} fontSize={22} fontWeight={700} letterSpacing={-1}>
          {value}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle"
          fill={A} fontFamily={MONO} fontSize={9} opacity={0.5}>{unit}</text>
        <text x={cx} y={cy + 27} textAnchor="middle"
          fill={A} fontFamily={MONO} fontSize={7.5} opacity={0.35} letterSpacing={2.5}>{label}</text>
      </svg>
    </div>
  );
}

// ─── Sonar ping ──────────────────────────────────────────────────────────────
function SonarRing({ ping }) {
  return (
    <div style={{ position: 'relative', width: 90, height: 90 }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        {[36, 27, 18].map((r, i) => (
          <circle key={i} cx={45} cy={45} r={r}
            fill="none" stroke={A} strokeWidth={0.5} opacity={0.1 + i * 0.04} />
        ))}
        <line x1={45} y1={9} x2={45} y2={20} stroke={A} strokeWidth={0.5} opacity={0.28} />
        <line x1={45} y1={70} x2={45} y2={81} stroke={A} strokeWidth={0.5} opacity={0.28} />
        <line x1={9} y1={45} x2={20} y2={45} stroke={A} strokeWidth={0.5} opacity={0.28} />
        <line x1={70} y1={45} x2={81} y2={45} stroke={A} strokeWidth={0.5} opacity={0.28} />
        <circle cx={45} cy={45} r={4} fill={A} opacity={0.85} />
        <circle cx={45} cy={45} r={4} fill="none" stroke={A} strokeWidth={1}>
          <animate attributeName="r" from="4" to="36" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.7" to="0" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <text x={45} y={63} textAnchor="middle" fill={A} fontFamily={MONO} fontSize={10} fontWeight={700}>{ping}ms</text>
        <text x={45} y={73} textAnchor="middle" fill={A} fontFamily={MONO} fontSize={7} opacity={0.4} letterSpacing={2}>PING</text>
      </svg>
    </div>
  );
}

// ─── Mini bar stat ────────────────────────────────────────────────────────────
function BarStat({ label, value, unit = '%' }) {
  const hot = value > 80;
  return (
    <div style={{ width: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: MONO, fontSize: 7.5, color: A, opacity: 0.4, letterSpacing: 1.5 }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: hot ? RED : A, fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <div style={{ height: 3, background: A4, borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: hot ? RED : A,
          boxShadow: `0 0 6px ${hot ? RED : A}88`,
          transition: 'width 0.8s ease', borderRadius: 1,
        }} />
      </div>
    </div>
  );
}

// ─── Data row ─────────────────────────────────────────────────────────────────
function DataRow({ label, value, vc = A }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '4px 0', borderBottom: `1px solid ${A4}`,
    }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: A, opacity: 0.9, fontWeight: 600, letterSpacing: 1.5 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 11, color: vc, fontWeight: 800, letterSpacing: 1 }}>{value}</span>
    </div>
  );
}

// ─── Corner bracket ───────────────────────────────────────────────────────────
function Corner({ pos }) {
  const s = {
    tl: { top: 14, left: 14, borderTop: `1.5px solid ${A2}`, borderLeft: `1.5px solid ${A2}` },
    tr: { top: 14, right: 14, borderTop: `1.5px solid ${A2}`, borderRight: `1.5px solid ${A2}` },
    bl: { bottom: 14, left: 14, borderBottom: `1.5px solid ${A2}`, borderLeft: `1.5px solid ${A2}` },
    br: { bottom: 14, right: 14, borderBottom: `1.5px solid ${A2}`, borderRight: `1.5px solid ${A2}` },
  };
  return <div style={{ position: 'absolute', width: 26, height: 26, ...s[pos] }} />;
}

// ─── Waveform ─────────────────────────────────────────────────────────────────
function Waveform({ bars = 22, seed = 1 }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 28 }}>
      {Array.from({ length: bars }, (_, i) => {
        const h = 3 + Math.abs(Math.sin((i + seed) * 0.72)) * 22;
        return (
          <div key={i} style={{
            width: 2, height: h, borderRadius: 1,
            background: i % 5 === 0 ? A : `${A}88`,
            animation: `wvPulse ${0.7 + ((i * 7 + seed * 3) % 13) * 0.09}s ease-in-out ${i * 0.045}s infinite`,
          }} />
        );
      })}
    </div>
  );
}

// ─── Threat hex grid ──────────────────────────────────────────────────────────
function ThreatGrid() {
  const [cells, setCells] = useState(() =>
    Array.from({ length: 30 }, () => ({ on: Math.random() > 0.5, hot: false }))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setCells(Array.from({ length: 30 }, () => ({
        on: Math.random() > 0.45,
        hot: Math.random() > 0.93,
      })));
    }, 1900);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 7, letterSpacing: 2.5, color: A, opacity: 0.35, marginBottom: 6 }}>
        THREAT_MATRIX
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: 126 }}>
        {cells.map((c, i) => (
          <div key={i} style={{
            width: 11, height: 11, borderRadius: 2,
            background: c.hot ? `${RED}22` : c.on ? A4 : 'transparent',
            border: `1px solid ${c.hot ? RED + '88' : c.on ? A3 : A4}`,
            transition: 'all 0.4s ease',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── HUDOverlay ───────────────────────────────────────────────────────────────
export default function HUDOverlay({ active, settings, tabCount = 0, torStatus, opacity = 0.8, activeUrl }) {
  const [time, setTime] = useState(new Date());
  const [uptime, setUptime] = useState(0);
  const [stats, setStats] = useState({ cpu: 12, ram: 44, ping: 24, net: 67, temp: 42 });

  useEffect(() => {
    const t1 = setInterval(() => setTime(new Date()), 1000);
    const t2 = setInterval(() => setUptime(u => u + 1), 1000);
    const t3 = setInterval(() => setStats({
      cpu: Math.floor(Math.random() * 25) + 5,
      ram: Math.floor(Math.random() * 18) + 36,
      ping: Math.floor(Math.random() * 38) + 10,
      net: Math.floor(Math.random() * 22) + 55,
      temp: Math.floor(Math.random() * 8) + 39,
    }), 2800);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, []);

  if (!active) return null;

  const vpnEnabled = settings?.proxy?.enabled;
  const vpnLabel = vpnEnabled ? (settings?.proxy?.preset || 'CUSTOM').toUpperCase() : 'DIRECT';
  const torActive = settings?.darkWebMode;
  const uptimeStr = `${pad(Math.floor(uptime / 3600))}:${pad(Math.floor((uptime % 3600) / 60))}:${pad(uptime % 60)}`;

  let activeDomain = 'IDLE';
  try {
    if (activeUrl && activeUrl.startsWith('http')) {
      activeDomain = new URL(activeUrl).hostname.toUpperCase();
    } else if (activeUrl && activeUrl.startsWith('about:')) {
      activeDomain = activeUrl.split(':')[1].toUpperCase();
    }
  } catch { }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10000,
      pointerEvents: 'none', overflow: 'hidden',
      opacity: opacity, transition: 'opacity 0.3s ease'
    }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spinCW   { to { transform: rotate(360deg);  } }
        @keyframes spinCCW  { to { transform: rotate(-360deg); } }
        @keyframes scanDown {
          0%   { top: -1px; opacity: 0; }
          4%   { opacity: 0.2; }
          96%  { opacity: 0.2; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeInHUD {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes wvPulse {
          0%, 100% { opacity: 0.32; }
          50%      { opacity: 1; }
        }
        @keyframes torBlink {
          0%, 100% { opacity: 1; }
          45%, 55% { opacity: 0.12; }
        }
      `}} />

      {/* Layout Backgrounds for visibility in light theme */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 280,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)'
      }} />
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0, width: 280,
        background: 'linear-gradient(-90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)'
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 160,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)'
      }} />

      {/* Scanline */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 0%, ${A} 35%, ${A} 65%, transparent 100%)`,
        animation: 'scanDown 8s ease-in-out infinite',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.68) 100%)',
      }} />

      {['tl', 'tr', 'bl', 'br'].map(p => <Corner key={p} pos={p} />)}

      {/* ─── TOP BAR ─── */}
      <div style={{
        position: 'absolute', top: 16, left: 46, right: 46,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        animation: 'fadeInHUD 0.6s ease',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontFamily: MONO, fontSize: 15, fontWeight: 800,
            color: A, letterSpacing: 4, textShadow: `0 0 14px ${A}`
          }}>
            OBSIDIAN_OS
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: A, opacity: 0.9, fontWeight: 700, letterSpacing: 2.5 }}>
            v1.0.5 // BUILD_2047
          </div>
          <div style={{
            fontFamily: MONO, fontSize: 8, letterSpacing: 2,
            color: torActive ? '#c084fc' : GREEN,
            animation: torActive ? 'torBlink 1.8s step-start infinite' : 'none',
          }}>
            {torActive ? '▲ ONION ROUTING ACTIVE' : '■ SECURE_ENCLAVE: OK'}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: MONO, fontSize: 30, fontWeight: 300,
            letterSpacing: 6, color: A, textShadow: `0 0 20px ${A}55`, lineHeight: 1
          }}>
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: A, opacity: 0.9, letterSpacing: 3, marginTop: 5, fontWeight: 600 }}>
            {time.toLocaleDateString('en-US', {
              weekday: 'short', year: 'numeric',
              month: 'short', day: 'numeric'
            }).toUpperCase()}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: A, opacity: 0.8, letterSpacing: 2, marginTop: 3, fontWeight: 700 }}>
            UPTIME: {uptimeStr}
          </div>
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{
            fontFamily: MONO, fontSize: 12, fontWeight: 800,
            color: vpnEnabled ? GREEN : A, letterSpacing: 2
          }}>
            VPN: {vpnLabel}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: A, fontWeight: 900, letterSpacing: 2 }}>
            LOC: {activeDomain}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, color: A, opacity: 0.9, letterSpacing: 2, fontWeight: 700 }}>
            TABS: {pad(tabCount)} OPEN
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: A, opacity: 0.8, letterSpacing: 1.5, fontWeight: 600 }}>
            CORE_TEMP: {stats.temp}°C
          </div>
        </div>
      </div>

      {/* ─── LEFT PANEL ─── */}
      <div style={{
        position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        animation: 'fadeInHUD 0.9s ease',
      }}>
        <ArcGauge label="CPU_LOAD" value={stats.cpu} size={132} warn />
        <ArcGauge label="MEM_USAGE" value={stats.ram} size={132} warn />
        <SonarRing ping={stats.ping} />
      </div>

      {/* ─── RIGHT PANEL ─── */}
      <div style={{
        position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
        animation: 'fadeInHUD 0.9s ease',
      }}>
        <ArcGauge label="NET_FLOW" value={stats.net} size={132} />

        <div style={{
          width: 132, padding: '8px 0',
          borderLeft: `3px solid ${A2}`,
          background: 'none',
        }}>
          <DataRow label="PROXY" value={vpnLabel} vc={vpnEnabled ? GREEN : A} />
          <DataRow label="TOR" value={torActive ? 'ACTIVE' : 'OFF'} vc={torActive ? '#c084fc' : A} />
          <DataRow label="TABS" value={`${pad(tabCount)} OPEN`} />
          <DataRow label="NET_PKT" value={`${Math.floor(stats.net * 1.4)}K/s`} />
          <DataRow label="ENCLAVE" value="LOCKED" vc={GREEN} />
        </div>

        <ThreatGrid />
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div style={{
        position: 'absolute', bottom: 16, left: 46, right: 46,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '12px 20px', background: A4, borderRadius: 12, border: `1px solid ${A3}`,
        animation: 'fadeInHUD 1.1s ease',
      }}>
        <Waveform bars={22} seed={1} />

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <BarStat label="CPU" value={stats.cpu} />
            <BarStat label="RAM" value={stats.ram} />
            <BarStat label="NET" value={stats.net} />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: A, opacity: 0.8, letterSpacing: 2.5, fontWeight: 600 }}>
            STATUS:&nbsp;<span style={{ color: GREEN }}>NOMINAL</span>
            &nbsp;//&nbsp;ENCRYPT:&nbsp;<span style={{ color: GREEN }}>AES-256</span>
            &nbsp;//&nbsp;THREATS:&nbsp;<span style={{ color: GREEN }}>NONE</span>
          </div>
        </div>

        <Waveform bars={22} seed={7} />
      </div>
    </div>
  );
}