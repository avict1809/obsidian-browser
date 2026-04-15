import React, { useState, useEffect, useRef, useCallback } from 'react';

const PIN_LEN = 6;

// ── shared style tokens ────────────────────────────────────────────────────
const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#0a0a0b',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 0,
    animation: 'fadeIn 0.25s ease',
  },

  card: {
    background: 'linear-gradient(160deg,#13131a 0%,#0f0f15 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: '44px 52px 40px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset',
    minWidth: 380,
  },

  iconRing: (color) => ({
    width: 68, height: 68, borderRadius: '50%',
    background: `radial-gradient(circle at 35% 35%, ${color}28, ${color}10)`,
    border: `1.5px solid ${color}40`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 0 32px ${color}18`,
    flexShrink: 0,
  }),

  title: {
    fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.92)',
    letterSpacing: -0.3, textAlign: 'center', lineHeight: 1.3,
  },

  subtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.38)',
    textAlign: 'center', lineHeight: 1.6, marginTop: 6,
  },

  dotsRow: {
    display: 'flex', gap: 12, alignItems: 'center',
  },

  digitBox: (filled, shake, accent) => ({
    width: 52, height: 58,
    borderRadius: 12,
    border: `1.5px solid ${filled ? accent : 'rgba(255,255,255,0.1)'}`,
    background: filled
      ? `linear-gradient(160deg, ${accent}18, ${accent}08)`
      : 'rgba(255,255,255,0.025)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 26, fontWeight: 700,
    color: accent,
    transition: 'border-color 0.15s, background 0.15s',
    boxShadow: filled ? `0 4px 16px ${accent}18` : 'none',
    animation: shake ? 'shake 0.45s ease' : 'none',
    fontFamily: "'DM Mono', monospace",
  }),

  dot: (accent) => ({
    width: 10, height: 10, borderRadius: '50%',
    background: accent,
    animation: 'dotScale 0.2s cubic-bezier(.34,1.56,.64,1)',
  }),

  errText: {
    fontSize: 12.5, color: '#e05555',
    textAlign: 'center',
    animation: 'fadeIn 0.15s ease',
    minHeight: 18,
  },

  btn: (accent, disabled) => ({
    width: '100%', padding: '13px 0',
    borderRadius: 12, border: 'none',
    background: disabled
      ? 'rgba(255,255,255,0.05)'
      : `linear-gradient(135deg, ${accent}, ${darken(accent)})`,
    color: disabled ? 'rgba(255,255,255,0.25)' : '#000',
    fontSize: 14, fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: "'Instrument Sans', sans-serif",
    letterSpacing: 0.3,
    transition: 'opacity 0.15s, transform 0.1s',
    boxShadow: disabled ? 'none' : `0 4px 20px ${accent}38`,
  }),

  link: {
    fontSize: 11, color: 'rgba(255,255,255,0.35)',
    cursor: 'pointer', textDecoration: 'none',
    transition: 'all 0.2s',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '6px 16px',
    borderRadius: 8,
    fontFamily: "'DM Mono', monospace",
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
};

function darken(hex) {
  // crude hex darken for gradient end
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 24);
  const b = Math.max(0, (n & 0xff) - 20);
  return `#${[r,g,b].map(v => v.toString(16).padStart(2,'0')).join('')}`;
}

// ── hidden real input trick ──────────────────────────────────────────────
// We render an invisible <input> that captures keyboard events, then display
// the PIN in nice styled boxes. This gives us native IME / paste / mobile
// keyboard support without rolling our own key handler mess.

function PinInput({ length = PIN_LEN, onComplete, accent = '#e8a030', shake = false, disabled = false }) {
  const [digits, setDigits] = useState([]);
  const inputRef = useRef(null);

  // Reset digits when shake fires (wrong PIN) — parent sets shake, then clears it
  useEffect(() => {
    if (shake) {
      setTimeout(() => setDigits([]), 450);
    }
  }, [shake]);

  // Focus the hidden input on mount
  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled]);

  const handleChange = e => {
    if (disabled) return;
    // Only allow numeric digits
    const raw = e.target.value.replace(/\D/g, '').slice(0, length);
    const arr = raw.split('');
    setDigits(arr);
    if (arr.length === length) {
      // Clear input value so the user can re-enter if needed
      e.target.value = '';
      onComplete(raw);
    }
  };

  const handleClick = () => inputRef.current?.focus();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} onClick={handleClick}>
      {/* Hidden real input */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        maxLength={length}
        onChange={handleChange}
        disabled={disabled}
        style={{
          position: 'absolute', opacity: 0, width: 1, height: 1,
          pointerEvents: 'none', zIndex: -1,
        }}
      />

      {/* Digit display boxes */}
      <div style={S.dotsRow}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < digits.length;
          return (
            <div key={i} style={S.digitBox(filled, shake, accent)}>
              {filled ? '●' : ''}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.22)', fontFamily: "'DM Mono',monospace" }}>
        tap here then type your PIN
      </p>
    </div>
  );
}

// ── Main LockScreen component ─────────────────────────────────────────────

