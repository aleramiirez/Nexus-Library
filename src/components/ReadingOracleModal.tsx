import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Compass,
  Sparkles,
  Zap,
  Globe,
  Layers,
  Dices,
  BookOpen,
  RotateCcw,
  Check,
  ChevronRight
} from 'lucide-react';
import { Book, Saga } from '../types/models';
import { BookCover } from './BookCover';
import { literaryGeographyService, isBookRead } from '../services/literaryGeographyService';
import { soundService } from '../services/soundService';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface ReadingOracleModalProps {
  isOpen: boolean;
  books: Book[];
  sagas: Saga[];
  onClose: () => void;
  onSelectBookToRead: (book: Book) => void;
  onOpenBookDetail?: (bookId: string) => void;
}

type OracleFilterMode = 'all' | 'quick' | 'saga' | 'country';

export const ReadingOracleModal: React.FC<ReadingOracleModalProps> = ({
  isOpen,
  books,
  sagas,
  onClose,
  onSelectBookToRead,
  onOpenBookDetail
}) => {
  const [filterMode, setFilterMode] = useState<OracleFilterMode>('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectionReason, setSelectionReason] = useState<string>('');
  const [isConsulting, setIsConsulting] = useState<boolean>(false);

  const focusTrapRef = useFocusTrap({ isOpen, onClose });

  // Países ya conquistados en el pasaporte literario
  const stampedCountryCodes = useMemo(() => {
    try {
      const passport = literaryGeographyService.calculatePassport(books);
      return new Set(passport.entries.filter((e) => e.stamped).map((e) => e.country.code.toUpperCase()));
    } catch {
      return new Set<string>();
    }
  }, [books]);

  // Sagas que ya se han empezado y tienen libros pendientes
  const activeSagaIds = useMemo(() => {
    const startedSagaNames = new Set<string>();
    books.forEach((b) => {
      if (b.sagaNombre?.trim() && (isBookRead(b) || b.progreso === '⏳ Leyendo')) {
        startedSagaNames.add(b.sagaNombre.trim().toLowerCase());
      }
    });
    return startedSagaNames;
  }, [books]);

  // Selección inteligente del Oráculo según el modo
  const consultOracle = useCallback(
    (mode: OracleFilterMode = filterMode) => {
      setIsConsulting(true);
      soundService.playWaxSeal(true);

      setTimeout(() => {
        const unreadBooks = books.filter((b) => b.progreso === '❌ No Leído');
        const candidatePool: Array<{ book: Book; reason: string }> = [];

        if (mode === 'quick') {
          // Libros de menos de 300 páginas
          const quickBooks = unreadBooks.filter((b) => b.paginas && b.paginas > 0 && b.paginas < 300);
          quickBooks.forEach((b) => {
            candidatePool.push({
              book: b,
              reason: `Lectura ágil de ${b.paginas} páginas · Perfecta para avanzar sin pausas.`
            });
          });
        } else if (mode === 'saga') {
          // Libros de sagas ya empezadas
          const sagaUnread = unreadBooks.filter(
            (b) => b.sagaNombre?.trim() && activeSagaIds.has(b.sagaNombre.trim().toLowerCase())
          );
          // Ordenar por volumen si existe
          sagaUnread.sort((a, b) => (a.volumen || 0) - (b.volumen || 0));
          sagaUnread.forEach((b) => {
            candidatePool.push({
              book: b,
              reason: `El siguiente paso en la saga "${b.sagaNombre}"${b.volumen ? ` (Volumen ${b.volumen})` : ''}.`
            });
          });
        } else if (mode === 'country') {
          // Libros de países aún no conquistados en el Pasaporte
          unreadBooks.forEach((b) => {
            const country = literaryGeographyService.resolveBookCountry(b);
            if (country && !stampedCountryCodes.has(country.code.toUpperCase())) {
              candidatePool.push({
                book: b,
                reason: `Un viaje literario a ${country.name} (${country.flag}) pendiente en tu Pasaporte.`
              });
            }
          });
        }

        // Si la categoría específica no tiene obras o es azar total:
        if (candidatePool.length === 0) {
          const pool = unreadBooks.length > 0 ? unreadBooks : books.filter((b) => b.progreso !== '⏳ Leyendo');
          pool.forEach((b) => {
            let reason = 'El destino de tu biblioteca ha elegido esta obra de entre tus tesoros pendientes.';
            if (b.genero) reason = `Una inmersión destacada en el género ${b.genero}.`;
            candidatePool.push({ book: b, reason });
          });
        }

        if (candidatePool.length > 0) {
          // Filtrar para no repetir el mismo libro inmediatamente si hay más de 1 opción
          const validCandidates =
            candidatePool.length > 1 && selectedBook
              ? candidatePool.filter((c) => c.book.id !== selectedBook.id)
              : candidatePool;

          const chosen = validCandidates[Math.floor(Math.random() * validCandidates.length)];
          setSelectedBook(chosen.book);
          setSelectionReason(chosen.reason);
        } else {
          setSelectedBook(null);
          setSelectionReason('No tienes libros pendientes en tu archivo para esta consulta.');
        }

        setIsConsulting(false);
      }, 550);
    },
    [books, filterMode, activeSagaIds, stampedCountryCodes, selectedBook]
  );

  // Al abrir el modal por primera vez, si no hay libro elegido, consultar automáticamente
  React.useEffect(() => {
    if (isOpen && !selectedBook) {
      consultOracle('all');
    }
  }, [isOpen, selectedBook, consultOracle]);

  if (!isOpen) return null;

  const resolvedCountry = selectedBook ? literaryGeographyService.resolveBookCountry(selectedBook) : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="oracle-modal-title"
    >
      <div
        ref={focusTrapRef as React.RefObject<HTMLDivElement>}
        className="w-full max-w-xl rounded-2xl border border-amber-600/40 bg-gradient-to-b from-[#fcf7ec] via-[#f7eed8] to-[#eee0c3] dark:from-[#18202F] dark:via-[#121824] dark:to-[#0D121B] text-stone-900 dark:text-stone-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Cabecera del Oráculo */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-amber-900/20 dark:border-amber-400/20 bg-gradient-to-r from-amber-500/15 via-[#f5ead4] to-amber-500/15 dark:from-amber-500/10 dark:via-[#161D2B] dark:to-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/25 text-amber-900 dark:text-amber-300 border border-amber-600/40 shadow-xs">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 id="oracle-modal-title" className="font-serif font-bold text-lg sm:text-xl text-amber-950 dark:text-amber-200 leading-tight">
                El Oráculo del Archivo
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 font-serif italic">
                ¿Qué leo ahora? · La providencia de tu biblioteca
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            aria-label="Cerrar Oráculo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de criterios de afinidad */}
        <div className="shrink-0 p-3 sm:px-6 border-b border-amber-900/15 dark:border-[#20293A] bg-white/40 dark:bg-[#101622]/60 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {[
            { id: 'all', label: 'Puro azar', icon: Dices },
            { id: 'quick', label: 'Lectura rápida (<300p)', icon: Zap },
            { id: 'saga', label: 'Continuar saga', icon: Layers },
            { id: 'country', label: 'Nuevo país', icon: Globe }
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = filterMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setFilterMode(item.id as OracleFilterMode);
                  consultOracle(item.id as OracleFilterMode);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs scale-102'
                    : 'border-amber-900/15 dark:border-[#29354A] bg-white/70 dark:bg-[#141B28] text-stone-700 dark:text-slate-400 hover:border-amber-600/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Zona de Revelación del Libro */}
        <div className="flex-1 p-5 sm:p-7 overflow-y-auto flex flex-col items-center justify-center">
          {isConsulting ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4 animate-pulse text-center">
              <div className="relative">
                <div className="w-20 h-28 rounded-xl border-2 border-dashed border-amber-600/50 bg-amber-500/10 flex items-center justify-center shadow-lg">
                  <Compass className="w-8 h-8 text-amber-700 dark:text-amber-300 animate-spin" />
                </div>
              </div>
              <p className="font-serif italic text-sm text-amber-900 dark:text-amber-300">
                El Oráculo está consultando los estantes del destino...
              </p>
            </div>
          ) : selectedBook ? (
            <div className="w-full space-y-5 animate-in fade-in zoom-in-95 duration-300">
              {/* Tarjeta de Revelación de Obra */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 sm:p-5 rounded-2xl border border-amber-900/25 dark:border-amber-400/20 bg-gradient-to-br from-[#fffcf5] via-[#f7edd6] to-[#eee1c5] dark:from-[#151D2C] dark:via-[#111724] dark:to-[#0C111A] shadow-md">
                {/* Portada en relieve */}
                <div className="shrink-0 w-28 sm:w-32 shadow-xl rounded-xl overflow-hidden border border-amber-900/20">
                  <BookCover
                    nombre={selectedBook.nombre}
                    autor={selectedBook.autor}
                    portadaUrl={selectedBook.portadaUrl}
                    portadaFallbackUrl={selectedBook.portadaFallbackUrl}
                    portadaDataUrl={selectedBook.portadaDataUrl}
                    size="md"
                    variant="book"
                    priority
                  />
                </div>

                {/* Detalles y Decreto del Oráculo */}
                <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                  {selectedBook.sagaNombre && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 border border-amber-600/30 text-amber-900 dark:text-amber-300">
                      <Layers className="w-3 h-3" />
                      {selectedBook.sagaNombre}
                      {selectedBook.volumen ? ` · Vol. ${selectedBook.volumen}` : ''}
                    </span>
                  )}

                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 dark:text-white leading-tight">
                    {selectedBook.nombre}
                  </h3>

                  <p className="font-serif italic text-sm text-stone-700 dark:text-slate-300">
                    {selectedBook.autor || 'Autor no especificado'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1 text-xs">
                    {selectedBook.genero && (
                      <span className="px-2 py-0.5 rounded-md bg-[#efe3c8] dark:bg-[#1F293D] border border-amber-900/15 text-stone-800 dark:text-slate-200">
                        {selectedBook.genero}
                      </span>
                    )}
                    {selectedBook.paginas && (
                      <span className="px-2 py-0.5 rounded-md bg-[#efe3c8] dark:bg-[#1F293D] border border-amber-900/15 text-stone-800 dark:text-slate-200">
                        {selectedBook.paginas} páginas
                      </span>
                    )}
                    {resolvedCountry && (
                      <span className="px-2 py-0.5 rounded-md bg-[#efe3c8] dark:bg-[#1F293D] border border-amber-900/15 text-stone-800 dark:text-slate-200 flex items-center gap-1">
                        <span>{resolvedCountry.flag}</span>
                        <span>{resolvedCountry.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Placa ornamental: Por qué te lo recomienda el Oráculo */}
                  <div className="mt-3 p-3 rounded-xl border border-amber-600/30 bg-amber-500/10 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-left font-serif leading-relaxed">
                      <strong className="block text-[10px] uppercase font-sans tracking-wider text-amber-900 dark:text-amber-300">
                        Decreto del Oráculo:
                      </strong>
                      <span>{selectionReason}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <span className="text-3xl">🏛️</span>
              <p className="font-serif italic text-stone-600 dark:text-slate-400">
                {selectionReason || 'No se han encontrado obras para este criterio.'}
              </p>
            </div>
          )}
        </div>

        {/* Pie de acción */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-amber-900/20 dark:border-amber-400/15 bg-white/40 dark:bg-[#101622]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => consultOracle()}
            disabled={isConsulting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-900/25 dark:border-[#2D394E] bg-white dark:bg-[#151D2C] hover:border-amber-600 text-stone-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Preguntar de nuevo</span>
          </button>

          {selectedBook && (
            <div className="w-full sm:w-auto flex items-center gap-2">
              {onOpenBookDetail && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenBookDetail(selectedBook.id);
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-amber-900/20 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-slate-800 transition"
                >
                  Ver ficha
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onSelectBookToRead(selectedBook);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-md transition transform active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Comenzar a leer ahora</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
