import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Book, Saga } from '../types/models';
import {
  SagaVitrine,
  VITRINE_CLOSED_H,
  computeVitrineOpenHeight
} from './SagaVitrine';
import { LibrarySelect } from './LibrarySelect';
import { formatFriendlyErrorMessage } from '../utils/errorUtils';

interface VitrineSnapshotItem {
  left: number;
  top: number;
  width: number;
  bodyHeight: number;
}

const FLIP_DURATION_MS = 720;
const FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface SagaWithBooksItem {
  saga: Saga;
  books: Book[];
  readCount: number;
  pendingCount: number;
  registeredCount: number;
  progressPercent: number;
}

type SagaFilter = 'all' | 'active' | 'new' | 'done';

const FILTERS: Array<{ id: SagaFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'En curso' },
  { id: 'new', label: 'Sin empezar' },
  { id: 'done', label: 'Completadas' }
];

const OPEN_STORAGE_KEY = 'nexus.sagas.openVitrines';

/** Clasificación para los filtros (no altera los datos de la saga). */
const categoryOf = (item: SagaWithBooksItem): Exclude<SagaFilter, 'all'> => {
  if (item.registeredCount > 0 && item.readCount === item.registeredCount) return 'done';
  const started =
    item.readCount > 0 ||
    item.books.some((b) => b.progreso === '⏳ Leyendo' || b.progreso === '⏸️ Pausado');
  return started ? 'active' : 'new';
};

