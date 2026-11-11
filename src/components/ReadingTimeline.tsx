import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  Star,
  BookOpen,
  Quote,
  Sparkles,
  ArrowUpDown,
  Filter,
  Layers,
  Award,
  ChevronRight,
  Flame,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { Book, StarRating } from '../types/models';
import { BookCover } from './BookCover';
import { formatStars } from '../constants/catalogs';
import '../dashboard-panels.css';

interface ReadingTimelineProps {
  books: Book[];
  selectedYear: number | 'all';
  onOpenBookDetail?: (book: Book) => void;
}

const MONTH_NAMES_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic'
];

function calculateReadingDurationDays(fechaInicio?: string, fechaFin?: string): number | null {
  if (!fechaInicio || !fechaFin) return null;
  const start = new Date(fechaInicio);
  const end = new Date(fechaFin);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days);
}

function formatTimelineDate(iso?: string): string {
  if (!iso || !iso.trim()) return '';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const [year, month, day] = parts;
  const mIndex = parseInt(month, 10) - 1;
  const mName = MONTH_NAMES_SHORT[mIndex] || month;
  return `${parseInt(day, 10)} de ${mName}. ${year}`;
}

interface TimelineMonthGroup {
  monthIndex: number; // 0..11
  monthName: string;
  year: number;
  books: Book[];
  totalPages: number;
}

