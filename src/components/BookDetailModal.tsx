import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { soundService } from '../services/soundService';
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
  Sliders,
  Languages,
  PenLine,
  Quote,
  Copy,
  Save,
  CheckCircle2,
  Share2
} from 'lucide-react';
import '../book-detail.css';
import { Book, StarRating, CustomCollection } from '../types/models';
import { collectionService } from '../services/collectionService';
import { AddToCollectionModal } from './AddToCollectionModal';
import { BookCover } from './BookCover';
import { formatStars, ReadingStatus, STAR_OPTIONS } from '../constants/catalogs';
import { READING_STATUS_META } from '../constants/readingStatusMeta';
import { ReadingStatusControl } from './ReadingStatusControl';
import { RecommendBookModal } from './RecommendBookModal';
import { ShareBookCardModal } from './ShareBookCardModal';
import { calculateReadingTime } from '../utils/readingTime';
import {
  bookMetadataService,
  isLikelyEnglish,
  translateToSpanish
} from '../services/bookMetadataService';
import {
  updateBookPartialRecord,
  updateBookQuickStatus,
  restoreBookStatusSnapshot,
  BookStatusSnapshot,
  getTodayLocalDateString
} from '../db/database';

export interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onStatusChange?: (bookId: string, status: ReadingStatus) => void;
  onRatingChange?: (bookId: string, rating: StarRating) => void;
  onDatesChange?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
  currentUserId?: string;
  onShowToast?: (
    message: string,
    optionsOrType?: 'success' | 'error' | 'info' | { type?: 'success' | 'error' | 'info'; action?: { label: string; onClick: () => void }; duration?: number }
  ) => void;
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

  // En móvil o usuarios con preferencia de movimiento reducido usamos animación nativa sin cálculo FLIP
  if (
    window.innerWidth < 768 ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  ) {
    return fallback;
  }

  let sourceEl: Element | null = null;
  try {
    const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(bookId) : bookId.replace(/"/g, '\\"');
    const container = document.querySelector(`[data-book-id="${escapedId}"]`);
    sourceEl = container ? (container.querySelector('.book-cover') || container) : null;
  } catch {
    sourceEl = null;
  }

  if (!sourceEl) return fallback;

  const rect = sourceEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return fallback;

  // Si la tarjeta o libro de origen está fuera de los límites visibles de la pantalla,
  // usar la animación fallback centrada para evitar que la animación salga disparada hacia fuera del viewport
  const isOutOfViewport =
    rect.bottom < -60 ||
    rect.top > window.innerHeight + 60 ||
    rect.right < -60 ||
    rect.left > window.innerWidth + 60;

  if (isOutOfViewport) return fallback;

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

export type BookModalTab = 'details' | 'synopsis' | 'notes';

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
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);
  const [selectedQuoteForCard, setSelectedQuoteForCard] = useState('');
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  const [bookCollections, setBookCollections] = useState<CustomCollection[]>([]);
  useEffect(() => {
    if (!book) return;
    setBookCollections(collectionService.getCollectionsForBook(book.id, currentUserId));
  }, [book, currentUserId]);
  const [isClosing, setIsClosing] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const [activeTab, setActiveTab] = useState<BookModalTab>('details');
  const [localNotes, setLocalNotes] = useState(book?.notasPersonales || '');
  const [localQuotes, setLocalQuotes] = useState<string[]>(book?.citas || []);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuotePage, setNewQuotePage] = useState('');
  const [copiedQuoteIndex, setCopiedQuoteIndex] = useState<number | null>(null);
  const [isFlippingPage, setIsFlippingPage] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');
  const [isFetchingSynopsis, setIsFetchingSynopsis] = useState(false);
  const [localSynopsis, setLocalSynopsis] = useState<string | null>(null);

  useEffect(() => {
    setLocalSynopsis(null);
    setLocalNotes(book?.notasPersonales || '');
    setLocalQuotes(book?.citas || []);
    setNewQuoteText('');
    setNewQuotePage('');
    setNotesSavedSuccess(false);
  }, [book?.id, book?.notasPersonales, book?.citas]);

  const computedReadingTime = useMemo(() => {
    if (!book) return 'Sin calcular';
    return calculateReadingTime(book);
  }, [book]);

  const colophonItems = useMemo(() => {
    if (!book) return [];
    const items: Array<{ label?: string; value: string; isMono?: boolean }> = [];
    if (book.editorial && book.editorial.trim()) {
      items.push({ value: book.editorial.trim() });
    }
    if (book.idioma && book.idioma.trim()) {
      items.push({ value: book.idioma.trim() });
    }
    if (book.isbn && book.isbn.trim()) {
      items.push({ label: 'ISBN', value: book.isbn.trim(), isMono: true });
    }
    return items;
  }, [book]);

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
  }, [book, isFetchingSynopsis, onShowToast, readOnly]);

  const [isTranslatingSynopsis, setIsTranslatingSynopsis] = useState(false);

  const isCurrentSynopsisEnglish = useMemo(() => {
    return isLikelyEnglish(currentSynopsis);
  }, [currentSynopsis]);

  const handleTranslateCurrentSynopsis = useCallback(async () => {
    if (!currentSynopsis || isTranslatingSynopsis) return;
    setIsTranslatingSynopsis(true);
    try {
      const translated = await translateToSpanish(currentSynopsis);
      if (translated && translated !== currentSynopsis) {
        setLocalSynopsis(translated);
        if (book && !readOnly) {
          await updateBookPartialRecord(book.id, {
            sinopsis: translated
          });
        }
        onShowToast?.('Sinopsis traducida al español y guardada con éxito.');
      } else {
        onShowToast?.('No se pudo traducir la sinopsis en este momento.');
      }
    } catch (err) {
      console.error('Error al traducir la sinopsis:', err);
      onShowToast?.('Ocurrió un error al traducir la sinopsis.');
    } finally {
      setIsTranslatingSynopsis(false);
    }
  }, [currentSynopsis, isTranslatingSynopsis, book, readOnly, onShowToast]);

  const flipTimerRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const handleTurnToTab = useCallback(
    (targetTab: BookModalTab) => {
      if (activeTab === targetTab || isFlippingPage) return;
      const order: Record<BookModalTab, number> = { details: 0, synopsis: 1, notes: 2 };
      const direction = order[targetTab] > order[activeTab] ? 'forward' : 'backward';
      setIsFlippingPage(true);
      setFlipDirection(direction);
      soundService.playPageTurn();
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = window.setTimeout(() => {
        setActiveTab(targetTab);
      }, 200);
      window.setTimeout(() => {
        setIsFlippingPage(false);
      }, 450);
    },
    [activeTab, isFlippingPage]
  );

  const handleTurnToSynopsis = useCallback(() => handleTurnToTab('synopsis'), [handleTurnToTab]);
  const handleTurnToDetails = useCallback(() => handleTurnToTab('details'), [handleTurnToTab]);
  const handleTurnToNotes = useCallback(() => handleTurnToTab('notes'), [handleTurnToTab]);

  const handleSaveNotes = useCallback(
    async (notesToSave?: string, isExplicitSave = false) => {
      if (!book?.id) return;
      const content = notesToSave !== undefined ? notesToSave : localNotes;
      const currentSaved = book.notasPersonales ?? '';

      // Si no hay cambios respecto a lo que ya está guardado en base de datos:
      if (content.trim() === currentSaved.trim()) {
        if (isExplicitSave && content.trim() !== '') {
          setNotesSavedSuccess(true);
          setTimeout(() => setNotesSavedSuccess(false), 1500);
        }
        return;
      }

      setIsSavingNotes(true);
      try {
        await updateBookPartialRecord(book.id, { notasPersonales: content });
        setNotesSavedSuccess(true);
        setTimeout(() => setNotesSavedSuccess(false), 2500);
        if (onShowToast) {
          onShowToast('Notas personales guardadas correctamente.', 'success');
        }
      } catch {
        if (onShowToast) {
          onShowToast('Error al guardar las notas personales.', 'error');
        }
      } finally {
        setIsSavingNotes(false);
      }
    },
    [book?.id, book?.notasPersonales, localNotes, onShowToast]
  );

  const handleAddQuote = useCallback(async () => {
    if (!book?.id || !newQuoteText.trim()) return;
    const pageSuffix = newQuotePage.trim() ? ` (pág. ${newQuotePage.trim()})` : '';
    const fullQuote = `${newQuoteText.trim()}${pageSuffix}`;
    const updated = [...localQuotes, fullQuote];
    setLocalQuotes(updated);
    setNewQuoteText('');
    setNewQuotePage('');
    try {
      await updateBookPartialRecord(book.id, { citas: updated });
      if (onShowToast) {
        onShowToast('Cita añadida a tu diario de lectura.', 'success');
      }
    } catch {
      if (onShowToast) {
        onShowToast('Error al guardar la cita.', 'error');
      }
    }
  }, [book?.id, newQuoteText, newQuotePage, localQuotes, onShowToast]);

  const handleDeleteQuote = useCallback(
    async (index: number) => {
      if (!book?.id) return;
      const updated = localQuotes.filter((_, i) => i !== index);
      setLocalQuotes(updated);
      try {
        await updateBookPartialRecord(book.id, { citas: updated });
        if (onShowToast) {
          onShowToast('Cita eliminada de tu diario.', 'info');
        }
      } catch {
        if (onShowToast) {
          onShowToast('Error al eliminar la cita.', 'error');
        }
      }
    },
    [book?.id, localQuotes, onShowToast]
  );

  const handleCopyQuote = useCallback(
    (quote: string, index: number) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard && book) {
        navigator.clipboard.writeText(`«${quote}» — ${book.nombre}, ${book.autor}`);
        setCopiedQuoteIndex(index);
        setTimeout(() => setCopiedQuoteIndex(null), 2000);
        if (onShowToast) {
          onShowToast('Cita copiada con autor y título al portapapeles.', 'success');
        }
      }
    },
    [book, onShowToast]
  );

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

  const statusHints = useMemo(() => {
    const hints: Partial<Record<ReadingStatus, string>> = {};
    if (!book?.fechaInicio) {
      hints['⏳ Leyendo'] = 'Se guardará la fecha de inicio';
    }
    if (!book?.fechaFin) {
      hints['✅ Leído'] = 'Se guardará la fecha de fin';
    }
    return hints;
  }, [book?.fechaInicio, book?.fechaFin]);

  const handleReadingStatusChange = useCallback(
    async (nextStatus: ReadingStatus) => {
      if (!book || book.progreso === nextStatus) return;

      const snapshot: BookStatusSnapshot = {
        progreso: book.progreso,
        fechaInicio: book.fechaInicio,
        fechaFin: book.fechaFin,
        tiempoLectura: book.tiempoLectura
      };

      const today = getTodayLocalDateString();
      const willTouchFechaInicio = nextStatus === '⏳ Leyendo' && !book.fechaInicio;
      const willTouchFechaFin = nextStatus === '✅ Leído' && !book.fechaFin;

      if (onStatusChange) {
        onStatusChange(book.id, nextStatus);
      } else {
        await updateBookQuickStatus(book.id, nextStatus);
      }

      const formatDisplayDate = (isoDate: string) => {
        const parts = isoDate.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return isoDate;
      };

      const nextMeta = READING_STATUS_META[nextStatus];
      let message = `Estado cambiado a ${nextMeta.label}`;
      if (willTouchFechaFin) {
        message = `Marcado como Leído · fecha de fin: ${formatDisplayDate(today)}`;
      } else if (willTouchFechaInicio) {
        message = `Marcado como Leyendo · fecha de inicio: ${formatDisplayDate(today)}`;
      }

      onShowToast?.(message, {
        type: 'info',
        duration: 6000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await restoreBookStatusSnapshot(book.id, snapshot);
            onShowToast?.(
              `Estado restaurado a ${READING_STATUS_META[snapshot.progreso].label}`,
              { type: 'info' }
            );
          }
        }
      });
    },
    [book, onStatusChange, onShowToast]
  );

  useEffect(() => {
    if (!book) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (activeTab === 'details') {
          e.preventDefault();
          handleTurnToTab('synopsis');
          return;
        }
        if (activeTab === 'synopsis') {
          e.preventDefault();
          handleTurnToTab('notes');
          return;
        }
      }
      if (e.key === 'ArrowLeft') {
        if (activeTab === 'notes') {
          e.preventDefault();
          handleTurnToTab('synopsis');
          return;
        }
        if (activeTab === 'synopsis') {
          e.preventDefault();
          handleTurnToTab('details');
          return;
        }
      }
      if (e.key === 'Escape') {
        if (isRecommendOpen || isShareCardOpen) return;
        if (
          typeof document !== 'undefined' &&
          (document.getElementById('delete-dialog-title') ||
            document.querySelector('[data-reading-status-menu]'))
        ) {
          return;
        }
        e.stopPropagation();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [book, isRecommendOpen, isShareCardOpen, handleRequestClose, activeTab, handleTurnToTab]);

  if (!book) return null;

  const isUrl = /^https?:\/\//i.test(book.lecturaVirtual);

  const formatReadingType = (val?: string) => {
    if (!val) return '📱 Digital (.epub / eBook)';
    if (/^https?:\/\//i.test(val)) return val;
    if (/digital|epub|ebook/i.test(val)) return '📱 Digital (.epub / eBook)';
    if (/físico|papel/i.test(val)) return '📖 Físico (Papel)';
    if (/audio/i.test(val)) return '🎧 Audiolibro';
    return val;
  };

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
                    {activeTab !== 'details' && (
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

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQuoteForCard('');
                            setIsShareCardOpen(true);
                          }}
                          className="p-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#fbf6ea] dark:bg-[#1B2333] hover:bg-amber-500/10 text-stone-800 dark:text-slate-200 active:scale-95 transition"
                          title="Crear tarjeta editorial para redes sociales"
                          aria-label="Compartir tarjeta del libro"
                        >
                          <Share2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
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

              {/* Selector de pestañas móvil */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ebdcc0]/60 dark:bg-[#111722] border-b border-amber-900/15 dark:border-[#222B3C] overflow-x-auto text-xs shrink-0 no-scrollbar">
                <button
                  type="button"
                  onClick={handleTurnToDetails}
                  className={`px-2.5 py-1 rounded-lg font-serif italic text-xs transition shrink-0 whitespace-nowrap ${
                    activeTab === 'details'
                      ? 'bg-amber-600/25 text-amber-950 dark:text-amber-200 font-bold border border-amber-600/40'
                      : 'text-stone-600 dark:text-slate-400'
                  }`}
                >
                  fol. II · Ficha
                </button>
                <button
                  type="button"
                  onClick={handleTurnToSynopsis}
                  className={`px-2.5 py-1 rounded-lg font-serif italic text-xs transition shrink-0 whitespace-nowrap ${
                    activeTab === 'synopsis'
                      ? 'bg-amber-600/25 text-amber-950 dark:text-amber-200 font-bold border border-amber-600/40'
                      : 'text-stone-600 dark:text-slate-400'
                  }`}
                >
                  fol. III · Sinopsis
                </button>
                <button
                  type="button"
                  onClick={handleTurnToNotes}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-serif italic text-xs transition shrink-0 whitespace-nowrap ${
                    activeTab === 'notes'
                      ? 'bg-amber-600/25 text-amber-950 dark:text-amber-200 font-bold border border-amber-600/40'
                      : 'text-stone-600 dark:text-slate-400'
                  }`}
                >
                  fol. IV · Diario & Citas
                  {(Boolean(localNotes) || localQuotes.length > 0) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                </button>
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
                      <div className="space-y-3">
                        {isCurrentSynopsisEnglish && (
                          <div className="p-3 rounded-xl border border-amber-600/35 bg-amber-500/15 flex items-center justify-between gap-2.5 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0 text-amber-950 dark:text-amber-200">
                              <Languages className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                              <span className="font-semibold truncate">Sinopsis en inglés detectada</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleTranslateCurrentSynopsis}
                              disabled={isTranslatingSynopsis}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 transition"
                            >
                              {isTranslatingSynopsis ? 'Traduciendo...' : 'Traducir al español'}
                            </button>
                          </div>
                        )}
                        <div className="rounded-2xl border border-amber-900/15 dark:border-[#242E42] bg-[#fffcf5]/90 dark:bg-[#161D2B]/80 p-4 shadow-sm">
                          <p className="font-serif text-sm leading-relaxed text-stone-800 dark:text-slate-200 whitespace-pre-line first-letter:float-left first-letter:text-4xl first-letter:font-serif first-letter:font-bold first-letter:text-amber-800 dark:first-letter:text-amber-400 first-letter:mr-2.5 first-letter:leading-none">
                            {currentSynopsis}
                          </p>
                        </div>
                        <div className="flex justify-end pt-0.5">
                          <button
                            type="button"
                            onClick={handleAutoFetchSynopsis}
                            disabled={isFetchingSynopsis}
                            className="inline-flex items-center gap-1 text-[11px] text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{isFetchingSynopsis ? 'Buscando...' : 'Actualizar sinopsis'}</span>
                          </button>
                        </div>
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

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleTurnToDetails}
                        title="Volver a la ficha del libro"
                        aria-label="Volver a la ficha del libro"
                        className="py-2.5 px-3 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#1A2232] text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Ficha técnica</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleTurnToNotes}
                        title="Ir al Diario de Lectura & Citas"
                        className="py-2.5 px-3 rounded-xl border border-amber-600/35 bg-amber-500/20 text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
                      >
                        <span>Diario & Citas</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : activeTab === 'notes' ? (
                  <div className="mobile-page-transition-forward space-y-4">
                    <div className="border-b border-amber-900/15 dark:border-[#242E42] pb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
                        fol. IV · Diario de Lectura & Citas
                      </span>
                      <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-white mt-0.5">
                        {book.nombre}
                      </h2>
                      <p className="font-serif italic text-xs text-stone-600 dark:text-slate-400">
                        {book.autor || 'Autor no especificado'}
                      </p>
                    </div>

                    {/* Reseña & Notas personales */}
                    <div className="rounded-2xl border border-amber-900/15 dark:border-[#242E42] bg-[#fffcf5]/90 dark:bg-[#161D2B]/80 p-4 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#20293A] pb-2">
                        <span className="font-serif font-bold text-xs text-stone-900 dark:text-white flex items-center gap-1.5">
                          <PenLine className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          Reseña & Notas Personales
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(undefined, true)}
                            disabled={isSavingNotes}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-600/35 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 transition"
                          >
                            {isSavingNotes ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : notesSavedSuccess ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>{notesSavedSuccess ? 'Guardado' : 'Guardar'}</span>
                          </button>
                        )}
                      </div>

                      {readOnly ? (
                        <p className="font-serif text-xs leading-relaxed text-stone-700 dark:text-slate-300 italic whitespace-pre-line">
                          {localNotes || 'Sin notas registradas.'}
                        </p>
                      ) : (
                        <textarea
                          rows={4}
                          value={localNotes}
                          onChange={(e) => setLocalNotes(e.target.value)}
                          onBlur={() => handleSaveNotes()}
                          placeholder="Escribe tus reflexiones, impresiones o reseña personal de esta obra..."
                          className="w-full rounded-xl border border-amber-900/20 dark:border-[#2A354B] bg-[#fbf6ea]/70 dark:bg-[#0D111A] p-2.5 text-xs font-serif text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition leading-relaxed resize-y"
                        />
                      )}
                    </div>

                    {/* Citas Memorables */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif font-bold text-xs text-stone-900 dark:text-white flex items-center gap-1.5">
                          <Quote className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          Citas Memorables ({localQuotes.length})
                        </span>
                      </div>

                      {!readOnly && (
                        <div className="rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-[#121824]/60 p-3 space-y-2">
                          <textarea
                            rows={2}
                            value={newQuoteText}
                            onChange={(e) => setNewQuoteText(e.target.value)}
                            placeholder="«Escribe aquí una cita inolvidable de la obra...»"
                            className="w-full rounded-lg border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] p-2 text-xs font-serif italic text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition resize-none"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={newQuotePage}
                              onChange={(e) => setNewQuotePage(e.target.value)}
                              placeholder="Pág. o ubicación (ej: pág. 120)"
                              className="rounded-lg border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] px-2 py-1 text-xs text-stone-900 dark:text-slate-200 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-600 max-w-[160px]"
                            />
                            <button
                              type="button"
                              onClick={handleAddQuote}
                              disabled={!newQuoteText.trim()}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Añadir</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {localQuotes.length === 0 ? (
                        <div className="py-5 px-3 rounded-xl border border-dashed border-amber-900/20 dark:border-[#232D40] text-center text-xs text-stone-500 dark:text-slate-400 font-serif italic">
                          Aún no has guardado citas de este libro.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[35vh] overflow-y-auto overscroll-contain pr-0.5">
                          {localQuotes.map((quote, idx) => (
                            <div
                              key={idx}
                              className="group relative rounded-xl border border-amber-900/15 dark:border-[#222B3C] bg-[#fffcf5]/85 dark:bg-[#141A26]/85 p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <blockquote className="font-serif italic text-xs text-stone-800 dark:text-slate-200 leading-relaxed pl-2 border-l-2 border-amber-600/60 dark:border-amber-400/60">
                                  «{quote}»
                                </blockquote>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedQuoteForCard(quote);
                                      setIsShareCardOpen(true);
                                    }}
                                    className="p-1 rounded-md text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
                                    title="Crear tarjeta para redes con esta cita"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyQuote(quote, idx)}
                                    className="p-1 rounded-md text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
                                    title="Copiar cita"
                                  >
                                    {copiedQuoteIndex === idx ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  {!readOnly && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteQuote(idx)}
                                      className="p-1 rounded-md text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                                      title="Eliminar cita"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleTurnToSynopsis}
                        className="py-2.5 px-3 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#1A2232] text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Sinopsis</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleTurnToDetails}
                        className="py-2.5 px-3 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] dark:bg-[#1A2232] text-amber-950 dark:text-amber-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition"
                      >
                        <span>Ficha técnica</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-serif italic text-stone-700 dark:text-slate-300">
                        Estado de lectura
                      </span>
                      <ReadingStatusControl
                        value={book.progreso}
                        onChange={handleReadingStatusChange}
                        hints={statusHints}
                      />
                    </div>

                    <div className="pt-2.5 border-t border-amber-900/15 dark:border-[#232D42]">
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

                {/* Botón para abrir Diario de Lectura & Citas en móvil */}
                <button
                  type="button"
                  onClick={handleTurnToNotes}
                  className="w-full p-3.5 rounded-2xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-r from-[#fbf5e6] via-[#f4ebd6] to-[#eddcc0] dark:from-[#171E2D] dark:via-[#141A26] dark:to-[#111622] text-left active:scale-[0.98] transition flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/35 shrink-0">
                      <PenLine className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 block">
                        Diario de Lectura & Citas favoritas
                      </span>
                      <span className="text-[11px] text-stone-600 dark:text-slate-400 block truncate">
                        {localQuotes.length > 0 || localNotes
                          ? `${localQuotes.length} citas · Notas personales registradas`
                          : 'Escribe tu reseña personal y guarda tus citas'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-300 shrink-0">
                    <span>fol. IV</span>
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
                          Formato
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
                            {formatReadingType(book.lecturaVirtual)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Ficha métrica compacta protagonista (Año · Páginas · Tiempo de lectura) */}
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/50 dark:bg-[#101520]/60 p-3.5 text-xs space-y-2.5">
                  <div className="grid grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90 text-center">
                    <div className="px-1">
                      <span className="text-stone-500 dark:text-slate-400 flex items-center justify-center gap-1 text-[10.5px]">
                        <Calendar className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                        Año
                      </span>
                      <p className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5 truncate">
                        {book.fechaPublicacion ?? '—'}
                      </p>
                    </div>

                    <div className="px-1">
                      <span className="text-stone-500 dark:text-slate-400 flex items-center justify-center gap-1 text-[10.5px]">
                        <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                        Páginas
                      </span>
                      <p className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5 truncate">
                        {book.paginas ? `${book.paginas} págs.` : '—'}
                      </p>
                    </div>

                    <div className="px-1">
                      <span className="text-stone-500 dark:text-slate-400 flex items-center justify-center gap-1 text-[10.5px]">
                        <Clock className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                        Lectura
                      </span>
                      <p className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-slate-100 mt-0.5 truncate">
                        {computedReadingTime}
                      </p>
                    </div>
                  </div>

                  {/* Colofón bibliográfico sutil: Editorial · Idioma · ISBN */}
                  {colophonItems.length > 0 && (
                    <div className="pt-2 border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-center gap-1.5 flex-wrap text-[11px] font-serif text-stone-600 dark:text-slate-400 text-center">
                      {colophonItems.map((item, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="text-amber-900/30 dark:text-slate-600">·</span>}
                          <span className={item.isMono ? 'font-mono text-[10px] text-stone-500 dark:text-slate-400' : ''}>
                            {item.label ? (
                              <span className="text-[9.5px] uppercase font-mono tracking-wider text-stone-400 dark:text-slate-500 mr-1">
                                {item.label}
                              </span>
                            ) : null}
                            {item.value}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
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
                    <div className="open-book-left-paper flex-1 flex flex-col justify-between p-3 sm:p-4 md:pr-7 md:pl-6 md:pt-3.5 md:pb-3.5 md:max-h-[85dvh] md:overflow-hidden">
                      <div className="open-book-content flex-1 flex flex-col items-center justify-between w-full h-full">
                        {/* Encabezado superior sutil de folio (Verso) */}
                        <div className="w-full flex items-center justify-between text-[11px] font-serif italic text-amber-900/75 dark:text-amber-400/80 border-b border-amber-900/15 dark:border-[#242E42] pb-1 mb-2 shrink-0">
                          <span>fol. I</span>
                          <span className="flex items-center gap-1.5 font-medium tracking-wide truncate">
                            <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                            {readerName ? `Ex-Libris · ${readerName}` : 'Ex-Libris · Ficha Bibliográfica'}
                          </span>
                        </div>

                        {/* Portada del libro centrada con sombra realista sobre el papel */}
                        <div className="my-auto py-1 flex items-center justify-center shrink-0">
                          <div className="w-32 sm:w-36 md:w-40 max-w-[165px] shadow-xl rounded-xl">
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

                        {/* Bloque inferior fijado abajo (Puntuación y Registro de Lectura) */}
                        <div className="w-full mt-auto shrink-0 flex flex-col gap-2 pt-2">
                          {!readOnly ? (
                            <>
                              {/* Puntuación Personal (Estrellas) */}
                              <div className="w-full rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/75 dark:bg-[#101520]/80 px-2.5 py-1.5 text-center shadow-inner shrink-0">
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
                              <div className="w-full rounded-xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-2.5 space-y-1.5 text-xs shrink-0 shadow-sm">
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
                                      Formato
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
                                        {formatReadingType(book.lecturaVirtual)}
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
                                  <div className="w-full rounded-xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/75 dark:bg-[#101520]/80 px-2.5 py-1.5 text-center shadow-inner shrink-0">
                                    <p className="font-serif italic text-[11px] text-stone-700 dark:text-slate-300 mb-0.5">
                                      Valoración de {readerName}
                                    </p>
                                    <div className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-bold">
                                      {book.puntuacion
                                        ? `${formatStars(book.puntuacion)} (${book.puntuacion}/5)`
                                        : 'Sin valorar'}
                                    </div>
                                  </div>

                                  <div className="w-full rounded-xl border border-dashed border-amber-900/30 dark:border-[#2B3750] bg-[#f3e7ce]/60 dark:bg-[#0f141f]/75 p-2 text-center text-xs shrink-0 shadow-sm">
                                    <span className="text-[10px] uppercase font-semibold text-stone-500 dark:text-slate-400 block mb-1">
                                      Estado en su estantería
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-amber-600/35 bg-amber-500/15 px-3 py-0.5 text-xs font-semibold text-amber-950 dark:text-amber-200">
                                      {book.progreso}
                                    </span>
                                  </div>
                                </>
                              ) : recommendationReason ? (
                                <div className="w-full rounded-xl border border-amber-600/35 dark:border-amber-500/30 bg-[#f4ead4]/80 dark:bg-[#141A26] p-2.5 text-center shrink-0 shadow-sm">
                                  <span className="flex items-center justify-center gap-1 text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 mb-1">
                                    <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                    Por qué te gustará
                                  </span>
                                  <p className="text-xs text-stone-800 dark:text-slate-200 font-serif leading-snug">
                                    {recommendationReason}
                                  </p>
                                </div>
                              ) : (
                                <div className="w-full rounded-xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#f4ead4]/60 dark:bg-[#101520]/60 p-2.5 text-center shrink-0">
                                  <span className="text-[10px] uppercase font-mono tracking-wider text-amber-800 dark:text-amber-400 block mb-0.5">
                                    Catálogo NEXUS
                                  </span>
                                  <p className="text-xs text-stone-700 dark:text-slate-300 font-serif italic">
                                    {book.genero ? `Género: ${book.genero}` : 'Ficha de obra recomendada'}
                                  </p>
                                </div>
                              )}

                              {book.lecturaVirtual && (
                                <div className="w-full pt-1.5 border-t border-amber-900/15 dark:border-[#232D42] flex items-center justify-between gap-2 text-[11px]">
                                  <span className="text-[10px] text-stone-600 dark:text-slate-400 shrink-0">
                                    Formato
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
                                      {formatReadingType(book.lecturaVirtual)}
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
                </div>

                {/* ─────────── 4. ALA DERECHA (RECTO: Cabecera Literaria, Metadatos y Sinopsis) ─────────── */}
                <div className="open-book-page-right md:col-span-6 flex flex-col">
                  <div className="open-book-edge-right" aria-hidden="true" />
                  <div className="open-book-edge-bottom-right" aria-hidden="true" />

                  <div className="open-book-right-paper flex-1 flex flex-col p-4 sm:p-5 md:pl-8 md:pr-7 md:pt-0 md:pb-3.5 md:max-h-[85dvh] md:overflow-y-auto">
                    {/* Fila 1: Pestañas / cintas marcapáginas superiores (colgando del borde superior derecho) */}
                    <div className="flex items-center justify-end gap-1.5 pt-0 mb-1 shrink-0">
                      {activeTab !== 'details' && (
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

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuoteForCard('');
                              setIsShareCardOpen(true);
                            }}
                            className="open-book-ribbon-tab border-amber-900/25 dark:border-slate-700 bg-[#f2e6ce] dark:bg-[#1B2333] hover:bg-[#ead9b8] dark:hover:bg-[#232D42] text-stone-800 dark:text-slate-200 px-2.5"
                            title="Crear tarjeta editorial para redes sociales"
                            aria-label="Compartir tarjeta del libro"
                          >
                            <Share2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
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

                    {/* Fila 2: Encabezado superior de folio (Recto: fol. II / III / IV) alineado con fol. I del Verso */}
                    <div className="w-full flex items-center justify-between text-[11px] font-serif italic border-b border-amber-900/15 dark:border-[#242E42] pb-1.5 mb-2.5 shrink-0">
                      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        <button
                          type="button"
                          onClick={handleTurnToDetails}
                          className={`px-2 py-0.5 rounded-md transition cursor-pointer whitespace-nowrap shrink-0 ${
                            activeTab === 'details'
                              ? 'bg-amber-600/20 text-amber-950 dark:text-amber-200 font-bold border border-amber-600/40 shadow-xs'
                              : 'text-stone-600 dark:text-slate-400 hover:text-amber-900 dark:hover:text-amber-300'
                          }`}
                        >
                          fol. II · Catálogo
                        </button>
                        <span className="text-amber-900/30 dark:text-amber-400/30 select-none">·</span>
                        <button
                          type="button"
                          onClick={handleTurnToSynopsis}
                          className={`px-2 py-0.5 rounded-md transition cursor-pointer whitespace-nowrap shrink-0 ${
                            activeTab === 'synopsis'
                              ? 'bg-amber-600/20 text-amber-950 dark:text-amber-200 font-bold border border-amber-600/40 shadow-xs'
                              : 'text-stone-600 dark:text-slate-400 hover:text-amber-900 dark:hover:text-amber-300'
                          }`}
                        >
                          fol. III · Sinopsis
                        </button>
                        <span className="text-amber-900/30 dark:text-amber-400/30 select-none">·</span>
                        <button
                          type="button"
                          onClick={handleTurnToNotes}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md transition cursor-pointer whitespace-nowrap shrink-0 ${
                            activeTab === 'notes'
                              ? 'bg-amber-600/20 text-amber-950 dark:text-amber-200 font-bold border border-amber-600/40 shadow-xs'
                              : 'text-stone-600 dark:text-slate-400 hover:text-amber-900 dark:hover:text-amber-300'
                          }`}
                        >
                          fol. IV · Diario & Citas
                          {(Boolean(localNotes) || localQuotes.length > 0) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          )}
                        </button>
                      </div>

                      <span className="text-[10px] text-amber-900/60 dark:text-amber-400/60 select-none hidden sm:inline ml-2 whitespace-nowrap">
                        Recto · {activeTab === 'details' ? 'fol. II' : activeTab === 'synopsis' ? 'fol. III' : 'fol. IV'}
                      </span>
                    </div>

                    {activeTab === 'details' ? (
                      <div className="open-book-content open-book-fade-content flex flex-col gap-2.5 sm:gap-3">
                      {/* Título, Autor, Saga y Divisor Ornamental */}
                      <div className="text-left">
                        {book.sagaNombre && (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-600/30 dark:border-amber-500/30 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-300 mb-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            <span>
                              Saga: {book.sagaNombre}
                              {book.volumen ? ' · Volumen ' + String(book.volumen) : ''}
                            </span>
                          </div>
                        )}

                        <h2
                          id="detail-book-title"
                          className="font-serif text-2xl sm:text-[27px] font-bold text-stone-900 dark:text-white leading-tight tracking-tight"
                        >
                          {book.nombre}
                        </h2>

                        <p className="font-serif italic text-sm sm:text-base text-stone-700 dark:text-slate-300 mt-0.5">
                          {book.autor || 'Autor no especificado'}
                        </p>

                        {/* Divisor ornamental dorado con ✦ en el centro */}
                        <div className="flex items-center gap-3 mt-2" aria-hidden="true">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
                          <span className="text-amber-700 dark:text-amber-400 text-xs select-none">
                            ✦
                          </span>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
                        </div>
                      </div>

                      {/* Estado de lectura y Géneros */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {!readOnly && (
                          <ReadingStatusControl
                            value={book.progreso}
                            onChange={handleReadingStatusChange}
                            hints={statusHints}
                          />
                        )}

                        {book.genero ? (
                          <span className="rounded-full bg-amber-500/15 border border-amber-600/35 dark:border-amber-500/35 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:text-amber-300">
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
                            className="rounded-full bg-[#f0e5cc]/80 dark:bg-[#1E2738] border border-amber-900/20 dark:border-[#2E3B52] px-2.5 py-1 text-xs text-stone-700 dark:text-slate-300"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>

                      {/* Fila principal con las 3 métricas protagonistas: Año, Páginas y Tiempo de lectura */}
                      <div className="border-y border-amber-900/20 dark:border-slate-800 text-xs">
                        <div className="grid grid-cols-3 divide-x divide-amber-900/15 dark:divide-slate-800/90 py-0.5">
                          <div className="py-1.5 sm:py-2 pr-2.5">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[10.5px]">
                              <Calendar className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Año Publicación
                            </span>
                            <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {book.fechaPublicacion ?? '—'}
                            </p>
                          </div>

                          <div className="py-1.5 sm:py-2 px-2.5">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[10.5px]">
                              <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Páginas
                            </span>
                            <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {book.paginas ? `${book.paginas} págs.` : '—'}
                            </p>
                          </div>

                          <div className="py-1.5 sm:py-2 pl-2.5">
                            <span className="text-stone-500 dark:text-slate-400 flex items-center gap-1 text-[10.5px]">
                              <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                              Tiempo de Lectura
                            </span>
                            <p className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 mt-0.5">
                              {computedReadingTime}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Colofón bibliográfico sutil: Editorial · Idioma · ISBN */}
                      {colophonItems.length > 0 && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-serif text-stone-600 dark:text-slate-400">
                          {colophonItems.map((item, idx) => (
                            <React.Fragment key={idx}>
                              {idx > 0 && <span className="text-amber-900/30 dark:text-slate-600">·</span>}
                              <span className={item.isMono ? 'font-mono text-[10.5px] text-stone-500 dark:text-slate-400' : ''}>
                                {item.label ? (
                                  <span className="text-[9.5px] uppercase font-mono tracking-wider text-stone-400 dark:text-slate-500 mr-1">
                                    {item.label}
                                  </span>
                                ) : null}
                                {item.value}
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* Botón interactivo para pasar página a la Sinopsis */}
                      <button
                        type="button"
                        onClick={handleTurnToSynopsis}
                        className="group w-full mt-1.5 sm:mt-2 p-2.5 sm:p-3 rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-[#f5ead4] to-amber-500/20 dark:from-amber-500/10 dark:via-[#192231] dark:to-amber-500/15 hover:border-amber-600 dark:hover:border-amber-400 text-left transition-all duration-300 shadow-sm flex items-center justify-between gap-3 shrink-0"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-600/35 group-hover:scale-105 transition-transform shrink-0 shadow-sm">
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

                      {/* Botón interactivo para abrir el Diario de Lectura & Citas */}
                      <button
                        type="button"
                        onClick={handleTurnToNotes}
                        className="group w-full mt-1.5 p-2.5 sm:p-3 rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-gradient-to-r from-[#fbf5e6] via-[#f4ebd6] to-[#eddcc0] dark:from-[#171E2D] dark:via-[#141A26] dark:to-[#111622] hover:border-amber-600 dark:hover:border-amber-400 text-left transition-all duration-300 shadow-sm flex items-center justify-between gap-3 shrink-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/35 group-hover:scale-105 transition-transform shrink-0 shadow-sm">
                            <PenLine className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-serif font-bold text-sm text-stone-900 dark:text-slate-100 block group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                              Diario de Lectura & Citas favoritas
                            </span>
                            <span className="text-[11px] text-stone-600 dark:text-slate-400 block truncate">
                              {localQuotes.length > 0 || localNotes
                                ? `${localQuotes.length} citas guardadas · Notas y reflexiones registradas`
                                : 'Escribe tu reseña personal y guarda fragmentos memorables'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-xs font-bold text-amber-950 dark:text-amber-200 border border-amber-600/30 shrink-0 group-hover:translate-x-1 transition-transform">
                          <span>fol. IV</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    </div>
                  ) : activeTab === 'notes' ? (
                    <div className="open-book-fade-content flex flex-col gap-4 sm:gap-5">
                      <div className="text-left border-b border-amber-900/15 dark:border-[#242E42] pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-800 dark:text-amber-400 font-semibold">
                            fol. IV · Cuaderno de Lectura & Citas Memorables
                          </span>
                          <span className="text-[10px] text-stone-500 dark:text-slate-400 font-serif italic">
                            Ex-Libris
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
                          <span className="text-amber-700 dark:text-amber-400 text-xs select-none">✦</span>
                          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-amber-700/35 to-amber-700/50 dark:via-amber-400/25 dark:to-amber-400/45" />
                        </div>
                      </div>

                      {/* Sección 1: Notas y Reseña Personal */}
                      <div className="rounded-2xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5]/90 dark:bg-[#151C2A]/90 p-4 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#20293A] pb-2">
                          <span className="font-serif font-bold text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
                            <PenLine className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                            Reseña & Reflexiones Personales
                          </span>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => handleSaveNotes(undefined, true)}
                              disabled={isSavingNotes}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border border-amber-600/35 bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-200 transition cursor-pointer"
                            >
                              {isSavingNotes ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : notesSavedSuccess ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              <span>{notesSavedSuccess ? 'Guardado' : 'Guardar notas'}</span>
                            </button>
                          )}
                        </div>

                        {readOnly ? (
                          <p className="font-serif text-sm text-stone-700 dark:text-slate-300 whitespace-pre-line leading-relaxed italic">
                            {localNotes || 'El lector no ha registrado notas públicas para este libro.'}
                          </p>
                        ) : (
                          <textarea
                            rows={4}
                            value={localNotes}
                            onChange={(e) => setLocalNotes(e.target.value)}
                            onBlur={() => handleSaveNotes()}
                            placeholder="Añade aquí lo que más te ha impresionado, tus reflexiones al terminar el libro o tu reseña personal..."
                            className="w-full rounded-xl border border-amber-900/20 dark:border-[#2A354B] bg-[#fbf6ea]/70 dark:bg-[#0D111A] p-3 text-sm font-serif text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition leading-relaxed resize-y"
                          />
                        )}
                      </div>

                      {/* Sección 2: Citas Memorables */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif font-bold text-sm text-stone-900 dark:text-white flex items-center gap-1.5">
                            <Quote className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                            Citas Memorables ({localQuotes.length})
                          </span>
                          <span className="text-xs text-stone-500 dark:text-slate-400 font-serif italic">
                            Frases inolvidables
                          </span>
                        </div>

                        {/* Formulario para añadir cita */}
                        {!readOnly && (
                          <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-[#121824]/60 p-3.5 space-y-2.5">
                            <textarea
                              rows={2}
                              value={newQuoteText}
                              onChange={(e) => setNewQuoteText(e.target.value)}
                              placeholder="«Escribe o pega aquí una frase o cita memorable del libro...»"
                              className="w-full rounded-xl border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] p-2.5 text-xs font-serif italic text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition resize-none"
                            />
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                value={newQuotePage}
                                onChange={(e) => setNewQuotePage(e.target.value)}
                                placeholder="Página o ubicación (ej: pág. 142)"
                                className="rounded-lg border border-amber-900/20 dark:border-[#2A354B] bg-[#fffcf5] dark:bg-[#0D111A] px-2.5 py-1 text-xs text-stone-900 dark:text-slate-200 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-600 max-w-[200px]"
                              />
                              <button
                                type="button"
                                onClick={handleAddQuote}
                                disabled={!newQuoteText.trim()}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Añadir cita</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Lista de citas guardadas */}
                        {localQuotes.length === 0 ? (
                          <div className="py-6 px-4 rounded-xl border border-dashed border-amber-900/20 dark:border-[#232D40] text-center text-xs text-stone-500 dark:text-slate-400 font-serif italic">
                            Aún no has guardado ninguna cita de esta obra. Agrega tus fragmentos favoritos para recordarlos siempre.
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[32vh] overflow-y-auto overscroll-contain pr-1">
                            {localQuotes.map((quote, idx) => (
                              <div
                                key={idx}
                                className="group relative rounded-xl border border-amber-900/15 dark:border-[#222B3C] bg-[#fffcf5]/85 dark:bg-[#141A26]/85 p-3.5 transition hover:border-amber-600/40"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <blockquote className="font-serif italic text-xs sm:text-sm text-stone-800 dark:text-slate-200 leading-relaxed pl-2.5 border-l-2 border-amber-600/60 dark:border-amber-400/60">
                                    «{quote}»
                                  </blockquote>

                                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedQuoteForCard(quote);
                                        setIsShareCardOpen(true);
                                      }}
                                      className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
                                      title="Crear tarjeta para redes con esta cita"
                                    >
                                      <Share2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyQuote(quote, idx)}
                                      className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
                                      title="Copiar cita con autor y título"
                                    >
                                      {copiedQuoteIndex === idx ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    {!readOnly && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteQuote(idx)}
                                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                                        title="Eliminar cita"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 mt-auto border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleTurnToSynopsis}
                          title="Volver a la sinopsis (←)"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] hover:bg-[#ebdcc0] dark:bg-[#1A2232] text-xs font-semibold text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Volver a Sinopsis</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleTurnToDetails}
                          title="Volver a la ficha técnica"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] hover:bg-[#ebdcc0] dark:bg-[#1A2232] text-xs font-semibold text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
                        >
                          <span>Ficha técnica</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                        <div className="py-2 space-y-3.5">
                          {isCurrentSynopsisEnglish && (
                            <div className="p-3 sm:p-3.5 rounded-xl border border-amber-600/35 bg-amber-500/15 flex items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-2 min-w-0 text-amber-950 dark:text-amber-200">
                                <Languages className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
                                <span className="font-medium truncate">
                                  Sinopsis en inglés detectada. ¿Deseas traducirla al español?
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleTranslateCurrentSynopsis}
                                disabled={isTranslatingSynopsis}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shrink-0 active:scale-95 transition shadow-xs disabled:opacity-50"
                              >
                                {isTranslatingSynopsis ? 'Traduciendo...' : 'Traducir al español'}
                              </button>
                            </div>
                          )}
                          <p className="font-serif text-[15px] sm:text-base leading-relaxed text-stone-800 dark:text-slate-200 whitespace-pre-line tracking-normal first-letter:float-left first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-amber-800 dark:first-letter:text-amber-400 first-letter:mr-3 first-letter:leading-none">
                            {currentSynopsis}
                          </p>
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-900/15 dark:border-[#232D42]">
                            <button
                              type="button"
                              onClick={handleAutoFetchSynopsis}
                              disabled={isFetchingSynopsis}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-amber-900 dark:hover:text-amber-300 transition"
                              title="Volver a buscar sinopsis en registros abiertos"
                            >
                              {isFetchingSynopsis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              <span>{isFetchingSynopsis ? 'Actualizando...' : 'Actualizar sinopsis'}</span>
                            </button>
                          </div>
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
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#f4ead4] hover:bg-[#ebdcc0] dark:bg-[#1A2232] dark:hover:bg-[#222C3F] text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer text-xs font-semibold"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Ficha técnica</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleTurnToNotes}
                          title="Ir al Diario & Citas (→)"
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-600/35 bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-950 dark:text-amber-200 transition shadow-sm cursor-pointer"
                        >
                          <span>Diario & Citas (fol. IV)</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
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

      {isShareCardOpen && book && (
        <ShareBookCardModal
          isOpen={isShareCardOpen}
          onClose={() => setIsShareCardOpen(false)}
          book={book}
          initialQuote={selectedQuoteForCard}
          readerDisplayName={readerName}
          onShowToast={onShowToast}
        />
      )}
    </>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
