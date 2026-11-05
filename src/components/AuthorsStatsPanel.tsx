import React, { useState, useMemo } from 'react';
import {
  Feather,
  Award,
  Trophy,
  BookOpen,
  Star,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Globe,
  Flame,
  ArrowUpDown
} from 'lucide-react';
import { Book } from '../types/models';
import { BookCover } from './BookCover';
import { literaryGeographyService, CountryInfo, isBookRead } from '../services/literaryGeographyService';
import { formatStars } from '../constants/catalogs';

export interface AuthorsStatsPanelProps {
  books: Book[];
  onOpenBookDetail?: (book: Book) => void;
  darkMode?: boolean;
}

export interface AuthorStats {
  name: string;
  totalBooks: number;
  readBooks: number;
  readingBooks: number;
  unreadBooks: number;
  pausedBooks: number;
  totalPagesRead: number;
  totalPossiblePages: number;
  ratingsCount: number;
  avgRating: number | null;
  country: CountryInfo | null;
  books: Book[];
}

type SortField = 'read' | 'total' | 'rating' | 'pages' | 'name';

export const AuthorsStatsPanel: React.FC<AuthorsStatsPanelProps> = ({
  books,
  onOpenBookDetail
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('read');
  const [expandedAuthor, setExpandedAuthor] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Agrupar y calcular estadísticas por autor
  const authorsStats = useMemo(() => {
    const authorMap = new Map<string, Book[]>();

    books.forEach((b) => {
      const rawAuthor = (b.autor || '').trim() || 'Autor Anónimo';
      if (!authorMap.has(rawAuthor)) {
        authorMap.set(rawAuthor, []);
      }
      authorMap.get(rawAuthor)!.push(b);
    });

    const result: AuthorStats[] = [];

    authorMap.forEach((authorBooks, name) => {
      let readCount = 0;
      let readingCount = 0;
      let unreadCount = 0;
      let pausedCount = 0;
      let totalPagesRead = 0;
      let totalPossiblePages = 0;
      let ratingSum = 0;
      let ratingsCount = 0;
      let country: CountryInfo | null = null;

      for (const b of authorBooks) {
        if (isBookRead(b)) {
          readCount++;
          totalPagesRead += b.paginas || 0;
        } else if (b.progreso === '⏳ Leyendo') {
          readingCount++;
          totalPagesRead += b.paginaActual || 0;
        } else if (b.progreso === '⏸️ Pausado') {
          pausedCount++;
          totalPagesRead += b.paginaActual || 0;
        } else {
          unreadCount++;
        }

        totalPossiblePages += b.paginas || 0;

        if (b.puntuacion && b.puntuacion > 0) {
          ratingSum += b.puntuacion;
          ratingsCount++;
        }

        if (!country) {
          const resolved = literaryGeographyService.resolveBookCountry(b);
          if (resolved) country = resolved;
        }
      }

      const avgRating = ratingsCount > 0 ? Math.round((ratingSum / ratingsCount) * 10) / 10 : null;

      result.push({
        name,
        totalBooks: authorBooks.length,
        readBooks: readCount,
        readingBooks: readingCount,
        unreadBooks: unreadCount,
        pausedBooks: pausedCount,
        totalPagesRead,
        totalPossiblePages,
        ratingsCount,
        avgRating,
        country,
        books: authorBooks
      });
    });

    return result;
  }, [books]);

  // Podio y destaques
  const highlights = useMemo(() => {
    if (authorsStats.length === 0) return null;

    // 1. Autor más leído (mayor obras completadas)
    const mostRead = [...authorsStats]
      .filter((a) => a.readBooks > 0)
      .sort((a, b) => b.readBooks - a.readBooks || b.totalPagesRead - a.totalPagesRead)[0] || null;

    // 2. Autor predilecto (mayor valoración media con al menos 2 obras valoradas, o >=1 si no hay)
    const ratedCandidates = authorsStats.filter((a) => a.ratingsCount >= 2 && a.avgRating !== null);
    const fallbackRated = authorsStats.filter((a) => a.ratingsCount >= 1 && a.avgRating !== null);
    const topRatedPool = ratedCandidates.length > 0 ? ratedCandidates : fallbackRated;
    const topRated = [...topRatedPool].sort(
      (a, b) => (b.avgRating || 0) - (a.avgRating || 0) || b.readBooks - a.readBooks
    )[0] || null;

    // 3. Mayor volumen de páginas
    const mostPages = [...authorsStats]
      .filter((a) => a.totalPagesRead > 0)
      .sort((a, b) => b.totalPagesRead - a.totalPagesRead)[0] || null;

    return { mostRead, topRated, mostPages };
  }, [authorsStats]);

  // Filtrado y ordenación
  const filteredAndSortedAuthors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = authorsStats;

    if (q) {
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'read':
          return b.readBooks - a.readBooks || b.totalBooks - a.totalBooks;
        case 'total':
          return b.totalBooks - a.totalBooks || b.readBooks - a.readBooks;
        case 'rating':
          return (b.avgRating || 0) - (a.avgRating || 0) || b.ratingsCount - a.ratingsCount;
        case 'pages':
          return b.totalPagesRead - a.totalPagesRead;
        case 'name':
          return a.name.localeCompare(b.name, 'es');
        default:
          return 0;
      }
    });
  }, [authorsStats, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedAuthors.length / PAGE_SIZE) || 1;
  const effectivePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedAuthors = useMemo(() => {
    const startIndex = (effectivePage - 1) * PAGE_SIZE;
    return filteredAndSortedAuthors.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSortedAuthors, effectivePage]);

  const toggleExpandAuthor = (name: string) => {
    setExpandedAuthor((prev) => (prev === name ? null : name));
  };

  if (books.length === 0) {
    return null;
  }

  return (
    <section className="catalog-card-panel relative pt-8 sm:pt-9 p-6 sm:p-8 shadow-xl mt-6">
      {/* Pestaña superior de latón */}
      <div className="catalog-brass-tab" aria-hidden="true">
        Sala de Autores · Archivo Bibliográfico
      </div>

      <div className="relative z-10 space-y-6">
        {/* Cabecera del Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#242E42] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-600/30">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                Sala de Autores
              </h2>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                {authorsStats.length} autores catalogados · Análisis de afinidad, lecturas y procedencia
              </p>
            </div>
          </div>

          {/* Barra de Controles: Búsqueda y Ordenación */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador de autor */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar autor..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121722] text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 focus:outline-none focus:border-amber-600 w-36 sm:w-44 transition"
              />
            </div>

            {/* Selector de orden */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 dark:text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortField);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#121722] text-xs text-stone-800 dark:text-slate-200 focus:outline-none focus:border-amber-600 font-medium"
              >
                <option value="read">Más leídos</option>
                <option value="total">Total de obras</option>
                <option value="rating">Mejor valorados</option>
                <option value="pages">Más páginas</option>
                <option value="name">Alfabético</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Podio de Destaques ─── */}
        {highlights && (highlights.mostRead || highlights.topRated || highlights.mostPages) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
            {/* 1. Autor más leído */}
            {highlights.mostRead && (
              <div className="p-4 rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 shadow-xs relative overflow-hidden">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Más Leído</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white mt-1.5 truncate">
                  {highlights.mostRead.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                  {highlights.mostRead.country && (
                    <span title={highlights.mostRead.country.name}>
                      {highlights.mostRead.country.flag} {highlights.mostRead.country.name}
                    </span>
                  )}
                  <span>·</span>
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    {highlights.mostRead.readBooks} {highlights.mostRead.readBooks === 1 ? 'leído' : 'leídos'}
                  </span>
                </div>
              </div>
            )}

            {/* 2. Autor predilecto / Mejor valorado */}
            {highlights.topRated && (
              <div className="p-4 rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 shadow-xs relative overflow-hidden">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                  <span>Mejor Valorado</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white mt-1.5 truncate">
                  {highlights.topRated.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    {highlights.topRated.avgRating} ★
                  </span>
                  <span>({highlights.topRated.ratingsCount} {highlights.topRated.ratingsCount === 1 ? 'reseña' : 'reseñas'})</span>
                  {highlights.topRated.country && (
                    <>
                      <span>·</span>
                      <span>{highlights.topRated.country.flag} {highlights.topRated.country.name}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 3. Mayor volumen de páginas leídas */}
            {highlights.mostPages && (
              <div className="p-4 rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 shadow-xs relative overflow-hidden">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Mayor Extensión</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white mt-1.5 truncate">
                  {highlights.mostPages.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    {highlights.mostPages.totalPagesRead.toLocaleString('es-ES')} páginas
                  </span>
                  <span>en {highlights.mostPages.readBooks} {highlights.mostPages.readBooks === 1 ? 'obra' : 'obras'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Lista de Autores con Tarjetas Desplegables ─── */}
        <div className="space-y-3">
          {filteredAndSortedAuthors.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400">
              No se han encontrado autores que coincidan con la búsqueda.
            </div>
          ) : (
            paginatedAuthors.map((author, index) => {
              const isExpanded = expandedAuthor === author.name;
              const readPct =
                author.totalBooks > 0
                  ? Math.round((author.readBooks / author.totalBooks) * 100)
                  : 0;
              const absoluteRank = (effectivePage - 1) * PAGE_SIZE + index + 1;

              return (
                <div
                  key={author.name}
                  className="rounded-xl border border-amber-900/20 dark:border-amber-400/20 bg-amber-950/5 dark:bg-[#121824]/90 transition-all hover:border-amber-600/40 shadow-xs overflow-hidden"
                >
                  {/* Fila principal del autor */}
                  <div
                    onClick={() => toggleExpandAuthor(author.name)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    {/* Identificación del autor */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-6 text-center font-mono text-xs font-bold text-amber-800/60 dark:text-amber-400/60 shrink-0">
                        #{absoluteRank}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-white truncate">
                            {author.name}
                          </h3>
                          {author.country && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-900/15 dark:border-amber-400/20 bg-amber-500/10 text-amber-900 dark:text-amber-300"
                              title={author.country.name}
                            >
                              <span>{author.country.flag}</span>
                              <span className="hidden sm:inline">{author.country.name}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                          <span>
                            {author.totalBooks} {author.totalBooks === 1 ? 'libro' : 'libros'} ({author.readBooks} leídos)
                          </span>
                          {author.totalPagesRead > 0 && (
                            <>
                              <span>·</span>
                              <span>{author.totalPagesRead.toLocaleString('es-ES')} págs. leídas</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Estadísticas visuales a la derecha */}
                    <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                      {/* Puntuación media */}
                      {author.avgRating !== null ? (
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-600/20 text-xs font-bold text-amber-900 dark:text-amber-300">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          <span>{author.avgRating} ★</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400 italic">Sin calificar</span>
                      )}

                      {/* Mini barra de progreso de lectura del autor */}
                      <div className="hidden md:flex flex-col items-end gap-1 w-24">
                        <div className="w-full h-1.5 rounded-full bg-stone-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${readPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-stone-500 dark:text-slate-400">
                          {readPct}% leído
                        </span>
                      </div>

                      {/* Icono de desplegar */}
                      <div className="p-1 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ─── Cajón Desplegable: Bibliografía del Autor ─── */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 border-t border-amber-900/15 dark:border-[#222B3C] bg-amber-500/5 dark:bg-[#0E1420]/80 animate-in fade-in duration-200">
                      <div className="text-xs font-semibold text-stone-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Obras en tu archivo ({author.books.length}):</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
                        {author.books.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => onOpenBookDetail?.(b)}
                            className="group cursor-pointer text-left space-y-1.5 active:scale-95 transition"
                            title={`${b.nombre} · ${b.progreso}`}
                          >
                            <div className="relative group-hover:-translate-y-1.5 transition-transform duration-300">
                              <BookCover
                                nombre={b.nombre}
                                autor={b.autor}
                                portadaUrl={b.portadaUrl}
                                portadaFallbackUrl={b.portadaFallbackUrl}
                                portadaDataUrl={b.portadaDataUrl}
                                size="sm"
                                variant="book"
                              />
                              {b.puntuacion && (
                                <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/85 backdrop-blur-sm text-[9px] font-bold text-amber-300 z-10 border border-amber-500/20">
                                  {b.puntuacion}★
                                </span>
                              )}
                            </div>

                            <p className="font-serif text-xs font-bold truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                              {b.nombre}
                            </p>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-900/15 dark:border-[#2A354A] bg-white dark:bg-[#151D2C] text-stone-700 dark:text-slate-300 truncate">
                                {b.progreso}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ─── Paginación: Carga de 10 autores por página ─── */}
        {totalPages > 1 && (
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-amber-900/15 dark:border-[#222B3C] text-xs text-stone-600 dark:text-slate-400">
            <span>
              Mostrando{' '}
              <strong>
                {(effectivePage - 1) * PAGE_SIZE + 1}–
                {Math.min(effectivePage * PAGE_SIZE, filteredAndSortedAuthors.length)}
              </strong>{' '}
              de <strong>{filteredAndSortedAuthors.length}</strong> autores
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  setExpandedAuthor(null);
                }}
                disabled={effectivePage <= 1}
                className="px-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-white dark:bg-[#151D2A] disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-600 text-stone-800 dark:text-slate-200 font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - effectivePage) > 1
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <span key={pageNum} className="px-1 text-stone-400">
                          …
                        </span>
                      );
                    }
                    return null;
                  }

                  const isCurrent = pageNum === effectivePage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setCurrentPage(pageNum);
                        setExpandedAuthor(null);
                      }}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-600'
                          : 'border border-amber-900/15 dark:border-[#242E40] bg-white/70 dark:bg-[#121824] text-stone-700 dark:text-slate-300 hover:border-amber-500/50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  setExpandedAuthor(null);
                }}
                disabled={effectivePage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-[#283246] bg-white dark:bg-[#151D2A] disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-600 text-stone-800 dark:text-slate-200 font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
