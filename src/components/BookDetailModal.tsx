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
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Plus,
  Sliders
} from 'lucide-react';
import '../book-detail.css';
import { Book, StarRating, CustomCollection, LentRecord } from '../types/models';
import { collectionService } from '../services/collectionService';
import { AddToCollectionModal } from './AddToCollectionModal';
import { LentBookModal } from './LentBookModal';
import { BookCover } from './BookCover';
import { formatStars, READING_STATUSES, ReadingStatus, STAR_OPTIONS } from '../constants/catalogs';
import { RecommendBookModal } from './RecommendBookModal';
import { bookMetadataService } from '../services/bookMetadataService';
import { updateBookPartialRecord } from '../db/database';

export interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onStatusChange?: (bookId: string, status: ReadingStatus) => void;
  onRatingChange?: (bookId: string, rating: StarRating) => void;
  onDatesChange?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
  currentUserId?: string;
  onShowToast?: (message: string) => void;
  readOnly?: boolean;
  onAddToLibrary?: (book: Book) => void;
  onCustomize?: (book: Book) => void;
  isAlreadyInLibrary?: boolean;
  recommendationReason?: string;
  readerName?: string;
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
    fromScale: '0.28'
  };

  if (typeof window === 'undefined' || typeof document === 'undefined' || !bookId) {
    return fallback;
  }

  // En móvil usamos animación nativa tipo bottom-sheet sin cálculo 3D FLIP
  if (window.innerWidth < 768) {
    return fallback;
  }

  const safeId = bookId.replace(/"/g, '\\"');
  const findVisible = (selector: string): Element | null => {
    try {
      const list = document.querySelectorAll(selector);
      for (let i = 0; i < list.length; i++) {
        const r = list[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return list[i];
      }
    } catch {
      return null;
    }
    return null;
  };

  let sourceEl: Element | null = null;
  try {
    sourceEl =
      findVisible(`[data-book-id="${safeId}"] .book-cover`) ||
      findVisible(`[data-book-id="${safeId}"]`) ||
      document.querySelector(`[data-book-id="${safeId}"] .book-cover`) ||
      document.querySelector(`[data-book-id="${safeId}"]`);
  } catch {
    sourceEl = null;
  }

  if (!sourceEl) return fallback;

  const rect = sourceEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return fallback;

  const stageWidth = Math.min(window.innerWidth - 48, 1024);
  const closedBookWidth = stageWidth * 0.5;

  const fromX = rect.left + rect.width / 2 - window.innerWidth / 2;
  const fromY = rect.top + rect.height / 2 - window.innerHeight / 2;
  const fromScale = Math.max(0.18, Math.min(0.75, rect.width / closedBookWidth));

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
  onShowToast,
  readOnly = false,
  onAddToLibrary,
  onCustomize,
  isAlreadyInLibrary = false,
  recommendationReason,
  readerName
}) => {
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [bookCollections, setBookCollections] = useState<CustomCollection[]>([]);
  const [activeLentRecord, setActiveLentRecord] = useState<LentRecord | null>(null);

  useEffect(() => {
    if (!book) return;
    setBookCollections(collectionService.getCollectionsForBook(book.id, currentUserId));
    setActiveLentRecord(collectionService.getActiveLentRecordForBook(book.id, currentUserId));
  }, [book, currentUserId]);
  const [isClosing, setIsClosing] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'synopsis'>('details');
  const [isFlippingPage, setIsFlippingPage] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');
  const [isFetchingSynopsis, setIsFetchingSynopsis] = useState(false);
  const [localSynopsis, setLocalSynopsis] = useState<string | null>(null);

  useEffect(() => {
    setLocalSynopsis(null);
  }, [book?.id]);

  const currentSynopsis = (localSynopsis !== null ? localSynopsis : book?.sinopsis) || '';

  const handleAutoFetchSynopsis = useCallback(async () => {
    if (!book || isFetchingSynopsis) return;
    setIsFetchingSynopsis(true);
    try {
      const synopsis = await bookMetadataService.fetchSynopsisForBook({
        nombre: book.nombre,
        autor: book.autor,
        isbn: book.isbn
      });

      if (synopsis && synopsis.trim().length > 0) {
        const clean = synopsis.trim();
        setLocalSynopsis(clean);
        if (!readOnly) {
          await updateBookPartialRecord(book.id, {
            sinopsis: clean
          });
        }
        if (onShowToast) {
          onShowToast('Sinopsis autocompletada y guardada con éxito.');
        }
      } else {
        if (onShowToast) {
          onShowToast('No se encontró una sinopsis disponible en los registros abiertos.');
        }
      }
    } catch (err) {
      console.error('Error al autocompletar la sinopsis:', err);
      if (onShowToast) {
        onShowToast('No fue posible autocompletar la sinopsis en este momento.');
      }
    } finally {
      setIsFetchingSynopsis(false);
    }
  }, [book, isFetchingSynopsis, onShowToast]);

  const flipTimerRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const handleTurnToSynopsis = useCallback(() => {
    if (activeTab === 'synopsis' || isFlippingPage) return;
    setIsFlippingPage(true);
    setFlipDirection('forward');
    if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    flipTimerRef.current = window.setTimeout(() => {
      setActiveTab('synopsis');
    }, 200);
    window.setTimeout(() => {
      setIsFlippingPage(false);
    }, 450);
  }, [activeTab, isFlippingPage]);

  const handleTurnToDetails = useCallback(() => {
    if (activeTab === 'details' || isFlippingPage) return;
    setIsFlippingPage(true);
    setFlipDirection('backward');
    if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
    flipTimerRef.current = window.setTimeout(() => {
      setActiveTab('details');
    }, 200);
    window.setTimeout(() => {
      setIsFlippingPage(false);
    }, 450);
  }, [activeTab, isFlippingPage]);

  // Se calcula una única vez al montar/cambiar de libro sin un segundo render en useEffect
  const flipVars = useMemo(() => computeBookFlipVars(book?.id), [book?.id]);

  useEffect(() => {
    if (!book?.id) return;
    setIsClosing(false);
    setAnimDone(false);
    setActiveTab('details');
    setIsFlippingPage(false);

    return () => {
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

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (!isMobile && book?.id) {
      applyBookFlipVarsToElement(shellRef.current, book.id);
    }
    setAnimDone(false);
    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, isMobile ? 260 : 680);
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
        (e.animationName === 'book-turn-open' ||
          e.animationName === 'open-book-sheet-in-mobile')
      ) {
        setAnimDone(true);
      }
    },
    [isClosing, onClose]
  );

  useEffect(() => {
    if (!book) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && activeTab === 'details') {
        e.preventDefault();
        handleTurnToSynopsis();
        return;
      }
      if (e.key === 'ArrowLeft' && activeTab === 'synopsis') {
        e.preventDefault();
        handleTurnToDetails();
        return;
      }
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
  }, [book, isRecommendOpen, handleRequestClose, activeTab, handleTurnToSynopsis, handleTurnToDetails]);

  if (!book) return null;

  const isUrl = /^https?:\/\//i.test(book.lecturaVirtual);

  const modalContent = (
    <>
      <div
        className={
          'open-book-backdrop fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 sm:p-3 md:p-6 overflow-y-auto' +
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
          className="open-book-stage relative w-full max-w-5xl md:my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Contenedor del Libro (en móvil actúa como hoja editorial; en escritorio como libro 3D a doble página) */}
          <div
            ref={shellRef}
            onAnimationEnd={handleShellAnimationEnd}
            className={
              'open-book-shell w-full text-stone-900 dark:text-slate-100' +
              (animDone ? ' is-anim-done' : '') +
              (isClosing ? ' is-closing' : '')
            }
            style={flipVars}
          >
            {/* ═══════════════════════════════════════════════════════════════════════════
                VISTA MÓVIL (< 768px): Ficha Editorial / Códice Fluido con Barra Fija
               ═══════════════════════════════════════════════════════════════════════════ */}
            <div className="md:hidden flex flex-col max-h-[92dvh] sm:max-h-[88dvh] rounded-t-3xl sm:rounded-2xl border-t-2 sm:border border-amber-700/40 dark:border-[#2B3750] bg-[#fbf6ea] dark:bg-[#131926] shadow-[0_-12px_40px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Tirador visual superior y barra de acciones fija */}
              <div className="shrink-0 bg-[#f0e5cc] dark:bg-[#0E131D] border-b border-amber-900/20 dark:border-[#232D42] px-3.5 pt-2 pb-2.5">
                <div className="w-10 h-1 rounded-full bg-amber-900/25 dark:bg-slate-600/80 mx-auto mb-2 sm:hidden" />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-serif italic text-amber-900 dark:text-amber-400 min-w-0">
                    <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                    <span className="truncate font-medium">Ex-Libris · Ficha Literaria</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeTab === 'synopsis' && (
                      <button
                        type="button"
                        onClick={handleTurnToDetails}
                        className="inline-flex items-center justify-center p-1.5 rounded-xl border border-amber-600/40 bg-amber-500/25 text-amber-950 dark:text-amber-200 active:scale-95 transition"
                        title="Volver a la ficha técnica"
                        aria-label="Volver a la ficha técnica"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsRecommendOpen(true)}
                          className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-[11px] font-semibold border border-amber-600/40 bg-amber-500/20 text-amber-950 dark:text-amber-200 active:scale-95 transition"
                          title="Recomendar este libro"
                          aria-label="Recomendar este libro"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          <span className="hidden sm:inline">Recomendar</span>
                        </button>

                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(book)}
                            className="p-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#fbf6ea] dark:bg-[#1B2333] text-stone-800 dark:text-slate-200 active:scale-95 transition"
                            title="Editar ficha"
                            aria-label="Editar ficha"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(book)}
                            className="p-1.5 rounded-xl border border-rose-500/35 bg-rose-500/15 text-rose-800 dark:text-rose-300 active:scale-95 transition"
                            title="Eliminar libro"
                            aria-label="Eliminar libro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    {readOnly && onAddToLibrary && (
                      isAlreadyInLibrary ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold border border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span className="hidden sm:inline">En biblioteca</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddToLibrary(book)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border border-amber-600/50 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm active:scale-95 transition"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Añadir</span>
                        </button>
                      )
                    )}

                    {readOnly && onCustomize && !isAlreadyInLibrary && (
                      <button
                        type="button"
                        onClick={() => onCustomize(book)}
                        className="p-1.5 rounded-xl border border-amber-600/40 bg-amber-500/15 text-amber-900 dark:text-amber-200 active:scale-95 transition"
                        title="Personalizar datos antes de guardar"
                        aria-label="Personalizar libro"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleRequestClose}
                      className="p-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#e4d4b4] dark:bg-[#1A2232] text-stone-800 dark:text-slate-200 active:scale-95 transition shrink-0"
                      title="Cerrar libro (Esc)"
                      aria-label="Cerrar ficha"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cuerpo deslizable de la ficha en móvil */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {activeTab === 'synopsis' ? (
                  <div className="mobile-page-transition-forward space-y-4">
                    <div className="border-b border-amber-900/15 dark:border-[#242E42] pb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
                        fol. III · Sinopsis Literaria
                      </span>
                      <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white mt-0.5">
                        {book.nombre}
                      </h2>
                      <p className="font-serif italic text-xs text-stone-600 dark:text-slate-400">
                        {book.autor || 'Autor no especificado'}
                      </p>
                    </div>

                    {currentSynopsis ? (
                      <div className="rounded-2xl border border-amber-900/15 dark:border-[#242E42] bg-[#fffcf5]/90 dark:bg-[#161D2B]/80 p-4 shadow-sm">
                        <p className="font-serif text-sm leading-relaxed text-stone-800 dark:text-slate-200 whitespace-pre-line first-letter:float-left first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:text-amber-800 dark:first-letter:text-amber-400 first-letter:mr-2.5 first-letter:leading-none">
                          {currentSynopsis}
                        </p>
                      </div>
                    ) : (
                      <div className="py-8 px-4 rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] text-center space-y-2.5">
                        <BookOpen className="w-8 h-8 text-amber-700/60 dark:text-amber-400/60 mx-auto" />
                        <p className="font-serif text-sm text-stone-700 dark:text-slate-300">
                          Esta edición no incluye una sinopsis registrada.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleAutoFetchSynopsis}
                            disabled={isFetchingSynopsis}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm disabled:opacity-50"
                          >
                            {isFetchingSynopsis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>{isFetchingSynopsis ? 'Buscando sinopsis...' : 'Autocompletar sinopsis'}</span>
                          </button>
                          {!readOnly && onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(book)}
                              disabled={isFetchingSynopsis}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-amber-900/20 dark:border-slate-700 bg-white/70 dark:bg-slate-800 text-stone-800 dark:text-slate-200 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Escribir manual</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleTurnToDetails}
                      title="Volver a la ficha del libro"
                      aria-label="Volver a la ficha del libro"
                      className="w-full py-2.5 px-4 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#1A2232] text-amber-950 dark:text-amber-200 flex items-center justify-center transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mobile-page-transition-backward space-y-4">
                {/* Cabecera Principal: Portada + Título + Autor + Saga */}
                <div className="flex gap-3.5 items-start">
                  <div className="w-24 sm:w-28 shrink-0 shadow-lg rounded-lg">
                    <BookCover
                      nombre={book.nombre}
                      autor={book.autor}
                      portadaUrl={book.portadaUrl}
                      portadaFallbackUrl={book.portadaFallbackUrl}
                      portadaDataUrl={book.portadaDataUrl}
                      size="md"
                      variant="book"
                      priority
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    {book.sagaNombre && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-300 max-w-full">
                        <Layers className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {book.sagaNombre}
                          {book.volumen ? ` · Vol. ${book.volumen}` : ''}
                        </span>
                      </div>
                    )}

                    <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-white leading-snug">
                      {book.nombre}
                    </h2>

                    <p className="font-serif italic text-sm text-stone-700 dark:text-slate-300">
                      {book.autor || 'Autor no especificado'}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {book.genero ? (
                        <span className="rounded-md bg-amber-500/15 border border-amber-600/35 px-2 py-0.5 text-[11px] font-semibold text-amber-950 dark:text-amber-300">
                          {book.genero}
                        </span>
                      ) : (
                        <span className="text-[11px] text-stone-500 dark:text-slate-500 italic">
                          Sin género
                        </span>
                      )}
                      {book.fechaPublicacion && (
                        <span className="rounded-md bg-[#efe3c8] dark:bg-[#1B2333] px-2 py-0.5 text-[11px] text-stone-700 dark:text-slate-300">
                          {book.fechaPublicacion}
                        </span>
                      )}
                      {book.paginas && (
                        <span className="rounded-md bg-[#efe3c8] dark:bg-[#1B2333] px-2 py-0.5 text-[11px] text-stone-700 dark:text-slate-300">
                          {book.paginas} págs.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subgéneros si existen */}
                {book.subgeneros.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {book.subgeneros.map((sub) => (
                      <span
                        key={sub}
                        className="rounded-lg bg-[#f0e5cc]/80 dark:bg-[#1E2738] border border-amber-900/20 dark:border-[#2E3B52] px-2.5 py-0.5 text-[11px] text-stone-700 dark:text-slate-300"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}

                {/* Estado de Lectura + Puntuación Personal */}
                {readOnly ? (
                  <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/75 dark:bg-[#0f141f]/90 p-3.5 space-y-2.5">
                    {readerName && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-slate-400 font-semibold">
                            Valoración de {readerName}
                          </span>
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">
                            {book.puntuacion
                              ? `${formatStars(book.puntuacion)} (${book.puntuacion}/5)`
                              : 'Sin valorar'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-amber-900/15 dark:border-[#232D42]">
                          <span className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-slate-400 font-semibold">
                            Estado de lectura
                          </span>
                          <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                            {book.progreso}
                          </span>
                        </div>
                      </>
                    )}
                    {recommendationReason && (
                      <div>
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 mb-1">
                          <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Por qué te gustará
                        </span>
                        <p className="text-xs text-stone-800 dark:text-slate-200 font-serif leading-snug">
                          {recommendationReason}
                        </p>
                      </div>
                    )}
                    {!readerName && !recommendationReason && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-stone-500 dark:text-slate-400 font-semibold block mb-0.5">
                          Catálogo NEXUS
                        </span>
                        <p className="text-xs text-stone-700 dark:text-slate-300 font-serif italic">
                          {book.genero ? `Género: ${book.genero}` : 'Ficha de obra recomendada'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/75 dark:bg-[#0f141f]/90 p-3.5 space-y-3">
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-stone-500 dark:text-slate-400 font-semibold mb-1.5">
                        Estado de lectura
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {READING_STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => onStatusChange?.(book.id, status)}
                            className={
                              'py-2 px-2.5 rounded-xl text-xs font-medium border text-center active:scale-[0.98] transition ' +
                              (book.progreso === status
                                ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-950 dark:text-amber-200 font-semibold shadow-sm'
                                : 'border-amber-900/20 dark:border-[#263147] bg-[#fbf6ea] dark:bg-[#171F2E] text-stone-700 dark:text-slate-300')
                            }
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-900/15 dark:border-[#232D42]">
                      <span className="block text-[10px] uppercase tracking-widest text-stone-500 dark:text-slate-400 font-semibold mb-1.5">
                        Puntuación personal
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        {STAR_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              onRatingChange?.(
                                book.id,
                                book.puntuacion === opt.value ? null : opt.value
                              )
                            }
                            className={
                              'py-1.5 rounded-xl text-xs border text-center active:scale-95 transition ' +
                              (book.puntuacion === opt.value
                                ? 'bg-amber-500/25 border-amber-600 dark:border-amber-400 text-amber-950 dark:text-amber-200 font-bold shadow-sm'
                                : 'border-amber-900/15 dark:border-[#263147] bg-[#fbf6ea]/70 dark:bg-[#171F2E]/70 text-stone-600 dark:text-slate-400')
                            }
                          >
                            {opt.value} ⭐
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón para pasar página a la Sinopsis en móvil */}
                <button
                  type="button"
                  onClick={handleTurnToSynopsis}
                  className="w-full p-3.5 rounded-2xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-[#f5ead4] to-amber-500/20 dark:from-amber-500/10 dark:via-[#192231] dark:to-amber-500/15 text-left active:scale-[0.98] transition flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-600/35 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 block">
                        Leer sinopsis de la obra
                      </span>
                      <span className="text-[11px] text-stone-600 dark:text-slate-400 block truncate">
                        {currentSynopsis
                          ? 'Pasa de página para ver el argumento'
                          : 'Sin sinopsis registrada'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-300 shrink-0">
                    <span>Pasar página</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Registro de Lectura (Fechas y Lectura Virtual) */}
                {(!readOnly || Boolean(book.fechaInicio || book.fechaFin || book.lecturaVirtual)) && (
                  <div className="rounded-2xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#232D42] pb-1.5">
                      <span className="font-serif italic font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                        Registro de Lectura
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-slate-500 font-mono">
                        NEXUS
                      </span>
                    </div>

                    {(book.fechaInicio || book.fechaFin || !readOnly) && (
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] text-stone-600 dark:text-slate-400 block mb-1">
                            Fecha Inicio
                          </label>
                          {!readOnly && onDatesChange ? (
                            <input
                              type="date"
                              value={book.fechaInicio || ''}
                              onChange={(e) =>
                                onDatesChange(book.id, e.target.value, book.fechaFin)
                              }
                              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2.5 py-1.5 text-xs font-medium focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
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
                          {!readOnly && onDatesChange ? (
                            <input
                              type="date"
                              value={book.fechaFin || ''}
                              onChange={(e) =>
                                onDatesChange(book.id, book.fechaInicio, e.target.value)
                              }
                              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2.5 py-1.5 text-xs font-medium focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                            />
                          ) : (
                            <span className="font-semibold text-xs block">
                              {book.fechaFin || '—'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {book.lecturaVirtual && (
                      <div className="pt-1.5 border-t border-amber-900/15 dark:border-[#232D42] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-stone-600 dark:text-slate-400 shrink-0">
                          Lectura Virtual
                        </span>
                        {isUrl ? (
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
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tabla Bibliográfica Compacta */}
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/50 dark:bg-[#101520]/60 p-3.5 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                      Editorial
                    </span>
                    <p className="font-semibold text-stone-900 dark:text-slate-100 mt-0.5 truncate">
                      {book.editorial || 'No disponible'}
                    </p>
                  </div>

                  <div>
                    <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                      <Globe className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                      Idioma / Edición
                    </span>
                    <p className="font-semibold text-stone-900 dark:text-slate-100 mt-0.5 truncate">
                      {[book.idioma, book.edicion].filter(Boolean).join(' · ') || 'No disponible'}
                    </p>
                  </div>

                  <div>
                    <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                      Tiempo Lectura
                    </span>
                    <p className="font-semibold text-stone-900 dark:text-slate-100 mt-0.5">
                      {book.tiempoLectura || 'Sin calcular'}
                    </p>
                  </div>

                  <div>
                    <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                      <Hash className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                      ISBN
                    </span>
                    <p className="font-mono font-semibold text-[11px] text-stone-900 dark:text-slate-100 mt-0.5 break-all">
                      {book.isbn || 'No disponible'}
                    </p>
                  </div>
                </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════
                VISTA ESCRITORIO (>= 768px): Libro Abierto 3D a Doble Página Simétrica
               ═══════════════════════════════════════════════════════════════════════════ */}
            <div className="open-book-pages-block hidden md:block">
              {/* Pliegue central del lomo en escritorio (36px de ancho en la unión central 50%) */}
              <div className="open-book-gutter" aria-hidden="true" />

              {/* Hoja animada interactiva al pasar página entre Ficha y Sinopsis */}
              {isFlippingPage && (
                <div
                  className={`open-book-leaf-turn ${
                    flipDirection === 'forward' ? 'is-turning-forward' : 'is-turning-backward'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Doble página simétrica en escritorio (6 cols Verso / 6 cols Recto) */}
              <div className="open-book-spread-grid grid grid-cols-12">
                {/* ─────────── 1. TAPA DURA DELANTERA (.cover.turn): Abre primero y cierra última ─────────── */}
                <div className="open-book-cover-turn" aria-hidden="true">
                  <div className="open-book-cover-inside">
                    <div className="open-book-edge-left" />
                    <div className="open-book-edge-bottom-left" />
                  </div>
                  <div className="open-book-cover-front">
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

                {/* ─────────── 2. HOJAS INTERMEDIAS QUE PASAN EN CASCADA (.page.turn 1..4) ─────────── */}
                <div className="open-book-turn-page open-book-turn-page-1" aria-hidden="true" />
                <div className="open-book-turn-page open-book-turn-page-2" aria-hidden="true" />
                <div className="open-book-turn-page open-book-turn-page-3" aria-hidden="true" />
                <div className="open-book-turn-page open-book-turn-page-4" aria-hidden="true" />

                {/* ─────────── 3. ALA IZQUIERDA (VERSO: Última hoja en abrirse y primera en cerrarse) ─────────── */}
                <div className="open-book-page-left md:col-span-6 flex flex-col">
                  {/* Dorso de papel mientras la hoja está en el lado derecho (> 90deg) */}
                  <div className="open-book-page-left-back" aria-hidden="true" />

                  {/* Cara Interior: Página Izquierda (Ex-Libris, Portada y Registro Personal) */}
                  <div className="open-book-left-inner flex-1 flex flex-col">
                    <div className="open-book-left-paper flex-1 flex flex-col justify-start p-3 sm:p-4 md:pr-7 md:pl-6 md:pt-3.5 md:pb-3.5 md:max-h-[82dvh] md:overflow-hidden">
                      <div className="open-book-content flex flex-col items-center w-full">
                        {/* Encabezado superior sutil de folio (Verso) */}
                        <div className="w-full flex items-center justify-between text-[11px] font-serif italic text-amber-900/75 dark:text-amber-400/80 border-b border-amber-900/15 dark:border-[#242E42] pb-1 mb-2">
                          <span>fol. I</span>
                          <span className="flex items-center gap-1.5 font-medium tracking-wide truncate">
                            <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                            {readerName ? `Ex-Libris · ${readerName}` : 'Ex-Libris · Ficha Bibliográfica'}
                          </span>
                        </div>

                        {/* Portada del libro centrada con sombra realista sobre el papel */}
                        <div className="w-32 sm:w-36 md:w-40 max-w-[165px] my-0.5 shadow-xl rounded-xl shrink-0">
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

                        {!readOnly ? (
                          <>
                            {/* Puntuación Personal (Estrellas) */}
                            <div className="mt-2 w-full rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/75 dark:bg-[#101520]/80 px-2.5 py-1.5 text-center shadow-inner shrink-0">
                              <p className="font-serif italic text-[11px] text-stone-700 dark:text-slate-300 mb-1">
                                Puntuación Personal
                              </p>
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {STAR_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() =>
                                      onRatingChange?.(
                                        book.id,
                                        book.puntuacion === opt.value ? null : opt.value
                                      )
                                    }
                                    className={
                                      'px-2 py-0.5 rounded-lg text-xs border transition ' +
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
                            <div className="mt-2 w-full rounded-xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-2.5 space-y-1.5 text-xs shrink-0 shadow-sm">
                              <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#232D42] pb-1">
                                <span className="font-serif italic font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-[11px]">
                                  <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                                  Registro de Lectura
                                </span>
                                <span className="text-[9px] uppercase tracking-widest text-stone-500 dark:text-slate-500 font-mono">
                                  NEXUS
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-semibold text-stone-600 dark:text-slate-400 block mb-0.5">
                                    Inicio
                                  </label>
                                  {onDatesChange ? (
                                    <input
                                      type="date"
                                      value={book.fechaInicio || ''}
                                      onChange={(e) =>
                                        onDatesChange(book.id, e.target.value, book.fechaFin)
                                      }
                                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2 py-0.5 text-[11px] font-medium text-stone-800 dark:text-slate-200 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                                    />
                                  ) : (
                                    <span className="font-semibold text-xs block text-stone-800 dark:text-slate-200">
                                      {book.fechaInicio || '—'}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <label className="text-[10px] font-semibold text-stone-600 dark:text-slate-400 block mb-0.5">
                                    Fin
                                  </label>
                                  {onDatesChange ? (
                                    <input
                                      type="date"
                                      value={book.fechaFin || ''}
                                      onChange={(e) =>
                                        onDatesChange(book.id, book.fechaInicio, e.target.value)
                                      }
                                      className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#141A26] px-2 py-0.5 text-[11px] font-medium text-stone-800 dark:text-slate-200 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none"
                                    />
                                  ) : (
                                    <span className="font-semibold text-xs block text-stone-800 dark:text-slate-200">
                                      {book.fechaFin || '—'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {book.lecturaVirtual && (
                                <div className="pt-1 border-t border-amber-900/15 dark:border-[#232D42] flex items-center justify-between gap-2 text-[11px]">
                                  <span className="text-[10px] text-stone-600 dark:text-slate-400 shrink-0">
                                    Lectura Virtual
                                  </span>
                                  {isUrl ? (
                                    <a
                                      href={book.lecturaVirtual}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-400 hover:underline font-semibold truncate text-[11px]"
                                    >
                                      Abrir recurso <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="font-medium text-[11px] truncate text-stone-800 dark:text-slate-200">
                                      {book.lecturaVirtual}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            {readerName ? (
                              <>
                                <div className="mt-2 w-full rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/75 dark:bg-[#101520]/80 px-2.5 py-1.5 text-center shadow-inner shrink-0">
                                  <p className="font-serif italic text-[11px] text-stone-700 dark:text-slate-300 mb-0.5">
                                    Valoración de {readerName}
                                  </p>
                                  <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-bold">
                                    {book.puntuacion
                                      ? `${formatStars(book.puntuacion)} (${book.puntuacion}/5)`
                                      : 'Sin valorar'}
                                  </div>
                                </div>

                                <div className="mt-2 w-full rounded-xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-2 text-center text-xs shrink-0 shadow-sm">
                                  <span className="text-[10px] uppercase font-semibold text-stone-500 dark:text-slate-400 block mb-1">
                                    Estado en su estantería
                                  </span>
                                  <span className="inline-flex items-center rounded-full border border-amber-600/35 bg-amber-500/15 px-3 py-0.5 text-xs font-semibold text-amber-950 dark:text-amber-200">
                                    {book.progreso}
                                  </span>
                                </div>
                              </>
                            ) : recommendationReason ? (
                              <div className="mt-2 w-full rounded-xl border border-amber-600/35 dark:border-amber-500/30 bg-[#f4ead4]/80 dark:bg-[#141A26] p-2.5 text-center shrink-0 shadow-sm">
                                <span className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 mb-1">
                                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                  Por qué te gustará
                                </span>
                                <p className="text-xs text-stone-800 dark:text-slate-200 font-serif leading-snug">
                                  {recommendationReason}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-2 w-full rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#f4ead4]/60 dark:bg-[#101520]/60 p-2.5 text-center shrink-0">
                                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-800 dark:text-amber-400 block mb-0.5">
                                  Catálogo NEXUS
                                </span>
                                <p className="text-xs text-stone-700 dark:text-slate-300 font-serif italic">
                                  {book.genero ? `Género: ${book.genero}` : 'Ficha de obra recomendada'}
                                </p>
                              </div>
                            )}

                            {book.lecturaVirtual && (
                              <div className="mt-1.5 w-full pt-1.5 border-t border-amber-900/15 dark:border-[#232D42] flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-[10px] text-stone-600 dark:text-slate-400 shrink-0">
                                  Lectura Virtual
                                </span>
                                {isUrl ? (
                                  <a
                                    href={book.lecturaVirtual}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-400 hover:underline font-semibold truncate text-[11px]"
                                  >
                                    Abrir recurso <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                ) : (
                                  <span className="font-medium text-[11px] truncate text-stone-800 dark:text-slate-200">
                                    {book.lecturaVirtual}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─────────── 4. ALA DERECHA (RECTO: Cabecera Literaria, Metadatos y Sinopsis) ─────────── */}
                <div className="open-book-page-right md:col-span-6 flex flex-col">
                  <div className="open-book-edge-right" aria-hidden="true" />
                  <div className="open-book-edge-bottom-right" aria-hidden="true" />

                  <div className="open-book-right-paper flex-1 flex flex-col p-4 sm:p-6 md:pl-8 md:pr-7 md:pt-0 md:pb-6 md:max-h-[82dvh] md:overflow-y-auto">
                    {/* Cintas / Pestañas Superiores de Acción (Marcapáginas en el borde superior derecho) */}
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <span className="inline-block pt-3 text-[11px] font-serif italic text-amber-900/70 dark:text-amber-400/75 select-none truncate">
                        {activeTab === 'details' ? 'Catálogo Literario · fol. II' : 'Sinopsis Literaria · fol. III'}
                      </span>

                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {activeTab === 'synopsis' && (
                          <button
                            type="button"
                            onClick={handleTurnToDetails}
                            className="open-book-ribbon-tab border-amber-600/40 bg-amber-500/25 hover:bg-amber-500/35 text-amber-950 dark:text-amber-200 font-bold px-2.5"
                            title="Volver a la ficha técnica (←)"
                            aria-label="Volver a la ficha técnica"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsRecommendOpen(true)}
                              className="open-book-ribbon-tab border-amber-600/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200"
                              title="Recomendar este libro a un amigo"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                              <span className="hidden xl:inline">Recomendar</span>
                            </button>

                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => onEdit(book)}
                                className="open-book-ribbon-tab border-amber-900/25 dark:border-slate-700 bg-[#f2e6ce] dark:bg-[#1B2333] hover:bg-[#ead9b8] dark:hover:bg-[#232D42] text-stone-800 dark:text-slate-200 px-2.5"
                                title="Editar ficha del libro"
                                aria-label="Editar ficha"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {onDelete && (
                              <button
                                type="button"
                                onClick={() => onDelete(book)}
                                className="open-book-ribbon-tab border-rose-500/35 bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 px-2.5"
                                title="Eliminar libro"
                                aria-label="Eliminar libro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}

                        {readOnly && onAddToLibrary && (
                          isAlreadyInLibrary ? (
                            <span className="open-book-ribbon-tab border-emerald-500/35 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold px-3">
                              <Check className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">En tu biblioteca</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddToLibrary(book)}
                              className="open-book-ribbon-tab border-amber-600/50 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 shadow-sm transition active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Añadir a Por Leer</span>
                            </button>
                          )
                        )}

                        {readOnly && onCustomize && !isAlreadyInLibrary && (
                          <button
                            type="button"
                            onClick={() => onCustomize(book)}
                            className="open-book-ribbon-tab border-amber-600/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 font-semibold px-2.5 transition active:scale-95"
                            title="Personalizar datos antes de guardar"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Personalizar</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleRequestClose}
                          aria-label="Cerrar ficha"
                          title="Cerrar libro (Esc)"
                          className="open-book-ribbon-tab border-amber-900/25 dark:border-slate-700 bg-[#e9dac0] dark:bg-[#161D2B] hover:bg-amber-900/20 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 px-2.5 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {activeTab === 'details' ? (
                      <div className="open-book-content open-book-fade-content flex flex-col gap-4 sm:gap-5">
                      {/* Título, Autor, Saga y Divisor Ornamental */}
                      <div className="text-left">
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
                        {!readOnly && (
                          <div>
                            <span className="block text-[11px] uppercase tracking-widest text-stone-500 dark:text-slate-400 font-semibold mb-1.5">
                              Estado de lectura
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {READING_STATUSES.map((status) => (
                                <button
                                  key={status}
                                  type="button"
                                  onClick={() => onStatusChange?.(book.id, status)}
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
                        )}

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
                        <div className="grid grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90">
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

                          <div className="py-2.5 pl-3">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                              <Hash className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              ISBN
                            </span>
                            <p className="font-mono font-semibold text-xs text-stone-900 dark:text-slate-100 mt-0.5 break-all">
                              {book.isbn || 'No disponible'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90">
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

                          <div className="py-2.5 pl-3">
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

                      {/* Botón interactivo para pasar página a la Sinopsis */}
                      <button
                        type="button"
                        onClick={handleTurnToSynopsis}
                        className="group w-full mt-2 p-3.5 rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-[#f5ead4] to-amber-500/20 dark:from-amber-500/10 dark:via-[#192231] dark:to-amber-500/15 hover:border-amber-600 dark:hover:border-amber-400 text-left transition-all duration-300 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-600/35 group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 block group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                              Leer sinopsis de la obra
                            </span>
                            <span className="text-[11px] text-stone-600 dark:text-slate-400 block truncate">
                              {currentSynopsis
                                ? 'Pasa la página para descubrir la trama y el argumento'
                                : 'Sin sinopsis registrada todavía (pulsa para consultar)'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-xs font-bold text-amber-950 dark:text-amber-200 border border-amber-600/30 shrink-0 group-hover:translate-x-1 transition-transform">
                          <span>Pasar página</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="open-book-fade-content flex flex-col gap-4 sm:gap-5">
                      <div className="text-left border-b border-amber-900/15 dark:border-[#242E42] pb-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
                            Argumento & Sinopsis de la obra
                          </span>
                          <span className="text-[10px] text-stone-500 dark:text-slate-400 font-serif italic">
                            fol. III
                          </span>
                        </div>
                        <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-white mt-1">
                          {book.nombre}
                        </h2>
                        <p className="font-serif italic text-sm text-stone-700 dark:text-slate-300 mt-0.5">
                          por {book.autor || 'Autor no especificado'}
                        </p>
                        <div className="flex items-center gap-3 mt-3" aria-hidden="true">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
                          <span className="text-amber-700 dark:text-amber-400 text-xs select-none">
                            ✦
                          </span>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
                        </div>
                      </div>

                      {currentSynopsis ? (
                        <div className="py-2">
                          <p className="font-serif text-[15px] sm:text-base leading-relaxed text-stone-800 dark:text-slate-200 whitespace-pre-line tracking-normal first-letter:float-left first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-amber-800 dark:first-letter:text-amber-400 first-letter:mr-3 first-letter:leading-none">
                            {currentSynopsis}
                          </p>
                        </div>
                      ) : (
                        <div className="py-12 px-6 rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] text-center space-y-2.5">
                          <BookOpen className="w-9 h-9 text-amber-700/60 dark:text-amber-400/60 mx-auto" />
                          <h3 className="font-serif text-base font-bold text-stone-800 dark:text-slate-200">
                            Esta obra no incluye sinopsis registrada todavía
                          </h3>
                          <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto">
                            Puedes buscar y autocompletar el argumento automáticamente desde los registros bibliográficos abiertos o redactarlo a mano.
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={handleAutoFetchSynopsis}
                              disabled={isFetchingSynopsis}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              {isFetchingSynopsis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              <span>{isFetchingSynopsis ? 'Buscando sinopsis...' : 'Autocompletar sinopsis'}</span>
                            </button>
                            {!readOnly && onEdit && (
                              <button
                                type="button"
                                onClick={() => onEdit(book)}
                                disabled={isFetchingSynopsis}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-amber-900/20 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-750 text-stone-800 dark:text-slate-200 transition shadow-sm cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Escribir manual</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 mt-auto border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleTurnToDetails}
                          title="Volver a la ficha técnica (←)"
                          aria-label="Volver a la ficha técnica"
                          className="inline-flex items-center justify-center p-2.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] hover:bg-[#ebdcc0] dark:bg-[#1A2232] dark:hover:bg-[#222C3F] text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[11px] text-stone-500 dark:text-slate-500 italic">
                          Pulsa ← o flecha izquierda para volver
                        </span>
                      </div>
                    </div>
                  )}
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