export default function LockScreen({ onUnlock }) {
  // mode: 'check' | 'setup' | 'setup-confirm' | 'change' | 'change-confirm'
  const [mode, setMode]         = useState('loading');
  const [shake, setShake]       = useState(false);
  const [error, setError]       = useState('');
  const [pinBuf, setPinBuf]     = useState('');   // stores first PIN during setup-confirm
  const [disabled, setDisabled] = useState(false);

  const ACCENT = '#e8a030';

  useEffect(() => {
    window.electronAPI?.authHasPassword().then(has => {
      setMode(has ? 'check' : 'setup');
    });
  }, []);

  const triggerShake = (msg) => {
    setError(msg);
    setShake(true);
    setDisabled(true);
    setTimeout(() => { setShake(false); setDisabled(false); }, 500);
  };

  const handlePin = useCallback(async (pin) => {
    if (mode === 'check') {
      const ok = await window.electronAPI?.authVerify(pin);
      if (ok) {
        onUnlock();
      } else {
        triggerShake('Incorrect PIN. Try again.');
      }

    } else if (mode === 'setup') {
      setPinBuf(pin);
      setError('');
      setMode('setup-confirm');

    } else if (mode === 'setup-confirm') {
      if (pin !== pinBuf) {
        setPinBuf('');
        triggerShake("PINs don't match. Start over.");
        setTimeout(() => setMode('setup'), 520);
      } else {
        await window.electronAPI?.authSetPassword(pin);
        onUnlock();
      }

    } else if (mode === 'change') {
      // Verify current password first
      const ok = await window.electronAPI?.authVerify(pin);
      if (!ok) {
        triggerShake('Incorrect current PIN.');
      } else {
        setPinBuf('');
        setError('');
        setMode('change-new');
      }

    } else if (mode === 'change-new') {
      setPinBuf(pin);
      setError('');
      setMode('change-confirm');

    } else if (mode === 'change-confirm') {
      if (pin !== pinBuf) {
        setPinBuf('');
        triggerShake("PINs don't match.");
        setTimeout(() => setMode('change-new'), 520);
      } else {
        await window.electronAPI?.authSetPassword(pin);
        onUnlock();
      }
    }
  }, [mode, pinBuf, onUnlock]);

  if (mode === 'loading') return null;

  const configs = {
    check: {
      icon: <LockIcon />,
      title: 'Obsidian Browser',
      sub: 'Enter your 6-digit PIN to continue',
    },
    setup: {
      icon: <ShieldIcon />,
      title: 'Set up PIN',
      iconColor: '#5cb87a',
      sub: 'Choose a 6-digit PIN to protect your browser',
    },
    'setup-confirm': {
      icon: <ShieldIcon />,
      title: 'Confirm PIN',
      iconColor: '#5cb87a',
      sub: 'Enter the same PIN again to confirm',
    },
    change: {
      icon: <KeyIcon />,
      title: 'Change PIN',
      iconColor: '#7eb8f7',
      sub: 'Enter your current 6-digit PIN',
    },
    'change-new': {
      icon: <KeyIcon />,
      title: 'New PIN',
      iconColor: '#7eb8f7',
      sub: 'Choose a new 6-digit PIN',
    },
    'change-confirm': {
      icon: <KeyIcon />,
      title: 'Confirm New PIN',
      iconColor: '#7eb8f7',
      sub: 'Enter the new PIN again to confirm',
    },
  };

  const cfg = configs[mode] || configs.check;
  const accent = cfg.iconColor || ACCENT;

  return (
    <div style={S.overlay}>
      {/* Subtle ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 400, height: 400, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={S.card}>
        {/* Icon */}
        <div style={S.iconRing(accent)}>
          {cfg.icon}
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center' }}>
          <div style={S.title}>{cfg.title}</div>
          <div style={S.subtitle}>{cfg.sub}</div>
        </div>

        {/* PIN input */}
        <PinInput
          key={mode}   /* remount on mode change to clear state */
          accent={accent}
          shake={shake}
          disabled={disabled}
          onComplete={handlePin}
        />

        {/* Error message placeholder */}
        <div style={S.errText}>{error}</div>

        {/* Footer links */}
        {mode === 'check' && (
          <button
            style={S.link}
            onClick={() => { setError(''); setMode('change'); }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--amber)';
              e.currentTarget.style.borderColor = 'rgba(232,160,48,0.3)';
              e.currentTarget.style.background = 'rgba(232,160,48,0.05)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(232,160,48,0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Change PIN
          </button>
        )}
        {(mode === 'change' || mode === 'change-new' || mode === 'change-confirm') && (
          <button
            style={S.link}
            onClick={() => { setError(''); setMode('check'); }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Small branding */}
      <p style={{ marginTop: 28, fontSize: 11, color: 'rgba(255,255,255,0.14)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'DM Mono', monospace" }}>
        Obsidian · Private Browser
      </p>
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="#e8a030" strokeWidth="1.6"/>
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#e8a030" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="12" cy="16" r="1.5" fill="#e8a030"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L4 6v5c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6l-8-4z" stroke="#5cb87a" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M9 12l2 2 4-4" stroke="#5cb87a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="12" r="4" stroke="#7eb8f7" strokeWidth="1.6"/>
      <path d="M12 12h8M17 10v4" stroke="#7eb8f7" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
