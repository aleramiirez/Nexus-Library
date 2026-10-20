import React, { useId } from 'react';

/**
 * [A - CINTA] Marcapáginas de seda burdeos en SVG inline:
 * - Degradado de seda burdeos (#9a2c3b -> #6e1e2a) con brillo diagonal de tejido
 * - Costura dorada fina punteada (#e5c158) siguiendo los cantos y el corte en V
 * - Detalle central de flor de lis dorada
 * - Corte en V (cola de golondrina) en el extremo derecho y sombra suave
 */
export const BookmarkMarker: React.FC = () => {
  const uid = useId().replace(/:/g, '');
  const silkGradId = `bm-silk-${uid}`;
  const sheenGradId = `bm-sheen-${uid}`;
  const foldGradId = `bm-fold-${uid}`;
  const goldGradId = `bm-gold-${uid}`;
  const shadowFilterId = `bm-shadow-${uid}`;

  return (
    <span className="bookmark-marker" aria-hidden="true">
      <svg
        viewBox="0 0 38 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible block"
      >
        <defs>
          {/* Sombra suave adaptada a modo claro y oscuro */}
          <filter
            id={shadowFilterId}
            x="0%"
            y="-15%"
            width="135%"
            height="145%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="1.2"
              dy="1.5"
              stdDeviation="1.3"
              floodColor="#000000"
              floodOpacity="0.48"
            />
          </filter>

          {/* Degradado base de seda burdeos */}
          <linearGradient id={silkGradId} x1="0" y1="3" x2="34" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8b2433" />
            <stop offset="32%" stopColor="#9a2c3b" />
            <stop offset="68%" stopColor="#7b202d" />
            <stop offset="100%" stopColor="#6e1e2a" />
          </linearGradient>

          {/* Brillo diagonal de tejido de seda */}
          <linearGradient id={sheenGradId} x1="4" y1="2" x2="26" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="28%" stopColor="#ffd6dc" stopOpacity="0.18" />
            <stop offset="48%" stopColor="#2a060b" stopOpacity="0.22" />
            <stop offset="72%" stopColor="#ffccd4" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Sombra de salida desde el canto izquierdo de las páginas */}
          <linearGradient id={foldGradId} x1="0" y1="13" x2="6" y2="13" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a0408" stopOpacity="0.72" />
            <stop offset="60%" stopColor="#2d070e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2d070e" stopOpacity="0" />
          </linearGradient>

          {/* Degradado metálico dorado para el emblema y el hilo */}
          <linearGradient id={goldGradId} x1="8" y1="5" x2="24" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f6de8c" />
            <stop offset="50%" stopColor="#e5c158" />
            <stop offset="100%" stopColor="#c49b38" />
          </linearGradient>
        </defs>

        <g filter={`url(#${shadowFilterId})`}>
          {/* Cuerpo de la cinta con corte en V (cola de golondrina) */}
          <path
            d="M 0 3 H 33.5 L 26.8 13 L 33.5 23 H 0 Z"
            fill={`url(#${silkGradId})`}
          />

          {/* Brillo satinado del tejido */}
          <path
            d="M 0 3 H 33.5 L 26.8 13 L 33.5 23 H 0 Z"
            fill={`url(#${sheenGradId})`}
          />

          {/* Pliegue sombreado junto al canto izquierdo */}
          <path d="M 0 3 H 6 V 23 H 0 Z" fill={`url(#${foldGradId})`} />

          {/* Ribete de luz en los cantos superior e inferior de la seda */}
          <path
            d="M 0 3.35 H 33.2 M 0 22.65 H 33.2"
            stroke="#f3b6bf"
            strokeOpacity="0.28"
            strokeWidth="0.6"
          />

          {/* Costura dorada punteada (bordes superior, inferior y cola de golondrina) */}
          <path
            d="M 1.2 4.8 H 30.6 L 24.9 13 L 30.6 21.2 H 1.2"
            stroke="#e5c158"
            strokeOpacity="0.72"
            strokeWidth="0.85"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1.8 1.35"
          />

          {/* Emblema dorado sutil (flor de lis / filigrana) */}
          <g fill={`url(#${goldGradId})`} opacity="0.92">
            {/* Pétalo central apuntado */}
            <path d="M 19.5 13 L 15.2 11.55 C 13.7 11.1 12.2 11.8 11.4 12.45 L 11.4 13.55 C 12.2 14.2 13.7 14.9 15.2 14.45 Z" />
            {/* Voluta superior */}
            <path d="M 11.8 12.1 C 12.4 9.7 14.5 8.2 16.4 8.7 C 17.3 8.95 17.7 9.75 17.2 10.35 C 16.8 10.8 16.1 10.7 15.9 10.2 C 15.7 9.75 15.1 9.65 14.5 9.95 C 13.6 10.4 13.0 11.3 12.7 12.25 Z" />
            {/* Voluta inferior */}
            <path d="M 11.8 13.9 C 12.4 16.3 14.5 17.8 16.4 17.3 C 17.3 17.05 17.7 16.25 17.2 15.65 C 16.8 15.2 16.1 15.3 15.9 15.8 C 15.7 16.25 15.1 16.35 14.5 16.05 C 13.6 15.6 13.0 14.7 12.7 13.75 Z" />
            {/* Anillo / nudo dorado */}
            <rect x="10.1" y="11.3" width="1.25" height="3.4" rx="0.5" />
            {/* Base del emblema */}
            <path d="M 7.6 13 L 9.7 11.85 V 14.15 Z" />
          </g>
        </g>
      </svg>
    </span>
  );
};
