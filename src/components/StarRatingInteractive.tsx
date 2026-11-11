import React, { useState, useId } from 'react';
import { Star, X } from 'lucide-react';
import { StarRating } from '../types/models';

interface StarRatingInteractiveProps {
  value: StarRating;
  onChange?: (val: StarRating) => void;
  size?: 'sm' | 'md' | 'lg';
  showScoreText?: boolean;
  allowClear?: boolean;
  readOnly?: boolean;
  className?: string;
}

export const StarRatingInteractive: React.FC<StarRatingInteractiveProps> = ({
  value,
  onChange,
  size = 'md',
  showScoreText = true,
  allowClear = true,
  readOnly = false,
  className = ''
}) => {
  const [hoverValue, setHoverValue] = useState<StarRating | null>(null);
  const baseId = useId().replace(/:/g, '');

  const effectiveValue = hoverValue !== null ? hoverValue : value;

  const starSizes = {
    sm: { svg: 'w-4 h-4', container: 'gap-0.5' },
    md: { svg: 'w-5 h-5 sm:w-6 sm:h-6', container: 'gap-1' },
    lg: { svg: 'w-7 h-7 sm:w-8 sm:h-8', container: 'gap-1.5' }
  };

  const handleSelect = (starVal: number) => {
    if (readOnly || !onChange) return;
    const rating = Math.max(0.5, Math.min(5, Math.round(starVal * 2) / 2)) as StarRating;
    // Si pulsa el mismo valor, permite deseleccionar / borrar si allowClear está activo
    if (allowClear && value === rating) {
      onChange(null);
    } else {
      onChange(rating);
    }
  };

  const starPath =
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

  return (
    <div
      className={`inline-flex flex-col gap-1.5 ${className}`}
      onMouseLeave={() => !readOnly && setHoverValue(null)}
    >
      <div className={`flex items-center ${starSizes[size].container}`}>
        {[1, 2, 3, 4, 5].map((starIdx) => {
          const fullValue = starIdx;
          const halfValue = starIdx - 0.5;

          const isFull = (effectiveValue ?? 0) >= fullValue;
          const isHalf = !isFull && (effectiveValue ?? 0) >= halfValue;
          const gradientId = `half-star-${baseId}-${starIdx}`;

          return (
            <div
              key={starIdx}
              className="relative inline-flex items-center justify-center select-none"
            >
              {/* SVG de la Estrella con soporte exacto de mitad rellena en degradado de oro */}
              <svg
                viewBox="0 0 24 24"
                className={`${starSizes[size].svg} transition-transform duration-150 ${
                  !readOnly && (isFull || isHalf) ? 'scale-105' : ''
                }`}
                style={{
                  filter:
                    isFull || isHalf
                      ? 'drop-shadow(0 1px 2px rgba(217, 119, 6, 0.45))'
                      : 'none'
                }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="transparent" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={starPath}
                  fill={
                    isFull
                      ? '#F59E0B'
                      : isHalf
                      ? `url(#${gradientId})`
                      : 'transparent'
                  }
                  stroke={
                    isFull || isHalf
                      ? '#D97706'
                      : 'currentColor'
                  }
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  className={
                    !isFull && !isHalf
                      ? 'text-amber-900/30 dark:text-amber-400/30 transition-colors'
                      : ''
                  }
                />
              </svg>

              {/* Botones de impacto transparentes para clic táctil/ratón: mitad izquierda = X.5, mitad derecha = X.0 */}
              {!readOnly && onChange && (
                <>
                  <button
                    type="button"
                    aria-label={`${halfValue} estrellas`}
                    onClick={() => handleSelect(halfValue)}
                    onMouseEnter={() => setHoverValue(halfValue as StarRating)}
                    className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer focus:outline-hidden"
                  />
                  <button
                    type="button"
                    aria-label={`${fullValue} estrellas`}
                    onClick={() => handleSelect(fullValue)}
                    onMouseEnter={() => setHoverValue(fullValue as StarRating)}
                    className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer focus:outline-hidden"
                  />
                </>
              )}
            </div>
          );
        })}

        {/* Botón de limpiar puntuación */}
        {!readOnly && onChange && allowClear && value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            title="Borrar puntuación (Sin puntuar)"
            className="ml-1.5 p-1 rounded-full text-stone-600 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
            aria-label="Borrar puntuación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Texto de puntuación y selector rápido / toggle +0.5 para móviles */}
      {showScoreText && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="font-serif font-bold text-amber-950 dark:text-amber-200">
            {value !== null ? `${value.toFixed(1)} / 5 ★` : 'Sin puntuar'}
          </span>

          {!readOnly && onChange && value !== null && (
            <button
              type="button"
              onClick={() => {
                if (value % 1 === 0) {
                  const next = Math.min(5, value + 0.5) as StarRating;
                  onChange(next);
                } else {
                  const next = Math.min(5, Math.ceil(value)) as StarRating;
                  onChange(next);
                }
              }}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-amber-600/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-950 dark:text-amber-200 transition cursor-pointer"
              title="Añadir o alternar media estrella"
            >
              {value % 1 !== 0 ? 'Entero' : '+0.5 ★'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const StarRatingDisplay: React.FC<{
  value: number | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  showNumeric?: boolean;
  className?: string;
}> = ({ value, size = 'sm', showNumeric = false, className = '' }) => {
  const baseId = useId().replace(/:/g, '');
  if (!value || value <= 0) return null;

  const numericVal = Math.max(0.5, Math.min(5, value));

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  };

  const starPath =
    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

  return (
    <span className={`inline-flex items-center gap-0.5 align-middle ${className}`}>
      {[1, 2, 3, 4, 5].map((starIdx) => {
        const fullValue = starIdx;
        const halfValue = starIdx - 0.5;

        const isFull = numericVal >= fullValue;
        const isHalf = !isFull && numericVal >= halfValue;
        const gradientId = `disp-star-${baseId}-${starIdx}`;

        if (!isFull && !isHalf) return null; // Solo renderizar las estrellas activas en display compacto

        return (
          <svg
            key={starIdx}
            viewBox="0 0 24 24"
            className={sizeClasses[size]}
            style={{
              filter: 'drop-shadow(0 1px 1px rgba(217, 119, 6, 0.4))'
            }}
          >
            {isHalf && (
              <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>
              </defs>
            )}
            <path
              d={starPath}
              fill={isFull ? '#F59E0B' : `url(#${gradientId})`}
              stroke="#D97706"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
      {showNumeric && (
        <span className="ml-1 text-[11px] font-semibold text-amber-900 dark:text-amber-300">
          {numericVal.toFixed(1)}
        </span>
      )}
    </span>
  );
};
