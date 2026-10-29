import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Trophy,
  Star,
  Calendar,
  Sparkles,
  Quote,
  BookOpen,
  ArrowRight,
  Award
} from 'lucide-react';
import { Book } from '../types/models';
import { BookCover } from './BookCover';
import { formatStars } from '../constants/catalogs';
import { soundService } from '../services/soundService';

export interface BookFinishedCelebrationModalProps {
  isOpen: boolean;
  book: Book;
  booksReadCount?: number;
  readerDisplayName?: string | null;
  readerUsername?: string | null;
  onClose: () => void;
  onOpenShareCard?: (book: Book) => void;
  onOpenChallenge?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BookFinishedCelebrationModal: React.FC<BookFinishedCelebrationModalProps> = ({
  isOpen,
  book,
  booksReadCount,
  readerDisplayName,
  onClose,
  onOpenShareCard,
  onOpenChallenge
}) => {
  const [stampLanded, setStampLanded] = useState(false);
  const [particlesActive, setParticlesActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStampLanded(false);
      setParticlesActive(false);

      // Lanzar animación de sello con pequeño delay de suspenso
      const landTimer = setTimeout(() => {
        setStampLanded(true);
        soundService.playWaxSeal();
      }, 350);

      const particleTimer = setTimeout(() => {
        setParticlesActive(true);
      }, 420);

      return () => {
        clearTimeout(landTimer);
        clearTimeout(particleTimer);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const quote = book.citas && book.citas.length > 0 ? book.citas[0] : null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pt-8 sm:pt-10 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Partículas flotantes de pergamino y destellos */}
      {particlesActive && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-amber-400/40 animate-pulse"
              style={{
                top: `${15 + (i * 5) % 70}%`,
                left: `${10 + (i * 17) % 80}%`,
                animationDelay: `${(i * 0.15).toFixed(2)}s`,
                animationDuration: `${2 + (i % 3)}s`,
                transform: `scale(${0.6 + (i % 4) * 0.3})`
              }}
            />
          ))}
        </div>
      )}

      <div className="catalog-card-panel relative w-full max-w-xl max-h-[92vh] flex flex-col p-0 shadow-2xl mt-3 sm:mt-4 overflow-visible">
        {/* Placa grabada superior */}
        <div className="catalog-brass-tab">
          Registro de Archivo · Volumen Concluido
        </div>

        {/* Cabecera ceremonial */}
        <div className="relative px-6 pt-6 pb-4 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/85 dark:bg-[#141b27]/85 rounded-t-[14px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center shadow-md border border-amber-300/40">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="block font-mono text-[10px] uppercase font-bold tracking-widest text-amber-900 dark:text-amber-400">
                Nexus Librarivm · Acta Oficial
              </span>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                ¡Obra Culminada & Sellada!
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar celebración"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del diploma ceremonial */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 bg-[#fffcf5] dark:bg-[#0f1420] rounded-b-[14px]">
          {/* Ficha del libro culminado */}
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl border border-amber-900/15 dark:border-amber-400/15 bg-gradient-to-br from-[#f8f1e3]/80 to-[#eee2cb]/80 dark:from-[#151c2c] dark:to-[#0f1422] shadow-inner">
            {/* Portada del libro con sombra realista */}
            <div className="shrink-0 w-24 sm:w-28 shadow-xl rounded-md overflow-hidden border border-amber-900/20">
              <BookCover
                nombre={book.nombre}
                autor={book.autor}
                portadaUrl={book.portadaUrl}
                portadaFallbackUrl={book.portadaFallbackUrl}
                portadaDataUrl={book.portadaDataUrl}
                size="md"
                className="w-full h-auto"
              />
            </div>

            {/* Metadatos de la lectura */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/25">
                ✓ LECTURA COMPLETADA
              </span>

              <h3 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-slate-100 leading-tight line-clamp-2">
                {book.nombre}
              </h3>

              <p className="font-serif italic text-sm text-amber-900 dark:text-amber-300">
                de {book.autor || 'Autor Anónimo'}
              </p>

              {book.paginas && (
                <p className="text-xs text-stone-600 dark:text-slate-400">
                  <span className="font-bold text-stone-900 dark:text-slate-200">{book.paginas}</span> páginas registradas en tu historial.
                </p>
              )}

              {/* Valoración si existe */}
              {book.puntuacion && (
                <div className="flex items-center justify-center sm:justify-start gap-1 pt-1 text-amber-600 dark:text-amber-400">
                  <span className="text-sm">{formatStars(book.puntuacion)}</span>
                  <span className="text-xs text-stone-600 dark:text-slate-400 font-mono ml-1">
                    ({book.puntuacion})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cita favorita si la tiene */}
          {quote && (
            <div className="relative p-3.5 rounded-xl border-l-4 border-amber-600 bg-amber-500/10 dark:bg-amber-400/5 text-xs font-serif italic text-stone-800 dark:text-slate-200">
              <Quote className="w-3.5 h-3.5 text-amber-600 mb-1 inline-block mr-1 opacity-70" />
              &ldquo;{quote}&rdquo;
            </div>
          )}

          {/* Sello de Lacre Real con Animación de Impacto */}
          <div className="relative flex flex-col items-center justify-center py-4">
            <div
              className={`relative flex items-center justify-center transition-all duration-500 transform ${
                stampLanded
                  ? 'scale-100 opacity-100 rotate-[-4deg]'
                  : 'scale-150 opacity-0 rotate-12 -translate-y-8'
              }`}
            >
              {/* Resplandor de impacto */}
              {stampLanded && (
                <div className="absolute inset-0 w-36 h-36 -m-4 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
              )}

              {/* Sello de lacre rojo oscuro encerado con filo irregular */}
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#8e172a] via-[#6d101e] to-[#400710] p-1.5 shadow-2xl border-2 border-[#b52a42]/40 flex items-center justify-center select-none ring-4 ring-[#8e172a]/20">
                {/* Anillo de texto latino grabado en el lacre */}
                <div className="w-full h-full rounded-full border border-amber-300/35 flex flex-col items-center justify-center text-center p-2 shadow-inner bg-radial from-[#9e1c31]/40 to-transparent">
                  <BookOpen className="w-6 h-6 text-amber-200/90 mb-0.5 filter drop-shadow" />
                  <span className="font-serif font-black text-[9px] uppercase tracking-wider text-amber-200/90 leading-tight">
                    NEXUS ARCHIVVM
                  </span>
                  <span className="font-mono text-[7.5px] uppercase tracking-widest text-amber-300/80 mt-0.5">
                    CONSUMMATVM
                  </span>
                </div>
              </div>
            </div>

            <p className="font-serif italic text-xs text-stone-600 dark:text-slate-400 text-center mt-3">
              Certificado expedido a nombre de{' '}
              <strong className="text-amber-900 dark:text-amber-300 not-italic">
                {readerDisplayName || 'Lector Nexus'}
              </strong>{' '}
              el {todayStr}.
            </p>

            {booksReadCount !== undefined && booksReadCount > 0 && (
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-amber-900/5 dark:bg-amber-400/10 text-amber-900 dark:text-amber-300 font-mono text-[11px] font-bold border border-amber-900/15 dark:border-amber-400/20">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Libro #{booksReadCount} completado en tu carnet</span>
              </div>
            )}
          </div>

          {/* Acciones de la celebración */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-3 border-t border-amber-900/10 dark:border-[#242f42]">
            {onOpenShareCard && (
              <button
                type="button"
                onClick={() => onOpenShareCard(book)}
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs shadow-md transition transform active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                <span>Compartir Tarjeta Editorial</span>
              </button>
            )}

            {onOpenChallenge && (
              <button
                type="button"
                onClick={onOpenChallenge}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-amber-900/20 dark:border-[#2b3548] bg-[#fffcf5] dark:bg-[#161c28] hover:bg-amber-500/10 text-stone-800 dark:text-slate-200 font-semibold text-xs transition"
              >
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Ver Reto Anual</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-stone-200 dark:border-[#222b3c] text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white text-xs font-semibold transition"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
