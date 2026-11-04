/**
 * Extracción del color dominante de una portada para pintar el lomo de un libro.
 *
 * - Las imágenes remotas se muestrean a través de images.weserv.nl (miniatura de 24×36 con CORS)
 *   y, si falla, directamente con crossOrigin="anonymous".
 * - Los resultados se guardan en memoria y en localStorage para no volver a descargarlas.
 * - Si no hay portada o el lienzo queda contaminado, se usa una tela estable derivada del título.
 */

export type CoverTone = readonly [base: string, deep: string];

const STORAGE_KEY = 'nexus.coverTone.v1';
const MAX_ENTRIES = 600;
const MAX_CONCURRENT = 3;

// Telas de encuadernación (mismas que BookCover para libros sin portada)
const CLOTH_PALETTE: ReadonlyArray<CoverTone> = [
  ['#7a2231', '#4a1320'],
  ['#24523b', '#12301f'],
  ['#23406e', '#122241'],
  ['#8a5a22', '#553413'],
  ['#3b4252', '#1e222c'],
  ['#5b2f5e', '#321a35']
];

export const hashString = (value: string): number => {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

export const fallbackTone = (seed: string): CoverTone =>
  CLOTH_PALETTE[hashString(seed) % CLOTH_PALETTE.length];

export const pickCoverSource = (book: {
  portadaDataUrl?: string;
  portadaUrl?: string;
  portadaFallbackUrl?: string;
}): string =>
  [book.portadaDataUrl, book.portadaUrl, book.portadaFallbackUrl].find((u) =>
    Boolean(u && u.trim())
  ) || '';

/** Clave corta y estable (las data URL pueden ocupar cientos de KB). */
const keyFor = (src: string) =>
  src.startsWith('data:') ? `d${hashString(src)}:${src.length}` : `u${hashString(src)}`;

let memory: Record<string, CoverTone> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const loadMemory = (): Record<string, CoverTone> => {
  if (memory) return memory;
  memory = {};
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') memory = parsed;
    }
  } catch {
    memory = {};
  }
  return memory!;
};

const schedulePersist = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const mem = loadMemory();
      const keys = Object.keys(mem);
      if (keys.length > MAX_ENTRIES) {
        keys.slice(0, keys.length - MAX_ENTRIES).forEach((k) => delete mem[k]);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
    } catch {
      /* almacenamiento lleno o no disponible: se queda en memoria */
    }
  }, 800);
};

export const getCachedCoverTone = (src: string): CoverTone | null => {
  if (!src) return null;
  return loadMemory()[keyFor(src)] || null;
};

/* ---------- Conversión de color ---------- */

const toHex = (r: number, g: number, b: number) =>
  '#' +
  [r, g, b]
    .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
    .join('');

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
};

const hslToHex = (h: number, s: number, l: number) => {
  if (s === 0) return toHex(l * 255, l * 255, l * 255);
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return toHex(hue2rgb(p, q, h + 1 / 3) * 255, hue2rgb(p, q, h) * 255, hue2rgb(p, q, h - 1 / 3) * 255);
};

/**
 * Color dominante: agrupa los píxeles en cubos de 3 bits por canal, pondera la saturación
 * (los grises y blancos de los márgenes pesan menos) y promedia el cubo ganador.
 * El resultado se oscurece lo justo para que el título blanco del lomo siga siendo legible.
 */
const dominantTone = (data: Uint8ClampedArray): CoverTone | null => {
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 510;
    const sat = max === 0 ? 0 : (max - min) / max;
    let w = 1 + sat * 2.2;
    if (light > 0.9 || light < 0.06) w *= 0.25;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const acc = buckets.get(key) || { w: 0, r: 0, g: 0, b: 0 };
    acc.w += w;
    acc.r += r * w;
    acc.g += g * w;
    acc.b += b * w;
    buckets.set(key, acc);
  }
  let best: { w: number; r: number; g: number; b: number } | null = null;
  buckets.forEach((acc) => {
    if (!best || acc.w > best.w) best = acc;
  });
  if (!best) return null;
  const { w, r, g, b } = best as { w: number; r: number; g: number; b: number };
  const [h, s, l] = rgbToHsl(r / w, g / w, b / w);
  const baseL = Math.min(0.42, Math.max(0.17, l));
  const baseS = Math.min(0.72, s);
  return [hslToHex(h, baseS, baseL), hslToHex(h, Math.min(0.8, baseS * 1.05), baseL * 0.5)];
};

/* ---------- Carga y muestreo ---------- */

const loadImage = (src: string, cors: boolean): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    const timer = setTimeout(() => resolve(null), 5000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 2 ? img : null);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });

const sample = (img: HTMLImageElement): CoverTone | null => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 12;
    canvas.height = 18;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, 12, 18);
    return dominantTone(ctx.getImageData(0, 0, 12, 18).data);
  } catch {
    return null; // lienzo contaminado
  }
};

const candidatesFor = (src: string): Array<[string, boolean]> => {
  if (src.startsWith('data:') || src.startsWith('blob:')) return [[src, false]];
  if (/^https?:\/\//.test(src)) {
    const proxied = `https://images.weserv.nl/?url=${encodeURIComponent(
      src.replace(/^https?:\/\//, '')
    )}&w=24&h=36&fit=cover&output=png`;
    return [
      [proxied, true],
      [src, true]
    ];
  }
  return [[src, true]];
};

const inflight = new Map<string, Promise<CoverTone | null>>();
const failed = new Set<string>();
let active = 0;
const queue: Array<() => void> = [];

const runLimited = <T>(task: () => Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const start = () => {
      active++;
      task()
        .then(resolve, reject)
        .finally(() => {
          active--;
          const next = queue.shift();
          if (next) next();
        });
    };
    if (active < MAX_CONCURRENT) start();
    else queue.push(start);
  });

/** Devuelve el tono del lomo para una portada (cacheado). Nunca lanza. */
export const extractCoverTone = (src: string): Promise<CoverTone | null> => {
  if (!src || typeof document === 'undefined') return Promise.resolve(null);
  const key = keyFor(src);
  const cached = loadMemory()[key];
  if (cached) return Promise.resolve(cached);
  if (failed.has(key)) return Promise.resolve(null);
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = runLimited(async () => {
    for (const [url, cors] of candidatesFor(src)) {
      const img = await loadImage(url, cors);
      const tone = img ? sample(img) : null;
      if (tone) {
        loadMemory()[key] = tone;
        schedulePersist();
        return tone;
      }
    }
    failed.add(key); // no reintentar en esta sesión
    return null;
  }).finally(() => inflight.delete(key));

  inflight.set(key, job);
  return job;
};
