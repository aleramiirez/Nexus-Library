import React, { useEffect, useRef } from 'react';

/**
 * Fondo animado para Nexus Library.
 * Motas de polvo dorado / bronce, "nexos" (constelaciones tenues) entre las motas cercanas,
 * y un orbe de luz cálida (como una llama de vela) que sigue al puntero con volutas y bruma,
 * iluminando y atrayendo suavemente las motas y nexos próximos.
 * Se adapta dinámicamente tanto al modo claro (papel crema) como al modo oscuro.
 */

// 1. Constantes de ajuste agrupadas arriba
const INFLUENCE_RADIUS = 230; // Radio de influencia sobre motas y nexos (px)
const GLOW_MAX_RADIUS = 300; // Tope en px del radio del resplandor
const GLOW_SIDE_RATIO = 0.22; // Proporción del lado mayor para el resplandor (22%)
const FOLLOW_SPEED = 3.2; // Velocidad de seguimiento de la luz (k)
const IDLE_TIMEOUT_MS = 3500; // Tiempo de inactividad antes de apagar la luz (ms)
const ORB_RADIUS = 9; // Radio base del núcleo del orbe (px)
const ATTRACTION_STRENGTH = 0.05; // Fuerza de desplazamiento suave hacia la luz
const LINK_DIST = 125; // Distancia base de enlace entre motas (px)
const LINK_BOOST = 60; // Aumento de distancia de enlace bajo la luz (px)
const TETHER_COUNT = 5; // Nº máximo de hilos desde el orbe a las motas cercanas
const TETHER_MAX_DIST = 200; // Distancia máxima de los hilos del orbe (px)

const FADE_IN_RATE = 5; // Velocidad de encendido de s -> ts
const FADE_OUT_RATE = 2.2; // Velocidad de apagado de s -> ts
const WISP_RATES = [7, 4.5, 3] as const; // Velocidades k de las 3 volutas encadenadas
const WISP_RADIUS_MULTS = [3.4, 4.6, 5.8] as const; // Multiplicadores de radio de las 3 volutas
const MIST_SPAWN_INTERVAL_MS = 110; // Intervalo mínimo entre nubecillas de bruma (ms)
const MIST_MAX_ALIVE = 16; // Máximo de nubecillas vivas simultáneas
const MAX_DPR = 1.5; // Límite de devicePixelRatio por rendimiento
const MAX_MOTES = 80; // Límite máximo de motas en pantalla

// Multiplicador global de opacidad de las nubecillas de bruma (1 = valores base)
export const MIST_OPACITY = 1;

type RGB = readonly [number, number, number];

// Paleta modo oscuro: oro, ámbar, ámbar, burdeos claro
const DARK_COLORS: readonly RGB[] = [
  [229, 193, 88],
  [212, 155, 75],
  [212, 155, 75],
  [176, 64, 82]
];
// Paleta modo claro (papel crema): bronce antiguo, ámbar sepia, oro viejo, burdeos tinta
const LIGHT_COLORS: readonly RGB[] = [
  [162, 102, 24],
  [138, 82, 18],
  [180, 116, 30],
  [138, 32, 46]
];

const DARK_LINK_RGB: RGB = [212, 155, 75];
const LIGHT_LINK_RGB: RGB = [150, 94, 24];
const DARK_GOLD_TARGET: RGB = [255, 222, 130];
const LIGHT_GOLD_TARGET: RGB = [214, 148, 32];

type Mote = {
  x: number;
  y: number;
  r: number; // radio
  vx: number;
  vy: number;
  phase: number; // desfase del parpadeo y del vaivén
  colorIdx: number;
};

type MistPuff = {
  x: number;
  y: number;
  r0: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const u = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return u * u * (3 - 2 * u);
};

const lerpRgb = (a: RGB, b: RGB, t: number): string => {
  if (t <= 0) return `${a[0]}, ${a[1]}, ${a[2]}`;
  if (t >= 1) return `${b[0]}, ${b[1]}, ${b[2]}`;
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `${r}, ${g}, ${bl}`;
};

