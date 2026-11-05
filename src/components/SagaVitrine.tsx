import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Edit3, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { Book } from '../types/models';
import { BookCover, preloadBookCover } from './BookCover';
import type { SagaWithBooksItem } from './SagasScreen';
import {
  CoverTone,
  extractCoverTone,
  fallbackTone,
  getCachedCoverTone,
  hashString,
  pickCoverSource
} from '../utils/coverTone';
import '../book-shelf.css';
import '../dashboard-panels.css';
import '../saga-vitrine.css';

/* Geometría compartida con saga-vitrine.css: si cambias una, cambia la otra. */
export const VITRINE_CLOSED_H = 132;
const COVER_W = 104;
const GAP_X = 18;
const PAD_X = 20;
const PAD_TOP = 22;
const ROW_H = 208;
const SPINE_W = [27, 24, 30, 26, 29, 25, 31];
const SPINE_H = [100, 104, 98, 106, 102, 99, 105];
const MAX_SEGMENTS = 24;

const READ = '✅ Leído';
const READING = '⏳ Leyendo';
const PAUSED = '⏸️ Pausado';

type BookState = 'read' | 'reading' | 'paused' | 'pending';

const stateOf = (b: Book): BookState =>
  b.progreso === READ
    ? 'read'
    : b.progreso === READING
      ? 'reading'
      : b.progreso === PAUSED
        ? 'paused'
        : 'pending';

const STATE_META: Record<BookState, { label: string; icon: React.ElementType | null; cls: string }> = {
  read: { label: 'Leído', icon: Check, cls: 'is-read' },
  reading: { label: 'Leyendo', icon: Play, cls: 'is-reading' },
  paused: { label: 'Pausado', icon: Pause, cls: 'is-paused' },
  pending: { label: 'Pendiente', icon: null, cls: '' }
};

export const computeVitrineOpenHeight = (bodyWidth: number, bookCount: number): number => {
  if (bookCount === 0) return VITRINE_CLOSED_H;
  const inner = Math.max(100, bodyWidth - PAD_X * 2);
  const cols = Math.max(1, Math.floor((inner + GAP_X) / (COVER_W + GAP_X)));
  const rows = Math.max(1, Math.ceil(bookCount / cols));
  return PAD_TOP + rows * ROW_H - 6;
};

export interface SagaVitrineProps {
  item: SagaWithBooksItem;
  isOpen: boolean;
  onToggle: () => void;
  detailBookId: string | null;
  onOpenBookDetail: (id: string) => void;
  isAssignActive?: boolean;
  isEditing?: boolean;
  onAssignClick?: () => void;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  readOnly?: boolean;
  /** Formularios de asignar/editar que se despliegan bajo la barra superior */
  children?: React.ReactNode;
}

/** Tonos de lomo: arranca con la caché/tela estable y se refina con el color real de la portada. */
const useSpineTones = (books: Book[]) => {
  const initial = useMemo(() => {
    const map: Record<string, CoverTone> = {};
    books.forEach((b) => {
      const src = pickCoverSource(b);
      map[b.id] = (src && getCachedCoverTone(src)) || fallbackTone(b.nombre + b.autor);
    });
    return map;
  }, [books]);

  const [tones, setTones] = useState(initial);

  useEffect(() => {
    setTones(initial);
    let alive = true;
    books.forEach((b) => {
      const src = pickCoverSource(b);
      if (!src || getCachedCoverTone(src)) return;
      extractCoverTone(src).then((tone) => {
        if (alive && tone) setTones((prev) => ({ ...prev, [b.id]: tone }));
      });
    });
    return () => {
      alive = false;
    };
  }, [books, initial]);

  return tones;
};