export const ReadingTimeline: React.FC<ReadingTimelineProps> = ({
  books,
  selectedYear,
  onOpenBookDetail
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeMonthFilter, setActiveMonthFilter] = useState<number | 'all'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Filtrar solo libros completados y del año seleccionado
  const completedBooks = useMemo(() => {
    return books.filter((b) => {
      if (b.progreso !== '✅ Leído') return false;
      if (selectedYear === 'all') return true;

      if (b.fechaFin && b.fechaFin.trim().length >= 4) {
        const y = parseInt(b.fechaFin.slice(0, 4), 10);
        if (y === selectedYear) return true;
      }
      if (b.updatedAt) {
        const d = new Date(b.updatedAt);
        if (!isNaN(d.getTime()) && d.getFullYear() === selectedYear) return true;
      }
      return false;
    });
  }, [books, selectedYear]);

  // 2. Ordenar cronológicamente
  const sortedBooks = useMemo(() => {
    const list = [...completedBooks];
    list.sort((a, b) => {
      const dateA = a.fechaFin || a.updatedAt || a.createdAt || '';
      const dateB = b.fechaFin || b.updatedAt || b.createdAt || '';
      return sortOrder === 'desc' ? dateB.localeCompare(dateA) : dateA.localeCompare(dateB);
    });
    return list;
  }, [completedBooks, sortOrder]);

  // 3. Agrupar por mes y año
  const monthGroups: TimelineMonthGroup[] = useMemo(() => {
    const groupsMap = new Map<string, TimelineMonthGroup>();

    sortedBooks.forEach((b) => {
      let monthIndex = 0;
      let year = typeof selectedYear === 'number' ? selectedYear : new Date().getFullYear();

      if (b.fechaFin && b.fechaFin.length >= 7) {
        const parts = b.fechaFin.split('-');
        if (parts.length >= 2) {
          const parsedYear = parseInt(parts[0], 10);
          const parsedMonth = parseInt(parts[1], 10) - 1;
          if (!isNaN(parsedYear)) year = parsedYear;
          if (!isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) {
            monthIndex = parsedMonth;
          }
        }
      } else if (b.updatedAt) {
        const d = new Date(b.updatedAt);
        if (!isNaN(d.getTime())) {
          monthIndex = d.getMonth();
          year = d.getFullYear();
        }
      }

      const key = `${year}-${monthIndex}`;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          monthIndex,
          monthName: MONTH_NAMES_FULL[monthIndex],
          year,
          books: [],
          totalPages: 0
        });
      }

      const group = groupsMap.get(key)!;
      group.books.push(b);
      group.totalPages += b.paginas || 0;
    });

    return Array.from(groupsMap.values());
  }, [sortedBooks, selectedYear]);

  // 4. Filtrar por búsqueda de texto y mes
  const filteredGroups = useMemo(() => {
    return monthGroups
      .map((g) => {
        if (activeMonthFilter !== 'all' && g.monthIndex !== activeMonthFilter) {
          return null;
        }

        const filteredBooks = g.books.filter((b) => {
          if (!searchFilter.trim()) return true;
          const q = searchFilter.toLowerCase();
          return (
            b.nombre.toLowerCase().includes(q) ||
            b.autor.toLowerCase().includes(q) ||
            (b.sagaNombre && b.sagaNombre.toLowerCase().includes(q))
          );
        });

        if (filteredBooks.length === 0) return null;

        return {
          ...g,
          books: filteredBooks,
          totalPages: filteredBooks.reduce((acc, curr) => acc + (curr.paginas || 0), 0)
        };
      })
      .filter((g): g is TimelineMonthGroup => g !== null);
  }, [monthGroups, activeMonthFilter, searchFilter]);

  // Métricas rápidas del timeline
  const totalBooksCount = completedBooks.length;
  const totalPagesSum = completedBooks.reduce((acc, curr) => acc + (curr.paginas || 0), 0);
  const avgDaysPerBook = useMemo(() => {
    const validDurations: number[] = [];
    completedBooks.forEach((b) => {
      const days = calculateReadingDurationDays(b.fechaInicio, b.fechaFin);
      if (days !== null && days <= 120) {
        validDurations.push(days);
      }
    });
    if (validDurations.length === 0) return null;
    return Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length);
  }, [completedBooks]);

  return (
    <div className="space-y-6">
      {/* ─── Barra de Control de la Cronología ─── */}
      <div className="rounded-2xl border border-amber-900/20 dark:border-amber-400/20 bg-gradient-to-r from-[#fbf6ea] via-[#f7eed8] to-[#fbf6ea] dark:from-[#141A26] dark:via-[#18202F] dark:to-[#141A26] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-white">
                Cronología Literaria {selectedYear === 'all' ? '· Colección Completa' : `· ${selectedYear}`}
              </h2>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
              Recorrido temporal de todas tus obras terminadas mes a mes
            </p>
          </div>

          {/* Estadísticas rápidas en pastillas */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-800/20 dark:border-amber-400/20 bg-amber-900/5 dark:bg-slate-800 font-semibold text-stone-800 dark:text-slate-200">
              <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{totalBooksCount} obras</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-800/20 dark:border-amber-400/20 bg-amber-900/5 dark:bg-slate-800 font-semibold text-stone-800 dark:text-slate-200">
              <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{totalPagesSum.toLocaleString('es-ES')} págs.</span>
            </span>
            {avgDaysPerBook !== null && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-800/20 dark:border-amber-400/20 bg-amber-900/5 dark:bg-slate-800 font-semibold text-stone-800 dark:text-slate-200">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>~{avgDaysPerBook} días / libro</span>
              </span>
            )}
          </div>
        </div>

        {/* Controles de orden, filtro de mes y buscador rápido */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-amber-900/15 dark:border-amber-400/15">
          {/* Selector de meses presentes */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveMonthFilter('all')}
              className={
                'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ' +
                (activeMonthFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-stone-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300')
              }
            >
              Todos los meses
            </button>
            {monthGroups.map((g) => (
              <button
                key={`${g.year}-${g.monthIndex}`}
                type="button"
                onClick={() =>
                  setActiveMonthFilter(activeMonthFilter === g.monthIndex ? 'all' : g.monthIndex)
                }
                className={
                  'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ' +
                  (activeMonthFilter === g.monthIndex
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-black/5 dark:bg-white/5 text-stone-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300')
                }
              >
                <span>{MONTH_NAMES_SHORT[g.monthIndex]}</span>
                <span className="text-[10px] opacity-75 font-mono">({g.books.length})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Buscador de obras en el timeline */}
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar por obra o autor..."
              className="w-full md:w-48 px-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-white/70 dark:bg-[#101520] text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-600 transition"
            />

            {/* Alternar orden temporal */}
            <button
              type="button"
              onClick={() => setSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              title={sortOrder === 'desc' ? 'Orden: Más recientes primero' : 'Orden: Cronológico'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-white/70 dark:bg-[#121824] hover:border-amber-600 text-xs font-semibold text-stone-800 dark:text-slate-200 transition shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
              <span>{sortOrder === 'desc' ? 'Recientes' : 'Antiguos'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Contenedor del Timeline Estilo Pergamino ─── */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-amber-900/20 dark:border-amber-400/20 bg-[#fbf6ea] dark:bg-[#141A26] p-10 text-center space-y-3 shadow-sm">
          <BookOpen className="w-10 h-10 text-amber-600/70 dark:text-amber-400/70 mx-auto animate-pulse" />
          <h3 className="font-serif font-bold text-base sm:text-lg text-stone-800 dark:text-slate-100">
            {searchFilter || activeMonthFilter !== 'all'
              ? 'No hay obras que coincidan con los filtros seleccionados'
              : `Sin lecturas registradas en ${selectedYear === 'all' ? 'la colección' : selectedYear}`}
          </h3>
          <p className="text-xs text-stone-600 dark:text-slate-400 max-w-md mx-auto">
            {searchFilter || activeMonthFilter !== 'all'
              ? 'Prueba a limpiar la búsqueda o cambiar el mes seleccionado.'
              : 'Cuando marques libros como leídos y asignes su fecha de finalización, aparecerán organizados en este pergamino cronológico.'}
          </p>
          {(searchFilter || activeMonthFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter('');
                setActiveMonthFilter('all');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xs"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-10">
          {/* Línea vertical dorada tipo lomo de libro encuadernado */}
          <div
            className="absolute left-2.5 sm:left-3.5 top-3 bottom-3 w-0.5 bg-gradient-to-b from-amber-600 via-amber-400 to-amber-700/60 dark:from-amber-500 dark:via-amber-400/70 dark:to-amber-600/40"
            aria-hidden="true"
          />

          {filteredGroups.map((group) => (
            <div key={`${group.year}-${group.monthIndex}`} className="space-y-4 relative">
              {/* Sello / Marcador del Mes en el Timeline */}
              <div className="relative flex items-center gap-3">
                {/* Círculo ornamentado sobre la línea */}
                <div className="absolute -left-6 sm:-left-8 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] shadow-md border-2 border-[#f7f0df] dark:border-[#0D1017] ring-2 ring-amber-600/40">
                  <Calendar className="w-3 h-3" />
                </div>

                <div className="inline-flex items-baseline gap-2.5 px-3.5 py-1 rounded-xl bg-amber-500/15 dark:bg-amber-400/10 border border-amber-600/30 dark:border-amber-400/30 shadow-2xs">
                  <span className="font-serif font-bold text-sm sm:text-base text-amber-950 dark:text-amber-200">
                    {group.monthName} {selectedYear === 'all' ? group.year : ''}
                  </span>
                  <span className="text-xs text-stone-600 dark:text-slate-400 font-medium">
                    {group.books.length} {group.books.length === 1 ? 'obra' : 'obras'} ·{' '}
                    {group.totalPages.toLocaleString('es-ES')} págs.
                  </span>
                </div>
              </div>

              {/* Lista de obras leídas en este mes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.books.map((book) => {
                  const durationDays = calculateReadingDurationDays(book.fechaInicio, book.fechaFin);
                  const firstQuote =
                    book.citas && book.citas.length > 0 ? book.citas[0] : null;

                  return (
                    <article
                      key={book.id}
                      onClick={() => onOpenBookDetail?.(book)}
                      className="group cursor-pointer rounded-2xl border border-amber-900/20 dark:border-amber-400/20 bg-gradient-to-b from-[#fdfbf6] to-[#f7eedc] dark:from-[#161D2B] dark:to-[#111722] p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-amber-600/60 transition-all duration-300 relative flex flex-col justify-between"
                    >
                      <div className="flex gap-4 items-start">
                        {/* Portada con efecto de relieve y miniatura */}
                        <div className="shrink-0 relative transition-transform duration-300 group-hover:-translate-y-1">
                          <div className="w-16 sm:w-20 shadow-md rounded overflow-hidden">
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
                          {/* Sombra base */}
                          <div className="w-12 h-1 bg-black/30 dark:bg-black/60 blur-[1px] rounded-full mx-auto -mt-0.5" />
                        </div>

                        {/* Contenido Editorial */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Saga si existe */}
                          {book.sagaNombre && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider truncate max-w-full">
                              Saga: {book.sagaNombre}
                              {book.volumen ? ` · Vol. ${book.volumen}` : ''}
                            </span>
                          )}

                          <h4 className="font-serif font-bold text-sm sm:text-base text-stone-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors leading-tight line-clamp-2">
                            {book.nombre}
                          </h4>

                          <p className="text-xs text-stone-600 dark:text-slate-400 truncate">
                            {book.autor}
                          </p>

                          {/* Estrellas y Fecha */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {book.puntuacion !== null && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-300 font-bold text-xs border border-amber-600/30">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                <span>{book.puntuacion}</span>
                              </span>
                            )}

                            {book.fechaFin && (
                              <span className="text-[11px] font-mono text-stone-600 dark:text-slate-400">
                                {formatTimelineDate(book.fechaFin)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detalles complementarios: Duración, Páginas, Formato */}
                      <div className="mt-3.5 pt-3 border-t border-amber-900/10 dark:border-amber-400/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5 text-stone-600 dark:text-slate-400 font-medium">
                          {durationDays !== null ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-900/5 dark:bg-slate-800 border border-amber-900/10 dark:border-slate-700">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>
                                {durationDays === 1 ? 'Lectura en 1 día' : `Leído en ${durationDays} días`}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-900/5 dark:bg-slate-800 border border-amber-900/10 dark:border-slate-700">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Concluido</span>
                            </span>
                          )}

                          {book.paginas && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-900/5 dark:bg-slate-800 border border-amber-900/10 dark:border-slate-700 font-mono">
                              {book.paginas} págs.
                            </span>
                          )}

                          {book.formato && (
                            <span className="capitalize px-2 py-0.5 rounded-md bg-amber-900/5 dark:bg-slate-800 border border-amber-900/10 dark:border-slate-700">
                              {book.formato}
                            </span>
                          )}

                          {book.vecesLeido && book.vecesLeido > 1 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-900 dark:text-purple-300 font-bold">
                              <span>Relectura ×{book.vecesLeido}</span>
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                          <span>Ver ficha</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>

                      {/* Extracto de Cita o Reseña si existe */}
                      {(firstQuote || book.resena) && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-900/5 dark:bg-black/30 border border-amber-900/10 dark:border-amber-400/10 text-stone-700 dark:text-slate-300 text-xs italic font-serif relative">
                          <Quote className="w-3.5 h-3.5 text-amber-600/40 absolute -top-1.5 left-2 bg-[#fdfbf6] dark:bg-[#161D2B] px-0.5" />
                          <p className="line-clamp-2 pl-2">
                            «{firstQuote || book.resena}»
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
