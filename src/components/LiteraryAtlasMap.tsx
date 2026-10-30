import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Compass, Minus, Plus, Globe, Maximize2, Minimize2 } from 'lucide-react';
import '../literary-atlas.css';

/* ==========================================================================
   Contrato público
   ========================================================================== */

export type ContinentId = 'all' | 'europe' | 'latam' | 'north_america' | 'asia' | 'africa' | 'oceania';

export interface CountryMapNode {
  code: string; // Código ISO-2 en mayúsculas
  name: string;
  flag: string;
  continent: Exclude<ContinentId, 'all'>;
  readCount: number; // Libros leídos por el usuario en este país
  readingCount: number; // Libros leyendo actualmente
  unreadCount: number; // Libros pendientes en su biblioteca
  totalCount: number; // Total en su biblioteca (read + reading + unread)
  canonCount: number; // Obras maestras disponibles para descubrir en este país
  firstReadDate?: string;
}

export interface LiteraryAtlasMapProps {
  countries: CountryMapNode[];
  selectedCountryCode: string | null;
  activeContinent: ContinentId;
  onSelectCountry: (code: string) => void;
  onSelectContinent: (continent: ContinentId) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

/* ==========================================================================
   Proyección y utilidades geométricas
   ========================================================================== */

type LL = [number, number]; // [longitud, latitud]
type XY = [number, number];
type Rect = { x: number; y: number; w: number; h: number };
type RegionId = Exclude<ContinentId, 'all'>;
type Status = 'conquered' | 'exploring' | 'discover';

const MAP_W = 1000;
const MAP_H = 520;
const LAT_TOP = 84;
const LAT_SPAN = 142; // 84°N … 58°S
const MIN_W = 125; // zoom máximo ×8
const EASE_MS = 600;

const px = (lon: number) => (lon + 180) * (MAP_W / 360);
const py = (lat: number) => (LAT_TOP - lat) * (MAP_H / LAT_SPAN);
const pt = (p: LL): XY => [px(p[0]), py(p[1])];
const f1 = (n: number) => Math.round(n * 10) / 10;

/** Curva cerrada suave (Catmull-Rom → Bézier) para trazos orgánicos de costa. */
function smoothClosed(pts: XY[], k = 0.7): string {
  const n = pts.length;
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * k;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * k;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * k;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * k;
    d += `C${f1(c1x)},${f1(c1y)} ${f1(c2x)},${f1(c2y)} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d + 'Z';
}
const polyPath = (poly: LL[]) => smoothClosed(poly.map(pt));

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number) => {
    let lo = 0;
    let hi = 1;
    let u = t;
    for (let i = 0; i < 28; i++) {
      const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
      if (Math.abs(x - t) < 1e-5) break;
      if (x < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
  };
}
const EASE = cubicBezier(0.22, 1, 0.36, 1);

function clampRect(r: Rect): Rect {
  const w = Math.min(MAP_W, Math.max(MIN_W, r.w));
  const h = (w * MAP_H) / MAP_W;
  return {
    w,
    h,
    x: Math.min(MAP_W - w, Math.max(0, r.x)),
    y: Math.min(MAP_H - h, Math.max(0, r.y)),
  };
}

/** Encuadre de una región geográfica manteniendo la proporción del lienzo. */
function regionRect(lon0: number, lon1: number, lat0: number, lat1: number): Rect {
  const x0 = px(lon0);
  const x1 = px(lon1);
  const y0 = py(lat0);
  const y1 = py(lat1);
  let w = x1 - x0;
  let h = y1 - y0;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const ar = MAP_W / MAP_H;
  if (w / h < ar) w = h * ar;
  else h = w / ar;
  return clampRect({ x: cx - w / 2, y: cy - h / 2, w, h });
}

const WORLD: Rect = { x: 0, y: 0, w: MAP_W, h: MAP_H };

const PRESETS: Record<ContinentId, Rect> = {
  all: WORLD,
  europe: regionRect(-17, 52, 64, 35),
  latam: regionRect(-118, -32, 30, -56),
  north_america: regionRect(-170, -50, 72, 14),
  asia: regionRect(24, 150, 56, 5),
  africa: regionRect(-22, 56, 40, -37),
  oceania: regionRect(108, 180, -5, -49),
};

/** Escala de los marcadores: crecen con el zoom, pero menos que el mapa. */
const markerScale = (z: number) => Math.min(1.6, 0.4 + 0.34 * (z - 1)) / z;

/* ==========================================================================
   Geografía: siluetas continentales [lon, lat]
   ========================================================================== */

const NORTH_AMERICA: LL[] = [
  [-168, 65.6], [-166, 68.3], [-162, 70.2], [-156.5, 71.3], [-152, 70.8], [-146, 70.2], [-141, 69.7],
  [-135, 69], [-129, 70], [-125, 69.5], [-121, 69.6], [-117, 68.9], [-113, 68.4], [-108, 68.2],
  [-104, 68], [-98, 68], [-95.5, 70], [-92.5, 69.5], [-90, 68.2], [-86, 67.8], [-83, 69.5],
  [-82, 67], [-85, 66], [-88, 64.2], [-90, 63.2], [-93, 61.5], [-94.5, 59.5], [-93, 58],
  [-90, 57], [-86, 55.8], [-82.5, 55], [-82.2, 53], [-80, 51.6], [-79, 52.7], [-78.8, 55],
  [-77, 57.5], [-78, 59], [-77.5, 60.8], [-74, 62.2], [-71, 61], [-69.5, 59], [-65.5, 60.3],
  [-64.5, 58.6], [-62, 57.5], [-61.5, 56], [-58, 54.5], [-56, 52.2], [-59.5, 50.2], [-64.5, 49.2],
  [-66.5, 49.2], [-64.5, 48.2], [-65.2, 47.3], [-64.7, 46.3], [-62, 46], [-61, 45.6], [-60, 46.2],
  [-61, 45.1], [-64, 44.2], [-66, 43.6], [-67, 44.8], [-69, 44], [-70.2, 43.6], [-70.8, 42.6],
  [-70, 41.8], [-70.6, 41.5], [-72, 41.2], [-74, 40.5], [-74, 39.5], [-75.2, 38.4], [-76, 37],
  [-75.7, 35.5], [-77, 34.6], [-79, 33.2], [-80.8, 32], [-81.4, 30.5], [-80.5, 28], [-80, 26],
  [-80.8, 25.2], [-81.8, 26.2], [-82.8, 28], [-83.2, 29.6], [-85, 29.7], [-86.5, 30.3],
  [-88.5, 30.3], [-89.5, 29.3], [-91, 29.2], [-93, 29.7], [-94.8, 29.2], [-96.5, 28],
  [-97.3, 26], [-97.7, 24], [-97.8, 22], [-97.2, 20.5], [-96, 19], [-94.5, 18.2], [-92.5, 18.5],
  [-91, 18.8], [-90.5, 20], [-90, 21.2], [-88, 21.5], [-87, 21.3], [-87.5, 19], [-88.3, 17.5],
  [-88.2, 16], [-86, 15.9], [-84, 15.6], [-83.3, 14.5], [-83.6, 12], [-83.8, 10.9], [-82.5, 9.6],
  [-81.2, 8.8], [-79.8, 9.5], [-78, 9.2], [-77.4, 8.6], [-78.5, 8], [-80, 7.3], [-81.8, 8.2],
  [-83.3, 8.5], [-85.7, 10], [-85.7, 11.2], [-87.4, 12.9], [-89.3, 13.4], [-91.4, 14],
  [-92.2, 14.5], [-94, 16], [-96, 15.7], [-98, 16.2], [-100, 17], [-102, 18], [-104, 19],
  [-105.5, 20.5], [-105.3, 22.5], [-106.7, 23.5], [-108.5, 25.5], [-110.5, 27.5], [-112.5, 29.5],
  [-114.8, 31.7], [-114.3, 30], [-113, 28.6], [-112.2, 26.5], [-110.4, 24.2], [-109.5, 23.2],
  [-110.3, 23.4], [-112, 24.8], [-113.5, 26.7], [-114.8, 28.5], [-115.8, 30], [-117.2, 32.6],
  [-118.5, 34], [-120.6, 34.5], [-122.5, 37.5], [-123.8, 39.5], [-124.3, 41.5], [-124.1, 44],
  [-124, 46.5], [-124.7, 48.3], [-123, 48.5], [-122.5, 49], [-124.5, 50], [-127, 51],
  [-128, 52.5], [-130, 54.5], [-132, 56], [-134, 58], [-137, 58.8], [-140, 59.8], [-144, 60],
  [-148, 60.3], [-151.5, 59.2], [-152.5, 58], [-154, 57.2], [-157.5, 56.6], [-161, 55.2],
  [-164.5, 54.5], [-162, 56.3], [-158, 58.5], [-157, 59.3], [-162, 59.8], [-164.5, 60.5],
  [-165.5, 62.5], [-161.5, 64.4], [-166, 64.6],
];

const SOUTH_AMERICA: LL[] = [
  [-77.4, 8.6], [-76, 9.3], [-75.5, 10.8], [-73.5, 11.3], [-71.5, 12.3], [-71.3, 11], [-70, 12],
  [-68, 10.6], [-64.5, 10.6], [-62, 10.7], [-61, 9.5], [-60, 8.3], [-58, 6.8], [-55, 5.8],
  [-52, 5], [-51, 3.5], [-50, 1.5], [-50, 0.2], [-48.5, -1], [-45, -1.5], [-42, -2.8],
  [-39, -3.2], [-36, -5], [-34.9, -7.2], [-35.3, -9.5], [-37.2, -11.2], [-38.7, -13],
  [-39.1, -15.5], [-39.7, -18], [-40.5, -20.5], [-41.5, -22.2], [-44, -23], [-46.5, -24],
  [-48.2, -25.8], [-48.8, -28], [-50, -30.5], [-52, -32.5], [-53.5, -34], [-55, -35], [-57, -35],
  [-57.5, -36.5], [-57, -38], [-59, -38.8], [-62, -39], [-62.3, -40.8], [-65, -41], [-64, -42.5],
  [-65.5, -45], [-67.5, -46], [-66, -47.8], [-67.5, -49.5], [-68.5, -50.5], [-69, -52.2],
  [-68, -53.5], [-66, -55], [-68, -55.3], [-71, -54.6], [-74, -52.5], [-75.5, -49.5],
  [-74.5, -46], [-73.8, -43], [-73.5, -40], [-73.5, -37], [-72, -34], [-71.5, -30], [-71.3, -27],
  [-70.5, -23.5], [-70.3, -19.5], [-71.5, -17.5], [-74, -15.5], [-76, -13.5], [-77.5, -11],
  [-78.5, -8.5], [-80.5, -6.5], [-81.3, -5], [-80, -3], [-80.6, -1], [-80, 1], [-78.8, 2],
  [-78, 3.8], [-77.3, 5.5], [-77.5, 7],
];

const EURASIA: LL[] = [
  [-9.2, 43.2], [-9.3, 41.8], [-8.8, 38.7], [-9, 37.1], [-7.4, 37.1], [-6.3, 36.5], [-5.4, 36],
  [-2, 36.7], [-0.7, 37.6], [0, 38.8], [-0.3, 39.5], [0.8, 41], [3.2, 41.9], [3, 43.1],
  [4.5, 43.4], [6.5, 43.1], [7.5, 43.8], [8.8, 44.4], [10.3, 43.8], [11, 42.5], [12.3, 41.5],
  [14, 40.8], [15.5, 40], [16, 38.9], [15.7, 37.9], [16.5, 38.4], [17, 39], [16.6, 40.3],
  [18.5, 40.1], [17, 41], [15.8, 41.9], [14, 42.5], [12.5, 44], [12.3, 45.3], [13.7, 45.6],
  [14.5, 45], [15.8, 43.8], [17.6, 42.8], [19.4, 41.9], [19.5, 40.3], [20.8, 39.5], [21, 38.3],
  [22, 37], [23, 36.5], [23.8, 37.7], [24, 38.2], [22.9, 39.2], [23.5, 40.2], [24.5, 40.8],
  [26, 40.8], [26.8, 40], [26.2, 39], [26.8, 38], [27.5, 37], [28.8, 36.7], [30.5, 36.3],
  [32.5, 36.1], [34.5, 36.8], [36, 36.6], [35.9, 35], [35.5, 33.7], [34.9, 32.5], [34.4, 31.3],
  [34.9, 29.5], [35.2, 28], [36.5, 26], [38.5, 24], [39.5, 21.5], [41, 19], [42.7, 16.5],
  [43.2, 13.5], [44.5, 12.7], [47, 13.1], [49, 14.5], [52, 15.8], [54, 17], [55.8, 17.9],
  [57.5, 19.5], [58.8, 20.5], [59.8, 22.5], [58.5, 23.6], [57.2, 24.2], [56.4, 24.9],
  [56.3, 26.2], [55.3, 25.4], [54.5, 24.4], [53, 24.2], [51.6, 24.3], [51.3, 26], [50.6, 25.5],
  [50.2, 26.2], [49.5, 27.1], [48.6, 28.5], [48, 29.4], [48.6, 30], [49.5, 30], [50.3, 29.4],
  [50.9, 28.3], [51.9, 27.8], [53, 26.7], [54.5, 26.5], [56, 27.1], [57, 27.1], [57.4, 25.7],
  [59, 25.4], [61.6, 25.2], [63.5, 25.3], [66.5, 25.4], [67.5, 24.9], [68.5, 23.5], [68.8, 23.2],
  [70.2, 22.6], [70, 21], [72.5, 21], [72.9, 19.5], [73.5, 17], [74.5, 14], [75.5, 11.8],
  [76.4, 9.4], [77.5, 8.1], [78.2, 8.8], [79.2, 10.3], [79.9, 11.5], [80.3, 13.2], [80.1, 15.3],
  [81.5, 16.6], [83.5, 18], [85.5, 19.8], [87, 21], [88.5, 21.7], [89.5, 21.8], [90.5, 22.3],
  [91.8, 22.6], [92.5, 20.7], [93.8, 19], [94.5, 17], [94.3, 15.8], [97.6, 16.8], [97.9, 15],
  [98.7, 12], [98.2, 9], [98.4, 8.2], [99.5, 7.5], [100.4, 6.2], [101.3, 3.8], [103.4, 1.9],
  [104.2, 1.3], [103.7, 2.5], [103.3, 4.2], [102.2, 6.3], [100.8, 7.3], [100.1, 9.5],
  [99.2, 11.5], [100, 13.2], [100.9, 13.4], [101.6, 12.6], [102.5, 12.1], [103.1, 10.9],
  [104.6, 10.2], [105.3, 8.7], [106.6, 9.7], [107.8, 10.9], [109.2, 11.7], [109.4, 13.4],
  [108.8, 15.2], [107.8, 16.5], [106.5, 18.3], [105.8, 19.3], [106.7, 20.4], [107.8, 21.5],
  [109, 21.5], [110.4, 20.5], [111.5, 21.5], [113.5, 22.2], [116, 22.8], [117.8, 24.3],
  [119.5, 25.7], [120.3, 27.5], [121.6, 28.6], [121.9, 30.5], [121.4, 31.5], [121, 32.2],
  [120.4, 34.3], [119.2, 35.1], [120.7, 36.1], [122.5, 37], [120.5, 37.8], [118.8, 37.6],
  [117.7, 38.6], [118.4, 39], [119.6, 39.8], [121.3, 40.9], [122.2, 40.5], [121.5, 38.8],
  [123, 39.7], [124.5, 39.9], [125, 39.5], [124.8, 38], [125.5, 37.2], [126.5, 36.5],
  [126.4, 34.8], [126.8, 34.3], [127.7, 34.8], [129.2, 35.2], [129.4, 36.5], [129.2, 37.8],
  [128.3, 38.7], [127.6, 39.6], [128.8, 40.9], [130.3, 42.3], [131.4, 42.9], [132.5, 43.2],
  [134, 43.3], [135.5, 43.8], [137.5, 45.5], [139, 47.5], [140.4, 49.5], [140.5, 51.5],
  [141.5, 52.8], [140.2, 54], [138.5, 53.9], [137, 54.1], [135.2, 54.7], [135.7, 56.4],
  [138, 56.9], [140.5, 57.7], [143, 59.2], [146, 59.4], [150, 59.6], [153, 59.1], [155.2, 59],
  [157, 58], [156.5, 56.5], [155.8, 54.5], [155.8, 52.6], [156.7, 51.2], [158.4, 52.1],
  [159.9, 53.3], [161.5, 54.9], [162.6, 56.3], [163.2, 58], [163.5, 59.7], [165.5, 60.5],
  [168, 60.6], [170, 60.2], [172, 61], [174, 61.8], [177, 62.5], [179.5, 62.6], [180, 64.5],
  [180, 68.5], [177.5, 69.4], [173.5, 69.8], [170, 70], [166, 69.5], [161, 69.4], [160, 70.5],
  [155, 71], [150.5, 71.5], [147, 72.3], [142, 72.8], [139, 71.4], [133, 71.5], [130, 70.9],
  [129, 71.9], [127.5, 73.4], [124, 73.7], [120, 73], [118.4, 73.4], [113.5, 73.7], [110, 74.5],
  [108, 76.5], [105, 77.5], [101, 76.5], [97, 76], [94, 75.5], [90, 75.6], [87, 74.5],
  [83, 73.8], [80.5, 73], [80.5, 72.4], [75, 72.5], [72.8, 72.3], [69.5, 72.8], [68.5, 70.5],
  [66.8, 69.2], [61, 69.4], [59, 68.6], [56, 68.3], [53, 68.5], [48, 67.8], [44, 68.5],
  [41, 67.6], [40.5, 66.3], [38, 66], [34.8, 66.6], [33, 67.3], [33, 69.2], [30, 70.1],
  [27, 71], [25, 70.8], [22.5, 70.5], [19, 70], [16, 69], [13.5, 67], [12, 65.5], [10.5, 64.2],
  [8.5, 63.4], [6.5, 62.5], [5.2, 61.2], [5, 59.9], [5.6, 58.7], [7, 58], [8.5, 58.1],
  [9.5, 59], [10.7, 59.4], [11.2, 58.9], [11.7, 58.2], [11.9, 57.6], [12.5, 56.5], [12.9, 55.4],
  [14.2, 55.4], [15.9, 56.2], [16.6, 57.2], [16.6, 58.5], [17.6, 58.9], [18.8, 59.6],
  [17.4, 60.5], [17.3, 61.8], [17.9, 62.6], [19.5, 63.6], [21.3, 64.5], [21.3, 65.6],
  [22.6, 65.8], [24.3, 65.8], [25.2, 65.1], [24.9, 64.3], [23.5, 63.2], [21.9, 62.3],
  [21.4, 61.1], [21.5, 60.2], [23, 59.8], [25.5, 60.2], [27.5, 60.4], [29, 60.2], [30.2, 59.9],
  [28.8, 59.4], [26, 59.5], [23.7, 59.2], [23.5, 58.3], [24.4, 57.9], [24.3, 57.3], [23.2, 57],
  [21.9, 57.5], [21, 56.8], [21, 55.9], [21.1, 55.3], [20, 54.7], [19.4, 54.3], [18.6, 54.7],
  [17.2, 54.5], [15.6, 54.2], [14.2, 53.9], [12.6, 54.4], [11, 54], [10.2, 54.4], [10.1, 54.9],
  [10.4, 56], [10.6, 57.1], [10, 57.7], [8.5, 57.1], [8.1, 56.2], [8.3, 55.3], [8.7, 54.3],
  [8.5, 53.7], [7, 53.5], [5.5, 53.4], [4.8, 52.8], [4.2, 52], [3.5, 51.5], [2.5, 51.1],
  [1.6, 50.9], [1.6, 50.1], [0.2, 49.7], [-1.2, 49.6], [-1.4, 48.7], [-3, 48.8], [-4.7, 48.5],
  [-4.4, 47.8], [-2.8, 47.4], [-1.5, 46.3], [-1.2, 45.4], [-1.4, 44], [-1.8, 43.4], [-3.5, 43.5],
  [-5.8, 43.6], [-8, 43.7],
];

// Mares interiores: se recortan de Eurasia con la regla evenodd.
const BLACK_SEA: LL[] = [
  [28, 41.8], [28.8, 43.3], [28.5, 44.7], [29.7, 45.3], [30.5, 46.3], [32, 46.5], [31.5, 46.1],
  [33.5, 46], [33.6, 45.4], [32.5, 45.3], [33.5, 44.5], [35, 45], [36.5, 45.3], [35.5, 45.8],
  [37, 46.6], [38.2, 47.1], [39.2, 47], [38.4, 46.3], [37.5, 45.4], [38, 44.8], [39.7, 43.5],
  [41.5, 41.6], [41, 41], [38.4, 40.9], [36.5, 41.3], [35, 42], [33.5, 42], [31.5, 41.1],
  [29.3, 41.2],
];
const CASPIAN: LL[] = [
  [47.6, 45.4], [49, 46.4], [50.5, 46.9], [53, 46.7], [53.2, 45.3], [51.3, 44.5], [50.3, 44],
  [51.3, 43], [52.5, 42], [52.8, 41], [53.2, 39.5], [53.7, 37.3], [52, 36.7], [50.5, 37.2],
  [49.2, 37.6], [49, 38.8], [48.5, 40.5], [49.8, 40.5], [49, 41.5], [48, 42.5], [47, 43.5],
  [47.3, 44.5],
];

const AFRICA: LL[] = [
  [32.6, 29.9], [32.9, 28.5], [33.8, 26.8], [34.8, 25.2], [35.8, 23], [36.9, 21], [37.3, 19],
  [38.5, 18], [39.8, 15.5], [41.5, 13.5], [43, 12.2], [44.5, 10.4], [47, 11.2], [51.2, 11.8],
  [51, 10.4], [49.8, 7], [47.8, 4.5], [45.5, 2], [43, -0.5], [41, -2.3], [39.5, -4.8],
  [39, -6.8], [39.3, -8.5], [40.2, -10.5], [40.5, -14], [39.5, -16.5], [36, -18.8], [35, -20.5],
  [35.5, -23.5], [33, -25.5], [32.8, -28], [31, -30], [28.5, -32.8], [26, -34], [22, -34.2],
  [20, -34.8], [18.4, -34], [18, -32], [17, -29.5], [15.5, -27], [14.5, -22.5], [13, -20],
  [11.8, -16.5], [13.5, -12], [13, -9], [12.3, -6], [11, -4], [9.3, -1.5], [9.5, 1], [9.8, 3.2],
  [8.7, 4.3], [6.5, 4.3], [5, 5.5], [3, 6.3], [1, 6], [-2, 4.8], [-4.5, 5.2], [-7.5, 4.4],
  [-9.5, 5.5], [-11.5, 7.2], [-13.2, 8.5], [-14.7, 10.6], [-16.7, 12.5], [-17.4, 14.7],
  [-16.5, 16.5], [-16.2, 19], [-16.9, 21.2], [-15.5, 23.5], [-13.3, 27.7], [-11, 28.5],
  [-9.7, 30], [-9.5, 32.5], [-7, 34], [-6, 35.8], [-2.9, 35.3], [-1, 35.2], [1, 36.5], [3, 36.8],
  [6, 37], [8.5, 36.9], [10, 37.3], [10.5, 36.5], [11, 35.2], [10.1, 34.3], [11, 33.2],
  [13.5, 32.8], [15.2, 32.3], [17, 31], [19.5, 30.4], [20.2, 32], [22.5, 32.9], [25, 32.6],
  [27, 31.5], [29, 30.9], [32.3, 31.3], [34.2, 31.3], [34.9, 29.5], [34.3, 27.9], [33.6, 28.2],
];

interface Land {
  id: string;
  continent?: RegionId;
  d: string;
}

const island = (id: string, poly: LL[], continent?: RegionId): Land => ({ id, continent, d: polyPath(poly) });

const LANDS: Land[] = [
  { id: 'na', continent: 'north_america', d: polyPath(NORTH_AMERICA) },
  { id: 'sa', continent: 'latam', d: polyPath(SOUTH_AMERICA) },
  {
    id: 'eurasia',
    d: polyPath(EURASIA) + polyPath(BLACK_SEA) + polyPath(CASPIAN),
  },
  { id: 'africa', continent: 'africa', d: polyPath(AFRICA) },
  island('greenland', [[-73, 78], [-60, 82], [-30, 83], [-20, 80], [-20, 72], [-24, 69], [-40, 65], [-44, 60], [-50, 62], [-54, 67], [-58, 75]], 'north_america'),
  island('baffin', [[-80, 73], [-70, 70], [-62, 66], [-66, 62], [-74, 64], [-80, 68], [-88, 70]], 'north_america'),
  island('victoria', [[-118, 72], [-105, 73], [-100, 70], [-110, 68], [-118, 70]], 'north_america'),
  island('ellesmere', [[-90, 80], [-70, 82], [-62, 82], [-75, 78], [-90, 77]], 'north_america'),
  island('newfoundland', [[-59, 47.7], [-55, 51.5], [-52.7, 47.5], [-53.5, 46.7]], 'north_america'),
  island('cuba', [[-85, 22], [-82, 23.2], [-79, 22.5], [-77, 21], [-74.2, 20.2], [-77.5, 19.9], [-79.5, 21.5], [-82.5, 22.2]], 'latam'),
  island('hispaniola', [[-74.4, 18.5], [-72, 19.9], [-69, 19.2], [-68.3, 18.5], [-71, 17.8]], 'latam'),
  island('iceland', [[-24, 65.5], [-22, 66.4], [-16, 66.5], [-14, 65], [-18, 63.5], [-22.5, 63.8]], 'europe'),
  island('britain', [[-5.7, 50], [-3, 50.6], [1.4, 51.2], [1.7, 52.7], [0, 53.5], [-1.5, 55], [-2, 56], [-2, 57.6], [-3.5, 58.6], [-5, 58.5], [-6, 57], [-5.5, 56], [-4.8, 55], [-3, 54.8], [-3, 53.4], [-4.5, 53.3], [-4.2, 52.3], [-5.2, 51.7], [-3, 51.4], [-4.5, 51]], 'europe'),
  island('ireland', [[-10, 51.7], [-6, 52], [-6, 54], [-5.7, 54.6], [-7.5, 55.3], [-9, 54.2], [-10, 53.5], [-9.5, 52.2]], 'europe'),
  island('sardinia', [[8.2, 41], [9.7, 41], [9.5, 39], [8.5, 39]], 'europe'),
  island('sicily', [[12.5, 38], [15.6, 38.2], [15, 36.7], [12.5, 37.6]], 'europe'),
  island('cyprus', [[32.3, 35], [34.5, 35.6], [33, 34.6]], 'europe'),
  island('novaya', [[52, 71], [56, 74], [68, 77], [60, 75], [55, 72]], 'europe'),
  island('honshu', [[130.8, 34], [133, 35.5], [136, 36], [137, 37.3], [139.5, 38.5], [140, 40.5], [141.5, 41], [142, 39.5], [141, 37], [140.8, 35.7], [139.8, 35], [137.5, 34.6], [135.5, 33.5], [134.5, 34], [132, 33.8]], 'asia'),
  island('hokkaido', [[140, 42], [141, 45.4], [145.5, 43.5], [143.5, 42]], 'asia'),
  island('kyushu', [[130, 33.5], [131.8, 33.2], [131.5, 31], [130.2, 31.2], [129.8, 32.5]], 'asia'),
  island('taiwan', [[120.2, 23], [121.5, 25], [122, 24.5], [120.8, 22]], 'asia'),
  island('srilanka', [[80, 9.8], [81.8, 7.5], [81, 6], [80, 6], [79.8, 8]], 'asia'),
  island('luzon', [[120.5, 18.5], [122.2, 18.4], [122, 14.5], [124, 13], [120.6, 13.9], [119.8, 16]], 'asia'),
  island('mindanao', [[122, 7], [126.5, 7.5], [125.5, 9.5], [123, 8.5]], 'asia'),
  island('sumatra', [[95.3, 5.5], [98, 4], [103, -1], [106, -3], [105.8, -5.8], [102, -4], [98.5, 0.5]], 'asia'),
  island('java', [[105.2, -6.8], [108.5, -6.5], [114.5, -7.8], [114.5, -8.7], [108, -7.8]], 'asia'),
  island('borneo', [[109, 1.5], [111, 2], [114, 4.5], [117, 7], [119, 5], [117.5, 1], [116.5, -3], [114, -4], [110.5, -3], [109, -0.5]], 'asia'),
  island('sulawesi', [[119.5, -5.5], [119.5, 0], [121, 1], [125, 1.5], [123, -1], [121.5, -1], [123.2, -4], [121, -4], [120.5, -5.5]], 'asia'),
  island('newguinea', [[131, -1], [135, -3.3], [138, -1.8], [145, -4.5], [147.5, -6.2], [147.5, -8], [150.5, -10.5], [147, -10], [143.5, -8.5], [141, -9], [138, -8.3], [137.5, -5], [134, -4]], 'oceania'),
  island('madagascar', [[49.5, -12], [50.5, -15.5], [47, -25], [44, -24.5], [43.5, -21], [44.5, -16]], 'africa'),
  island('australia', [[114, -22], [114, -26], [115, -34], [118, -35], [123, -34], [129, -31.5], [134, -32.5], [138, -35], [140, -38], [144, -38.5], [147, -38], [150, -37], [153, -31], [153.5, -25], [149, -20.5], [146, -19], [145.3, -15], [143.5, -12.8], [142.5, -10.7], [141.5, -13], [141.5, -17.5], [139, -17.2], [136.5, -15.5], [135.5, -12], [132, -11.3], [130, -12.5], [129.5, -15], [125.5, -14], [122, -17.5], [119, -20]], 'oceania'),
  island('tasmania', [[145, -40.8], [148, -41], [148.2, -42.5], [146.5, -43.6], [145.2, -42]], 'oceania'),
  island('nz-north', [[172.7, -34.5], [174.5, -36.5], [178.5, -37.7], [177, -39.5], [175, -41.5], [174.8, -39.5], [173.8, -39.2], [174.5, -37.5]], 'oceania'),
  island('nz-south', [[172.7, -40.5], [174, -41.2], [173, -43.5], [171, -44.5], [169, -46.6], [166.5, -46], [168, -44], [171, -42]], 'oceania'),
];

/* ==========================================================================
   Coordenadas literarias de los países [lon, lat]
   ========================================================================== */

const COORDS: Record<string, LL> = {
  ES: [-3.7, 40.4], GB: [-1.2, 52.4], FR: [2.4, 46.8], IT: [12.4, 42.6], DE: [10.2, 51.1],
  IE: [-7.9, 53.2], RU: [39, 56.5], NO: [9.2, 61.2], SE: [15.6, 60.6], GR: [22.4, 39.3],
  PT: [-8, 39.6], PL: [19.6, 52.1], CZ: [15.6, 49.8], AT: [14.4, 47.5],
  US: [-97, 38.5], CA: [-102, 56], MX: [-102, 23.5], AR: [-64, -35], CO: [-73.5, 4.5],
  CL: [-71, -33], PE: [-75, -10], UY: [-55.8, -32.7], CU: [-79.5, 21.8], BR: [-52, -11],
  JP: [138, 36.5], CN: [104, 35], KR: [127.8, 36.4], IN: [78.5, 22.5], TR: [34.5, 39.2],
  IR: [53, 32.5], LB: [35.9, 33.9],
  EG: [30, 26.5], NG: [8, 9.5], ZA: [24.5, -29], MA: [-6.8, 32], DZ: [2.5, 28], KE: [37.8, 0.5],
  AU: [134, -25.5], NZ: [172.5, -41.5],
};

/* ==========================================================================
   Elementos decorativos precomputados
   ========================================================================== */

const GRATICULE_LON = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRATICULE_LAT = [75, 60, 45, 30, 15, -15, -30, -45];
const GRAT_MINOR_D =
  GRATICULE_LON.map((l) => `M${f1(px(l))},0V${MAP_H}`).join('') +
  GRATICULE_LAT.map((l) => `M0,${f1(py(l))}H${MAP_W}`).join('');
const GRAT_MAJOR_D = [0, 23.4, -23.4, 66.5]
  .map((l) => `M0,${f1(py(l))}H${MAP_W}`)
  .join('') + `M${f1(px(0))},0V${MAP_H}`;

const GRAT_LAT_LABELS: { lat: number; t: string }[] = [
  { lat: 60, t: '60°N' }, { lat: 30, t: '30°N' }, { lat: 0, t: 'Æquator' },
  { lat: -30, t: '30°S' }, { lat: -45, t: '45°S' },
];
const GRAT_LON_LABELS: { lon: number; t: string }[] = [
  { lon: -120, t: '120°O' }, { lon: -60, t: '60°O' }, { lon: 0, t: 'Greenwich' },
  { lon: 60, t: '60°E' }, { lon: 120, t: '120°E' },
];

const ROSE_HUBS: XY[] = [[96, 436], [640, 402]];
const rhumbPath = (cx: number, cy: number, step: number, offset: number, len: number) => {
  let d = '';
  for (let a = offset; a < 360; a += step) {
    const r = (a * Math.PI) / 180;
    d += `M${f1(cx)},${f1(cy)}L${f1(cx + Math.sin(r) * len)},${f1(cy - Math.cos(r) * len)}`;
  }
  return d;
};
const RHUMB_MAJOR_D = ROSE_HUBS.map(([x, y]) => rhumbPath(x, y, 22.5, 0, 720)).join('');
const RHUMB_MINOR_D = ROSE_HUBS.map(([x, y]) => rhumbPath(x, y, 22.5, 11.25, 520)).join('');

const roseTip = (deg: number, r: number): string => {
  const a = (deg * Math.PI) / 180;
  return `${f1(Math.sin(a) * r)},${f1(-Math.cos(a) * r)}`;
};
const ROSE_STAR = Array.from({ length: 8 }, (_, i) => {
  const deg = i * 45;
  const main = i % 2 === 0;
  const R = main ? 40 : 26;
  const rb = main ? 9 : 6.5;
  return {
    key: i,
    main,
    left: `0,0 ${roseTip(deg, R)} ${roseTip(deg - 45, rb)}`,
    right: `0,0 ${roseTip(deg, R)} ${roseTip(deg + 45, rb)}`,
  };
});
const ROSE_TICKS = Array.from({ length: 72 }, (_, i) => {
  const len = i % 9 === 0 ? 6 : i % 3 === 0 ? 3.6 : 2.2;
  const a = (i * 5 * Math.PI) / 180;
  const r0 = 46;
  const r1 = 46 - len;
  return {
    key: i,
    x1: f1(Math.sin(a) * r0),
    y1: f1(-Math.cos(a) * r0),
    x2: f1(Math.sin(a) * r1),
    y2: f1(-Math.cos(a) * r1),
  };
});

const REGION_LABELS: { id: RegionId; text: string; lon: number; lat: number; size: number }[] = [
  { id: 'north_america', text: 'AMÉRICA DEL NORTE', lon: -108, lat: 47, size: 11 },
  { id: 'latam', text: 'AMÉRICA LATINA', lon: -62, lat: -21, size: 10.5 },
  { id: 'europe', text: 'EUROPA', lon: 33, lat: 49.2, size: 8 },
  { id: 'asia', text: 'ASIA', lon: 92, lat: 51, size: 13 },
  { id: 'africa', text: 'ÁFRICA', lon: 21, lat: 3, size: 11 },
  { id: 'oceania', text: 'OCEANÍA', lon: 136, lat: -33.5, size: 9 },
];

const OCEAN_LABELS: { text: string; lon: number; lat: number; rot: number }[] = [
  { text: 'OCÉANO ATLÁNTICO', lon: -33, lat: 24, rot: -72 },
  { text: 'OCÉANO PACÍFICO', lon: -140, lat: 14, rot: 0 },
  { text: 'OCÉANO ÍNDICO', lon: 82, lat: -17, rot: 0 },
];

/** Sello de lacre: círculo festoneado e irregular. */
const WAX_D = (() => {
  const pts: XY[] = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = 12 - (i % 2 === 0 ? 0 : 1.5) + Math.sin(i * 2.3) * 0.5;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return smoothClosed(pts, 1);
})();

const COMPASS_STAR_D = 'M0,-8 L1.7,-1.7 L8,0 L1.7,1.7 L0,8 L-1.7,1.7 L-8,0 L-1.7,-1.7Z';
const HALF_D = 'M0,-5 A5,5 0 0 0 0,5Z';

/* ==========================================================================
   Datos derivados
   ========================================================================== */

const REGIONS: { id: ContinentId; label: string }[] = [
  { id: 'all', label: '🌍 Mundo Completo' },
  { id: 'europe', label: 'Europa' },
  { id: 'latam', label: 'América Latina' },
  { id: 'north_america', label: 'Norteamérica' },
  { id: 'asia', label: 'Asia & Oriente' },
  { id: 'africa', label: 'África' },
  { id: 'oceania', label: 'Oceanía' },
];

const statusOf = (c: CountryMapNode): Status => {
  if (c.readCount > 0) return 'conquered';
  if (c.readingCount > 0 || c.unreadCount > 0) return 'exploring';
  return 'discover';
};
const STATUS_RANK: Record<Status, number> = { conquered: 0, exploring: 1, discover: 2 };
const STATUS_GLYPH: Record<Status, string> = { conquered: '●', exploring: '◐', discover: '○' };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ==========================================================================
   Mapa base (estático y memoizado: no se repinta durante el zoom)
   ========================================================================== */

interface BaseMapProps {
  onContinent: (id: RegionId) => void;
  isGeneralView: boolean;
}

const BaseMap = memo(function BaseMap({ onContinent, isGeneralView }: BaseMapProps) {
  return (
    <>
      <defs>
        <linearGradient id="la-land-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="la-stop-a" />
          <stop offset="1" className="la-stop-b" />
        </linearGradient>
        <radialGradient id="la-wax-grad" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" className="la-wax-s0" />
          <stop offset="0.55" className="la-wax-s1" />
          <stop offset="1" className="la-wax-s2" />
        </radialGradient>
        <pattern id="la-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" className="la-hatch-line" />
        </pattern>
        <clipPath id="la-map-clip">
          <rect x="0" y="0" width={MAP_W} height={MAP_H} />
        </clipPath>
        <clipPath id="la-clip-europe">
          <polygon
            points={`${f1(px(-25))},${f1(py(82))} ${f1(px(55))},${f1(py(82))} ${f1(px(55))},${f1(py(48))} ${f1(px(42))},${f1(py(42))} ${f1(px(26))},${f1(py(41))} ${f1(px(26))},${f1(py(34))} ${f1(px(-25))},${f1(py(34))}`}
          />
        </clipPath>
        <clipPath id="la-clip-asia">
          <polygon
            points={`${f1(px(55))},${f1(py(82))} ${f1(px(190))},${f1(py(82))} ${f1(px(190))},${f1(py(-15))} ${f1(px(32))},${f1(py(-15))} ${f1(px(32))},${f1(py(30))} ${f1(px(26))},${f1(py(41))} ${f1(px(42))},${f1(py(42))} ${f1(px(55))},${f1(py(48))}`}
          />
        </clipPath>
        <clipPath id="la-clip-wax-flag">
          <circle cx="0" cy="0" r="7.5" />
        </clipPath>
        <clipPath id="la-clip-exp-flag">
          <circle cx="0" cy="0" r="6.5" />
        </clipPath>
        <clipPath id="la-clip-label-flag">
          <rect x="0" y="0" width="16" height="11" rx="2" ry="2" />
        </clipPath>
        {LANDS.map((l) => (
          <path key={l.id} id={`la-p-${l.id}`} d={l.d} />
        ))}
      </defs>

      {/* Líneas de rumbo náuticas (loxodrómicas) */}
      <g clipPath="url(#la-map-clip)">
        <path className="la-rhumb la-rhumb--minor" d={RHUMB_MINOR_D} />
        <path className="la-rhumb" d={RHUMB_MAJOR_D} />
      </g>

      {/* Retícula de latitud / longitud */}
      <path className="la-grat" d={GRAT_MINOR_D} />
      <path className="la-grat la-grat--major" d={GRAT_MAJOR_D} />
      {GRAT_LAT_LABELS.map((g) => (
        <text key={g.t} className="la-grat-text" x={10} y={f1(py(g.lat) - 2)}>
          {g.t}
        </text>
      ))}
      {GRAT_LON_LABELS.map((g) => (
        <text key={g.t} className="la-grat-text" x={f1(px(g.lon) + 3)} y={10}>
          {g.t}
        </text>
      ))}

      {/* Aguas de costa (ondas de tinta) */}
      <g>
        {LANDS.map((l) => (
          <use key={`r1-${l.id}`} href={`#la-p-${l.id}`} className="la-ripple la-ripple--1" />
        ))}
        {LANDS.map((l) => (
          <use key={`r2-${l.id}`} href={`#la-p-${l.id}`} className="la-ripple la-ripple--2" />
        ))}
        {LANDS.map((l) => (
          <use key={`r3-${l.id}`} href={`#la-p-${l.id}`} className="la-ripple la-ripple--3" />
        ))}
      </g>

      {/* Continentes e islas agrupados por región: interactivos SOLO en vista general */}
      <g>
        {/* América del Norte */}
        <g
          className={`la-continent ${isGeneralView ? 'la-continent--interactive' : ''}`}
          data-continent="north_america"
          onClick={isGeneralView ? () => onContinent('north_america') : undefined}
          role={isGeneralView ? 'button' : undefined}
          tabIndex={isGeneralView ? 0 : -1}
          aria-label={isGeneralView ? 'Región América del Norte' : undefined}
        >
          {LANDS.filter((l) => l.continent === 'north_america').map((l) => (
            <use key={`l-${l.id}`} href={`#la-p-${l.id}`} className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          ))}
          <text
            className="la-region-label"
            x={f1(px(-108))}
            y={f1(py(47))}
            fontSize={11}
          >
            AMÉRICA DEL NORTE
          </text>
        </g>

        {/* América Latina */}
        <g
          className={`la-continent ${isGeneralView ? 'la-continent--interactive' : ''}`}
          data-continent="latam"
          onClick={isGeneralView ? () => onContinent('latam') : undefined}
          role={isGeneralView ? 'button' : undefined}
          tabIndex={isGeneralView ? 0 : -1}
          aria-label={isGeneralView ? 'Región América Latina' : undefined}
        >
          {LANDS.filter((l) => l.continent === 'latam').map((l) => (
            <use key={`l-${l.id}`} href={`#la-p-${l.id}`} className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          ))}
          <text
            className="la-region-label"
            x={f1(px(-62))}
            y={f1(py(-21))}
            fontSize={10.5}
          >
            AMÉRICA LATINA
          </text>
        </g>

        {/* Europa */}
        <g
          className={`la-continent ${isGeneralView ? 'la-continent--interactive' : ''}`}
          data-continent="europe"
          onClick={isGeneralView ? () => onContinent('europe') : undefined}
          role={isGeneralView ? 'button' : undefined}
          tabIndex={isGeneralView ? 0 : -1}
          aria-label={isGeneralView ? 'Región Europa' : undefined}
        >
          <use href="#la-p-eurasia" clipPath="url(#la-clip-europe)" className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          {LANDS.filter((l) => l.continent === 'europe').map((l) => (
            <use key={`l-${l.id}`} href={`#la-p-${l.id}`} className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          ))}
          <text
            className="la-region-label"
            x={f1(px(33))}
            y={f1(py(49.2))}
            fontSize={8}
          >
            EUROPA
          </text>
        </g>

        {/* Asia */}
        <g
          className={`la-continent ${isGeneralView ? 'la-continent--interactive' : ''}`}
          data-continent="asia"
          onClick={isGeneralView ? () => onContinent('asia') : undefined}
          role={isGeneralView ? 'button' : undefined}
          tabIndex={isGeneralView ? 0 : -1}
          aria-label={isGeneralView ? 'Región Asia & Oriente' : undefined}
        >
          <use href="#la-p-eurasia" clipPath="url(#la-clip-asia)" className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          {LANDS.filter((l) => l.continent === 'asia').map((l) => (
            <use key={`l-${l.id}`} href={`#la-p-${l.id}`} className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          ))}
          <text
            className="la-region-label"
            x={f1(px(92))}
            y={f1(py(51))}
            fontSize={13}
          >
            ASIA
          </text>
        </g>

        {/* África */}
        <g
          className={`la-continent ${isGeneralView ? 'la-continent--interactive' : ''}`}
          data-continent="africa"
          onClick={isGeneralView ? () => onContinent('africa') : undefined}
          role={isGeneralView ? 'button' : undefined}
          tabIndex={isGeneralView ? 0 : -1}
          aria-label={isGeneralView ? 'Región África' : undefined}
        >
          {LANDS.filter((l) => l.continent === 'africa').map((l) => (
            <use key={`l-${l.id}`} href={`#la-p-${l.id}`} className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          ))}
          <text
            className="la-region-label"
            x={f1(px(21))}
            y={f1(py(3))}
            fontSize={11}
          >
            ÁFRICA
          </text>
        </g>

        {/* Oceanía */}
        <g
          className={`la-continent ${isGeneralView ? 'la-continent--interactive' : ''}`}
          data-continent="oceania"
          onClick={isGeneralView ? () => onContinent('oceania') : undefined}
          role={isGeneralView ? 'button' : undefined}
          tabIndex={isGeneralView ? 0 : -1}
          aria-label={isGeneralView ? 'Región Oceanía' : undefined}
        >
          {LANDS.filter((l) => l.continent === 'oceania').map((l) => (
            <use key={`l-${l.id}`} href={`#la-p-${l.id}`} className={`la-land ${isGeneralView ? 'la-land--click' : ''}`} />
          ))}
          <text
            className="la-region-label"
            x={f1(px(136))}
            y={f1(py(-33.5))}
            fontSize={9}
          >
            OCEANÍA
          </text>
        </g>

        {/* Tramado cartográfico vintage (pointer-events: none) */}
        {LANDS.map((l) => (
          <use key={`h-${l.id}`} href={`#la-p-${l.id}`} className="la-hatch" />
        ))}
      </g>

      {/* Nombres de océanos */}
      {OCEAN_LABELS.map((o) => (
        <text
          key={o.text}
          className="la-ocean-label"
          x={f1(px(o.lon))}
          y={f1(py(o.lat))}
          transform={`rotate(${o.rot} ${f1(px(o.lon))} ${f1(py(o.lat))})`}
        >
          {o.text}
        </text>
      ))}

      {/* Cartela del título */}
      <g>
        <text className="la-title" x={28} y={27}>
          ATLAS LITERARIUM
        </text>
        <text className="la-subtitle" x={29} y={38}>
          Orbis Librorum Terrarum · carta de las letras del mundo
        </text>
        <line className="la-title-rule" x1={28} y1={44} x2={236} y2={44} />
        <rect className="la-title-rule" x={232} y={41} width={6} height={6} fill="currentColor" transform="rotate(45 235 44)" style={{ fill: 'var(--la-crimson)' }} />
      </g>

      {/* Rosa de los vientos ornamental */}
      <g className="la-rose" transform={`translate(${ROSE_HUBS[0][0]} ${ROSE_HUBS[0][1]})`}>
        <circle className="la-rose-stroke" r={48} />
        <circle className="la-rose-stroke la-rose-stroke--dash" r={37} />
        <g className="la-rose__ring">
          <circle className="la-rose-stroke" r={46} />
          {ROSE_TICKS.map((t) => (
            <line key={t.key} className="la-rose-tick" x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>
        <g className="la-rose__star">
          {ROSE_STAR.map((s) => (
            <g key={s.key}>
              <polygon className={s.main ? 'la-rose-halfA' : 'la-rose-halfA la-rose-halfA--minor'} points={s.left} />
              <polygon className={s.main ? 'la-rose-halfB' : 'la-rose-halfB la-rose-halfB--minor'} points={s.right} />
            </g>
          ))}
        </g>
        <circle className="la-rose-hub" r={3.6} />
        <text className="la-rose-letter la-rose-letter--n" x={0} y={-58}>N</text>
        <text className="la-rose-letter" x={58} y={0}>E</text>
        <text className="la-rose-letter" x={0} y={58}>S</text>
        <text className="la-rose-letter" x={-58} y={0}>O</text>
      </g>
    </>
  );
});

