import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';
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
  Share2,
  RotateCcw
} from 'lucide-react';
import '../book-detail.css';
import { Book, StarRating, CustomCollection } from '../types/models';
import { collectionService } from '../services/collectionService';
import { AddToCollectionModal } from './AddToCollectionModal';
import { BookCover } from './BookCover';
import { formatStars, ReadingStatus, STAR_OPTIONS } from '../constants/catalogs';
import { StarRatingInteractive, StarRatingDisplay } from './StarRatingInteractive';
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
import { BookDetailReadingProgress } from './book-detail/BookDetailReadingProgress';

export interface BookDetailModalProps {
  book: Book | null;
  onClose: () => void;
  onEdit?: (book: Book) => void;
  onDelete?: (book: Book) => void;
  onStatusChange?: (bookId: string, status: ReadingStatus) => void;
  onRatingChange?: (bookId: string, rating: StarRating) => void;
  onDatesChange?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
  onUpdateProgress?: (bookId: string, paginaActual: number, totalPaginas?: number) => Promise<void>;
  onStartReadingSession?: (book: Book) => void;
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

import {
  type BookFlipValues,
  getBookFlipValues,
  computeBookFlipVars,
  applyBookFlipVarsToElement,
} from './book-detail/flipAnimation';
import { BookDetailColophon } from './book-detail/BookDetailColophon';
import { BookDetailReadingRecord } from './book-detail/BookDetailReadingRecord';
import { BookDetailMetricsGrid } from './book-detail/BookDetailMetricsGrid';
import { BookDetailSynopsisView } from './book-detail/BookDetailSynopsisView';
import { BookDetailNotesView } from './book-detail/BookDetailNotesView';

export type { BookFlipValues };
export { getBookFlipValues, computeBookFlipVars, applyBookFlipVarsToElement };

const FORMAT_LABELS: Record<string, string> = {
  fisico: '📖 Físico',
  digital: '📱 Digital / ePub',
  audiolibro: '🎧 Audiolibro'
};

const OWNERSHIP_LABELS: Record<string, string> = {
  propio: '🏛️ En mi estantería',
  prestado: '🤝 Prestado',
  biblioteca: '🔖 Biblioteca pública',
  deseo: '✨ Lista de deseos'
};

export type BookModalTab = 'details' | 'synopsis' | 'notes';

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onRatingChange,
  onDatesChange,
  onUpdateProgress,
  onStartReadingSession,
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
  const [localNotes, setLocalNotes] = useState(book?.resena || book?.notasPersonales || '');
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
    setLocalNotes(book?.resena || book?.notasPersonales || '');
    setLocalQuotes(book?.citas || []);
    setNewQuoteText('');
    setNewQuotePage('');
    setNotesSavedSuccess(false);
  }, [book?.id, book?.notasPersonales, book?.resena, book?.citas]);

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

  const focusTrapRef = useFocusTrap({ isOpen: Boolean(book), onClose: handleRequestClose });

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

  const handleStartReread = useCallback(async () => {
    if (!book) return;
    const prevHistory = book.historialLecturas || [];
    const newEntry = {
      fechaInicio: book.fechaInicio || '',
      fechaFin: book.fechaFin || getTodayLocalDateString(),
      puntuacion: book.puntuacion ?? null
    };
    const nextHistory = [...prevHistory, newEntry];
    const nextVeces = (book.vecesLeido || 1) + 1;
    const today = getTodayLocalDateString();

    await updateBookPartialRecord(book.id, {
      historialLecturas: nextHistory,
      vecesLeido: nextVeces,
      paginaActual: 0,
      fechaInicio: today,
      fechaFin: '',
      progreso: '⏳ Leyendo'
    });

    soundService.playPageTurn(true);
    onShowToast?.(
      `🔄 ¡Relectura iniciada! (${nextVeces}ª lectura). ¡Feliz reencuentro con esta obra!`,
      'success'
    );
  }, [book, onShowToast]);

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

        <div ref={focusTrapRef} className="open-book-stage relative w-full max-w-5xl md:my-auto"
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
                  <BookDetailSynopsisView
                    book={book}
                    currentSynopsis={currentSynopsis}
                    isCurrentSynopsisEnglish={isCurrentSynopsisEnglish}
                    isTranslatingSynopsis={isTranslatingSynopsis}
                    isFetchingSynopsis={isFetchingSynopsis}
                    onTranslateCurrentSynopsis={handleTranslateCurrentSynopsis}
                    onAutoFetchSynopsis={handleAutoFetchSynopsis}
                    onTurnToDetails={handleTurnToDetails}
                    onTurnToNotes={handleTurnToNotes}
                    onEdit={onEdit}
                    readOnly={readOnly}
                    variant="mobile"
                  />
                ) : activeTab === 'notes' ? (
                  <BookDetailNotesView
                    book={book}
                    localNotes={localNotes}
                    setLocalNotes={setLocalNotes}
                    localQuotes={localQuotes}
                    isSavingNotes={isSavingNotes}
                    notesSavedSuccess={notesSavedSuccess}
                    onSaveNotes={handleSaveNotes}
                    newQuoteText={newQuoteText}
                    setNewQuoteText={setNewQuoteText}
                    newQuotePage={newQuotePage}
                    setNewQuotePage={setNewQuotePage}
                    onAddQuote={handleAddQuote}
                    onDeleteQuote={handleDeleteQuote}
                    onCopyQuote={handleCopyQuote}
                    copiedQuoteIndex={copiedQuoteIndex}
                    onShareQuote={(quote) => {
                      setSelectedQuoteForCard(quote);
                      setIsShareCardOpen(true);
                    }}
                    onTurnToSynopsis={handleTurnToSynopsis}
                    onTurnToDetails={handleTurnToDetails}
                    readOnly={readOnly}
                    variant="mobile"
                  />
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
                        <span className="text-[11px] text-stone-600 dark:text-slate-400 italic">
                          Sin género
                        </span>
                      )}
                      {book.formato && (
                        <span className="rounded-md bg-[#efe3c8] dark:bg-[#1B2333] border border-amber-900/15 dark:border-[#283246] px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:text-slate-300">
                          {FORMAT_LABELS[book.formato] || book.formato}
                        </span>
                      )}
                      {book.propiedad && (
                        <span className="rounded-md bg-[#efe3c8] dark:bg-[#1B2333] border border-amber-900/15 dark:border-[#283246] px-2 py-0.5 text-[11px] font-medium text-stone-700 dark:text-slate-300">
                          {OWNERSHIP_LABELS[book.propiedad] || book.propiedad}
                        </span>
                      )}
                      {book.vecesLeido && book.vecesLeido > 1 && (
                        <span className="rounded-md bg-amber-500/15 border border-amber-600/35 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                          🔄 Leído {book.vecesLeido} veces
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
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-bold">
                            {book.puntuacion ? (
                              <>
                                <StarRatingDisplay value={book.puntuacion} size="xs" />
                                <span>({book.puntuacion.toFixed(1)}/5)</span>
                              </>
                            ) : (
                              'Sin valorar'
                            )}
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
                        {typeof book.paginaActual === 'number' && book.paginas && book.paginas > 0 && (book.progreso === '⏳ Leyendo' || book.progreso === '⏸️ Pausado') && (
                          <div className="pt-2 border-t border-amber-900/15 dark:border-[#232D42] space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-slate-400 font-mono">
                              <span>Progreso en lectura</span>
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                Pág. {book.paginaActual} / {book.paginas} ({Math.min(100, Math.round((book.paginaActual / book.paginas) * 100))}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-amber-950/10 dark:bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.round((book.paginaActual / book.paginas) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
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
                      <div className="flex items-center justify-between">
                        <StarRatingInteractive
                          value={book.puntuacion}
                          onChange={(rating) => onRatingChange?.(book.id, rating)}
                          size="md"
                          showScoreText={true}
                          allowClear={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Control de Progreso de lectura interactivo en móvil */}
                {!readOnly && (book.progreso === '⏳ Leyendo' || (book.paginaActual && book.paginaActual > 0)) && (
                  <BookDetailReadingProgress
                    book={book}
                    onUpdateProgress={onUpdateProgress}
                    onStartReadingSession={onStartReadingSession}
                    variant="mobile"
                  />
                )}

                {/* Botón Iniciar relectura si el libro ya está marcado como Leído */}
                {!readOnly && book.progreso === '✅ Leído' && (
                  <button
                    type="button"
                    onClick={handleStartReread}
                    className="w-full py-2.5 px-3.5 rounded-xl border border-amber-600/40 bg-gradient-to-r from-amber-500/15 via-[#f5ead4] to-amber-500/20 dark:from-amber-500/10 dark:via-[#192231] dark:to-amber-500/15 hover:border-amber-600 text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                    <span>Iniciar nueva relectura {book.vecesLeido && book.vecesLeido > 1 ? `(${book.vecesLeido + 1}ª)` : '(2ª)'}</span>
                  </button>
                )}

                {/* Historial de lecturas previas */}
                {book.historialLecturas && book.historialLecturas.length > 0 && (
                  <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#fbf6ea]/70 dark:bg-[#101520]/80 p-3 space-y-1.5">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-slate-400">
                      Historial de lecturas registradas ({book.historialLecturas.length})
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {book.historialLecturas.map((h, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-amber-500/10 border border-amber-900/10 dark:border-[#222B3C] text-stone-700 dark:text-slate-300 font-serif"
                        >
                          <span>Lectura #{idx + 1}: {h.fechaInicio || '—'} a {h.fechaFin || '—'}</span>
                          {h.puntuacion && (
                            <span className="text-amber-800 dark:text-amber-300 font-sans font-bold">
                              {h.puntuacion} ★
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registro de Lectura (Fechas y Lectura Virtual) */}
                <BookDetailReadingRecord
                  book={book}
                  onDatesChange={onDatesChange}
                  readOnly={readOnly}
                  variant="mobile"
                />

                {/* Ficha métrica compacta protagonista (Año · Páginas · Tiempo de lectura) y Colofón */}
                <div className="rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#f4ead4]/50 dark:bg-[#101520]/60 p-3.5 text-xs space-y-2.5">
                  <BookDetailMetricsGrid
                    book={book}
                    computedReadingTime={computedReadingTime}
                    variant="mobile"
                  />
                  <BookDetailColophon items={colophonItems} variant="mobile" />
                </div>

                {/* Botón sutil para pasar página a la Sinopsis en móvil */}
                <button
                  type="button"
                  onClick={handleTurnToSynopsis}
                  className="w-full py-2.5 px-3.5 rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-center justify-between shadow-2xs transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span className="font-serif font-bold truncate">Pasar a la Sinopsis (fol. III)</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-300 shrink-0">
                    <span>Pasar página</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
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

                        {/* Bloque inferior fijado abajo (Puntuación y Registro de Lectura Unificados) */}
                        <div className="w-full mt-auto shrink-0 pt-2">
                          {!readOnly ? (
                            <div className="w-full rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#f5ebd7]/75 dark:bg-[#101520]/80 p-2.5 sm:p-3 text-center shadow-xs shrink-0 space-y-2">
                              {/* Puntuación Personal */}
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-serif italic text-xs font-semibold text-amber-950/80 dark:text-amber-300/80 mb-1">
                                  Puntuación Personal
                                </span>
                                <StarRatingInteractive
                                  value={book.puntuacion}
                                  onChange={(rating) => onRatingChange?.(book.id, rating)}
                                  size="md"
                                  showScoreText={true}
                                  allowClear={true}
                                />
                              </div>

                              {/* Divisor sutil */}
                              <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-900/15 dark:via-amber-400/15 to-transparent" />

                              {/* Sello / Ficha de Registro de Lectura (Fechas y Lectura Virtual) */}
                              <BookDetailReadingRecord
                                book={book}
                                onDatesChange={onDatesChange}
                                readOnly={readOnly}
                                variant="desktop"
                                embedded={true}
                              />
                            </div>
                          ) : (
                            <>
                              {readerName ? (
                                <div className="w-full rounded-2xl border border-amber-900/20 dark:border-[#242E42] bg-[#f5ebd7]/75 dark:bg-[#101520]/80 p-2.5 sm:p-3 text-center shadow-xs shrink-0 space-y-2">
                                  <div>
                                    <p className="font-serif italic text-xs font-semibold text-amber-950/80 dark:text-amber-300/80 mb-0.5">
                                      Valoración de {readerName}
                                    </p>
                                    <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm text-amber-700 dark:text-amber-400 font-bold">
                                      {book.puntuacion ? (
                                        <>
                                          <StarRatingDisplay value={book.puntuacion} size="sm" />
                                          <span>({book.puntuacion.toFixed(1)}/5)</span>
                                        </>
                                      ) : (
                                        'Sin valorar'
                                      )}
                                    </div>
                                  </div>

                                  <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-900/15 dark:via-amber-400/15 to-transparent" />

                                  <div className="flex items-center justify-between text-xs px-1">
                                    <span className="text-[10px] uppercase font-semibold text-stone-500 dark:text-slate-400">
                                      Estado en su estantería
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-amber-600/35 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-950 dark:text-amber-200">
                                      {book.progreso}
                                    </span>
                                  </div>
                                </div>
                              ) : null}
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
                          <span className="text-xs text-stone-600 dark:text-slate-400 italic">
                            Sin género asignado
                          </span>
                        )}
                        {book.formato && (
                          <span className="rounded-full bg-[#efe3c8] dark:bg-[#1B2333] border border-amber-900/15 dark:border-[#283246] px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-slate-300">
                            {FORMAT_LABELS[book.formato] || book.formato}
                          </span>
                        )}
                        {book.propiedad && (
                          <span className="rounded-full bg-[#efe3c8] dark:bg-[#1B2333] border border-amber-900/15 dark:border-[#283246] px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-slate-300">
                            {OWNERSHIP_LABELS[book.propiedad] || book.propiedad}
                          </span>
                        )}
                        {book.vecesLeido && book.vecesLeido > 1 && (
                          <span className="rounded-full bg-amber-500/15 border border-amber-600/35 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
                            🔄 Leído {book.vecesLeido} veces
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

                      {/* Control de Progreso de lectura interactivo en desktop */}
                      {!readOnly && (book.progreso === '⏳ Leyendo' || (book.paginaActual && book.paginaActual > 0)) && (
                        <BookDetailReadingProgress
                          book={book}
                          onUpdateProgress={onUpdateProgress}
                          onStartReadingSession={onStartReadingSession}
                          variant="desktop"
                        />
                      )}

                      {/* Botón Iniciar relectura si el libro ya está marcado como Leído */}
                      {!readOnly && book.progreso === '✅ Leído' && (
                        <button
                          type="button"
                          onClick={handleStartReread}
                          className="w-full py-2 px-3 rounded-xl border border-amber-600/40 bg-gradient-to-r from-amber-500/15 via-[#f5ead4] to-amber-500/20 dark:from-amber-500/10 dark:via-[#192231] dark:to-amber-500/15 hover:border-amber-600 text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                          <span>Iniciar nueva relectura {book.vecesLeido && book.vecesLeido > 1 ? `(${book.vecesLeido + 1}ª)` : '(2ª)'}</span>
                        </button>
                      )}

                      {/* Historial de lecturas previas registradas */}
                      {book.historialLecturas && book.historialLecturas.length > 0 && (
                        <div className="rounded-xl border border-amber-900/15 dark:border-[#242E42] bg-[#fbf6ea]/70 dark:bg-[#101520]/80 p-2.5 space-y-1">
                          <span className="block text-[10px] uppercase tracking-wider font-semibold text-stone-500 dark:text-slate-400">
                            Historial de lecturas ({book.historialLecturas.length})
                          </span>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {book.historialLecturas.map((h, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-[11px] py-0.5 px-2 rounded-lg bg-amber-500/10 border border-amber-900/10 dark:border-[#222B3C] text-stone-700 dark:text-slate-300 font-serif"
                              >
                                <span>Lectura #{idx + 1}: {h.fechaInicio || '—'} a {h.fechaFin || '—'}</span>
                                {h.puntuacion && (
                                  <span className="text-amber-800 dark:text-amber-300 font-sans font-bold">
                                    {h.puntuacion} ★
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fila principal con las 3 métricas protagonistas: Año, Páginas y Tiempo de lectura */}
                      <BookDetailMetricsGrid
                        book={book}
                        computedReadingTime={computedReadingTime}
                        variant="desktop"
                      />

                      {/* Colofón bibliográfico sutil: Editorial · Idioma · ISBN */}
                      <BookDetailColophon items={colophonItems} variant="desktop" />

                      {/* Barra de navegación de página sutil (sustituye a los dos bloques gigantes) */}
                      <div className="pt-3 sm:pt-4 mt-auto border-t border-amber-900/15 dark:border-[#242E42] flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-serif italic text-stone-500 dark:text-slate-400">
                          <BookOpen className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                          <span>fol. II · Ficha de Catálogo</span>
                        </div>

                        <button
                          type="button"
                          onClick={handleTurnToSynopsis}
                          className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-600/35 dark:border-amber-500/35 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer"
                          title="Pasar página a la Sinopsis de la obra (fol. III)"
                        >
                          <span>Pasar a Sinopsis</span>
                          <ChevronRight className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ) : activeTab === 'notes' ? (
                    <BookDetailNotesView
                      book={book}
                      localNotes={localNotes}
                      setLocalNotes={setLocalNotes}
                      localQuotes={localQuotes}
                      isSavingNotes={isSavingNotes}
                      notesSavedSuccess={notesSavedSuccess}
                      onSaveNotes={handleSaveNotes}
                      newQuoteText={newQuoteText}
                      setNewQuoteText={setNewQuoteText}
                      newQuotePage={newQuotePage}
                      setNewQuotePage={setNewQuotePage}
                      onAddQuote={handleAddQuote}
                      onDeleteQuote={handleDeleteQuote}
                      onCopyQuote={handleCopyQuote}
                      copiedQuoteIndex={copiedQuoteIndex}
                      onShareQuote={(quote) => {
                        setSelectedQuoteForCard(quote);
                        setIsShareCardOpen(true);
                      }}
                      onTurnToSynopsis={handleTurnToSynopsis}
                      onTurnToDetails={handleTurnToDetails}
                      readOnly={readOnly}
                      variant="desktop"
                    />
                  ) : (
                    <BookDetailSynopsisView
                      book={book}
                      currentSynopsis={currentSynopsis}
                      isCurrentSynopsisEnglish={isCurrentSynopsisEnglish}
                      isTranslatingSynopsis={isTranslatingSynopsis}
                      isFetchingSynopsis={isFetchingSynopsis}
                      onTranslateCurrentSynopsis={handleTranslateCurrentSynopsis}
                      onAutoFetchSynopsis={handleAutoFetchSynopsis}
                      onTurnToDetails={handleTurnToDetails}
                      onTurnToNotes={handleTurnToNotes}
                      onEdit={onEdit}
                      readOnly={readOnly}
                      variant="desktop"
                    />
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
