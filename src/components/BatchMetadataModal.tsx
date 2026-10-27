import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  StopCircle
} from 'lucide-react';
import { Book, Saga } from '../types/models';
import { bookMetadataService } from '../services/bookMetadataService';
import { updateBookPartialRecord } from '../db/database';
import { BookCover } from './BookCover';

export type BatchMetadataMode = 'covers' | 'synopsis';

export interface BatchMetadataModalProps {
  isOpen: boolean;
  mode: BatchMetadataMode;
  books: Book[];
  sagas?: Saga[];
  onClose: () => void;
  onCompleted?: (updatedCount: number, totalProcessed: number) => void;
  onNavigateToLibrary?: () => void;
}

export const BatchMetadataModal: React.FC<BatchMetadataModalProps> = ({
  isOpen,
  mode,
  books,
  sagas = [],
  onClose,
  onCompleted,
  onNavigateToLibrary
}) => {
  const [filterMode, setFilterMode] = useState<'missing_only' | 'all'>('missing_only');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Estado del proceso
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    currentBookTitle: string;
  }>({ current: 0, total: 0, currentBookTitle: '' });
  const [results, setResults] = useState<{
    updated: number;
    failed: number;
    total: number;
  }>({ updated: 0, failed: 0, total: 0 });

  const cancelRef = useRef(false);

  // Mapa de sagas para visualización
  const sagasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sagas) {
      map.set(s.id, s.nombre);
    }
    return map;
  }, [sagas]);

  // Libros candidatos por criterio faltante
  const isCandidateMissing = useMemo(() => {
    return (book: Book) => {
      if (mode === 'covers') {
        return !book.portadaUrl && !book.portadaDataUrl;
      }
      return !book.sinopsis || book.sinopsis.trim().length === 0;
    };
  }, [mode]);

  const missingBooksCount = useMemo(() => {
    return books.filter(isCandidateMissing).length;
  }, [books, isCandidateMissing]);

  // Al abrir el modal o cambiar de modo, preseleccionar por defecto todos los que faltan
  useEffect(() => {
    if (!isOpen) {
      setStatus('idle');
      setSearchQuery('');
      setFilterMode('missing_only');
      cancelRef.current = false;
      return;
    }

    const missingIds = new Set(
      books.filter(isCandidateMissing).map((b) => b.id)
    );
    setSelectedIds(missingIds);
    setFilterMode(missingIds.size > 0 ? 'missing_only' : 'all');
  }, [isOpen, mode, books, isCandidateMissing]);

  // Bloqueo del scroll del body mientras el modal está abierto
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Filtrado de libros visibles
  const visibleBooks = useMemo(() => {
    let list = books;
    if (filterMode === 'missing_only') {
      list = list.filter(isCandidateMissing);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((b) => {
        const title = (b.nombre || '').toLowerCase();
        const author = (b.autor || '').toLowerCase();
        const isbn = (b.isbn || '').toLowerCase();
        const saga = b.sagaId ? (sagasMap.get(b.sagaId) || '').toLowerCase() : '';
        return (
          title.includes(query) ||
          author.includes(query) ||
          isbn.includes(query) ||
          saga.includes(query)
        );
      });
    }

    return list;
  }, [books, filterMode, searchQuery, isCandidateMissing, sagasMap]);

  // Conmutador de selección individual
  const toggleBookSelection = (id: string) => {
    if (status === 'processing') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Conmutador de selección masiva (Marcar/Desmarcar visibles)
  const areAllVisibleSelected = useMemo(() => {
    if (visibleBooks.length === 0) return false;
    return visibleBooks.every((b) => selectedIds.has(b.id));
  }, [visibleBooks, selectedIds]);

  const handleToggleSelectAll = () => {
    if (status === 'processing') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (areAllVisibleSelected) {
        // Desmarcar visibles
        for (const b of visibleBooks) {
          next.delete(b.id);
        }
      } else {
        // Marcar todos los visibles
        for (const b of visibleBooks) {
          next.add(b.id);
        }
      }
      return next;
    });
  };

  // Ejecución de la búsqueda masiva
  const handleStartBatchProcess = async () => {
    if (selectedIds.size === 0 || status === 'processing') return;

    const booksToProcess = books.filter((b) => selectedIds.has(b.id));
    if (booksToProcess.length === 0) return;

    cancelRef.current = false;
    setStatus('processing');
    setProgress({
      current: 0,
      total: booksToProcess.length,
      currentBookTitle: booksToProcess[0]?.nombre || ''
    });

    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < booksToProcess.length; i++) {
      if (cancelRef.current) break;

      const book = booksToProcess[i];
      setProgress({
        current: i + 1,
        total: booksToProcess.length,
        currentBookTitle: book.nombre
      });

      try {
        const match = await bookMetadataService.findBestMatchForBook({
          nombre: book.nombre,
          autor: book.autor,
          isbn: book.isbn
        });

        if (mode === 'covers') {
          if (match) {
            const hasNewCover = Boolean(match.portadaUrl || match.portadaFallbackUrl);
            if (hasNewCover) {
              await updateBookPartialRecord(book.id, {
                portadaUrl: match.portadaUrl || book.portadaUrl,
                portadaFallbackUrl: match.portadaFallbackUrl || book.portadaFallbackUrl,
                isbn: book.isbn || match.isbn,
                paginas: book.paginas ?? match.paginas,
                fechaPublicacion: book.fechaPublicacion ?? match.fechaPublicacion,
                editorial: book.editorial || match.editorial,
                idioma: book.idioma || match.idioma,
                sinopsis: book.sinopsis || match.sinopsis,
                genero: book.genero || match.suggestedGenre,
                subgeneros:
                  book.subgeneros.length > 0 ? book.subgeneros : match.suggestedSubgenres
              });
              updatedCount++;
            } else {
              failedCount++;
            }
          } else {
            failedCount++;
          }
        } else {
          // Mode 'synopsis'
          let newSynopsis = match?.sinopsis?.trim() || '';
          if (!newSynopsis) {
            newSynopsis = (
              await bookMetadataService.fetchSynopsisForBook({
                nombre: book.nombre,
                autor: book.autor,
                isbn: book.isbn
              })
            ).trim();
          }

          if (newSynopsis.length > 0) {
            await updateBookPartialRecord(book.id, {
              sinopsis: newSynopsis,
              portadaUrl: book.portadaUrl || match?.portadaUrl,
              portadaFallbackUrl: book.portadaFallbackUrl || match?.portadaFallbackUrl,
              isbn: book.isbn || match?.isbn,
              paginas: book.paginas ?? match?.paginas,
              fechaPublicacion: book.fechaPublicacion ?? match?.fechaPublicacion,
              editorial: book.editorial || match?.editorial,
              idioma: book.idioma || match?.idioma,
              genero: book.genero || match?.suggestedGenre,
              subgeneros:
                book.subgeneros.length > 0 ? book.subgeneros : (match?.suggestedSubgenres || [])
            });
            updatedCount++;
          } else {
            failedCount++;
          }
        }
      } catch {
        failedCount++;
      }

      // Pequeño retardo entre peticiones para cortesía con las APIs bibliográficas
      await new Promise((r) => setTimeout(r, 260));
    }

    const finalTotal = cancelRef.current ? progress.current : booksToProcess.length;
    setResults({
      updated: updatedCount,
      failed: failedCount,
      total: finalTotal
    });
    setStatus('done');

    if (onCompleted) {
      onCompleted(updatedCount, finalTotal);
    }
  };

  const handleCancelProcess = () => {
    cancelRef.current = true;
  };

  const handleRequestClose = () => {
    if (status === 'processing') {
      if (window.confirm('¿Deseas detener el proceso de búsqueda en curso?')) {
        cancelRef.current = true;
        onClose();
      }
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  const isCovers = mode === 'covers';
  const progressPercent =
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-metadata-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-2xl sm:rounded-3xl border border-amber-900/30 dark:border-[#2B3750] bg-[#faf3e3] dark:bg-[#111722] text-stone-900 dark:text-slate-100 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ────────── 1. CABECERA FIJA ────────── */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3.5 border-b border-amber-900/15 dark:border-[#222B3C] bg-[#f5ebd6]/90 dark:bg-[#141A26]/90 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/30 shrink-0 mt-0.5">
              {isCovers ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-semibold bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-600/30">
                  {isCovers ? 'Portadas de Libros' : 'Sinopsis & Argumentos'}
                </span>
                <span className="text-xs text-stone-500 dark:text-slate-400 font-serif italic">
                  {missingBooksCount} sin registrar
                </span>
              </div>
              <h2
                id="batch-metadata-title"
                className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-white mt-1 leading-snug"
              >
                {isCovers
                  ? 'Completar Portadas Faltantes'
                  : 'Completar Sinopsis Faltantes'}
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed line-clamp-2 mt-0.5">
                {isCovers
                  ? 'Marca los libros a los que deseas buscar y asignar portada automáticamente desde los catálogos públicos.'
                  : 'Marca los libros a los que deseas buscar y registrar su sinopsis y argumento bibliográfico.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Cerrar ventana"
            className="p-1.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#efe3c8] dark:bg-[#1B2333] hover:bg-amber-900/15 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ────────── 2. ESTADOS SEGÚN EL PROCESO ────────── */}
        {status === 'processing' ? (
          /* VISTA DE PROCESO EN TIEMPO REAL */
          <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-6 overflow-y-auto">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/35 flex items-center justify-center shadow-lg">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>

            <div className="space-y-1.5 max-w-md">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-400 font-semibold block">
                {isCovers ? 'Buscando portadas oficiales' : 'Buscando sinopsis de la obra'}
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white truncate px-2">
                {progress.currentBookTitle || 'Procesando catálogo...'}
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400">
                Libro {progress.current} de {progress.total} ({progressPercent}%)
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="w-full max-w-md space-y-2">
              <div className="w-full h-3 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden shadow-inner p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 italic block">
                Por favor, mantén esta ventana abierta mientras se completan las búsquedas
              </span>
            </div>

            <button
              type="button"
              onClick={handleCancelProcess}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 text-rose-800 dark:text-rose-300 text-xs font-semibold transition"
            >
              <StopCircle className="w-4 h-4" />
              <span>Detener proceso</span>
            </button>
          </div>
        ) : status === 'done' ? (
          /* VISTA DE RESUMEN FINALIZADO */
          <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-5 overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-600/35 flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-white">
                ¡Búsqueda y actualización completadas!
              </h3>
              <p className="text-sm text-stone-700 dark:text-slate-300 leading-relaxed">
                Se han actualizado con éxito{' '}
                <strong className="text-emerald-800 dark:text-emerald-400 font-bold">
                  {results.updated}
                </strong>{' '}
                de los{' '}
                <strong>{results.total}</strong> libros seleccionados.
              </p>
              {results.failed > 0 && (
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 italic">
                  ({results.failed} libros no contaban con {isCovers ? 'portada' : 'sinopsis'} disponible en los registros bibliográficos abiertos).
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="px-4 py-2.5 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#efe3c8] dark:bg-[#1B2333] hover:bg-[#e4d4b4] dark:hover:bg-[#222C3F] text-xs font-semibold text-stone-800 dark:text-slate-200 transition"
              >
                Volver a la lista
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateToLibrary) {
                    onNavigateToLibrary();
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md"
              >
                Cerrar y ver biblioteca
              </button>
            </div>
          </div>
        ) : (
          /* VISTA PRINCIPAL: SELECTOR DE LIBROS */
          <>
            {/* Controles de Búsqueda y Filtros Rápidos */}
            <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-amber-900/15 dark:border-[#222B3C] bg-[#f9f0dc]/70 dark:bg-[#121824]/70 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Buscador de libros */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por título, autor o saga..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl text-xs border border-amber-900/25 dark:border-slate-700 bg-[#fffcf5] dark:bg-[#0D1017] text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtro de pendientes vs todos */}
                <div className="flex items-center gap-1.5 shrink-0 bg-[#ede0c4]/80 dark:bg-[#0d121b] p-1 rounded-xl border border-amber-900/15 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterMode('missing_only')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      filterMode === 'missing_only'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-stone-700 dark:text-slate-400 hover:text-stone-950 dark:hover:text-white'
                    }`}
                  >
                    Solo faltantes ({missingBooksCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition ${
                      filterMode === 'all'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-stone-700 dark:text-slate-400 hover:text-stone-950 dark:hover:text-white'
                    }`}
                  >
                    Todos ({books.length})
                  </button>
                </div>
              </div>

              {/* Barra de acción rápida: Marcar/Desmarcar todos y contador */}
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300 hover:underline active:scale-95 transition"
                >
                  {areAllVisibleSelected ? (
                    <>
                      <Square className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Desmarcar visibles</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Marcar todos los visibles ({visibleBooks.length})</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] font-mono text-stone-600 dark:text-slate-400">
                  <strong className="text-amber-900 dark:text-amber-300 font-bold">
                    {selectedIds.size}
                  </strong>{' '}
                  seleccionados para procesar
                </span>
              </div>
            </div>

            {/* Lista Deslizable de Libros */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {visibleBooks.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-3 rounded-2xl border border-dashed border-amber-900/20 dark:border-slate-800 bg-[#f6ebd4]/40 dark:bg-[#0d121c]/50">
                  <AlertCircle className="w-8 h-8 text-amber-700/60 dark:text-amber-400/60 mx-auto" />
                  <p className="font-serif text-sm font-semibold text-stone-800 dark:text-slate-200">
                    {filterMode === 'missing_only'
                      ? isCovers
                        ? '¡Excelente! Todos los libros de tu biblioteca ya tienen portada asignada.'
                        : '¡Excelente! Todos los libros de tu biblioteca ya tienen sinopsis registrada.'
                      : 'No se encontraron libros que coincidan con la búsqueda.'}
                  </p>
                  {filterMode === 'missing_only' && books.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className="inline-flex items-center gap-1 text-xs text-amber-800 dark:text-amber-300 font-bold underline"
                    >
                      Ver todos los libros de la biblioteca
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {visibleBooks.map((book) => {
                    const isSelected = selectedIds.has(book.id);
                    const missing = isCandidateMissing(book);
                    const sagaName = book.sagaId ? sagasMap.get(book.sagaId) : null;

                    return (
                      <div
                        key={book.id}
                        onClick={() => toggleBookSelection(book.id)}
                        className={`group relative rounded-xl border p-2.5 sm:p-3 flex items-start gap-3 cursor-pointer select-none transition-all duration-200 ${
                          isSelected
                            ? 'bg-[#f4ead4] dark:bg-[#1A2232] border-amber-600/50 dark:border-amber-500/50 shadow-sm ring-1 ring-amber-500/30'
                            : 'bg-[#fffcf5]/70 dark:bg-[#0F1420]/70 border-amber-900/15 dark:border-[#222C3E] hover:border-amber-900/30 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Checkbox personalizado */}
                        <div className="pt-0.5 shrink-0">
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                              isSelected
                                ? 'bg-amber-500 border-amber-600 text-slate-950 font-bold shadow-sm'
                                : 'border-amber-900/30 dark:border-slate-600 bg-[#fffcf5] dark:bg-[#0D1017] group-hover:border-amber-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Miniatura de portada */}
                        <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden shadow-sm border border-amber-900/15 dark:border-slate-700">
                          <BookCover
                            nombre={book.nombre}
                            autor={book.autor}
                            portadaUrl={book.portadaUrl}
                            portadaFallbackUrl={book.portadaFallbackUrl}
                            portadaDataUrl={book.portadaDataUrl}
                            size="sm"
                            variant="book"
                          />
                        </div>

                        {/* Información del libro */}
                        <div className="flex-1 min-w-0">
                          {sagaName && (
                            <div className="flex items-center gap-1 text-[10px] font-medium text-amber-900 dark:text-amber-300 truncate mb-0.5">
                              <Layers className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{sagaName}</span>
                            </div>
                          )}

                          <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                            {book.nombre}
                          </h4>

                          <p className="font-serif italic text-xs text-stone-600 dark:text-slate-400 truncate">
                            {book.autor || 'Autor no especificado'}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {missing ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/30">
                                <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                                {isCovers ? 'Sin portada' : 'Sin sinopsis'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-500/15 text-stone-600 dark:text-slate-400">
                                {isCovers ? 'Tiene portada' : 'Tiene sinopsis'}
                              </span>
                            )}

                            {book.genero && (
                              <span className="text-[10px] text-stone-500 dark:text-slate-500 truncate max-w-[120px]">
                                {book.genero}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ────────── 3. PIE DE ACCIONES FIJO ────────── */}
            <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-amber-900/15 dark:border-[#222B3C] bg-[#f5ebd6]/90 dark:bg-[#141A26]/90 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-600 dark:text-slate-400 truncate">
                {selectedIds.size === 0
                  ? 'Marca al menos un libro para iniciar la búsqueda'
                  : `${selectedIds.size} de ${books.length} libros listos para actualizar`}
              </span>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-amber-900/25 dark:border-slate-700 bg-[#efe3c8] dark:bg-[#1B2333] hover:bg-[#e4d4b4] dark:hover:bg-[#222C3F] text-xs font-semibold text-stone-800 dark:text-slate-200 transition"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={handleStartBatchProcess}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isCovers
                      ? `Buscar y asignar portadas (${selectedIds.size})`
                      : `Buscar y asignar sinopsis (${selectedIds.size})`}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};
