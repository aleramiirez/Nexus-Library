import React, { useEffect, useRef } from 'react';

/**
 * Fondo animado para Nexus Library.
 * Motas de polvo dorado flotando en una biblioteca, con haces de luz suaves
 * y "nexos" (líneas tenues) entre las motas cercanas. Reacciona suavemente al ratón.
 *
 * Los haces de luz usan la clase .nexus-rays (ver CSS en index.css).
 */

type Mote = {
  x: number;
  y: number;
  r: number; // radio
  vx: number;
  vy: number;
  phase: number; // desfase del parpadeo y del vaivén
  color: string; // "r, g, b"
};

// oro, ámbar, ámbar, burdeos claro (de tu paleta nexus)
const COLORS = ['229, 193, 88', '212, 155, 75', '212, 155, 75', '176, 64, 82'];
const LINK_DIST = 120;

export const AnimatedBackground: React.FC = () => {
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
      r: Math.random() * 1.8 + 0.6,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.25 + 0.05), // suben despacio
      phase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // menos motas en pantallas pequeñas para cuidar la batería
      const count = Math.min(80, Math.floor((w * h) / 18000));
      motes = Array.from({ length: count }, () => spawn(true));
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // suaviza el seguimiento del ratón
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      // posiciones calculadas (con parallax según el tamaño de la mota)
      const pos = motes.map((m) => {
        const sway = Math.sin(t / 2500 + m.phase) * 12;
        const depth = m.r * 10;
        return {
          x: m.x + sway + (mouse.x - 0.5) * depth,
          y: m.y + (mouse.y - 0.5) * depth
        };
      });

      // nexos entre motas cercanas
      ctx.lineWidth = 0.6;
      for (let i = 0; i < motes.length; i++) {
        for (let j = i + 1; j < motes.length; j++) {
          const dx = pos[i].x - pos[j].x;
          const dy = pos[i].y - pos[j].y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            ctx.strokeStyle = `rgba(212, 155, 75, ${(1 - d / LINK_DIST) * 0.22})`;
            ctx.beginPath();
            ctx.moveTo(pos[i].x, pos[i].y);
            ctx.lineTo(pos[j].x, pos[j].y);
            ctx.stroke();
          }
        }
      }

      // motas con brillo suave y parpadeo
      motes.forEach((m, i) => {
        const twinkle = 0.45 + 0.55 * Math.sin(t / 1400 + m.phase) ** 2;
        const { x, y } = pos[i];
        const glow = m.r * 6;
        const g = ctx.createRadialGradient(x, y, 0, x, y, glow);
        g.addColorStop(0, `rgba(${m.color}, ${0.9 * twinkle})`);
        g.addColorStop(0.25, `rgba(${m.color}, ${0.25 * twinkle})`);
        g.addColorStop(1, `rgba(${m.color}, 0)`);
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

    // pausa cuando la pestaña no está visible
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduceMotion) raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    document.addEventListener('visibilitychange', onVisibility);

    if (reduceMotion) {
      frame(0); // un solo fotograma estático
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
      className="hidden dark:block pointer-events-none select-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="nexus-rays" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
