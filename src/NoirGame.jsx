import React, { useEffect, useRef, useState, useCallback } from 'react';

const NoirGame = ({ onExit }) => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'paused', 'gameover'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('noir-highscore') || '0'));
  const [lives, setLives] = useState(5);
  
  const requestRef = useRef();
  const stateRef = useRef({
    gameState: 'start',
    player: { x: 0, y: 0, size: 20, targetX: 0 },
    mouse: { x: 0, y: 0 },
    bullets: [],
    enemies: [],
    particles: [],
    stars: [],
    score: 0,
    lives: 5,
    speed: 3,
    lastEnemyTime: 0,
    lastShootTime: 0,
    isSpacePressed: false,
    spawnInterval: 1200,
    frame: 0
  });

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    stateRef.current = {
      gameState: 'playing',
      player: { 
        x: canvas.width / 2, 
        y: canvas.height - 80, 
        size: 18, 
        targetX: canvas.width / 2 
      },
      mouse: { x: canvas.width / 2, y: canvas.height / 2 },
      bullets: [],
      enemies: [],
      particles: [],
      stars: Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 1.5 + 0.5
      })),
      score: 0,
      lives: 5,
      speed: 3.5,
      lastEnemyTime: 0,
      lastShootTime: 0,
      spawnInterval: 1200,
      frame: 0
    };
    setGameState('playing');
    setScore(0);
    setLives(3);
  }, []);

  const togglePause = useCallback(() => {
    setGameState(prev => {
      const next = prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev;
      stateRef.current.gameState = next;
      return next;
    });
  }, []);

  const handleGameOver = useCallback(() => {
    stateRef.current.gameState = 'gameover';
    setGameState('gameover');
    setHighScore(prev => {
      const newHigh = Math.max(prev, Math.floor(stateRef.current.score));
      localStorage.setItem('noir-highscore', newHigh);
      return newHigh;
    });
  }, []);

  const spawnExplosion = (x, y, color = 'rgba(255,255,255,0.5)', count = 10) => {
    for(let i=0; i<count; i++) {
      stateRef.current.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color
      });
    }
  };

  const update = useCallback((time) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const state = stateRef.current;

    if (state.gameState === 'playing') {
      state.frame++;
      
      // Speed up over time
      state.speed = 3.5 + (state.score / 2000);
      state.spawnInterval = Math.max(300, 1200 - (state.score / 10));

      // Player interpolation
      state.player.x += (state.player.targetX - state.player.x) * 0.2;

      // Manual Shooting (Space)
      if (state.isSpacePressed && time - state.lastShootTime > 150) {
        state.bullets.push({
          x: state.player.x,
          y: state.player.y - state.player.size,
          speed: 12
        });
        state.lastShootTime = time;
      }

      // Spawn Enemies
      if (time - state.lastEnemyTime > state.spawnInterval) {
        const types = ['square', 'triangle', 'pentagon'];
        const type = types[Math.floor(Math.random() * types.length)];
        const size = 25 + Math.random() * 25;
        state.enemies.push({
          x: Math.random() * (canvas.width - size),
          y: -size,
          size,
          type,
          hp: type === 'pentagon' ? 3 : 1,
          speed: state.speed * (0.7 + Math.random() * 0.6),
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 0.05
        });
        state.lastEnemyTime = time;
      }

      // Update Stars
      state.stars.forEach(s => {
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = -s.size; s.x = Math.random() * canvas.width; }
      });

      // Update Bullets
      state.bullets = state.bullets.filter(b => {
        b.y -= b.speed;
        return b.y > -20;
      });

      // Update Enemies
      state.enemies = state.enemies.filter(e => {
        e.y += e.speed;
        e.rotation += e.rotSpeed;

        // Collision with player
        const dx = e.x + e.size/2 - state.player.x;
        const dy = e.y + e.size/2 - state.player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < (e.size/2 + state.player.size/2) * 0.8) {
          spawnExplosion(state.player.x, state.player.y, 'var(--amber)', 20);
          state.lives--;
          setLives(state.lives);
          if (state.lives <= 0) handleGameOver();
          return false; // Destroy enemy on hit
        }

        // Collision with bullets
        let hit = false;
        state.bullets = state.bullets.filter(b => {
          if (hit) return true;
          if (b.x > e.x && b.x < e.x + e.size && b.y > e.y && b.y < e.y + e.size) {
            e.hp--;
            spawnExplosion(b.x, b.y, 'rgba(255,255,255,0.8)', 3);
            if (e.hp <= 0) {
              state.score += 100;
              setScore(state.score);
              spawnExplosion(e.x + e.size/2, e.y + e.size/2, 'rgba(255,255,255,0.3)', 15);
              hit = true;
            }
            return false;
          }
          return true;
        });

        const passed = e.y > canvas.height;
        if (passed) {
          // Penalty for letting enemies pass
          state.lives--;
          setLives(state.lives);
          if (state.lives <= 0) handleGameOver();
          // Visual feedback for leak
          spawnExplosion(e.x + e.size/2, canvas.height - 10, 'var(--red)', 5);
        }

        return !hit && !passed;
      });

      // Update Particles
      state.particles = state.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        return p.life > 0;
      });
    }

    // DRAW
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    state.stars.forEach(s => { ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fill(); });

    // Bullets
    ctx.fillStyle = 'var(--amber)';
    ctx.shadowBlur = 10; ctx.shadowColor = 'var(--amber)';
    state.bullets.forEach(b => { ctx.fillRect(b.x - 1, b.y, 2, 12); });
    ctx.shadowBlur = 0;

    // Particles
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Enemies
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    state.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x + e.size/2, e.y + e.size/2);
      ctx.rotate(e.rotation);
      ctx.beginPath();
      if (e.type === 'square') ctx.strokeRect(-e.size/2, -e.size/2, e.size, e.size);
      else if (e.type === 'pentagon') {
        for(let i=0; i<5; i++) {
          const ang = (i / 5) * Math.PI * 2;
          const x = Math.cos(ang) * e.size/2;
          const y = Math.sin(ang) * e.size/2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      } else {
        ctx.moveTo(0, -e.size/2); ctx.lineTo(e.size/2, e.size/2); ctx.lineTo(-e.size/2, e.size/2);
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    });

    // Player
    if (state.gameState !== 'gameover') {
      ctx.shadowBlur = 20; ctx.shadowColor = 'var(--amber)';
      ctx.fillStyle = 'var(--amber)';
      ctx.beginPath();
      ctx.moveTo(state.player.x, state.player.y - state.player.size);
      ctx.lineTo(state.player.x + state.player.size, state.player.y + state.player.size);
      ctx.lineTo(state.player.x - state.player.size, state.player.y + state.player.size);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Custom Cursor
    ctx.save();
    ctx.translate(state.mouse.x, state.mouse.y);
    ctx.strokeStyle = 'var(--amber)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0); ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    requestRef.current = requestAnimationFrame(update);
  }, [handleGameOver]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      stateRef.current.mouse = { x, y };
      if (stateRef.current.gameState === 'playing') stateRef.current.player.targetX = x;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') togglePause();
      else if (e.key === ' ') {
        stateRef.current.isSpacePressed = true;
        if (stateRef.current.gameState !== 'playing') initGame();
      } else if (stateRef.current.gameState === 'playing') {
        if (e.key === 'ArrowLeft') stateRef.current.player.targetX -= 50;
        if (e.key === 'ArrowRight') stateRef.current.player.targetX += 50;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === ' ') stateRef.current.isSpacePressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(requestRef.current);
    };
  }, [update, initGame, togglePause]);

  return (
    <div style={{
      width: '100%', height: '100%', background: '#0a0a0b',
      position: 'relative', overflow: 'hidden', cursor: 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-ui)'
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* UI Overlay */}
      <div style={{ position: 'absolute', top: 20, left: 30, pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>Integrity</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ width: 20, height: 4, background: i < lives ? 'var(--amber)' : 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
          ))}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 20, right: 30, textAlign: 'right', pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>Signal Intensity</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>{score.toString().padStart(6, '0')}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>PEAK: {highScore}</div>
      </div>

      {gameState === 'start' && (
        <div style={{ zIndex: 10, textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: -2 }}>OBSIDIAN DEFENDER</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 30, fontSize: 14 }}>Guard the boundary. Do not let them pass.</p>
          <button onClick={initGame} style={{
            background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 8,
            padding: '14px 36px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 0 30px var(--amber-glow)', transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>INITIATE DEFENSE</button>
          <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 20, justifyContent: 'center' }}>
            <span>MOUSE / ARROWS: Move</span>
            <span>SPACE: Fire Cannon</span>
            <span>ESC: Pause</span>
          </div>
        </div>
      )}

      {gameState === 'paused' && (
        <div style={{ zIndex: 10, textAlign: 'center', background: 'rgba(0,0,0,0.7)', inset: 0, position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24, letterSpacing: 4 }}>SIGNAL PAUSED</h2>
          <button onClick={togglePause} style={{
            background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 8,
            padding: '12px 32px', fontSize: 14, fontWeight: 700, cursor: 'pointer'
          }}>RESUME</button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div style={{ zIndex: 10, textAlign: 'center', animation: 'modalIn 0.3s ease' }}>
          <h2 style={{ fontSize: 40, fontWeight: 800, color: 'var(--red)', marginBottom: 8 }}>SIGNAL LOST</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Purge complete. Efficiency: {score} units.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={initGame} style={{ background: 'var(--amber)', color: '#000', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>REBOOT</button>
            <button onClick={onExit} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>EXIT</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoirGame;
