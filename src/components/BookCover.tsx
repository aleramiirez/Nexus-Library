import React, { useEffect, useState } from 'react';
import { getAuthorInitials } from '../services/coverService';

interface BookCoverProps {
  nombre: string;
  autor: string;
  portadaUrl?: string;
  portadaFallbackUrl?: string;
  portadaDataUrl?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BookCover: React.FC<BookCoverProps> = ({
  nombre,
  autor,
  portadaUrl,
  portadaFallbackUrl,
  portadaDataUrl,
  className = '',
  size = 'md'
}) => {
  const candidates = [portadaDataUrl, portadaUrl, portadaFallbackUrl].filter(
    (u): u is string => Boolean(u && u.trim())
  );

  const [sourceIndex, setSourceIndex] = useState(0);
  const [failedAll, setFailedAll] = useState(candidates.length === 0);

  useEffect(() => {
    setSourceIndex(0);
    setFailedAll(candidates.length === 0);
  }, [portadaDataUrl, portadaUrl, portadaFallbackUrl]);

  const currentSrc = !failedAll && sourceIndex < candidates.length ? candidates[sourceIndex] : '';

  const handleImageError = () => {
    if (sourceIndex + 1 < candidates.length) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setFailedAll(true);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth <= 2 || img.naturalHeight <= 2) {
      handleImageError();
    }
  };

  const initials = getAuthorInitials(autor);
  const titleSizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm';

  return (
    <div
      className={
        'relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-amber-500/20 group-hover:border-amber-400/50 bg-gradient-to-b from-[#1A2130] via-[#131824] to-[#0E131D] shadow-md flex items-center justify-center p-1.5 select-none transition-all duration-300 ' +
        className
      }
    >
      <div className="relative w-full h-full flex items-center justify-center rounded overflow-hidden bg-[#101520]/90 ring-1 ring-white/5">
        {currentSrc ? (
          <img
            src={currentSrc}
            alt={'Portada de ' + nombre}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
            className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col justify-between p-3 text-center bg-gradient-to-br from-[#231823] via-[#171C28] to-[#11151F] border border-amber-400/25 rounded"
            aria-label={'Cubierta editorial generada para ' + nombre}
          >
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
              <span className="text-[9px] uppercase tracking-[0.2em] text-amber-400/80 font-medium">
                Edición Registrada
              </span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-semibold text-amber-300">
                {initials}
              </span>
            </div>

            <div className="my-auto px-1 flex flex-col items-center gap-1.5">
              <div className="w-6 h-[1px] bg-amber-400/40" />
              <p
                className={
                  'font-serif font-bold text-amber-50/95 leading-snug line-clamp-4 ' +
                  titleSizeClass
                }
              >
                {nombre || 'Sin título'}
              </p>
              <div className="w-6 h-[1px] bg-amber-400/40" />
            </div>

            <div className="border-t border-amber-500/20 pt-1.5">
              <p className="text-[10px] text-slate-300/85 truncate font-medium">
                {autor || 'Autor desconocido'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
