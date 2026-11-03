import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Compass, Minus, Plus, Globe, Maximize2, Minimize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { LibrarySelect } from './LibrarySelect';
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

import {
  type Rect,
  type RegionId,
  type Status,
  MAP_W,
  MAP_H,
  MIN_W,
  MIN_H,
  WORLD,
  EASE_MS,
  px,
  py,
  f1,
  EASE,
  clampRect,
  getMaxViewSize,
  getPresetRect,
  markerScale,
  LANDS,
  COORDS,
  PRESETS,
  GRAT_MINOR_D,
  GRAT_MAJOR_D,
  GRAT_LAT_LABELS,
  GRAT_LON_LABELS,
  ROSE_HUBS,
  RHUMB_MAJOR_D,
  RHUMB_MINOR_D,
  ROSE_STAR_MINOR_A,
  ROSE_STAR_MINOR_B,
  ROSE_STAR_MAIN_A,
  ROSE_STAR_MAIN_B,
  ROSE_TICKS_D,
  REGION_LABELS,
  OCEAN_LABELS,
  WAX_D,
  COMPASS_STAR_D,
  HALF_D,
  REGIONS,
  REGION_OPTIONS,
  statusOf,
  STATUS_RANK,
  STATUS_GLYPH,
  plural,
  attachDragScroll,
} from './literary-atlas/atlasGeometry';

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
          <path className="la-rose-tick" d={ROSE_TICKS_D} />
        </g>
        <g className="la-rose__star">
          <path className="la-rose-halfA la-rose-halfA--minor" d={ROSE_STAR_MINOR_A} />
          <path className="la-rose-halfB la-rose-halfB--minor" d={ROSE_STAR_MINOR_B} />
          <path className="la-rose-halfA" d={ROSE_STAR_MAIN_A} />
          <path className="la-rose-halfB" d={ROSE_STAR_MAIN_B} />
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
  lx: number;
  ly: number;
  rect: Rect;
  startDist: number;
  ldist: number;
  moved: boolean;
  box: DOMRect | null;
}
const IDLE_GESTURE: Gesture = {
  mode: 'none',
  sx: 0,
  sy: 0,
  lx: 0,
  ly: 0,
  rect: WORLD,
  startDist: 0,
  ldist: 0,
  moved: false,
  box: null,
};