const SagaVitrineComponent: React.FC<SagaVitrineProps> = ({
  item,
  isOpen,
  onToggle,
  detailBookId,
  onOpenBookDetail,
  isAssignActive = false,
  isEditing = false,
  onAssignClick,
  onEditClick,
  onDeleteClick,
  readOnly = false,
  children
}) => {
  const { saga, books, readCount, pendingCount, registeredCount, progressPercent } = item;
  const bodyId = `vitrine-body-${saga.id}`;
  const articleRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [coversMounted, setCoversMounted] = useState(isOpen);
  const preloaded = useRef(false);
  const tones = useSpineTones(books);

  useEffect(() => {
    if (isOpen) setCoversMounted(true);
  }, [isOpen]);

  // Ajusta la altura cuando no hay una transición FLIP de rejilla en curso
  useLayoutEffect(() => {
    const articleEl = articleRef.current;
    const bodyEl = bodyRef.current;
    if (!articleEl || !bodyEl) return;
    if (articleEl.hasAttribute('data-flip-active')) return;
    const targetH = isOpen
      ? computeVitrineOpenHeight(bodyEl.clientWidth, books.length)
      : VITRINE_CLOSED_H;
    bodyEl.style.height = `${targetH}px`;
  }, [isOpen, books.length]);

  // Recalcular altura abierta al redimensionar la ventana o contenedor
  useEffect(() => {
    const bodyEl = bodyRef.current;
    const articleEl = articleRef.current;
    if (!bodyEl || !articleEl) return;

    const ro = new ResizeObserver(() => {
      if (!isOpen || articleEl.hasAttribute('data-flip-active')) return;
      bodyEl.style.height = `${computeVitrineOpenHeight(bodyEl.clientWidth, books.length)}px`;
    });
    ro.observe(bodyEl);
    return () => ro.disconnect();
  }, [isOpen, books.length]);

  const warmUp = () => {
    if (preloaded.current) return;
    preloaded.current = true;
    books.forEach((b) => preloadBookCover(b));
  };

  const inProgressCount = books.filter((b) => {
    const s = stateOf(b);
    return s === 'reading' || s === 'paused';
  }).length;

  const summary =
    `${registeredCount} vol. · ${readCount} ${readCount === 1 ? 'leído' : 'leídos'} · ` +
    `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}`;

  const progressLabel =
    registeredCount > 0
      ? `${readCount} de ${registeredCount} volúmenes leídos` +
        (inProgressCount > 0 ? `, ${inProgressCount} en curso` : '')
      : 'Sin volúmenes registrados';

  const segmented = books.length > 0 && books.length <= MAX_SEGMENTS;
  const isComplete = registeredCount > 0 && readCount === registeredCount;

  return (
    <article
      ref={articleRef}
      data-vitrine-id={saga.id}
      data-book-count={books.length}
      className={'saga-vitrine' + (isOpen ? ' is-open' : '') + (isComplete ? ' is-complete' : '')}
      aria-labelledby={`vitrine-title-${saga.id}`}
      onPointerEnter={warmUp}
    >
      {/* Barra superior: placa, resumen y acciones */}
      <header className="vit-rail vit-rail-top">
        <h2
          id={`vitrine-title-${saga.id}`}
          className="vit-plate"
          title={saga.descripcion ? `${saga.nombre} — ${saga.descripcion}` : saga.nombre}
        >
          {saga.nombre}
        </h2>
        <p
          className="vit-summary"
          title={saga.descripcion ? `${summary} — ${saga.descripcion}` : summary}
        >
          {summary}
          {saga.descripcion && <span className="vit-summary-desc"> — {saga.descripcion}</span>}
        </p>
        <div className="vit-actions">
          {!readOnly && (
            <>
              {onAssignClick && (
                <button
                  type="button"
                  onClick={onAssignClick}
                  className={'vit-btn' + (isAssignActive ? ' is-active' : '')}
                  title={isAssignActive ? 'Cancelar asignación' : 'Asignar libro'}
                  aria-label={isAssignActive ? `Cancelar asignación en ${saga.nombre}` : `Asignar libro a ${saga.nombre}`}
                  aria-pressed={isAssignActive}
                >
                  {isAssignActive ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
              {onEditClick && (
                <button
                  type="button"
                  onClick={onEditClick}
                  className={'vit-btn' + (isEditing ? ' is-active' : '')}
                  title="Editar nombre o descripción"
                  aria-label={`Editar saga ${saga.nombre}`}
                  aria-pressed={isEditing}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              {onDeleteClick && (
                <button
                  type="button"
                  onClick={onDeleteClick}
                  className="vit-btn is-danger"
                  title="Eliminar saga"
                  aria-label={`Eliminar saga ${saga.nombre}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={onToggle}
            onFocus={warmUp}
            className="vit-btn vit-toggle"
            aria-expanded={isOpen}
            aria-controls={bodyId}
            aria-label={`${isOpen ? 'Cerrar' : 'Abrir'} vitrina de ${saga.nombre}`}
            title={isOpen ? 'Cerrar vitrina' : 'Abrir vitrina'}
          >
            <ChevronDown className="w-4 h-4 vit-toggle-icon" />
          </button>
        </div>
      </header>

      {children && <div className="vit-panel">{children}</div>}

      {/* Cuerpo: interior de la vitrina */}
      <div
        id={bodyId}
        ref={bodyRef}
        className="vit-body"
        style={{ height: `${VITRINE_CLOSED_H}px` }}
        onClick={!isOpen ? onToggle : undefined}
      >
        <div className="vit-layer vit-wood" aria-hidden="true" />
        <div className="vit-layer vit-shelves" aria-hidden="true" />
        <div className="vit-layer vit-plank" aria-hidden="true" />

        {books.length === 0 ? (
          <p className="vit-empty">Vitrina vacía · asigna el primer volumen con «+»</p>
        ) : (
          <ul className="vit-books" aria-hidden={!isOpen} aria-label={`Volúmenes de ${saga.nombre}`}>
            {books.map((book, i) => {
              const state = stateOf(book);
              const meta = STATE_META[state];
              const StateIcon = meta.icon;
              const h = hashString(book.id) >>> 0;
              const [base, deep] = tones[book.id] || fallbackTone(book.nombre);
              const volLabel = book.volumen ? `Vol. ${book.volumen}` : 'S/n';
              const rawW = SPINE_W[(h + i) % SPINE_W.length];
              const spineScale = books.length > 12 ? Math.max(0.55, 12 / books.length) : 1;
              const spineW = Math.round(rawW * spineScale);
              const spineH = SPINE_H[((h >>> 3) + i * 2) % SPINE_H.length];
              return (
                <li
                  key={book.id}
                  className="vit-book"
                  style={
                    {
                      '--i': i,
                      '--sw': `${spineW}px`,
                      '--sh': `${spineH}px`,
                      '--spine-a': base,
                      '--spine-b': deep
                    } as React.CSSProperties
                  }
                >
                  <button
                    type="button"
                    data-book-id={isOpen ? book.id : undefined}
                    className={'vit-book-btn' + (detailBookId === book.id ? ' is-extracted' : '')}
                    tabIndex={isOpen ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isOpen) onOpenBookDetail(book.id);
                    }}
                    onPointerEnter={() => preloadBookCover(book)}
                    aria-label={`${volLabel}: ${book.nombre}. ${meta.label}`}
                    title={`${book.nombre} · ${meta.label}`}
                  >
                    <span className="vit-face">
                      {/* Lomo (estado cerrado) */}
                      <span className="vit-spine" aria-hidden="true">
                        <i />
                        <i />
                        <em>{book.nombre}</em>
                        {state === 'read' && <u className="is-read" />}
                        {(state === 'reading' || state === 'paused') && <u className="is-progress" />}
                      </span>
                      {/* Portada (estado abierto) */}
                      <span className="vit-cover">
                        {coversMounted && (
                          <BookCover
                            nombre={book.nombre}
                            autor={book.autor}
                            portadaUrl={book.portadaUrl}
                            portadaFallbackUrl={book.portadaFallbackUrl}
                            portadaDataUrl={book.portadaDataUrl}
                            size="sm"
                            variant="book"
                          />
                        )}
                        <span className="dashboard-saga-chip vit-chip">{volLabel}</span>
                        {StateIcon && (
                          <span
                            className={`saga-seal vit-seal ${meta.cls}`}
                            role="img"
                            aria-label={`Estado: ${meta.label}`}
                            title={meta.label}
                          >
                            <StateIcon className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                            <span className="sr-only">{meta.label}</span>
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shelf-plate vit-book-plate" title={book.nombre}>
                      {book.nombre}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="vit-layer vit-shade" aria-hidden="true" />
        <div className="vit-door vit-door-l" aria-hidden="true" />
        <div className="vit-door vit-door-r" aria-hidden="true" />
        <span className="vit-hint" aria-hidden="true">
          Abrir vitrina
        </span>
      </div>

      {/* Barra inferior: un segmento por volumen */}
      <footer className="vit-rail vit-rail-bottom">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          aria-label={progressLabel}
          className={'vit-progress' + (segmented ? '' : ' is-continuous')}
        >
          {segmented ? (
            books.map((b, i) => {
              const s = stateOf(b);
              return (
                <span
                  key={b.id}
                  className={
                    'vit-seg' +
                    (s === 'read' ? ' is-read' : s === 'reading' || s === 'paused' ? ' is-half' : '')
                  }
                  style={{ '--i': i } as React.CSSProperties}
                  title={`${b.nombre} · ${STATE_META[s].label}`}
                />
              );
            })
          ) : (
            <span className="vit-fill" style={{ width: `${progressPercent}%` }} />
          )}
        </div>
        <span className="vit-percent">{progressPercent}%</span>
      </footer>
    </article>
  );
};

export const SagaVitrine = React.memo(SagaVitrineComponent);