/* ==========================================================================
   Nodo de país
   ========================================================================== */

interface CountryNodeProps {
  c: CountryMapNode;
  x: number;
  y: number;
  status: Status;
  selected: boolean;
  dim: boolean;
  onSelect: (code: string) => void;
}

const CountryNode = memo(function CountryNode({ c, x, y, status, selected, dim, onSelect }: CountryNodeProps) {
  const title =
    status === 'conquered'
      ? `${c.name}: ${plural(c.readCount, 'libro leído', 'libros leídos')}`
      : status === 'exploring'
        ? `${c.name}: en expedición (${c.readingCount} leyendo, ${c.unreadCount} por leer)`
        : `${c.name}: descubre su canon literario (${plural(c.canonCount, 'obra maestra', 'obras maestras')})`;

  const meta =
    status === 'discover'
      ? `Canon por descubrir · ${plural(c.canonCount, 'obra', 'obras')}`
      : `${c.readCount} leídos · ${c.canonCount} en el canon`;

  const FLAG_W = 16;
  const FLAG_H = 11;
  const GAP = 6;
  const charW = selected ? 7.2 : 6.4;
  const textW = Math.ceil(c.name.length * charW);
  const contentW = FLAG_W + GAP + textW;
  const horizontalPadding = 22;
  const labelW = Math.max(56, selected ? Math.max(contentW + horizontalPadding, meta.length * 4.2 + 20) : contentW + horizontalPadding);
  const startX = -contentW / 2;
  const flagY = selected ? -10.5 : -5.5;
  const ty = selected ? 37 : 24;

  const flagUrl = `https://flagcdn.com/w40/${c.code.toLowerCase()}.png`;

  const cls = [
    'la-node',
    `la-node--${status}`,
    selected ? 'la-node--selected' : '',
    dim ? 'la-node--dim' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <g
      className={cls}
      style={{ transform: `translate(${f1(x)}px, ${f1(y)}px) scale(var(--la-s, 0.4))` }}
      role="button"
      tabIndex={dim ? -1 : 0}
      aria-label={title}
      aria-pressed={selected}
      onClick={() => onSelect(c.code)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(c.code);
        }
      }}
    >
      <title>{title}</title>
      <circle className="la-node__hit" r={16} />
      <circle className="la-focus" r={16.5} />

      {selected && (
        <g className="la-sel">
          <circle className="la-sel__ring la-sel__ring--a" r={18} />
          <circle className="la-sel__ring la-sel__ring--b" r={22} />
        </g>
      )}

      <g className="la-node__body">
        {status === 'conquered' && (
          <>
            {selected && <circle className="la-pulse" r={13} />}
            <path className="la-wax" d={WAX_D} fill="url(#la-wax-grad)" />
            <circle className="la-wax-ring" r={9.3} />
            <circle className="la-wax-ring la-wax-ring--dash" r={7.4} />
            <image
              href={flagUrl}
              x={-7.5}
              y={-7.5}
              width={15}
              height={15}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#la-clip-wax-flag)"
            />
            <ellipse className="la-wax-shine" cx={-4} cy={-5} rx={4.2} ry={2.2} transform="rotate(-35 -4 -5)" />
            <g className="la-badge" transform="translate(10 -10)">
              <circle r={5.8} />
              <text y={0.3}>{c.readCount > 99 ? '99+' : c.readCount}</text>
            </g>
          </>
        )}

        {status === 'exploring' && (
          <>
            <circle className="la-explore__disc" r={10} />
            <circle className="la-explore__ring" r={11.8} />
            <circle className="la-explore__outline" r={5} />
            <path className="la-explore__half" d={HALF_D} />
            <image
              href={flagUrl}
              x={-6.5}
              y={-6.5}
              width={13}
              height={13}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#la-clip-exp-flag)"
            />
          </>
        )}

        {status === 'discover' && (
          <>
            <circle className="la-discover__halo" r={12} />
            <path className="la-discover__star" d={COMPASS_STAR_D} />
            <circle className="la-discover__dot" r={3.2} />
          </>
        )}
      </g>

      <g className="la-label" transform={`translate(0 ${ty})`}>
        <rect
          className="la-label__bg"
          x={-labelW / 2}
          y={selected ? -15 : -9}
          width={labelW}
          height={selected ? 30 : 18}
          rx={4}
        />
        <g transform={`translate(${startX} ${flagY})`}>
          <rect
            width={FLAG_W}
            height={FLAG_H}
            rx={2}
            ry={2}
            fill="#dcd4c0"
            stroke="rgba(80,50,20,0.3)"
            strokeWidth={0.5}
          />
          <image
            href={flagUrl}
            x={0}
            y={0}
            width={FLAG_W}
            height={FLAG_H}
            preserveAspectRatio="xMidYMid slice"
            clipPath="url(#la-clip-label-flag)"
          />
        </g>
        <text
          className="la-label__name"
          x={startX + FLAG_W + GAP}
          y={selected ? -5 : 0.5}
          textAnchor="start"
        >
          {c.name}
        </text>
        {selected && (
          <text className="la-label__meta" y={8}>
            {meta}
          </text>
        )}
      </g>
    </g>
  );
});

