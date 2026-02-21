import React, { useRef, useEffect } from 'react';
import { ReactorState, GamePhase } from '@meltdown/shared';

interface Props {
  reactor: ReactorState;
  phase: GamePhase;
}

export function ReactorDisplay({ reactor, phase }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      life: number; maxLife: number; size: number;
      color: string; type: string;
    }> = [];

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Clear
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Core temperature drives color
      const tempNorm = Math.min(1, reactor.temperature / 1000);
      const coreR = Math.floor(50 + tempNorm * 205);
      const coreG = Math.floor(150 - tempNorm * 150);
      const coreB = Math.floor(255 - tempNorm * 200);

      // Containment ring
      const ringRadius = Math.min(w, h) * 0.35;
      const containNorm = reactor.containment / 100;

      ctx.strokeStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${0.3 + containNorm * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Secondary containment
      ctx.strokeStyle = `rgba(0, 204, 255, ${0.1 + containNorm * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius + 10, 0, Math.PI * 2);
      ctx.stroke();

      // Coolant flow visualization
      const flowNorm = (reactor.coolantFlow / 100) * (reactor.coolantLevel / 100);
      const coolantSegments = 12;
      for (let i = 0; i < coolantSegments; i++) {
        const angle = (i / coolantSegments) * Math.PI * 2 + t * flowNorm * 2;
        const x = cx + Math.cos(angle) * (ringRadius + 20);
        const y = cy + Math.sin(angle) * (ringRadius + 20);
        ctx.fillStyle = `rgba(0, 150, 255, ${0.3 * flowNorm})`;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core glow
      const pulseSize = 1 + Math.sin(t * 2) * 0.05 * (1 + tempNorm);
      const coreRadius = Math.min(w, h) * 0.12 * pulseSize;

      // Outer glow
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 3);
      gradient.addColorStop(0, `rgba(${coreR}, ${coreG}, ${coreB}, 0.3)`);
      gradient.addColorStop(0.5, `rgba(${coreR}, ${coreG}, ${coreB}, 0.1)`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Core
      const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
      coreGradient.addColorStop(0.3, `rgba(${coreR}, ${coreG}, ${coreB}, 0.8)`);
      coreGradient.addColorStop(1, `rgba(${coreR}, ${coreG}, ${coreB}, 0.2)`);
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Shield visualization
      if (reactor.shieldStrength > 10) {
        const shieldAlpha = (reactor.shieldStrength / 100) * 0.3;
        ctx.strokeStyle = `rgba(100, 200, 255, ${shieldAlpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius - 15, 0, Math.PI * 2 * (reactor.shieldStrength / 100));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Radiation particles
      if (reactor.radiation > 20) {
        const radCount = Math.floor((reactor.radiation - 20) / 10);
        for (let i = 0; i < radCount && particles.length < 500; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 2;
          particles.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 60, maxLife: 60,
            size: 1 + Math.random() * 2,
            color: `rgba(0, 255, 100, `,
            type: 'radiation',
          });
        }
      }

      // Fire particles for high temp
      if (reactor.temperature > 700) {
        const fireCount = Math.floor((reactor.temperature - 700) / 100);
        for (let i = 0; i < fireCount && particles.length < 500; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = coreRadius + Math.random() * 30;
          particles.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 1,
            vy: -1 - Math.random() * 2,
            life: 30, maxLife: 30,
            size: 2 + Math.random() * 3,
            color: `rgba(255, ${Math.floor(100 + Math.random() * 100)}, 0, `,
            type: 'fire',
          });
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color + alpha.toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      // Phase-specific effects
      if (phase >= GamePhase.CriticalMeltdown) {
        // Screen shake effect via canvas transform
        const shakeX = (Math.random() - 0.5) * 4 * (phase === GamePhase.FinalCountdown ? 2 : 1);
        const shakeY = (Math.random() - 0.5) * 4 * (phase === GamePhase.FinalCountdown ? 2 : 1);
        canvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
      } else {
        canvas.style.transform = '';
      }

      // Scanline overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 2);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Update reactor ref for animation loop - we use a ref trick
  const reactorRef = useRef(reactor);
  const phaseRef = useRef(phase);
  reactorRef.current = reactor;
  phaseRef.current = phase;

  const getColor = (value: number, thresholds: [number, number]) =>
    value >= thresholds[1] ? 'danger' : value >= thresholds[0] ? 'warning' : 'safe';

  return (
    <div className="reactor-canvas-container">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div className="reactor-overlay">
        <div className="overlay-gauges">
          <div className="mini-gauge">
            <div className="label">Temp</div>
            <div className={`value ${getColor(reactor.temperature, [600, 800])}`}>
              {Math.round(reactor.temperature)}K
            </div>
          </div>
          <div className="mini-gauge">
            <div className="label">Pressure</div>
            <div className={`value ${getColor(reactor.pressure, [60, 80])}`}>
              {reactor.pressure.toFixed(1)}MPa
            </div>
          </div>
          <div className="mini-gauge">
            <div className="label">Power</div>
            <div className="value" style={{ color: 'var(--accent)' }}>
              {reactor.powerOutput.toFixed(0)}%
            </div>
          </div>
          <div className="mini-gauge">
            <div className="label">Stability</div>
            <div className={`value ${getColor(100 - reactor.stability, [50, 80])}`}>
              {reactor.stability.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