const AnimatedBackgroundComponent: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = mediaQuery.matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let lastFrameTime = 0;
    let lastMistSpawn = 0;
    let motes: Mote[] = [];
    const mists: MistPuff[] = [];

    // Parallax global suave por ratón
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    // 2. Estado de la luz {x, y, tx, ty, s, ts, last}
    const light = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      s: 0,
      ts: 0,
      last: 0
    };

    // Tres volutas encadenadas detrás del orbe
    const wisps = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 }
    ];

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
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_MOTES, Math.floor((w * h) / 18000));
      motes = Array.from({ length: count }, () => spawn(true));
    };

    // 7. Función auxiliar "suave(x, y, r, c0, c1, alfa, composición)"
    // En modo claro, subimos la proporción del borde ámbar (0.65 vs 0.4) para que el orbe
    // y su bruma contrasten con calidez y nitidez sobre el fondo de papel crema.
    const suave = (
      x: number,
      y: number,
      r: number,
      c0: string,
      c1: string,
      alfa: number,
      composicion: GlobalCompositeOperation,
      midFactor = 0.4
    ) => {
      if (alfa <= 0.001 || r <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = composicion;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${c0}, ${Math.min(1, alfa)})`);
      g.addColorStop(0.5, `rgba(${c1}, ${Math.min(1, alfa * midFactor)})`);
      g.addColorStop(1, `rgba(${c1}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const frame = (t: number) => {
      // 8. Cero trabajo extra si el modal está abierto
      if (
        document.documentElement.classList.contains('modal-open') ||
        document.body.style.overflow === 'hidden'
      ) {
        lastFrameTime = 0;
        if (mists.length > 0) mists.length = 0;
        raf = requestAnimationFrame(frame);
        return;
      }

      const dt = lastFrameTime > 0 ? Math.min(0.05, Math.max(0.001, (t - lastFrameTime) / 1000)) : 0.016;
      lastFrameTime = t;

      ctx.clearRect(0, 0, w, h);

      const isDark = document.documentElement.classList.contains('dark');
      const palette = isDark ? DARK_COLORS : LIGHT_COLORS;
      const baseLinkRgb = isDark ? DARK_LINK_RGB : LIGHT_LINK_RGB;
      const goldTargetRgb = isDark ? DARK_GOLD_TARGET : LIGHT_GOLD_TARGET;
      const linkMaxAlpha = isDark ? 0.22 : 0.28;

      // Actualizar estado de la luz (salvo en reduce-motion)
      let spd = 0;
      let orbX = light.x;
      let orbY = light.y;
      let breathR = ORB_RADIUS;

      if (!reduceMotion) {
        if (light.ts > 0 && t - light.last > IDLE_TIMEOUT_MS) {
          light.ts = 0;
        }

        const followFactor = 1 - Math.exp(-FOLLOW_SPEED * dt);
        light.x += (light.tx - light.x) * followFactor;
        light.y += (light.ty - light.y) * followFactor;

        const fadeRate = light.ts > light.s ? FADE_IN_RATE : FADE_OUT_RATE;
        light.s += (light.ts - light.s) * (1 - Math.exp(-fadeRate * dt));
        if (light.s < 0.0005 && light.ts === 0) {
          light.s = 0;
        }

        spd = Math.hypot(light.tx - light.x, light.ty - light.y);

        // Posición del orbe con vaivén orgánico (suma de dos senos)
        const wobbleAmp = 2 + Math.min(spd, 40) * 0.18;
        orbX =
          light.x + (Math.sin(t * 0.0031) + Math.sin(t * 0.0053 + 1.4)) * 0.5 * wobbleAmp;
        orbY =
          light.y + (Math.cos(t * 0.0027 + 0.8) + Math.sin(t * 0.0047 + 2.6)) * 0.5 * wobbleAmp;
        breathR = ORB_RADIUS * (1 + 0.1 * Math.sin(t * 0.0042));

        // Actualizar las 3 volutas encadenadas
        if (light.s >= 0.01) {
          for (let wi = 0; wi < 3; wi++) {
            const targetX = wi === 0 ? orbX : wisps[wi - 1].x;
            const targetY = wi === 0 ? orbY : wisps[wi - 1].y;
            const wf = 1 - Math.exp(-WISP_RATES[wi] * dt);
            wisps[wi].x += (targetX - wisps[wi].x) * wf;
            wisps[wi].y += (targetY - wisps[wi].y) * wf;
          }
        }

        // Generar nubecillas de bruma mientras la luz se mueve
        if (
          spd > 0.6 &&
          light.s > 0.05 &&
          mists.length < MIST_MAX_ALIVE &&
          t - lastMistSpawn >= MIST_SPAWN_INTERVAL_MS
        ) {
          lastMistSpawn = t;
          mists.push({
            x: orbX + (Math.random() * 2 - 1) * 7,
            y: orbY + (Math.random() * 2 - 1) * 7,
            r0: 12 + Math.random() * 12,
            vx: (Math.random() * 2 - 1) * 0.09,
            vy: -(0.06 + Math.random() * 0.22),
            born: t,
            life: 1200 + Math.random() * 900
          });
        }
      }

      const lightActive = !reduceMotion && light.s >= 0.01;
      const orbComp: GlobalCompositeOperation = isDark ? 'lighter' : 'source-over';
      const orbC0 = isDark ? '255, 226, 150' : '255, 247, 224';
      const orbC1 = isDark ? '229, 170, 70' : '226, 160, 60';
      // En modo claro subimos ligeramente la opacidad del borde ámbar (0.52 vs 0.4) para que el orbe
      // y su bruma se distingan sobre el papel crema sin oscurecer el resplandor cálido.
      const midRimFactor = isDark ? 0.4 : 0.52;

      // (a) RESPLANDOR
      if (lightActive) {
        const glowR = Math.min(GLOW_MAX_RADIUS, Math.max(w, h) * GLOW_SIDE_RATIO);
        ctx.save();
        if (isDark) {
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, glowR);
          g.addColorStop(0, `rgba(229, 193, 88, ${0.2 * light.s})`);
          g.addColorStop(0.5, `rgba(212, 155, 75, ${0.08 * light.s})`);
          g.addColorStop(1, 'rgba(212, 155, 75, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(light.x, light.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'source-over';
          // Halo ámbar tenue más grande (212,150,60, alfa ≈ 0.16*s)
          const outerR = glowR * 1.15;
          const gOuter = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, outerR);
          gOuter.addColorStop(0, `rgba(212, 150, 60, ${0.16 * light.s})`);
          gOuter.addColorStop(0.55, `rgba(212, 150, 60, ${0.07 * light.s})`);
          gOuter.addColorStop(1, 'rgba(212, 150, 60, 0)');
          ctx.fillStyle = gOuter;
          ctx.beginPath();
          ctx.arc(light.x, light.y, outerR, 0, Math.PI * 2);
          ctx.fill();

          // Degradado crema-blanco cálido (255,250,232, alfa ≈ 0.75*s)
          const gInner = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, glowR);
          gInner.addColorStop(0, `rgba(255, 250, 232, ${0.75 * light.s})`);
          gInner.addColorStop(0.5, `rgba(255, 249, 230, ${0.38 * light.s})`);
          gInner.addColorStop(1, 'rgba(255, 250, 232, 0)');
          ctx.fillStyle = gInner;
          ctx.beginPath();
          ctx.arc(light.x, light.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // (b) BRUMA (nubecillas)
      if (!reduceMotion && mists.length > 0) {
        const frameScale = dt * 60;
        for (let i = mists.length - 1; i >= 0; i--) {
          const p = mists[i];
          const age = t - p.born;
          if (age >= p.life) {
            mists.splice(i, 1);
            continue;
          }
          const u = age / p.life;
          p.x += p.vx * frameScale;
          p.y += p.vy * frameScale;
          const r = p.r0 * (1 + 0.8 * u);
          const baseMistAlpha = isDark ? 0.06 : 0.11;
          const alpha = Math.sin(Math.PI * u) * baseMistAlpha * MIST_OPACITY;
          suave(p.x, p.y, r, orbC0, orbC1, alpha, orbComp, midRimFactor);
        }
      }

      // Parallax global del ratón y cálculo de posiciones e influencia f de cada mota
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;

      const pos = motes.map((m) => {
        const sway = Math.sin(t / 2500 + m.phase) * 12;
        const depth = m.r * 10;
        let px = m.x + sway + (mouse.x - 0.5) * depth;
        let py = m.y + (mouse.y - 0.5) * depth;
        let f = 0;
        let distToOrb = Infinity;

        if (lightActive) {
          const dx = light.x - px;
          const dy = light.y - py;
          const dist = Math.hypot(dx, dy);
          if (dist < INFLUENCE_RADIUS) {
            f = light.s * smoothstep(0, 1, 1 - dist / INFLUENCE_RADIUS);
            if (f > 0) {
              // Desplazamiento suave hacia la luz y parpadeo más vivo
              px += dx * ATTRACTION_STRENGTH * f;
              py += dy * ATTRACTION_STRENGTH * f;
              m.phase += f * 1.8 * dt;
            }
          }
          distToOrb = Math.hypot(orbX - px, orbY - py);
        }

        return { x: px, y: py, f, distToOrb };
      });

      // (c) NEXOS entre motas cercanas
      const baseLineWidth = isDark ? 0.6 : 0.7;
      for (let i = 0; i < motes.length; i++) {
        const pi = pos[i];
        for (let j = i + 1; j < motes.length; j++) {
          const pj = pos[j];
          const fAvg = (pi.f + pj.f) * 0.5;
          const maxDist = LINK_DIST + LINK_BOOST * fAvg;
          const dx = pi.x - pj.x;
          if (dx >= maxDist || dx <= -maxDist) continue;
          const dy = pi.y - pj.y;
          if (dy >= maxDist || dy <= -maxDist) continue;

          const d = Math.hypot(dx, dy);
          if (d < maxDist) {
            const rawAlpha = (1 - d / maxDist) * linkMaxAlpha * (1 + 1.8 * fAvg);
            const alpha = Math.min(0.75, rawAlpha);
            const strokeRgb = lerpRgb(baseLinkRgb, goldTargetRgb, fAvg);
            ctx.lineWidth = baseLineWidth + 0.5 * fAvg;
            ctx.strokeStyle = `rgba(${strokeRgb}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }

      // (d) HILOS del orbe a las 5 motas más cercanas (dentro de 200px)
      if (lightActive) {
        const candidates: { idx: number; d: number }[] = [];
        for (let i = 0; i < pos.length; i++) {
          const d = pos[i].distToOrb;
          if (d < TETHER_MAX_DIST) {
            candidates.push({ idx: i, d });
          }
        }
        candidates.sort((a, b) => a.d - b.d);
        const count = Math.min(TETHER_COUNT, candidates.length);

        if (count > 0) {
          ctx.save();
          ctx.lineWidth = isDark ? 0.75 : 0.9;
          const tetherRgb = isDark ? '255, 222, 130' : '214, 148, 32';
          for (let k = 0; k < count; k++) {
            const target = pos[candidates[k].idx];
            const u = 1 - candidates[k].d / TETHER_MAX_DIST;
            const alphaStart = (isDark ? 0.42 : 0.48) * u * light.s;
            const alphaEnd = (isDark ? 0.14 : 0.18) * u * light.s;
            const grad = ctx.createLinearGradient(orbX, orbY, target.x, target.y);
            grad.addColorStop(0, `rgba(${tetherRgb}, ${alphaStart})`);
            grad.addColorStop(1, `rgba(${tetherRgb}, ${alphaEnd})`);
            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(orbX, orbY);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      // (e) MOTAS con brillo suave y parpadeo
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        const { x, y, f } = pos[i];
        const twinkle = 0.45 + 0.55 * Math.sin(t / 1400 + m.phase) ** 2;
        const color = lerpRgb(palette[m.colorIdx], goldTargetRgb, f);
        const glow = m.r * (isDark ? 6 : 5.5) * (1 + 0.9 * f);
        const coreAlpha = Math.min(1, (isDark ? 0.9 : 0.85) * twinkle * (1 + 0.4 * f));
        const midAlpha = Math.min(1, (isDark ? 0.25 : 0.28) * twinkle * (1 + 0.4 * f));

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
      }

      // (f) ORBE con sus volutas
      if (lightActive) {
        const wispAlpha = (isDark ? 0.2 : 0.34) * light.s;
        for (let wi = 2; wi >= 0; wi--) {
          suave(
            wisps[wi].x,
            wisps[wi].y,
            breathR * WISP_RADIUS_MULTS[wi],
            orbC0,
            orbC1,
            wispAlpha,
            orbComp,
            midRimFactor
          );
        }

        // Halo del orbe (2.6x el radio, alfa 0.55*s)
        suave(orbX, orbY, breathR * 2.6, orbC0, orbC1, 0.55 * light.s, orbComp, midRimFactor);

        // Núcleo del orbe (radio 9px ±10%, centro blanco cálido 255,252,240, alfa 0.95*s)
        suave(
          orbX,
          orbY,
          breathR,
          '255, 252, 240',
          isDark ? orbC0 : orbC1,
          0.95 * light.s,
          orbComp,
          isDark ? 0.5 : 0.72
        );
      }

      raf = requestAnimationFrame(frame);
    };

    const activateAtPointer = (e: PointerEvent) => {
      if (reduceMotion) return;
      mouse.tx = w > 0 ? e.clientX / w : 0.5;
      mouse.ty = h > 0 ? e.clientY / h : 0.5;
      light.tx = e.clientX;
      light.ty = e.clientY;
      light.last = performance.now();

      // Si la luz estaba apagada (s < 0.03), colocarla directamente en el puntero
      if (light.s < 0.03) {
        light.x = e.clientX;
        light.y = e.clientY;
        for (let i = 0; i < 3; i++) {
          wisps[i].x = e.clientX;
          wisps[i].y = e.clientY;
        }
      }
      light.ts = 1;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        light.ts = 0;
      }
    };

    const onPointerCancel = () => {
      light.ts = 0;
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        light.ts = 0;
      }
    };

    const onWindowBlur = () => {
      light.ts = 0;
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      lastFrameTime = 0;
      if (document.hidden) {
        light.ts = 0;
        light.s = 0;
        mists.length = 0;
      } else if (!reduceMotion) {
        raf = requestAnimationFrame(frame);
      }
    };

    const attachPointerListeners = () => {
      window.addEventListener('pointermove', activateAtPointer, { passive: true });
      window.addEventListener('pointerdown', activateAtPointer, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      window.addEventListener('pointercancel', onPointerCancel, { passive: true });
      window.addEventListener('mouseout', onMouseOut, { passive: true });
      window.addEventListener('blur', onWindowBlur);
    };

    const detachPointerListeners = () => {
      window.removeEventListener('pointermove', activateAtPointer);
      window.removeEventListener('pointerdown', activateAtPointer);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('blur', onWindowBlur);
    };

    const onReduceMotionChange = (e: MediaQueryListEvent) => {
      reduceMotion = e.matches;
      cancelAnimationFrame(raf);
      lastFrameTime = 0;
      light.s = 0;
      light.ts = 0;
      mists.length = 0;
      if (reduceMotion) {
        detachPointerListeners();
        frame(0);
        cancelAnimationFrame(raf);
      } else {
        attachPointerListeners();
        if (!document.hidden) {
          raf = requestAnimationFrame(frame);
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    mediaQuery.addEventListener('change', onReduceMotionChange);

    if (reduceMotion) {
      frame(0);
      cancelAnimationFrame(raf);
    } else {
      attachPointerListeners();
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      mediaQuery.removeEventListener('change', onReduceMotionChange);
      detachPointerListeners();
      mists.length = 0;
      motes.length = 0;
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