const readOpenIds = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(OPEN_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

export interface SagasScreenProps {
  sagasWithBooks: SagaWithBooksItem[];
  books: Book[];
  detailBookId: string | null;
  onOpenBookDetail: (id: string) => void;
  onSaveSaga: (name: string, description: string, sagaId?: string) => Promise<unknown>;
  onDeleteSaga: (saga: Saga) => void;
  onAssignBookToSaga: (bookId: string, saga: Saga, volume: number | null) => Promise<unknown>;
  onError?: (msg: string) => void;
}

export const SagasScreen: React.FC<SagasScreenProps> = ({
  sagasWithBooks,
  books,
  detailBookId,
  onOpenBookDetail,
  onSaveSaga,
  onDeleteSaga,
  onAssignBookToSaga,
  onError
}) => {
  const [sagaFormOpen, setSagaFormOpen] = useState(false);
  const [editingSaga, setEditingSaga] = useState<Saga | null>(null);
  const [sagaNameInput, setSagaNameInput] = useState('');
  const [sagaDescInput, setSagaDescInput] = useState('');
  const [sagaError, setSagaError] = useState('');
  const [assignBookId, setAssignBookId] = useState<string>('');
  const [assignVolume, setAssignVolume] = useState<string>('1');
  const [activeSagaIdForAssign, setActiveSagaIdForAssign] = useState<string | null>(null);
  const [filter, setFilter] = useState<SagaFilter>('all');
  const [openIds, setOpenIds] = useState<Set<string>>(readOpenIds);
  const gridRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<Map<string, VitrineSnapshotItem> | null>(null);
  const flipCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipRafRef = useRef<number>(0);

  /**
   * Captura la geometría visual actual de todas las vitrinas antes de abrir/cerrar
   * para interpolar posición (FLIP), anchura y altura de forma continua sin parpadeos.
   */
  const captureGridSnapshot = useCallback(() => {
    const gridEl = gridRef.current;
    if (!gridEl || prefersReducedMotion()) {
      snapshotRef.current = null;
      return;
    }
    const map = new Map<string, VitrineSnapshotItem>();
    const cards = gridEl.querySelectorAll<HTMLElement>('[data-vitrine-id]');
    cards.forEach((cardEl) => {
      const id = cardEl.dataset.vitrineId;
      if (!id) return;
      const rect = cardEl.getBoundingClientRect();
      const bodyEl = cardEl.querySelector<HTMLElement>('.vit-body');
      const bodyHeight = bodyEl ? bodyEl.getBoundingClientRect().height : VITRINE_CLOSED_H;
      map.set(id, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        bodyHeight
      });
    });
    snapshotRef.current = map;
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify([...openIds]));
    } catch {
      /* sin almacenamiento de sesión */
    }
  }, [openIds]);

  // Animación FLIP sincronizada en toda la rejilla al abrir o cerrar vitrinas
  useLayoutEffect(() => {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    const gridEl = gridRef.current;
    if (!snapshot || !gridEl || prefersReducedMotion()) return;

    if (flipCleanupTimerRef.current) {
      clearTimeout(flipCleanupTimerRef.current);
      flipCleanupTimerRef.current = null;
    }
    if (flipRafRef.current) {
      cancelAnimationFrame(flipRafRef.current);
      flipRafRef.current = 0;
    }

    const cards = Array.from(gridEl.querySelectorAll<HTMLElement>('[data-vitrine-id]'));
    if (cards.length === 0) return;

    // 1. Limpiar estilos previos y fijar la altura destino de cada vitrina para medir el layout final real
    const targets = new Map<
      HTMLElement,
      { id: string; bodyEl: HTMLElement | null; targetBodyH: number }
    >();

    cards.forEach((cardEl) => {
      const id = cardEl.dataset.vitrineId || '';
      const bookCount = Number(cardEl.dataset.bookCount || '0');
      const isOpenNow = cardEl.classList.contains('is-open');
      const bodyEl = cardEl.querySelector<HTMLElement>('.vit-body');

      cardEl.setAttribute('data-flip-active', 'true');
      cardEl.style.transition = 'none';
      cardEl.style.width = '';
      cardEl.style.transform = '';
      cardEl.style.zIndex = '';

      // Al estar ya aplicado .is-open (o quitado), clientWidth es el ancho final de su celda
      const finalCardW = cardEl.clientWidth;
      const targetBodyH = isOpenNow
        ? computeVitrineOpenHeight(finalCardW, bookCount)
        : VITRINE_CLOSED_H;

      if (bodyEl) {
        bodyEl.style.transition = 'none';
        bodyEl.style.height = `${targetBodyH}px`;
      }

      targets.set(cardEl, { id, bodyEl, targetBodyH });
    });

    // 2. Medir las cajas finales (LAST) en una sola pasada de lectura
    const lastRects = new Map<HTMLElement, DOMRect>();
    cards.forEach((cardEl) => {
      lastRects.set(cardEl, cardEl.getBoundingClientRect());
    });

    // 3. INVERT: colocar cada vitrina en su posición, ancho y alto anteriores antes de pintar
    const animated: Array<{
      cardEl: HTMLElement;
      bodyEl: HTMLElement | null;
      lastWidth: number;
      targetBodyH: number;
      animateWidth: boolean;
      animateTransform: boolean;
      animateHeight: boolean;
    }> = [];

    cards.forEach((cardEl) => {
      const info = targets.get(cardEl);
      const last = lastRects.get(cardEl);
      if (!info || !last) return;
      const first = snapshot.get(info.id);
      if (!first) return;

      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const dw = Math.abs(first.width - last.width);
      const dh = Math.abs(first.bodyHeight - info.targetBodyH);

      const animateWidth = dw > 1.5;
      const animateTransform = Math.abs(dx) > 1 || Math.abs(dy) > 1;
      const animateHeight = Boolean(info.bodyEl && dh > 1.5);

      if (!animateWidth && !animateTransform && !animateHeight) {
        cardEl.removeAttribute('data-flip-active');
        return;
      }

      if (animateWidth) {
        cardEl.style.width = `${first.width}px`;
        cardEl.style.zIndex = '6';
      }
      if (animateTransform) {
        cardEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
      if (animateHeight && info.bodyEl) {
        info.bodyEl.style.height = `${first.bodyHeight}px`;
      }

      animated.push({
        cardEl,
        bodyEl: info.bodyEl,
        lastWidth: last.width,
        targetBodyH: info.targetBodyH,
        animateWidth,
        animateTransform,
        animateHeight
      });
    });

    if (animated.length === 0) return;

    // 4. Forzar reflujo único para comprometer el estado invertido
    void gridEl.offsetHeight;

    // 5. PLAY: interpolar suavemente hacia el tamaño y posición finales
    flipRafRef.current = requestAnimationFrame(() => {
      flipRafRef.current = 0;
      const dur = `${FLIP_DURATION_MS}ms`;
      animated.forEach(
        ({ cardEl, bodyEl, lastWidth, targetBodyH, animateWidth, animateTransform, animateHeight }) => {
          const cardTransitions: string[] = [];
          if (animateWidth) cardTransitions.push(`width ${dur} ${FLIP_EASING}`);
          if (animateTransform) cardTransitions.push(`transform ${dur} ${FLIP_EASING}`);
          if (cardTransitions.length > 0) {
            cardEl.style.transition = cardTransitions.join(', ');
          }
          if (animateWidth) {
            cardEl.style.width = `${lastWidth}px`;
          }
          if (animateTransform) {
            cardEl.style.transform = 'translate3d(0, 0, 0)';
          }
          if (animateHeight && bodyEl) {
            bodyEl.style.transition = `height ${dur} ${FLIP_EASING}`;
            bodyEl.style.height = `${targetBodyH}px`;
          }
        }
      );
    });

    // 6. Limpiar estilos temporales al concluir la transición (ya están en su posición final exacta)
    flipCleanupTimerRef.current = setTimeout(() => {
      flipCleanupTimerRef.current = null;
      cards.forEach((cardEl) => {
        cardEl.removeAttribute('data-flip-active');
        cardEl.style.transition = '';
        cardEl.style.width = '';
        cardEl.style.transform = '';
        cardEl.style.zIndex = '';
        const bodyEl = cardEl.querySelector<HTMLElement>('.vit-body');
        if (bodyEl) {
          bodyEl.style.transition = '';
        }
      });
    }, FLIP_DURATION_MS + 40);
  }, [openIds]);

  const categories = useMemo(() => {
    const map = new Map<string, Exclude<SagaFilter, 'all'>>();
    sagasWithBooks.forEach((item) => map.set(item.saga.id, categoryOf(item)));
    return map;
  }, [sagasWithBooks]);

  const filterCounts = useMemo(() => {
    const counts: Record<SagaFilter, number> = { all: sagasWithBooks.length, active: 0, new: 0, done: 0 };
    categories.forEach((c) => counts[c]++);
    return counts;
  }, [categories, sagasWithBooks.length]);

  const visibleSagas = useMemo(
    () =>
      filter === 'all'
        ? sagasWithBooks
        : sagasWithBooks.filter((item) => categories.get(item.saga.id) === filter),
    [sagasWithBooks, categories, filter]
  );

  const anyVisibleOpen = visibleSagas.some((item) => openIds.has(item.saga.id));

  const toggleVitrine = useCallback(
    (sagaId: string) => {
      captureGridSnapshot();
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(sagaId)) next.delete(sagaId);
        else next.add(sagaId);
        return next;
      });
    },
    [captureGridSnapshot]
  );

  const toggleAllVisible = () => {
    captureGridSnapshot();
    setOpenIds((prev) => {
      const next = new Set(prev);
      visibleSagas.forEach((item) => {
        if (anyVisibleOpen) next.delete(item.saga.id);
        else next.add(item.saga.id);
      });
      return next;
    });
  };

  const handleSaveSagaForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSagaError('');
    try {
      await onSaveSaga(sagaNameInput, sagaDescInput, editingSaga?.id);
      setSagaFormOpen(false);
      setEditingSaga(null);
      setSagaNameInput('');
      setSagaDescInput('');
    } catch (err: unknown) {
      setSagaError(
        formatFriendlyErrorMessage(err, 'No se pudo guardar la saga en este momento.')
      );
    }
  };

  const handleAssignBook = async (saga: Saga) => {
    if (!assignBookId) return;
    const volNum = assignVolume ? Number(assignVolume) : null;
    try {
      await onAssignBookToSaga(assignBookId, saga, volNum);
      setAssignBookId('');
      setAssignVolume('1');
      setActiveSagaIdForAssign(null);
      // Abrir la vitrina para mostrar el volumen recién colocado
      captureGridSnapshot();
      setOpenIds((prev) => (prev.has(saga.id) ? prev : new Set(prev).add(saga.id)));
    } catch (err: unknown) {
      onError?.(
        formatFriendlyErrorMessage(err, 'No se pudo vincular el libro a la saga.')
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/20 dark:border-[#242E42] pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Colección de Sagas</h1>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
            Volúmenes alineados por orden de lectura y progreso calculado sobre los
            volúmenes registrados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingSaga(null);
            setSagaNameInput('');
            setSagaDescInput('');
            setSagaError('');
            setSagaFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 text-xs shadow-md transition"
        >
          <Plus className="w-4 h-4" /> Nueva Saga
        </button>
      </div>

      {sagaFormOpen && !editingSaga && (
        <form
          onSubmit={handleSaveSagaForm}
          className="rounded-2xl border border-amber-600/40 dark:border-amber-500/40 bg-[#fbf6ea] dark:bg-[#141A26] p-5 space-y-4 shadow-md"
        >
          <h2 className="font-serif text-lg font-bold text-amber-800 dark:text-amber-300">
            Crear Nueva Saga
          </h2>
          {sagaError && <p className="text-xs text-rose-600 dark:text-rose-400">{sagaError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-saga-name" className="block text-xs font-semibold mb-1">
                Nombre único de la saga *
              </label>
              <input
                id="create-saga-name"
                type="text"
                required
                autoFocus
                value={sagaNameInput}
                onChange={(e) => setSagaNameInput(e.target.value)}
                placeholder="Ej. Nacidos de la Bruma (Mistborn)"
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label htmlFor="create-saga-desc" className="block text-xs font-semibold mb-1">
                Descripción opcional
              </label>
              <input
                id="create-saga-desc"
                type="text"
                value={sagaDescInput}
                onChange={(e) => setSagaDescInput(e.target.value)}
                placeholder="Ej. Era 1 y Era 2 del Cosmere"
                className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSagaFormOpen(false)}
              className="rounded-xl border border-amber-900/25 dark:border-slate-700 px-4 py-2 text-xs text-stone-700 dark:text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs"
            >
              Guardar Saga
            </button>
          </div>
        </form>
      )}

      {sagasWithBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-12 text-center">
          <p className="font-serif text-xl text-stone-600 dark:text-slate-300">
            Todavía no tienes sagas registradas.
          </p>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            Crea una saga con el botón superior o asígnala directamente al añadir un libro.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra de herramientas: filtros, contador y abrir/cerrar todas */}
          <div className="vit-toolbar" role="toolbar" aria-label="Filtrar sagas">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className="vit-filter"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                <span className="vit-filter-n">{filterCounts[f.id]}</span>
              </button>
            ))}
            <span className="vit-count" aria-live="polite">
              {visibleSagas.length} {visibleSagas.length === 1 ? 'saga' : 'sagas'}
            </span>
            <span className="vit-toolbar-spacer" />
            <button
              type="button"
              className="vit-filter"
              onClick={toggleAllVisible}
              disabled={visibleSagas.length === 0}
            >
              {anyVisibleOpen ? 'Cerrar todas' : 'Abrir todas'}
            </button>
          </div>

          {visibleSagas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-900/30 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-10 text-center">
              <p className="font-serif text-lg text-stone-600 dark:text-slate-300">
                Ninguna saga coincide con este filtro.
              </p>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-4"
              >
                Ver todas las sagas
              </button>
            </div>
          ) : (
            <div className="vit-grid" ref={gridRef}>
              {visibleSagas.map((item) => {
                const isAssignActive = activeSagaIdForAssign === item.saga.id;
                const isEditing = sagaFormOpen && editingSaga?.id === item.saga.id;
                return (
                  <SagaVitrine
                    key={item.saga.id}
                    item={item}
                    isOpen={openIds.has(item.saga.id)}
                    onToggle={() => toggleVitrine(item.saga.id)}
                    detailBookId={detailBookId}
                    onOpenBookDetail={onOpenBookDetail}
                    isAssignActive={isAssignActive}
                    isEditing={isEditing}
                    onAssignClick={() => {
                      if (isAssignActive) {
                        setActiveSagaIdForAssign(null);
                        setAssignBookId('');
                        setAssignVolume('1');
                      } else {
                        setActiveSagaIdForAssign(item.saga.id);
                        setAssignBookId('');
                        const maxVol = item.books.reduce(
                          (max, b) => (b.volumen && b.volumen > max ? b.volumen : max),
                          0
                        );
                        setAssignVolume(String(maxVol + 1));
                      }
                    }}
                    onEditClick={() => {
                      if (isEditing) {
                        setSagaFormOpen(false);
                        setEditingSaga(null);
                      } else {
                        setEditingSaga(item.saga);
                        setSagaNameInput(item.saga.nombre);
                        setSagaDescInput(item.saga.descripcion);
                        setSagaError('');
                        setSagaFormOpen(true);
                      }
                    }}
                    onDeleteClick={() => onDeleteSaga(item.saga)}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={handleSaveSagaForm}
                        className="rounded-xl border border-amber-600/40 dark:border-amber-500/40 bg-[#f4ead4] dark:bg-[#101520] p-4 space-y-3"
                      >
                        <h3 className="font-serif text-base font-bold text-amber-800 dark:text-amber-300">
                          Editar Saga
                        </h3>
                        {sagaError && <p className="text-xs text-rose-600 dark:text-rose-400">{sagaError}</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`edit-saga-name-${item.saga.id}`} className="block text-xs font-semibold mb-1">
                              Nombre de la saga *
                            </label>
                            <input
                              id={`edit-saga-name-${item.saga.id}`}
                              type="text"
                              required
                              autoFocus
                              value={sagaNameInput}
                              onChange={(e) => setSagaNameInput(e.target.value)}
                              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                            />
                          </div>
                          <div>
                            <label htmlFor={`edit-saga-desc-${item.saga.id}`} className="block text-xs font-semibold mb-1">
                              Descripción opcional
                            </label>
                            <input
                              id={`edit-saga-desc-${item.saga.id}`}
                              type="text"
                              value={sagaDescInput}
                              onChange={(e) => setSagaDescInput(e.target.value)}
                              className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-3 py-2 text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSagaFormOpen(false);
                              setEditingSaga(null);
                            }}
                            className="rounded-lg border border-amber-900/25 dark:border-slate-700 px-3 py-1.5 text-xs text-stone-700 dark:text-slate-300"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 text-xs"
                          >
                            Guardar cambios
                          </button>
                        </div>
                      </form>
                    ) : isAssignActive ? (
                      <div className="flex flex-wrap items-end gap-2.5 rounded-xl border border-amber-600/30 dark:border-amber-500/30 bg-[#f4ead4] dark:bg-[#101520] p-3.5">
                        <div className="flex-1 min-w-[200px]">
                          <label htmlFor={`assign-book-select-${item.saga.id}`} className="block text-[11px] font-semibold text-stone-700 dark:text-slate-300 mb-1">
                            Libro de tu biblioteca
                          </label>
                          <LibrarySelect
                            id={`assign-book-select-${item.saga.id}`}
                            value={assignBookId}
                            onChange={(val) => setAssignBookId(val)}
                            placeholder="— Selecciona un libro —"
                            searchable={true}
                            searchPlaceholder="Buscar por título o autor..."
                            options={[
                              { value: '', label: '— Selecciona un libro —' },
                              ...books
                                .filter((b) => b.sagaId !== item.saga.id)
                                .map((b) => ({
                                  value: b.id,
                                  label: b.nombre,
                                  hint: b.autor || 'Sin autor'
                                }))
                            ]}
                          />
                        </div>
                        <div className="w-24 sm:w-28">
                          <label htmlFor={`assign-volume-input-${item.saga.id}`} className="block text-[11px] font-semibold text-stone-700 dark:text-slate-300 mb-1">
                            Volumen #
                          </label>
                          <input
                            id={`assign-volume-input-${item.saga.id}`}
                            type="number"
                            min="1"
                            value={assignVolume}
                            onChange={(e) => setAssignVolume(e.target.value)}
                            className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] px-2.5 py-1.5 text-xs text-stone-900 dark:text-slate-100 focus:outline-none focus:border-amber-600 dark:focus:border-amber-400"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSagaIdForAssign(null);
                              setAssignBookId('');
                              setAssignVolume('1');
                            }}
                            className="rounded-lg border border-amber-900/25 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800 transition"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={!assignBookId}
                            onClick={() => handleAssignBook(item.saga)}
                            className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold px-3.5 py-1.5 text-xs transition shadow-sm"
                          >
                            Vincular
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </SagaVitrine>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
