import React, { useEffect, useRef } from 'react';

/**
 * Fondo animado para Nexus Library.
 * Motas de polvo dorado / bronce y "nexos" (constelaciones tenues) entre las motas cercanas.
 * Se adapta dinámicamente tanto al modo claro (papel crema con tonos bronce, ámbar tostado y burdeos)
 * como al modo oscuro (oro brillante, ámbar y carmesí).
 */

type Mote = {
  x: number;
  y: number;
  r: number; // radio
  vx: number;
  vy: number;
  phase: number; // desfase del parpadeo y del vaivén
  colorIdx: number;
};

// Paleta modo oscuro: oro, ámbar, ámbar, burdeos claro
const DARK_COLORS = ['229, 193, 88', '212, 155, 75', '212, 155, 75', '176, 64, 82'];
// Paleta modo claro (papel crema): bronce antiguo, ámbar sepia, oro viejo, burdeos tinta
const LIGHT_COLORS = ['162, 102, 24', '138, 82, 18', '180, 116, 30', '138, 32, 46'];
const LINK_DIST = 125;

const AnimatedBackgroundComponent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let motes: Mote[] = [];
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + 0.65,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.25 + 0.05),
      phase: Math.random() * Math.PI * 2,
      colorIdx: Math.floor(Math.random() * DARK_COLORS.length)
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(80, Math.floor((w * h) / 18000));
      motes = Array.from({ length: count }, () => spawn(true));
    };

    const frame = (t: number) => {
      // Pausar el redibujado del canvas cuando hay un modal abierto para garantizar 60/120fps puros en las animaciones 3D
      if (document.body.style.overflow === 'hidden') {
        raf = requestAnimationFrame(frame);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const isDark = document.documentElement.classList.contains('dark');
      const palette = isDark ? DARK_COLORS : LIGHT_COLORS;
      const linkRgb = isDark ? '212, 155, 75' : '150, 94, 24';
      const linkMaxAlpha = isDark ? 0.22 : 0.28;

      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      const pos = motes.map((m) => {
        const sway = Math.sin(t / 2500 + m.phase) * 12;
        const depth = m.r * 10;
        return {
          x: m.x + sway + (mouse.x - 0.5) * depth,
          y: m.y + (mouse.y - 0.5) * depth
        };
      });

      // Nexos (constelaciones) entre motas cercanas
      ctx.lineWidth = isDark ? 0.6 : 0.7;
      for (let i = 0; i < motes.length; i++) {
        for (let j = i + 1; j < motes.length; j++) {
          const dx = pos[i].x - pos[j].x;
          const dy = pos[i].y - pos[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(${linkRgb}, ${(1 - d / LINK_DIST) * linkMaxAlpha})`;
            ctx.beginPath();
            ctx.moveTo(pos[i].x, pos[i].y);
            ctx.lineTo(pos[j].x, pos[j].y);
            ctx.stroke();
          }
        }
      }

      // Motas con brillo suave y parpadeo
      motes.forEach((m, i) => {
        const twinkle = 0.45 + 0.55 * Math.sin(t / 1400 + m.phase) ** 2;
        const { x, y } = pos[i];
        const color = palette[m.colorIdx];
        const glow = m.r * (isDark ? 6 : 5.5);
        const coreAlpha = (isDark ? 0.9 : 0.85) * twinkle;
        const midAlpha = (isDark ? 0.25 : 0.28) * twinkle;

        const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
        g.addColorStop(0, `rgba(${color}, ${coreAlpha})`);
        g.addColorStop(0.28, `rgba(${color}, ${midAlpha})`);
        g.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, glow, 0, Math.PI * 2);
        ctx.fill();

        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -20 || m.x < -40 || m.x > w + 40) {
          motes[i] = spawn(false);
        }
      });

      raf = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      mouse.tx = e.clientX / w;
      mouse.ty = e.clientY / h;
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduceMotion) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    document.addEventListener('visibilitychange', onVisibility);

    if (reduceMotion) {
      frame(0);
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="block pointer-events-none select-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="nexus-rays" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export const AnimatedBackground = React.memo(AnimatedBackgroundComponent);