/* ==========================================================================
   Componente principal
   ========================================================================== */

interface Gesture {
  mode: 'none' | 'drag' | 'pinch';
  sx: number;
  sy: number;
  rect: Rect;
  startDist: number;
  moved: boolean;
}
const IDLE_GESTURE: Gesture = { mode: 'none', sx: 0, sy: 0, rect: WORLD, startDist: 0, moved: false };

export function LiteraryAtlasMap(props: LiteraryAtlasMapProps) {
  const { countries, selectedCountryCode, activeContinent, onSelectContinent, isExpanded, onToggleExpand } = props;

  const propsRef = useRef(props);
  propsRef.current = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<Rect>(PRESETS[activeContinent]);
  const targetRef = useRef<Rect>(PRESETS[activeContinent]);
  const rafRef = useRef(0);
  const firstRef = useRef(true);
  const suppressRef = useRef(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<Gesture>(IDLE_GESTURE);
  const wheelTimer = useRef<number | undefined>(undefined);

  const [zoom, setZoom] = useState(() => MAP_W / PRESETS[activeContinent].w);
  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );

  /* ------------------------------ Cámara ------------------------------ */

  const syncZoom = useCallback(() => {
    setZoom(Math.round((MAP_W / curRef.current.w) * 100) / 100);
  }, []);

  const applyRect = useCallback((r: Rect) => {
    const svg = svgRef.current;
    if (!svg) return;
    curRef.current = r;
    svg.setAttribute('viewBox', `${r.x.toFixed(2)} ${r.y.toFixed(2)} ${r.w.toFixed(2)} ${r.h.toFixed(2)}`);
    const z = MAP_W / r.w;
    svg.style.setProperty('--la-s', String(markerScale(z)));
    const lvl = z >= 2.2 ? 'high' : z > 1.12 ? 'mid' : 'low';
    if (svg.dataset.zoom !== lvl) svg.dataset.zoom = lvl;
  }, []);

  const animateTo = useCallback(
    (target: Rect, duration = EASE_MS) => {
      cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      const from = { ...curRef.current };
      const reduce =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || duration <= 0) {
        applyRect(target);
        syncZoom();
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = EASE(t);
        applyRect({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          w: from.w + (target.w - from.w) * e,
          h: from.h + (target.h - from.h) * e,
        });
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
        else syncZoom();
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [applyRect, syncZoom],
  );

  // Encuadre inicial y transiciones al cambiar de continente
  useLayoutEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      applyRect(PRESETS[activeContinent]);
      targetRef.current = PRESETS[activeContinent];
      syncZoom();
      return;
    }
    animateTo(PRESETS[activeContinent]);
  }, [activeContinent, animateTo, applyRect, syncZoom]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(wheelTimer.current);
    },
    [],
  );

  // Zoom con Ctrl/Cmd + rueda (no secuestra el scroll normal de la página)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      const box = el.getBoundingClientRect();
      const cur = curRef.current;
      const ux = cur.x + ((e.clientX - box.left) / box.width) * cur.w;
      const uy = cur.y + ((e.clientY - box.top) / box.height) * cur.h;
      const nw = Math.min(MAP_W, Math.max(MIN_W, cur.w / Math.exp(-e.deltaY * 0.002)));
      const k = nw / cur.w;
      const next = clampRect({ x: ux - (ux - cur.x) * k, y: uy - (uy - cur.y) * k, w: nw, h: (nw * MAP_H) / MAP_W });
      applyRect(next);
      targetRef.current = next;
      window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(syncZoom, 120);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyRect, syncZoom]);

  const zoomBy = useCallback(
    (factor: number) => {
      const t = targetRef.current;
      const nw = Math.min(MAP_W, Math.max(MIN_W, t.w / factor));
      const nh = (nw * MAP_H) / MAP_W;
      animateTo(clampRect({ x: t.x + t.w / 2 - nw / 2, y: t.y + t.h / 2 - nh / 2, w: nw, h: nh }));
    },
    [animateTo],
  );

  const resetView = useCallback(() => {
    animateTo(WORLD);
    if (propsRef.current.activeContinent !== 'all') propsRef.current.onSelectContinent('all');
  }, [animateTo]);

  /** Centra suavemente un país si queda fuera de la zona cómoda de la vista actual. */
  const focusCountry = useCallback(
    (code: string) => {
      const ll = COORDS[code];
      if (!ll) return;
      const t = targetRef.current;
      if (t.w >= MAP_W - 1) return;
      const x = px(ll[0]);
      const y = py(ll[1]);
      const inside =
        x >= t.x + t.w * 0.2 && x <= t.x + t.w * 0.8 && y >= t.y + t.h * 0.24 && y <= t.y + t.h * 0.76;
      if (inside) return;
      animateTo(clampRect({ x: x - t.w / 2, y: y - t.h / 2, w: t.w, h: t.h }));
    },
    [animateTo],
  );

  useEffect(() => {
    if (selectedCountryCode) focusCountry(selectedCountryCode);
  }, [selectedCountryCode, focusCountry]);

  /* ------------------------- Arrastre y pellizco ------------------------- */

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    suppressRef.current = false;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        mode: 'drag',
        sx: e.clientX,
        sy: e.clientY,
        rect: { ...curRef.current },
        startDist: 0,
        moved: false,
      };
    } else if (pointersRef.current.size === 2) {
      cancelAnimationFrame(rafRef.current);
      const box = e.currentTarget.getBoundingClientRect();
      const [a, b] = Array.from(pointersRef.current.values());
      gestureRef.current = {
        mode: 'pinch',
        sx: (a.x + b.x) / 2 - box.left,
        sy: (a.y + b.y) / 2 - box.top,
        rect: { ...curRef.current },
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        moved: true,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    const svg = svgRef.current;
    if (!svg || g.mode === 'none') return;
    const box = svg.getBoundingClientRect();

    if (g.mode === 'pinch' && pointersRef.current.size >= 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mx = (a.x + b.x) / 2 - box.left;
      const my = (a.y + b.y) / 2 - box.top;
      const nw = Math.min(MAP_W, Math.max(MIN_W, (g.rect.w * g.startDist) / dist));
      const nh = (nw * MAP_H) / MAP_W;
      const ux = g.rect.x + (g.sx / box.width) * g.rect.w;
      const uy = g.rect.y + (g.sy / box.height) * g.rect.h;
      const next = clampRect({ x: ux - (mx / box.width) * nw, y: uy - (my / box.height) * nh, w: nw, h: nh });
      applyRect(next);
      targetRef.current = next;
      return;
    }

    if (g.mode === 'drag') {
      const dx = e.clientX - g.sx;
      const dy = e.clientY - g.sy;
      if (!g.moved) {
        if (Math.hypot(dx, dy) < 6) return;
        if (MAP_W / curRef.current.w <= 1.02) return; // sin zoom no hay nada que arrastrar
        cancelAnimationFrame(rafRef.current);
        g.moved = true;
        g.rect = { ...curRef.current };
        g.sx = e.clientX;
        g.sy = e.clientY;
        try {
          svg.setPointerCapture(e.pointerId);
        } catch {
          /* el puntero ya no está activo */
        }
        svg.dataset.drag = '1';
        return;
      }
      const upp = g.rect.w / box.width;
      const next = clampRect({
        x: g.rect.x - (e.clientX - g.sx) * upp,
        y: g.rect.y - (e.clientY - g.sy) * upp,
        w: g.rect.w,
        h: g.rect.h,
      });
      applyRect(next);
      targetRef.current = next;
    }
  };

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointersRef.current.delete(e.pointerId)) return;
    const g = gestureRef.current;
    if (g.moved) suppressRef.current = true;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* sin captura activa */
    }
    if (pointersRef.current.size === 0) {
      if (g.moved) syncZoom();
      if (svgRef.current) delete svgRef.current.dataset.drag;
      gestureRef.current = IDLE_GESTURE;
    } else if (g.mode === 'pinch') {
      gestureRef.current = { ...g, mode: 'none' };
    }
  };

  /* --------------------------- Selección --------------------------- */

  const handleSelect = useCallback((code: string) => {
    if (suppressRef.current) return;
    propsRef.current.onSelectCountry(code);
  }, []);

  const handleContinent = useCallback((id: RegionId) => {
    if (suppressRef.current) return;
    propsRef.current.onSelectContinent(id);
  }, []);

  /* ------------------------- Datos derivados ------------------------- */

  const nodes = useMemo(
    () =>
      countries
        .filter((c) => COORDS[c.code])
        .map((c) => ({
          c,
          x: px(COORDS[c.code][0]),
          y: py(COORDS[c.code][1]),
          status: statusOf(c),
        })),
    [countries],
  );

  const orderedNodes = useMemo(() => {
    const layer = (s: Status) => (s === 'discover' ? 0 : s === 'exploring' ? 1 : 2);
    return [...nodes].sort((a, b) => {
      const sa = a.c.code === selectedCountryCode ? 1 : 0;
      const sb = b.c.code === selectedCountryCode ? 1 : 0;
      return sa - sb || layer(a.status) - layer(b.status);
    });
  }, [nodes, selectedCountryCode]);

  // Rutas de viaje: arcos dorados entre los países conquistados, en orden cronológico
  const routes = useMemo(() => {
    const conquered = nodes
      .filter((n) => n.status === 'conquered')
      .sort((a, b) => {
        const da = a.c.firstReadDate ?? '9999';
        const db = b.c.firstReadDate ?? '9999';
        return da < db ? -1 : da > db ? 1 : a.c.code.localeCompare(b.c.code);
      });
    const out: { key: string; d: string; delay: number }[] = [];
    for (let i = 0; i < conquered.length - 1; i++) {
      const a = conquered[i];
      const b = conquered[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      let nx = -dy / dist;
      let ny = dx / dist;
      if (ny > 0) {
        nx = -nx;
        ny = -ny; // el arco siempre se curva hacia el norte
      }
      const bow = Math.min(70, dist * 0.22);
      const cx = (a.x + b.x) / 2 + nx * bow;
      const cy = (a.y + b.y) / 2 + ny * bow;
      out.push({
        key: `${a.c.code}-${b.c.code}`,
        d: `M${f1(a.x)},${f1(a.y)}Q${f1(cx)},${f1(cy)} ${f1(b.x)},${f1(b.y)}`,
        delay: (i % 6) * -0.4,
      });
    }
    return out;
  }, [nodes]);

  const pills = useMemo(() => {
    const list = activeContinent === 'all' ? countries : countries.filter((c) => c.continent === activeContinent);
    return [...list]
      .map((c) => ({ c, status: statusOf(c) }))
      .sort(
        (a, b) =>
          STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
          b.c.readCount - a.c.readCount ||
          b.c.readingCount - a.c.readingCount ||
          a.c.name.localeCompare(b.c.name, 'es'),
      );
  }, [countries, activeContinent]);

  const summary = useMemo(() => {
    let conquered = 0;
    let exploring = 0;
    let discover = 0;
    for (const c of countries) {
      const s = statusOf(c);
      if (s === 'conquered') conquered++;
      else if (s === 'exploring') exploring++;
      else discover++;
    }
    return { conquered, exploring, discover, total: countries.length };
  }, [countries]);

  // Centra la píldora activa dentro de la cinta (sin mover la página)
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !selectedCountryCode) return;
    const btn = strip.querySelector<HTMLElement>(`[data-code="${selectedCountryCode}"]`);
    if (!btn) return;
    strip.scrollTo({
      left: btn.offsetLeft - strip.clientWidth / 2 + btn.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [selectedCountryCode, activeContinent]);

  const isZoomed = zoom > 1.05 || activeContinent !== 'all';
  const isGeneralView = activeContinent === 'all' && zoom <= 1.05;

  /* ------------------------------ Render ------------------------------ */

  return (
    <section className={`la-root font-sans ${isExpanded ? 'la-root--expanded' : ''}`} aria-label="Atlas Literario Mundial">
      {/* Barra superior: regiones + zoom */}
      <div className="la-toolbar">
        <div className="la-regions la-noscroll" role="group" aria-label="Regiones del mundo">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="la-chip"
              aria-pressed={activeContinent === r.id}
              onClick={() => {
                if (r.id === activeContinent) animateTo(PRESETS[r.id]);
                else onSelectContinent(r.id);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="la-zoom" role="group" aria-label="Controles de zoom">
          <button
            type="button"
            className="la-iconbtn"
            onClick={() => zoomBy(1.6)}
            disabled={zoom >= MAP_W / MIN_W - 0.02}
            aria-label="Acercar"
            title="Acercar"
          >
            <Plus size={17} />
          </button>
          <button
            type="button"
            className="la-iconbtn"
            onClick={() => zoomBy(1 / 1.6)}
            disabled={zoom <= 1.02}
            aria-label="Alejar"
            title="Alejar"
          >
            <Minus size={17} />
          </button>
          <button
            type="button"
            className="la-iconbtn"
            onClick={resetView}
            aria-label="Vista general del mundo"
            title="Vista general del mundo (Planisferio completo)"
          >
            <Globe size={16} />
          </button>
          {onToggleExpand && (
            <button
              type="button"
              className={isExpanded ? 'la-iconbtn px-2.5 w-auto' : 'la-iconbtn'}
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Reducir mapa' : 'Agrandar mapa (Mesa cartográfica)'}
              title={isExpanded ? 'Reducir mapa a vista normal (Esc)' : 'Agrandar mapa (Mesa cartográfica)'}
            >
              {isExpanded ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-950 dark:text-amber-200">
                  <Minimize2 size={14} />
                  <span>Cerrar</span>
                </span>
              ) : (
                <Maximize2 size={16} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Lienzo del planisferio */}
      <div className="la-canvas">
        <svg
          ref={svgRef}
          className="la-svg"
          viewBox="0 0 1000 520"
          preserveAspectRatio={isZoomed ? 'xMidYMid slice' : 'xMidYMid meet'}
          role="group"
          aria-label="Planisferio literario interactivo"
          data-zoom="low"
          data-zoomed={isZoomed}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        >
          <BaseMap onContinent={handleContinent} isGeneralView={isGeneralView} />

          {/* Rutas de viaje literarias */}
          {routes.length > 0 && (
            <g aria-hidden="true">
              {routes.map((r) => (
                <path key={`g-${r.key}`} className="la-route-glow" d={r.d} />
              ))}
              {routes.map((r) => (
                <path key={r.key} className="la-route" d={r.d} style={{ animationDelay: `${r.delay}s` }} />
              ))}
            </g>
          )}

          {/* Países */}
          <g>
            {orderedNodes.map((n) => (
              <CountryNode
                key={n.c.code}
                c={n.c}
                x={n.x}
                y={n.y}
                status={n.status}
                selected={n.c.code === selectedCountryCode}
                dim={activeContinent !== 'all' && n.c.continent !== activeContinent}
                onSelect={handleSelect}
              />
            ))}
          </g>
        </svg>

        <div className="la-grain" aria-hidden="true" />
        <div className="la-vignette" aria-hidden="true" />
        <div className="la-frame" aria-hidden="true">
          <i className="la-corner la-corner--tl" />
          <i className="la-corner la-corner--tr" />
          <i className="la-corner la-corner--bl" />
          <i className="la-corner la-corner--br" />
        </div>
        <div className="la-hint" data-show={isZoomed && !isTouchDevice && !isExpanded} aria-hidden="true">
          Arrastra para explorar · Ctrl + rueda para acercar
        </div>
      </div>

      {/* Cinta inferior de navegación rápida (oculta en modo ampliado para máxima perspectiva) */}
      {!isExpanded && (
        <nav className="la-strip la-noscroll" ref={stripRef} aria-label="Países de la región activa">
          {pills.length === 0 && <span className="la-strip__empty">No hay territorios en esta región todavía.</span>}
          {pills.map(({ c, status }) => {
            const selected = c.code === selectedCountryCode;
            const glyph = status === 'conquered' ? String(c.readCount) : STATUS_GLYPH[status];
            return (
              <button
                key={c.code}
                type="button"
                data-code={c.code}
                className={`la-pill la-pill--${status}`}
                aria-pressed={selected}
                aria-label={`${c.name}: ${
                  status === 'conquered'
                    ? plural(c.readCount, 'libro leído', 'libros leídos')
                    : status === 'exploring'
                      ? 'en expedición'
                      : 'canon por descubrir'
                }`}
                onClick={() => propsRef.current.onSelectCountry(c.code)}
              >
                <span className="la-pill__flag" aria-hidden="true">
                  <img
                    src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`}
                    alt=""
                    className="w-3.5 h-2.5 object-cover rounded-xs border border-amber-900/15 dark:border-white/15 inline-block mr-1 align-middle"
                    loading="lazy"
                  />
                </span>
                <span>{c.name}</span>
                <span className="la-pill__glyph" aria-hidden="true">
                  {glyph}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Leyenda cartográfica (oculta en modo ampliado para despejar el lienzo) */}
      {!isExpanded && (
        <footer className="la-legend">
          <span className="la-legend__title">
            <Compass size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
            Leyenda
          </span>
          <span className="la-legend__item">
            <svg width="20" height="20" viewBox="-12 -12 24 24" aria-hidden="true">
              <path className="la-wax" d={WAX_D} fill="url(#la-wax-grad)" />
              <circle className="la-wax-ring" r={8} />
            </svg>
            ● Sello Conquistado (Leído) <span className="la-legend__count">{summary.conquered}</span>
          </span>
          <span className="la-legend__item">
            <svg width="20" height="20" viewBox="-12 -12 24 24" aria-hidden="true">
              <circle className="la-explore__disc" r={10} />
              <circle className="la-explore__ring" r={11.5} style={{ animation: 'none' }} />
              <path className="la-explore__half" d={HALF_D} />
              <circle className="la-explore__outline" r={5} />
            </svg>
            ◐ En Expedición (Leyendo / Por leer) <span className="la-legend__count">{summary.exploring}</span>
          </span>
          <span className="la-legend__item">
            <svg width="20" height="20" viewBox="-12 -12 24 24" aria-hidden="true">
              <path className="la-discover__star" d={COMPASS_STAR_D} />
              <circle className="la-discover__dot" r={3.2} />
            </svg>
            ○ Territorio con Canon por Descubrir <span className="la-legend__count">{summary.discover}</span>
          </span>
          <span className="la-legend__summary">
            <strong>{summary.conquered}</strong> de {summary.total} territorios conquistados
          </span>
        </footer>
      )}
    </section>
  );
}

export default LiteraryAtlasMap;