export function LiteraryAtlasMap(props: LiteraryAtlasMapProps) {
  const { countries, selectedCountryCode, activeContinent, onSelectContinent, isExpanded, onToggleExpand } = props;

  const propsRef = useRef(props);
  propsRef.current = props;

  const svgRef = useRef<SVGSVGElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const regionsRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<Rect>(PRESETS[activeContinent]);
  const targetRef = useRef<Rect>(PRESETS[activeContinent]);
  const rafRef = useRef(0);
  const wheelRafRef = useRef(0);
  const pendingFlushRef = useRef(0);
  const lastScaleRef = useRef(-1);
  const lastVbRef = useRef('');
  const lastTapRef = useRef<{ t: number; x: number; y: number }>({ t: 0, x: 0, y: 0 });
  const firstRef = useRef(true);
  const suppressRef = useRef(false);
  const gestureRef = useRef<Gesture>(IDLE_GESTURE);
  const wheelTimer = useRef<number | undefined>(undefined);

  const [zoom, setZoom] = useState(() => MAP_H / PRESETS[activeContinent].h);
  const [worldZoom, setWorldZoom] = useState(() => MAP_W / PRESETS[activeContinent].w);
  const isTouchDevice = typeof window !== 'undefined' && (
    'ontouchstart' in window || navigator.maxTouchPoints > 0 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );

  /* ------------------------------ Cámara ------------------------------ */

  const syncZoom = useCallback(() => {
    const box = svgRef.current?.getBoundingClientRect();
    const { maxH } = getMaxViewSize(box);
    const nextZ = Math.round((maxH / curRef.current.h) * 100) / 100;
    setZoom((prev) => (Math.abs(prev - nextZ) < 0.01 ? prev : nextZ));
    const nextWorldZ = Math.round((MAP_W / curRef.current.w) * 100) / 100;
    setWorldZoom((prev) => (Math.abs(prev - nextWorldZ) < 0.01 ? prev : nextWorldZ));
  }, []);

  const commitRectToDOM = useCallback((r: Rect) => {
    const svg = svgRef.current;
    if (!svg) return;
    const vb = `${r.x.toFixed(1)} ${r.y.toFixed(1)} ${r.w.toFixed(1)} ${r.h.toFixed(1)}`;
    if (vb !== lastVbRef.current) {
      lastVbRef.current = vb;
      svg.setAttribute('viewBox', vb);
    }
    const z = MAP_W / r.w;
    const s = markerScale(z);
    if (Math.abs(s - lastScaleRef.current) > 0.004) {
      lastScaleRef.current = s;
      svg.style.setProperty('--la-s', s.toFixed(3));
    }
    const lvl = z >= 2.2 ? 'high' : z > 1.12 ? 'mid' : 'low';
    if (svg.dataset.zoom !== lvl) svg.dataset.zoom = lvl;
    const zoomedStr = z > 1.05 || propsRef.current.activeContinent !== 'all' ? 'true' : 'false';
    if (svg.dataset.zoomed !== zoomedStr) svg.dataset.zoomed = zoomedStr;
  }, []);

  const applyRect = useCallback(
    (r: Rect) => {
      curRef.current = r;
      if (pendingFlushRef.current) {
        cancelAnimationFrame(pendingFlushRef.current);
        pendingFlushRef.current = 0;
      }
      commitRectToDOM(r);
    },
    [commitRectToDOM],
  );

  const scheduleRect = useCallback(
    (r: Rect) => {
      curRef.current = r;
      if (!pendingFlushRef.current) {
        pendingFlushRef.current = requestAnimationFrame(() => {
          pendingFlushRef.current = 0;
          commitRectToDOM(curRef.current);
        });
      }
    },
    [commitRectToDOM],
  );

  const animateTo = useCallback(
    (target: Rect, duration = EASE_MS) => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(wheelRafRef.current);
      wheelRafRef.current = 0;
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
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          syncZoom();
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [applyRect, syncZoom],
  );

  // Encuadre inicial y transiciones al cambiar de continente
  useLayoutEffect(() => {
    const box = svgRef.current?.getBoundingClientRect();
    let init = getPresetRect(activeContinent, box);
    if (firstRef.current) {
      firstRef.current = false;
      const code = propsRef.current.selectedCountryCode;
      if (code && COORDS[code] && init.w < MAP_W - 1) {
        const x = px(COORDS[code][0]);
        const y = py(COORDS[code][1]);
        init = clampRect({ x: x - init.w / 2, y: y - init.h / 2, w: init.w, h: init.h }, box);
      }
      applyRect(init);
      targetRef.current = init;
      syncZoom();
      return;
    }
    animateTo(init);
  }, [activeContinent, animateTo, applyRect, syncZoom]);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(wheelRafRef.current);
      cancelAnimationFrame(pendingFlushRef.current);
      window.clearTimeout(wheelTimer.current);
    },
    [],
  );

  // Gestos multitáctiles nativos en móvil (TouchEvent garantiza coordenadas sincronizadas de ambos dedos sin parpadeos)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const preventGesture = (e: Event) => e.preventDefault();

    const onTouchStart = (e: TouchEvent) => {
      const box = el.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        suppressRef.current = false;
        gestureRef.current = {
          mode: 'drag',
          sx: t.clientX,
          sy: t.clientY,
          lx: t.clientX,
          ly: t.clientY,
          rect: { ...curRef.current },
          startDist: 0,
          ldist: 0,
          moved: false,
          box,
        };
      } else if (e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        cancelAnimationFrame(rafRef.current);
        cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = 0;
        if (pendingFlushRef.current) {
          cancelAnimationFrame(pendingFlushRef.current);
          pendingFlushRef.current = 0;
          commitRectToDOM(curRef.current);
        }
        suppressRef.current = true;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const mx = (t0.clientX + t1.clientX) / 2 - box.left;
        const my = (t0.clientY + t1.clientY) / 2 - box.top;
        const dist = Math.max(16, Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY));
        gestureRef.current = {
          mode: 'pinch',
          sx: mx,
          sy: my,
          lx: mx,
          ly: my,
          rect: { ...curRef.current },
          startDist: dist,
          ldist: dist,
          moved: true,
          box,
        };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (g.mode === 'none' || !g.box || g.box.width <= 0 || g.box.height <= 0) return;

      if (e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.max(16, Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY));
        const mx = (t0.clientX + t1.clientX) / 2 - g.box.left;
        const my = (t0.clientY + t1.clientY) / 2 - g.box.top;

        if (g.mode !== 'pinch') {
          g.mode = 'pinch';
          g.sx = mx;
          g.sy = my;
          g.lx = mx;
          g.ly = my;
          g.rect = { ...curRef.current };
          g.startDist = dist;
          g.ldist = dist;
          g.moved = true;
          suppressRef.current = true;
          return;
        }

        if (Math.hypot(mx - g.lx, my - g.ly) < 0.7 && Math.abs(dist - g.ldist) < 0.7) {
          return;
        }
        g.lx = mx;
        g.ly = my;
        g.ldist = dist;

        const { maxH, ar } = getMaxViewSize(g.box);
        const k = g.startDist / dist;
        const nh = Math.min(maxH, Math.max(MIN_H, g.rect.h * k));
        const nw = nh * ar;
        const ux = g.rect.x + (g.sx / g.box.width) * g.rect.w;
        const uy = g.rect.y + (g.sy / g.box.height) * g.rect.h;
        const next = clampRect(
          {
            x: ux - (mx / g.box.width) * nw,
            y: uy - (my / g.box.height) * nh,
            w: nw,
            h: nh,
          },
          g.box,
        );
        targetRef.current = next;
        scheduleRect(next);
        return;
      }

      if (e.touches.length === 1 && g.mode === 'drag') {
        const t = e.touches[0];
        const dx = t.clientX - g.sx;
        const dy = t.clientY - g.sy;
        if (!g.moved) {
          if (Math.hypot(dx, dy) < 6) return;
          cancelAnimationFrame(rafRef.current);
          cancelAnimationFrame(wheelRafRef.current);
          wheelRafRef.current = 0;
          g.moved = true;
          suppressRef.current = true;
          g.sx = t.clientX;
          g.sy = t.clientY;
          g.lx = t.clientX;
          g.ly = t.clientY;
          g.rect = { ...curRef.current };
          return;
        }
        if (e.cancelable) e.preventDefault();
        if (Math.hypot(t.clientX - g.lx, t.clientY - g.ly) < 0.7) return;
        g.lx = t.clientX;
        g.ly = t.clientY;
        const uppX = g.rect.w / g.box.width;
        const uppY = g.rect.h / g.box.height;
        const next = clampRect(
          {
            x: g.rect.x - dx * uppX,
            y: g.rect.y - dy * uppY,
            w: g.rect.w,
            h: g.rect.h,
          },
          g.box,
        );
        targetRef.current = next;
        scheduleRect(next);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (g.mode === 'none') return;

      if (e.touches.length === 0) {
        if (pendingFlushRef.current) {
          cancelAnimationFrame(pendingFlushRef.current);
          pendingFlushRef.current = 0;
          commitRectToDOM(curRef.current);
        }
        if (g.moved) {
          syncZoom();
          window.setTimeout(() => {
            suppressRef.current = false;
          }, 60);
        } else if (e.changedTouches.length === 1 && g.box && !(e.target as Element | null)?.closest('.la-node')) {
          const ct = e.changedTouches[0];
          const now = performance.now();
          const prev = lastTapRef.current;
          if (now - prev.t < 290 && Math.hypot(ct.clientX - prev.x, ct.clientY - prev.y) < 28) {
            lastTapRef.current = { t: 0, x: 0, y: 0 };
            suppressRef.current = true;
            const cur = curRef.current;
            const { maxH, ar } = getMaxViewSize(g.box);
            const curZ = maxH / cur.h;
            if (curZ > 3.1) {
              animateTo(getPresetRect(propsRef.current.activeContinent, g.box));
            } else {
              const rx = (ct.clientX - g.box.left) / g.box.width;
              const ry = (ct.clientY - g.box.top) / g.box.height;
              const ux = cur.x + rx * cur.w;
              const uy = cur.y + ry * cur.h;
              const nh = Math.max(MIN_H, cur.h / 1.85);
              const nw = nh * ar;
              animateTo(
                clampRect(
                  {
                    x: ux - rx * nw,
                    y: uy - ry * nh,
                    w: nw,
                    h: nh,
                  },
                  g.box,
                ),
              );
            }
            window.setTimeout(() => {
              suppressRef.current = false;
            }, 60);
          } else {
            lastTapRef.current = { t: now, x: ct.clientX, y: ct.clientY };
          }
        }
        gestureRef.current = IDLE_GESTURE;
      } else if (e.touches.length === 1) {
        if (pendingFlushRef.current) {
          cancelAnimationFrame(pendingFlushRef.current);
          pendingFlushRef.current = 0;
          commitRectToDOM(curRef.current);
        }
        const rem = e.touches[0];
        gestureRef.current = {
          mode: 'drag',
          sx: rem.clientX,
          sy: rem.clientY,
          lx: rem.clientX,
          ly: rem.clientY,
          rect: { ...curRef.current },
          startDist: 0,
          ldist: 0,
          moved: true,
          box: g.box,
        };
      }
    };

    el.addEventListener('gesturestart', preventGesture, { passive: false });
    el.addEventListener('gesturechange', preventGesture, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('gesturestart', preventGesture);
      el.removeEventListener('gesturechange', preventGesture);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [animateTo, commitRectToDOM, scheduleRect, syncZoom]);

  // Zoom con rueda interpolado a 60-120fps:
  // - En modo ampliado (mesa de gran formato): la rueda del ratón hace zoom directamente sin necesidad de pulsar Ctrl.
  // - En vista empotrada normal: exige Ctrl/Cmd para no interferir con el desplazamiento normal por la página web.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    let lastWheelFrame = 0;

    const stepWheelGlide = (now: number) => {
      const dt = lastWheelFrame ? Math.min(48, Math.max(4, now - lastWheelFrame)) : 16;
      lastWheelFrame = now;
      const cur = curRef.current;
      const tgt = targetRef.current;
      const dw = tgt.w - cur.w;
      const dh = tgt.h - cur.h;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;

      if (Math.abs(dw) < 0.2 && Math.abs(dh) < 0.2 && Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
        wheelRafRef.current = 0;
        lastWheelFrame = 0;
        applyRect(tgt);
        syncZoom();
        return;
      }

      const alpha = 1 - Math.pow(0.0006, dt / 160);
      applyRect({
        x: cur.x + dx * alpha,
        y: cur.y + dy * alpha,
        w: cur.w + dw * alpha,
        h: cur.h + dh * alpha,
      });
      wheelRafRef.current = requestAnimationFrame(stepWheelGlide);
    };

    const onWheel = (e: WheelEvent) => {
      if (!isExpanded && !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      cancelAnimationFrame(rafRef.current);
      const box = el.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) return;

      const rawDelta = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      const clampedDelta = Math.max(-220, Math.min(220, rawDelta));

      const { maxH, ar } = getMaxViewSize(box);
      const base = targetRef.current;
      const cur = curRef.current;
      const rx = (e.clientX - box.left) / box.width;
      const ry = (e.clientY - box.top) / box.height;
      const ux = cur.x + rx * cur.w;
      const uy = cur.y + ry * cur.h;
      const nh = Math.min(maxH, Math.max(MIN_H, base.h * Math.exp(clampedDelta * 0.0018)));
      const nw = nh * ar;
      targetRef.current = clampRect(
        {
          x: ux - rx * nw,
          y: uy - ry * nh,
          w: nw,
          h: nh,
        },
        box,
      );

      if (!wheelRafRef.current) {
        lastWheelFrame = 0;
        wheelRafRef.current = requestAnimationFrame(stepWheelGlide);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyRect, syncZoom, isExpanded]);

  const zoomBy = useCallback(
    (factor: number) => {
      const box = svgRef.current?.getBoundingClientRect();
      const { maxH, ar } = getMaxViewSize(box);
      const t = targetRef.current;
      const nh = Math.min(maxH, Math.max(MIN_H, t.h / factor));
      const nw = nh * ar;
      animateTo(clampRect({ x: t.x + t.w / 2 - nw / 2, y: t.y + t.h / 2 - nh / 2, w: nw, h: nh }, box));
    },
    [animateTo],
  );

  const resetView = useCallback(() => {
    const box = svgRef.current?.getBoundingClientRect();
    animateTo(getPresetRect('all', box));
    if (propsRef.current.activeContinent !== 'all') propsRef.current.onSelectContinent('all');
  }, [animateTo]);

  /** Centra suavemente un país si queda fuera de la zona cómoda de la vista actual. */
  const focusCountry = useCallback(
    (code: string) => {
      const ll = COORDS[code];
      if (!ll) return;
      const t = targetRef.current;
      if (t.w >= MAP_W - 1 && t.h >= MAP_H - 1) return;
      const x = px(ll[0]);
      const y = py(ll[1]);
      const inside =
        x >= t.x + t.w * 0.2 && x <= t.x + t.w * 0.8 && y >= t.y + t.h * 0.24 && y <= t.y + t.h * 0.76;
      if (inside) return;
      const box = svgRef.current?.getBoundingClientRect();
      animateTo(clampRect({ x: x - t.w / 2, y: y - t.h / 2, w: t.w, h: t.h }, box));
    },
    [animateTo],
  );

  useEffect(() => {
    if (selectedCountryCode) focusCountry(selectedCountryCode);
  }, [selectedCountryCode, focusCountry]);

  /* ------------------------- Arrastre con ratón (Escritorio) ------------------------- */

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    suppressRef.current = false;
    gestureRef.current = {
      mode: 'drag',
      sx: e.clientX,
      sy: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      rect: { ...curRef.current },
      startDist: 0,
      ldist: 0,
      moved: false,
      box: e.currentTarget.getBoundingClientRect(),
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse') return;
    const g = gestureRef.current;
    const svg = svgRef.current;
    if (!svg || g.mode !== 'drag' || !g.box || g.box.width <= 0 || g.box.height <= 0) return;

    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      if (curRef.current.w >= MAP_W - 1 && curRef.current.h >= MAP_H - 1) return;
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(wheelRafRef.current);
      wheelRafRef.current = 0;
      g.moved = true;
      suppressRef.current = true;
      g.sx = e.clientX;
      g.sy = e.clientY;
      g.lx = e.clientX;
      g.ly = e.clientY;
      g.rect = { ...curRef.current };
      try {
        svg.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura */
      }
      svg.dataset.drag = '1';
      return;
    }
    const uppX = g.rect.w / g.box.width;
    const uppY = g.rect.h / g.box.height;
    const next = clampRect(
      {
        x: g.rect.x - dx * uppX,
        y: g.rect.y - dy * uppY,
        w: g.rect.w,
        h: g.rect.h,
      },
      g.box,
    );
    targetRef.current = next;
    scheduleRect(next);
  };

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse') return;
    const g = gestureRef.current;
    if (g.mode === 'none') return;
    if (g.moved) suppressRef.current = true;
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* sin captura activa */
    }
    if (pendingFlushRef.current) {
      cancelAnimationFrame(pendingFlushRef.current);
      pendingFlushRef.current = 0;
      commitRectToDOM(curRef.current);
    }
    if (g.moved) syncZoom();
    if (svgRef.current) delete svgRef.current.dataset.drag;
    gestureRef.current = IDLE_GESTURE;
  };

  /* --------------------------- Selección --------------------------- */

  const handleSelect = useCallback((code: string) => {
    if (suppressRef.current) return;
    propsRef.current.onSelectCountry(code);
  }, []);

  const handleContinent = useCallback((id: RegionId) => {
    if (suppressRef.current) return;
    if (propsRef.current.activeContinent !== 'all' || MAP_W / curRef.current.w > 1.05) return;
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

  const [canScrollStripLeft, setCanScrollStripLeft] = useState(false);
  const [canScrollStripRight, setCanScrollStripRight] = useState(false);
  const [hasStripOverflow, setHasStripOverflow] = useState(false);

  const checkStripScroll = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setHasStripOverflow(overflow);
    setCanScrollStripLeft(el.scrollLeft > 4);
    setCanScrollStripRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const handleScrollStrip = (amount: number) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkStripScroll, 250);
  };

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const t = setTimeout(checkStripScroll, 50);

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkStripScroll();
      }
    };

    const cleanupDrag = attachDragScroll(el, checkStripScroll);

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', checkStripScroll, { passive: true });
    window.addEventListener('resize', checkStripScroll);

    return () => {
      clearTimeout(t);
      cleanupDrag();
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', checkStripScroll);
      window.removeEventListener('resize', checkStripScroll);
    };
  }, [pills, checkStripScroll]);

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
    setTimeout(checkStripScroll, 300);
  }, [selectedCountryCode, activeContinent, checkStripScroll]);

  /* ------------------- Control y arrastre de Regiones ------------------- */
  const [canScrollRegionsLeft, setCanScrollRegionsLeft] = useState(false);
  const [canScrollRegionsRight, setCanScrollRegionsRight] = useState(false);
  const [hasRegionsOverflow, setHasRegionsOverflow] = useState(false);

  const checkRegionsScroll = useCallback(() => {
    const el = regionsRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    setHasRegionsOverflow(overflow);
    setCanScrollRegionsLeft(el.scrollLeft > 4);
    setCanScrollRegionsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const handleScrollRegions = (amount: number) => {
    const el = regionsRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkRegionsScroll, 250);
  };

  useEffect(() => {
    const el = regionsRef.current;
    if (!el) return;
    const t = setTimeout(checkRegionsScroll, 50);

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkRegionsScroll();
      }
    };

    const cleanupDrag = attachDragScroll(el, checkRegionsScroll);

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('scroll', checkRegionsScroll, { passive: true });
    window.addEventListener('resize', checkRegionsScroll);

    return () => {
      clearTimeout(t);
      cleanupDrag();
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('scroll', checkRegionsScroll);
      window.removeEventListener('resize', checkRegionsScroll);
    };
  }, [checkRegionsScroll]);

  // Centra la región activa cuando cambia
  useEffect(() => {
    const el = regionsRef.current;
    if (!el) return;
    const activeChip = el.querySelector<HTMLElement>(`[aria-pressed="true"]`);
    if (activeChip) {
      el.scrollTo({
        left: activeChip.offsetLeft - el.clientWidth / 2 + activeChip.clientWidth / 2,
        behavior: 'smooth',
      });
    }
    setTimeout(checkRegionsScroll, 300);
  }, [activeContinent, checkRegionsScroll]);

  const isZoomed = worldZoom > 1.05 || activeContinent !== 'all';
  const isGeneralView = activeContinent === 'all' && worldZoom <= 1.05;

  /* ------------------------------ Render ------------------------------ */

  return (
    <section className={`la-root font-sans ${isExpanded ? 'la-root--expanded' : ''}`} aria-label="Atlas Literario Mundial">
      {/* Barra superior: regiones + zoom */}
      <div className="la-toolbar">
        {/* Selector de continentes en móvil: desplegable con el estilo LibrarySelect de la app */}
        <div className="la-mobile-regions">
          <LibrarySelect<ContinentId>
            value={activeContinent}
            onChange={(val) => {
              if (val === activeContinent) {
                animateTo(getPresetRect(val, svgRef.current?.getBoundingClientRect()));
              } else {
                onSelectContinent(val);
              }
            }}
            options={REGION_OPTIONS}
            ariaLabel="Filtrar por continente o región"
            className={`library-select-trigger la-continent-select-trigger ${
              activeContinent !== 'all' ? 'la-continent-select-trigger--filtered' : ''
            }`}
          />
        </div>

        {/* Cinta de chips de continentes en escritorio (oculta en móvil por CSS) */}
        <div className="la-regions-wrapper">
          {hasRegionsOverflow && (
            <button
              type="button"
              className="la-strip-btn la-regions-btn--prev"
              onClick={() => handleScrollRegions(-220)}
              disabled={!canScrollRegionsLeft}
              aria-label="Desplazar regiones hacia la izquierda"
              title="Desplazar a la izquierda"
            >
              <ChevronLeft size={16} />
            </button>
          )}

          <div className="la-regions la-noscroll" ref={regionsRef} role="group" aria-label="Regiones del mundo">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className="la-chip"
                aria-pressed={activeContinent === r.id}
                onClick={() => {
                  if (r.id === activeContinent) animateTo(getPresetRect(r.id, svgRef.current?.getBoundingClientRect()));
                  else onSelectContinent(r.id);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {hasRegionsOverflow && (
            <button
              type="button"
              className="la-strip-btn la-regions-btn--next"
              onClick={() => handleScrollRegions(220)}
              disabled={!canScrollRegionsRight}
              aria-label="Desplazar regiones hacia la derecha"
              title="Desplazar a la derecha"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <div className="la-zoom" role="group" aria-label="Controles de zoom">
          <button
            type="button"
            className="la-iconbtn"
            onClick={() => zoomBy(1.6)}
            disabled={zoom >= MAP_H / MIN_H - 0.05}
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
              className={isExpanded ? 'la-expand-btn' : 'la-iconbtn'}
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Cerrar mapa ampliado (Esc)' : 'Agrandar mapa (Mesa cartográfica)'}
              title={isExpanded ? 'Cerrar mapa ampliado a vista normal (Esc)' : 'Agrandar mapa (Mesa cartográfica)'}
            >
              {isExpanded ? (
                <>
                  <Minimize2 size={15} className="shrink-0 text-amber-900 dark:text-amber-200" />
                  <span className="hidden sm:inline text-xs font-bold text-amber-950 dark:text-amber-200">
                    Cerrar
                  </span>
                </>
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
          preserveAspectRatio="xMidYMid meet"
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
        <div className="la-strip-wrapper">
          {hasStripOverflow && (
            <button
              type="button"
              className="la-strip-btn la-strip-btn--prev"
              onClick={() => handleScrollStrip(-280)}
              disabled={!canScrollStripLeft}
              aria-label="Desplazar países hacia la izquierda"
              title="Desplazar a la izquierda"
            >
              <ChevronLeft size={16} />
            </button>
          )}

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

          {hasStripOverflow && (
            <button
              type="button"
              className="la-strip-btn la-strip-btn--next"
              onClick={() => handleScrollStrip(280)}
              disabled={!canScrollStripRight}
              aria-label="Desplazar países hacia la derecha"
              title="Desplazar a la derecha"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
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
