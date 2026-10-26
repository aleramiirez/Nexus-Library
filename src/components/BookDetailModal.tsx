import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Edit3,
  Trash2,
  ExternalLink,
  Calendar,
  BookOpen,
  Layers,
  Hash,
  Globe,
  Building2,
  Clock,
  Sparkles
} from 'lucide-react';
import '../book-detail.css';
import { Book, StarRating } from '../types/models';
import { BookCover } from './BookCover';
import { READING_STATUSES, ReadingStatus, STAR_OPTIONS } from '../constants/catalogs';
import { RecommendBookModal } from './RecommendBookModal';

export interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
  onStatusChange: (bookId: string, status: ReadingStatus) => void;
  onRatingChange: (bookId: string, rating: StarRating) => void;
  onDatesChange?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
  currentUserId?: string;
  onShowToast?: (message: string) => void;
}

export interface BookFlipValues {
  fromX: string;
  fromY: string;
  fromScale: string;
}

export function getBookFlipValues(bookId?: string | null): BookFlipValues {
  const fallback: BookFlipValues = {
    fromX: '0px',
    fromY: '24px',
    fromScale: '0.45'
  };

  if (typeof window === 'undefined' || typeof document === 'undefined' || !bookId) {
    return fallback;
  }

  const safeId = bookId.replace(/"/g, '\\"');
  const findVisible = (selector: string): Element | null => {
    const list = document.querySelectorAll(selector);
    for (let i = 0; i < list.length; i++) {
      const r = list[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return list[i];
    }
    return null;
  };

  const sourceEl =
    findVisible(`[data-book-id="${safeId}"] .book-cover`) ||
    findVisible(`[data-book-id="${safeId}"]`) ||
    document.querySelector(`[data-book-id="${safeId}"] .book-cover`) ||
    document.querySelector(`[data-book-id="${safeId}"]`);

  if (!sourceEl) return fallback;

  const rect = sourceEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return fallback;

  const fromX = rect.left + rect.width / 2 - window.innerWidth / 2;
  const fromY = rect.top + rect.height / 2 - window.innerHeight / 2;
  const fromScale = Math.max(0.2, Math.min(0.72, rect.width / 420));

  return {
    fromX: `${Math.round(fromX)}px`,
    fromY: `${Math.round(fromY)}px`,
    fromScale: fromScale.toFixed(3)
  };
}

/**
 * Calcula las variables CSS (--from-x, --from-y, --from-scale) desde la coordenada exacta
 * del libro en la estantería o tarjeta hasta el centro del viewport.
 */
export function computeBookFlipVars(bookId?: string | null): React.CSSProperties {
  const { fromX, fromY, fromScale } = getBookFlipValues(bookId);
  return {
    '--from-x': fromX,
    '--from-y': fromY,
    '--from-scale': fromScale
  } as React.CSSProperties;
}

/**
 * Escribe directamente las coordenadas FLIP en el nodo DOM sin provocar un re-render de React.
 */
export function applyBookFlipVarsToElement(
  el: HTMLElement | null,
  bookId?: string | null
): void {
  if (!el) return;
  const { fromX, fromY, fromScale } = getBookFlipValues(bookId);
  el.style.setProperty('--from-x', fromX);
  el.style.setProperty('--from-y', fromY);
  el.style.setProperty('--from-scale', fromScale);
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onRatingChange,
  onDatesChange,
  currentUserId,
  onShowToast
}) => {
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  // Se calcula una única vez al montar/cambiar de libro sin un segundo render en useEffect
  const flipVars = useMemo(() => computeBookFlipVars(book?.id), [book?.id]);

  useEffect(() => {
    if (!book?.id) return;
    setIsClosing(false);
    setEntered(false);
    setAnimDone(false);

    let rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(() => {
        setEntered(true);
      });
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [book?.id]);

  const handleRequestClose = useCallback(() => {
    if (isClosing) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onClose();
      return;
    }

    if (book?.id) {
      applyBookFlipVarsToElement(shellRef.current, book.id);
    }
    setAnimDone(false);
    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, 720);
  }, [book?.id, isClosing, onClose]);

  const handleShellAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      if (isClosing && e.target === e.currentTarget) {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        onClose();
        return;
      }

      if (
        !isClosing &&
        (e.animationName === 'open-page-left-in' ||
          e.animationName === 'open-mobile-cover-in' ||
          e.animationName === 'open-book-flight-in-mobile')
      ) {
        setAnimDone(true);
      }
    },
    [isClosing, onClose]
  );

  useEffect(() => {
    if (!book) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRecommendOpen) return;
        if (typeof document !== 'undefined' && document.getElementById('delete-dialog-title')) {
          return;
        }
        e.stopPropagation();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, isRecommendOpen, handleRequestClose]);

  if (!book) return null;

  const isUrl = /^https?:\/\//i.test(book.lecturaVirtual);

  const modalContent = (
    <>
      <div
        className={
          'open-book-backdrop fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto' +
          (entered ? ' is-entered' : '') +
          (isClosing ? ' is-closing' : '')
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-book-title"
        onClick={handleRequestClose}
      >
        {/* Hermano independiente para el fade del fondo sin afectar el contexto 3D del libro */}
        <div className="open-book-backdrop-fill" aria-hidden="true" />

        <div
          className="open-book-stage relative w-full max-w-5xl my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Contenedor 3D del Libro (preserve-3d, siempre opacity: 1) */}
          <div
            ref={shellRef}
            onAnimationEnd={handleShellAnimationEnd}
            className={
              'open-book-shell w-full text-stone-900 dark:text-slate-100' +
              (entered ? ' is-entered' : '') +
              (animDone ? ' is-anim-done' : '') +
              (isClosing ? ' is-closing' : '')
            }
            style={flipVars}
          >
            <div className="open-book-pages-block">
              {/* Portada 3D abatible en pantallas móviles */}
              <div className="open-book-mobile-cover" aria-hidden="true">
                <BookCover
                  nombre={book.nombre}
                  autor={book.autor}
                  portadaUrl={book.portadaUrl}
                  portadaFallbackUrl={book.portadaFallbackUrl}
                  portadaDataUrl={book.portadaDataUrl}
                  size="lg"
                  variant="book"
                  priority
                />
              </div>

              {/* Pliegue central del lomo en escritorio (36px de ancho en la unión 5/12) */}
              <div className="open-book-gutter" aria-hidden="true" />

              {/* Hojas intermedias que abanican en 3D al abrir y cerrar el libro */}
              <div className="open-book-fan-sheet open-book-fan-sheet-1" aria-hidden="true" />
              <div className="open-book-fan-sheet open-book-fan-sheet-2" aria-hidden="true" />
              <div className="open-book-fan-sheet open-book-fan-sheet-3" aria-hidden="true" />

              {/* Doble página en escritorio (5 cols Verso / 7 cols Recto) y página continua en móvil */}
              <div className="open-book-spread-grid grid grid-cols-1 md:grid-cols-12 max-h-[88dvh] md:max-h-none overflow-y-auto md:overflow-visible rounded-[14px] md:rounded-none">
                {/* ─────────── ALA IZQUIERDA (VERSO INTERIOR + PORTADA DURA EXTERIOR EN EL REVERSO 3D) ─────────── */}
                <div className="open-book-page-left md:col-span-5 flex flex-col">
                  {/* Cara Interior: Página Izquierda (Ex-Libris, Portada y Registro Personal) */}
                  <div className="open-book-left-inner flex-1 flex flex-col">
                    <div className="open-book-edge-left" aria-hidden="true" />
                    <div className="open-book-edge-bottom-left" aria-hidden="true" />

                    <div className="open-book-left-paper flex-1 flex flex-col justify-between p-4 sm:p-6 md:pr-7 md:pl-6 md:py-6 md:max-h-[82dvh] md:overflow-y-auto border-b md:border-b-0 border-amber-900/15 dark:border-[#222B3C]">
                      <div className="open-book-content flex flex-col items-center">
                        {/* Encabezado superior sutil de folio (Verso) */}
                        <div className="w-full flex items-center justify-between text-[11px] font-serif italic text-amber-900/75 dark:text-amber-400/80 border-b border-amber-900/15 dark:border-[#242E42] pb-2 mb-4">
                          <span>fol. I</span>
                          <span className="flex items-center gap-1.5 font-medium tracking-wide">
                            <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                            Ex-Libris · Ficha Bibliográfica
                          </span>
                        </div>

                        {/* Portada del libro centrada con sombra realista sobre el papel */}
                        <div className="w-36 sm:w-44 md:w-48 max-w-[205px] my-1 shadow-xl rounded-xl">
                          <BookCover
                            nombre={book.nombre}
                            autor={book.autor}
                            portadaUrl={book.portadaUrl}
                            portadaFallbackUrl={book.portadaFallbackUrl}
                            portadaDataUrl={book.portadaDataUrl}
                            size="lg"
                            variant="book"
                            priority
                          />
                        </div>

                        {/* Puntuación Personal (Estrellas) */}
                        <div className="mt-4 w-full rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/75 dark:bg-[#101520]/80 px-3 py-2.5 text-center shadow-inner">
                          <p className="font-serif italic text-xs text-stone-700 dark:text-slate-300 mb-1.5">
                            Puntuación Personal
                          </p>
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            {STAR_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  onRatingChange(
                                    book.id,
                                    book.puntuacion === opt.value ? null : opt.value
                                  )
                                }
                                className={
                                  'px-2 py-1 rounded-lg text-xs border transition ' +
                                  (book.puntuacion === opt.value
                                    ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-950 dark:text-amber-200 font-bold shadow-sm'
                                    : 'border-transparent hover:bg-amber-900/10 dark:hover:bg-slate-800 text-stone-600 dark:text-slate-400')
                                }
                              >
                                {opt.value} ⭐
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sello / Ficha de Registro de Lectura Clásica (Fechas y Lectura Virtual) */}
                        <div className="mt-3.5 w-full rounded-xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-3 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#232D42] pb-1.5">
                            <span className="font-serif italic font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                              Registro de Lectura
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-slate-500 font-mono">
                              NEXUS
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-stone-600 dark:text-slate-400 block mb-1">
                                Fecha Inicio
                              </label>
                              {onDatesChange ? (
                                <input
                                  type="date"
                                  value={book.fechaInicio || ''}
                                  onChange={(e) =>
                                    onDatesChange(book.id, e.target.value, book.fechaFin)
                                  }
                                  className="w-full rounded-md border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2 py-1 text-[11px] font-medium focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                                />
                              ) : (
                                <span className="font-semibold text-xs block">
                                  {book.fechaInicio || '—'}
                                </span>
                              )}
                            </div>

                            <div>
                              <label className="text-[11px] text-stone-600 dark:text-slate-400 block mb-1">
                                Fecha Fin
                              </label>
                              {onDatesChange ? (
                                <input
                                  type="date"
                                  value={book.fechaFin || ''}
                                  onChange={(e) =>
                                    onDatesChange(book.id, book.fechaInicio, e.target.value)
                                  }
                                  className="w-full rounded-md border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2 py-1 text-[11px] font-medium focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                                />
                              ) : (
                                <span className="font-semibold text-xs block">
                                  {book.fechaFin || '—'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-amber-900/15 dark:border-[#232D42] flex items-center justify-between gap-2">
                            <span className="text-[11px] text-stone-600 dark:text-slate-400 shrink-0">
                              Lectura Virtual
                            </span>
                            {book.lecturaVirtual ? (
                              isUrl ? (
                                <a
                                  href={book.lecturaVirtual}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-400 hover:underline font-semibold truncate"
                                >
                                  Abrir recurso <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                <span className="font-medium text-xs truncate">
                                  {book.lecturaVirtual}
                                </span>
                              )
                            ) : (
                              <span className="text-stone-400 dark:text-slate-500">—</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cara Exterior 3D: Portada Dura del Libro Cerrado (visible durante el vuelo y el giro de apertura/cierre) */}
                  <div className="open-book-front-cover-face" aria-hidden="true">
                    <div className="open-book-front-cover-inner">
                      <BookCover
                        nombre={book.nombre}
                        autor={book.autor}
                        portadaUrl={book.portadaUrl}
                        portadaFallbackUrl={book.portadaFallbackUrl}
                        portadaDataUrl={book.portadaDataUrl}
                        size="lg"
                        variant="book"
                        priority
                      />
                    </div>
                  </div>
                </div>

                {/* ─────────── ALA DERECHA (RECTO: Cabecera Literaria, Metadatos y Sinopsis) ─────────── */}
                <div className="open-book-page-right md:col-span-7 flex flex-col">
                  <div className="open-book-edge-right" aria-hidden="true" />
                  <div className="open-book-edge-bottom-right" aria-hidden="true" />
                  <div className="open-book-shadow-sweep" aria-hidden="true" />

                  <div className="open-book-right-paper flex-1 flex flex-col p-4 sm:p-6 md:pl-8 md:pr-7 md:pt-0 md:pb-6 md:max-h-[82dvh] md:overflow-y-auto">
                    {/* Cintas / Pestañas Superiores de Acción (Marcapáginas en el borde superior derecho) */}
                    <div className="flex items-start justify-between gap-2 mb-4 -mt-4 sm:-mt-6 md:mt-0">
                      <span className="hidden md:inline-block pt-3 text-[11px] font-serif italic text-amber-900/70 dark:text-amber-400/75">
                        Catálogo Literario · fol. II
                      </span>

                      <div className="flex items-start gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => setIsRecommendOpen(true)}
                          className="open-book-ribbon-tab border-amber-600/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200"
                          title="Recomendar este libro a un amigo"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          <span>Recomendar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onEdit(book)}
                          className="open-book-ribbon-tab border-amber-900/25 dark:border-slate-700 bg-[#f2e6ce] dark:bg-[#1B2333] hover:bg-[#ead9b8] dark:hover:bg-[#232D42] text-stone-800 dark:text-slate-200"
                          title="Editar ficha del libro"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDelete(book)}
                          className="open-book-ribbon-tab border-rose-500/35 bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300"
                          title="Eliminar libro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRequestClose}
                          aria-label="Cerrar ficha"
                          title="Cerrar libro (Esc)"
                          className="open-book-ribbon-tab border-amber-900/25 dark:border-slate-700 bg-[#e9dac0] dark:bg-[#161D2B] hover:bg-amber-900/20 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 px-2.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="open-book-content flex flex-col gap-4 sm:gap-5">
                      {/* Título, Autor, Saga y Divisor Ornamental */}
                      <div className="text-center md:text-left">
                        {book.sagaNombre && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 px-3 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-300 mb-2">
                            <Layers className="w-3.5 h-3.5" />
                            <span>
                              Saga: {book.sagaNombre}
                              {book.volumen ? ' · Volumen ' + String(book.volumen) : ''}
                            </span>
                          </div>
                        )}

                        <h2
                          id="detail-book-title"
                          className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white leading-tight tracking-tight"
                        >
                          {book.nombre}
                        </h2>

                        <p className="font-serif italic text-base sm:text-lg text-stone-700 dark:text-slate-300 mt-1">
                          {book.autor || 'Autor no especificado'}
                        </p>

                        {/* Divisor ornamental dorado con ✦ en el centro */}
                        <div className="flex items-center gap-3 mt-3" aria-hidden="true">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
                          <span className="text-amber-700 dark:text-amber-400 text-xs select-none">
                            ✦
                          </span>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
                        </div>
                      </div>

                      {/* Estado de lectura y Géneros */}
                      <div className="space-y-3">
                        <div>
                          <span className="block text-[11px] uppercase tracking-widest text-stone-500 dark:text-slate-400 font-semibold mb-1.5">
                            Estado de lectura
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {READING_STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => onStatusChange(book.id, status)}
                                className={
                                  'py-2 px-2.5 rounded-lg text-xs font-medium border text-center transition ' +
                                  (book.progreso === status
                                    ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-950 dark:text-amber-200 font-semibold shadow-sm'
                                    : 'border-amber-900/20 dark:border-[#263147] bg-[#f4ead4]/70 dark:bg-[#1A2232]/80 text-stone-700 dark:text-slate-300 hover:border-amber-600/50 dark:hover:border-slate-500')
                                }
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                          {book.genero ? (
                            <span className="rounded-lg bg-amber-500/15 border border-amber-600/35 dark:border-amber-500/35 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:text-amber-300">
                              {book.genero}
                            </span>
                          ) : (
                            <span className="text-xs text-stone-500 dark:text-slate-500 italic">
                              Sin género asignado
                            </span>
                          )}
                          {book.subgeneros.map((sub) => (
                            <span
                              key={sub}
                              className="rounded-lg bg-[#f0e5cc]/80 dark:bg-[#1E2738] border border-amber-900/20 dark:border-[#2E3B52] px-2.5 py-1 text-xs text-stone-700 dark:text-slate-300"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tabla Bibliográfica Clásica con líneas divisorias finas */}
                      <div className="border-y border-amber-900/20 dark:border-slate-800 divide-y divide-amber-900/15 dark:divide-slate-800/90 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90">
                          <div className="py-2.5 pr-3">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Año Publicación
                            </span>
                            <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {book.fechaPublicacion ?? 'No disponible'}
                            </p>
                          </div>

                          <div className="py-2.5 px-3">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                              <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Páginas
                            </span>
                            <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {book.paginas ?? 'No disponible'}
                            </p>
                          </div>

                          <div className="col-span-2 sm:col-span-1 py-2.5 sm:pl-3 border-t sm:border-t-0 border-amber-900/15 dark:border-slate-800/90">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                              <Hash className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              ISBN
                            </span>
                            <p className="font-mono font-semibold text-xs text-stone-900 dark:text-slate-100 mt-0.5 break-all">
                              {book.isbn || 'No disponible'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90">
                          <div className="py-2.5 pr-3">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                              <Building2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Editorial
                            </span>
                            <p className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {book.editorial || 'No disponible'}
                            </p>
                          </div>

                          <div className="py-2.5 px-3">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                              <Globe className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Idioma / Edición
                            </span>
                            <p className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {[book.idioma, book.edicion].filter(Boolean).join(' · ') ||
                                'No disponible'}
                            </p>
                          </div>

                          <div className="col-span-2 sm:col-span-1 py-2.5 sm:pl-3 border-t sm:border-t-0 border-amber-900/15 dark:border-slate-800/90">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Tiempo de Lectura
                            </span>
                            <p className="font-semibold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {book.tiempoLectura || 'Sin calcular'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sinopsis con estilo de página literaria y letra capitular */}
                      {book.sinopsis && (
                        <div className="pt-1">
                          <h3 className="font-serif italic text-xs text-amber-900 dark:text-amber-400 font-semibold mb-1.5">
                            Sinopsis de la obra
                          </h3>
                          <p className="text-sm text-stone-800 dark:text-slate-300 leading-relaxed whitespace-pre-line first-letter:font-serif first-letter:text-2xl first-letter:font-bold first-letter:text-amber-800 dark:first-letter:text-amber-400 first-letter:mr-0.5">
                            {book.sinopsis}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Renderizado fuera del contenedor con perspective/transform para preservar position: fixed */}
      {isRecommendOpen && (
        <RecommendBookModal
          isOpen={isRecommendOpen}
          onClose={() => setIsRecommendOpen(false)}
          book={book}
          currentUserId={currentUserId}
          onSuccess={onShowToast}
        />
      )}
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
