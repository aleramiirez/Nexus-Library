import React, { useMemo, useState } from 'react';
import {
  Trophy,
  Sparkles,
  Target,
  Edit3,
  Check,
  Calendar,
  BookOpen,
  Clock,
  Star,
  Award,
  Layers,
  Flame,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Book, Saga } from '../types/models';
import {
  readingChallengeService,
  YearReadingStats,
  MonthCadence
} from '../services/readingChallengeService';
import { BookCover } from './BookCover';
import { ReadingWrappedModal } from './ReadingWrappedModal';
import { formatStars } from '../constants/catalogs';

interface ReadingChallengeScreenProps {
  books: Book[];
  sagas?: Saga[];
  currentUserId?: string;
  userName?: string;
  onOpenBookDetail?: (book: Book) => void;
  onShowToast?: (message: string) => void;
  onUpdateBookDates?: (bookId: string, fechaInicio: string, fechaFin: string) => void;
}

export const ReadingChallengeScreen: React.FC<ReadingChallengeScreenProps> = ({
  books,
  sagas = [],
  currentUserId,
  userName = 'Lector Nexus',
  onOpenBookDetail,
  onShowToast,
  onUpdateBookDates
}) => {
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(
    () => readingChallengeService.getAvailableYears(books),
    [books]
  );

  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentYear);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState<string>('');
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthCadence | null>(null);

  // Recalcular estadísticas del año seleccionado
  const stats: YearReadingStats = useMemo(() => {
    return readingChallengeService.calculateStats(books, selectedYear, currentUserId);
  }, [books, selectedYear, currentUserId]);

  const handleStartEditGoal = () => {
    setGoalInputValue(String(stats.targetGoal));
    setIsEditingGoal(true);
  };

  const handleSaveGoal = (e?: React.FormEvent) => {
    e?.preventDefault();
    const val = parseInt(goalInputValue.trim(), 10);
    if (!isNaN(val) && val > 0 && val <= 500) {
      const yearToSet = selectedYear === 'all' ? currentYear : selectedYear;
      readingChallengeService.setGoal(yearToSet, val, currentUserId);
      setIsEditingGoal(false);
      onShowToast?.(`Meta para ${yearToSet} actualizada a ${val} libros.`);
    }
  };

  const maxMonthBooks = useMemo(() => {
    return Math.max(1, ...stats.monthlyCadence.map((m) => m.booksCount));
  }, [stats.monthlyCadence]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* ─── Cabecera Principal ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#242E42] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-600/30">
              <Trophy className="w-5 h-5" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
              Reto & Estadísticas de Lectura
            </h1>
          </div>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
            Seguimiento de tus metas anuales, ritmo de lectura y análisis de tu biblioteca
          </p>
        </div>

        {/* Acciones superiores: Selector de año y Botón Nexus Wrapped */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de años tipo pastillas */}
          <div className="inline-flex items-center rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-1 text-xs">
            {availableYears.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setSelectedYear(y);
                  setSelectedMonth(null);
                }}
                className={
                  'rounded-lg px-2.5 py-1 font-semibold transition ' +
                  (selectedYear === y
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-stone-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300')
                }
              >
                {y}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelectedYear('all');
                setSelectedMonth(null);
              }}
              className={
                'rounded-lg px-2.5 py-1 font-semibold transition ' +
                (selectedYear === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-stone-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300')
              }
            >
              Histórico
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsWrappedOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition"
            title="Generar tarjeta resumen anual para compartir"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Memoria {selectedYear === 'all' ? 'Total' : selectedYear}</span>
          </button>
        </div>
      </div>

      {/* ─── Hero Section: Banner del Reto de Lectura Anual ─── */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-700/35 dark:border-amber-500/30 bg-gradient-to-br from-[#f6ebd4] via-[#fbf6ea] to-[#edd9b7] dark:from-[#111724] dark:via-[#161D2B] dark:to-[#0D121B] p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-700/30 dark:border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300">
              <Target className="w-3.5 h-3.5" />
              <span>
                {selectedYear === 'all'
                  ? 'Compromiso Histórico de Lectura'
                  : `Reto de Lectura · Año ${selectedYear}`}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 dark:text-white">
                {stats.completedCount}
                <span className="text-xl sm:text-2xl text-stone-500 dark:text-slate-400 font-normal">
                  {' '}
                  / {stats.targetGoal} libros
                </span>
              </h2>

              {!isEditingGoal ? (
                <button
                  type="button"
                  onClick={handleStartEditGoal}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline"
                  title="Modificar objetivo anual"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editar meta</span>
                </button>
              ) : (
                <form onSubmit={handleSaveGoal} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={goalInputValue}
                    onChange={(e) => setGoalInputValue(e.target.value)}
                    className="w-16 rounded-lg border border-amber-600 bg-white dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-stone-900 dark:text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400"
                    title="Guardar"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingGoal(false)}
                    className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-white px-1"
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </div>

            {/* Mensaje de Ritmo y Cadencia */}
            <div className="text-xs sm:text-sm text-stone-700 dark:text-slate-300 flex items-center gap-2">
              {stats.paceStatus === 'completed' ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                  <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ¡Enhorabuena! Has alcanzado y superado tu meta anual con creces.
                </span>
              ) : stats.paceStatus === 'ahead' ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300 bg-amber-500/15 border border-amber-600/30 px-2.5 py-1 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  ¡Vas a excelente ritmo! Llevas {stats.diffFromPace}{' '}
                  {stats.diffFromPace === 1 ? 'libro' : 'libros'} por delante del ritmo previsto.
                </span>
              ) : stats.paceStatus === 'behind' ? (
                <span className="inline-flex items-center gap-1.5 text-stone-700 dark:text-slate-300 bg-stone-500/10 dark:bg-slate-800/60 border border-stone-400/20 px-2.5 py-1 rounded-xl">
                  <Calendar className="w-4 h-4 text-stone-500 dark:text-slate-400" />
                  Vas con {stats.diffFromPace}{' '}
                  {stats.diffFromPace === 1 ? 'libro' : 'libros'} de diferencia respecto al ritmo
                  anual previsto.
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-xl">
                  <Target className="w-4 h-4 text-amber-600" />
                  Vas exactamente al día según el calendario de lectura.
                </span>
              )}
            </div>
          </div>

          {/* Medidor visual tipo marcapáginas con barra dorada */}
          <div className="w-full lg:w-72 bg-white/70 dark:bg-[#0E131D]/80 border border-amber-900/20 dark:border-[#222B3D] rounded-2xl p-4 shadow-inner space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-600 dark:text-slate-400">Progreso del reto</span>
              <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
                {stats.percentage}%
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 transition-all duration-700 shadow"
                style={{ width: `${Math.min(100, stats.percentage)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 pt-0.5">
              <span>{stats.completedCount} leídos</span>
              <span>
                {Math.max(0, stats.targetGoal - stats.completedCount)} restantes
              </span>
            </div>
          </div>
        </div>

        {/* Tira visual de obras leídas recientemente en este año */}
        {stats.completedBooks.length > 0 && (
          <div className="mt-6 pt-5 border-t border-amber-900/15 dark:border-[#242E42]">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-serif italic font-semibold text-stone-700 dark:text-slate-300">
                Últimas obras terminadas en {selectedYear === 'all' ? 'tu colección' : selectedYear}:
              </span>
              <span className="text-stone-500 dark:text-slate-400">
                Mostrando {Math.min(8, stats.completedBooks.length)} de {stats.completedBooks.length}
              </span>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-2 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stats.completedBooks.slice(0, 8).map((book) => (
                <div
                  key={book.id}
                  onClick={() => onOpenBookDetail?.(book)}
                  data-book-id={book.id}
                  className="group flex-shrink-0 w-20 sm:w-24 cursor-pointer text-left space-y-1 active:scale-95 transition"
                  title={`${book.nombre} (por ${book.autor})`}
                >
                  <div className="relative rounded-lg overflow-hidden shadow-md group-hover:shadow-xl group-hover:-translate-y-1 transition duration-300">
                    <BookCover
                      nombre={book.nombre}
                      autor={book.autor}
                      portadaUrl={book.portadaUrl}
                      portadaFallbackUrl={book.portadaFallbackUrl}
                      portadaDataUrl={book.portadaDataUrl}
                      size="sm"
                      variant="book"
                    />
                    {book.puntuacion && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/80 backdrop-blur-sm text-[9px] font-bold text-amber-300">
                        {book.puntuacion}★
                      </span>
                    )}
                  </div>
                  <p className="font-serif text-[11px] font-semibold text-stone-900 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                    {book.nombre}
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                    {book.fechaFin ? book.fechaFin.slice(5) : 'Leído'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── Cuadrícula de 4 Métricas Clave ─── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 dark:text-slate-400">
            <span className="text-xs uppercase font-medium">Libros Leídos</span>
            <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="font-serif text-3xl sm:text-4xl font-bold text-emerald-700 dark:text-emerald-400">
            {stats.completedCount}
          </p>
          <span className="text-[11px] text-stone-500 dark:text-slate-400 block pt-0.5">
            {stats.percentage}% de la meta ({stats.targetGoal} total)
          </span>
        </div>

        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 dark:text-slate-400">
            <span className="text-xs uppercase font-medium">Páginas Devoradas</span>
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 dark:text-white">
            {stats.totalPagesRead.toLocaleString('es-ES')}
          </p>
          <span className="text-[11px] text-stone-500 dark:text-slate-400 block pt-0.5">
            Promedio de ~{stats.avgPagesPerBook} páginas por libro
          </span>
        </div>

        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 dark:text-slate-400">
            <span className="text-xs uppercase font-medium">Tiempo Invertido</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-serif text-3xl sm:text-4xl font-bold text-amber-700 dark:text-amber-300">
            ~{stats.estimatedHoursRead}h
          </p>
          <span className="text-[11px] text-stone-500 dark:text-slate-400 block pt-0.5">
            Basado en un ritmo de lectura medio
          </span>
        </div>

        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-stone-500 dark:text-slate-400">
            <span className="text-xs uppercase font-medium">Valoración Media</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-serif text-3xl sm:text-4xl font-bold text-amber-600 dark:text-amber-400">
            {stats.avgRating !== null ? `${stats.avgRating} ⭐` : '—'}
          </p>
          <span className="text-[11px] text-stone-500 dark:text-slate-400 block pt-0.5">
            {stats.ratedCount} libros puntuados con estrellas
          </span>
        </div>
      </section>

      {/* ─── Cadencia Mensual de Lectura (Gráfico 12 meses) ─── */}
      <section className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/15 dark:border-[#222B3C] pb-3">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Cadencia Mensual de Lectura</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
              Libros terminados cada mes. Haz clic sobre un mes para ver sus obras.
            </p>
          </div>
          {selectedMonth && (
            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-semibold self-start sm:self-auto"
            >
              Ver todos los meses
            </button>
          )}
        </div>

        {/* Gráfico de barras mensual */}
        <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-44 pt-6 px-1">
          {stats.monthlyCadence.map((m) => {
            const heightPct =
              maxMonthBooks > 0 ? Math.round((m.booksCount / maxMonthBooks) * 100) : 0;
            const isSelected = selectedMonth?.monthIndex === m.monthIndex;

            return (
              <div
                key={m.monthIndex}
                onClick={() => setSelectedMonth(isSelected ? null : m)}
                className="group flex flex-col items-center justify-end h-full cursor-pointer"
                title={`${m.monthFullName}: ${m.booksCount} libros (${m.pagesCount} páginas)`}
              >
                {/* Contador sobre la barra */}
                <span
                  className={
                    'text-[10px] font-mono font-bold mb-1 transition ' +
                    (m.booksCount > 0
                      ? isSelected
                        ? 'text-amber-600 dark:text-amber-300 scale-110'
                        : 'text-stone-700 dark:text-slate-300'
                      : 'text-stone-300 dark:text-slate-600')
                  }
                >
                  {m.booksCount > 0 ? m.booksCount : ''}
                </span>

                {/* Barra */}
                <div className="w-full max-w-[28px] bg-amber-900/10 dark:bg-slate-800 rounded-t-lg h-32 flex items-end overflow-hidden p-0.5">
                  <div
                    className={
                      'w-full rounded-t-md transition-all duration-500 ' +
                      (isSelected
                        ? 'bg-amber-500 shadow-md ring-2 ring-amber-400/50'
                        : m.booksCount > 0
                          ? 'bg-gradient-to-t from-amber-600 to-amber-500 group-hover:from-amber-500 group-hover:to-amber-400'
                          : 'bg-transparent')
                    }
                    style={{ height: `${Math.max(m.booksCount > 0 ? 12 : 0, heightPct)}%` }}
                  />
                </div>

                {/* Nombre del mes */}
                <span
                  className={
                    'text-[10px] sm:text-[11px] font-medium mt-2 transition ' +
                    (isSelected
                      ? 'text-amber-700 dark:text-amber-300 font-bold'
                      : 'text-stone-600 dark:text-slate-400 group-hover:text-stone-900 dark:group-hover:text-white')
                  }
                >
                  {m.monthName}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detalle del mes seleccionado */}
        {selectedMonth && (
          <div className="p-4 rounded-2xl border border-amber-600/30 bg-amber-500/10 dark:bg-amber-500/5 animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-stone-900 dark:text-white">
                Obras leídas en {selectedMonth.monthFullName}: {selectedMonth.booksCount} libros (
                {selectedMonth.pagesCount.toLocaleString('es-ES')} págs)
              </span>
            </div>

            {selectedMonth.books.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                {selectedMonth.books.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onOpenBookDetail?.(b)}
                    data-book-id={b.id}
                    className="cursor-pointer group text-left space-y-1 active:scale-95 transition"
                  >
                    <div className="rounded-lg overflow-hidden shadow group-hover:shadow-lg transition">
                      <BookCover
                        nombre={b.nombre}
                        autor={b.autor}
                        portadaUrl={b.portadaUrl}
                        portadaFallbackUrl={b.portadaFallbackUrl}
                        portadaDataUrl={b.portadaDataUrl}
                        size="sm"
                        variant="book"
                      />
                    </div>
                    <p className="font-serif text-xs font-semibold truncate group-hover:text-amber-600">
                      {b.nombre}
                    </p>
                    <p className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                      {b.paginas ? `${b.paginas} págs.` : 'Sin páginas'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 dark:text-slate-400 italic">
                No hay libros registrados con fecha de finalización en este mes.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ─── Hitos & Obras Destacadas ─── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Libro más extenso y más breve */}
        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-4">
          <div className="border-b border-amber-900/15 dark:border-[#222B3C] pb-2.5">
            <h2 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Extremos de Lectura</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400">
              Las lecturas más voluminosas y condensadas del año
            </p>
          </div>

          <div className="space-y-3">
            {stats.longestBook ? (
              <div
                onClick={() => onOpenBookDetail?.(stats.longestBook!)}
                className="cursor-pointer p-3 rounded-xl border border-amber-900/15 dark:border-[#253044] bg-white/60 dark:bg-slate-900/50 hover:border-amber-600/50 transition flex items-center gap-3.5"
              >
                <div className="w-12 shrink-0 shadow rounded overflow-hidden">
                  <BookCover
                    nombre={stats.longestBook.nombre}
                    autor={stats.longestBook.autor}
                    portadaUrl={stats.longestBook.portadaUrl}
                    portadaFallbackUrl={stats.longestBook.portadaFallbackUrl}
                    portadaDataUrl={stats.longestBook.portadaDataUrl}
                    size="sm"
                    variant="book"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                    El Tomo Más Largo
                  </span>
                  <h3 className="font-serif font-bold text-xs sm:text-sm truncate">
                    {stats.longestBook.nombre}
                  </h3>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate">
                    {stats.longestBook.autor}
                  </p>
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 mt-0.5 block">
                    {stats.longestBook.paginas} páginas
                  </span>
                </div>
              </div>
            ) : null}

            {stats.shortestBook && stats.shortestBook.id !== stats.longestBook?.id ? (
              <div
                onClick={() => onOpenBookDetail?.(stats.shortestBook!)}
                className="cursor-pointer p-3 rounded-xl border border-amber-900/15 dark:border-[#253044] bg-white/60 dark:bg-slate-900/50 hover:border-amber-600/50 transition flex items-center gap-3.5"
              >
                <div className="w-12 shrink-0 shadow rounded overflow-hidden">
                  <BookCover
                    nombre={stats.shortestBook.nombre}
                    autor={stats.shortestBook.autor}
                    portadaUrl={stats.shortestBook.portadaUrl}
                    portadaFallbackUrl={stats.shortestBook.portadaFallbackUrl}
                    portadaDataUrl={stats.shortestBook.portadaDataUrl}
                    size="sm"
                    variant="book"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider">
                    La Lectura Más Ágil
                  </span>
                  <h3 className="font-serif font-bold text-xs sm:text-sm truncate">
                    {stats.shortestBook.nombre}
                  </h3>
                  <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate">
                    {stats.shortestBook.autor}
                  </p>
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 mt-0.5 block">
                    {stats.shortestBook.paginas} páginas
                  </span>
                </div>
              </div>
            ) : null}

            {!stats.longestBook && !stats.shortestBook && (
              <p className="text-xs text-stone-500 dark:text-slate-400 py-6 text-center">
                Registra el número de páginas en tus libros para calcular estos extremos.
              </p>
            )}
          </div>
        </div>

        {/* Favoritos y Mejor Valorados */}
        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-4">
          <div className="border-b border-amber-900/15 dark:border-[#222B3C] pb-2.5">
            <h2 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span>Tus Favoritos de {selectedYear === 'all' ? 'Siempre' : selectedYear}</span>
            </h2>
            <p className="text-xs text-stone-600 dark:text-slate-400">
              Obras con la puntuación más alta registradas en el período
            </p>
          </div>

          {stats.favoriteBooks.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {stats.favoriteBooks.slice(0, 4).map((b) => (
                <div
                  key={b.id}
                  onClick={() => onOpenBookDetail?.(b)}
                  className="cursor-pointer p-2.5 rounded-xl border border-amber-900/15 dark:border-[#253044] bg-white/60 dark:bg-slate-900/50 hover:border-amber-600/50 transition flex items-center gap-2.5"
                >
                  <div className="w-10 shrink-0 shadow rounded overflow-hidden">
                    <BookCover
                      nombre={b.nombre}
                      autor={b.autor}
                      portadaUrl={b.portadaUrl}
                      portadaFallbackUrl={b.portadaFallbackUrl}
                      portadaDataUrl={b.portadaDataUrl}
                      size="sm"
                      variant="book"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif font-bold text-xs truncate">{b.nombre}</h3>
                    <p className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                      {b.autor}
                    </p>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                      {formatStars(b.puntuacion)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-stone-500 dark:text-slate-400 space-y-1">
              <Star className="w-6 h-6 text-stone-400 mx-auto" />
              <p>Aún no has valorado libros leídos con 5 estrellas en este año.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Desgloses: Géneros, Autores y Puntuaciones ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Desglose por Género */}
        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-3">
          <h2 className="font-serif text-base font-bold text-stone-900 dark:text-white">
            Géneros Más Leídos
          </h2>
          {stats.genreDistribution.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-slate-400">Sin datos registrados.</p>
          ) : (
            <div className="space-y-2">
              {stats.genreDistribution.slice(0, 6).map((g) => (
                <div key={g.genre} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate">{g.genre}</span>
                    <span className="text-stone-500 dark:text-slate-400 font-mono">
                      {g.count} ({g.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 dark:bg-amber-400 rounded-full"
                      style={{ width: `${g.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Autores más leídos */}
        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-3">
          <h2 className="font-serif text-base font-bold text-stone-900 dark:text-white">
            Autores de Cabecera
          </h2>
          {stats.authorDistribution.length === 0 ? (
            <p className="text-xs text-stone-500 dark:text-slate-400">Sin autores registrados.</p>
          ) : (
            <div className="divide-y divide-amber-900/15 dark:divide-[#222B3C] text-xs">
              {stats.authorDistribution.slice(0, 5).map((a) => (
                <div key={a.author} className="py-2 flex items-center justify-between">
                  <span className="font-medium truncate mr-2">{a.author}</span>
                  <span className="rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-semibold px-2 py-0.5 shrink-0 text-[11px]">
                    {a.count} {a.count === 1 ? 'libro' : 'libros'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desglose de estrellas */}
        <div className="rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] p-5 shadow-sm space-y-3">
          <h2 className="font-serif text-base font-bold text-stone-900 dark:text-white">
            Distribución de Puntuaciones
          </h2>
          <div className="space-y-2">
            {([5, 4, 3, 2, 1] as const).map((stars) => {
              const count = stats.ratingDistribution[stars] || 0;
              const pct = stats.ratedCount > 0 ? Math.round((count / stats.ratedCount) * 100) : 0;

              return (
                <div key={stars} className="flex items-center gap-2 text-xs">
                  <span className="w-12 font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    {stars} ⭐
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 dark:bg-amber-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-stone-500 dark:text-slate-400 font-mono text-[11px]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Aviso de Libros Leídos sin Fecha Asignada ─── */}
      {stats.booksWithoutFinishDate.length > 0 && selectedYear !== 'all' && (
        <section className="rounded-2xl border border-dashed border-amber-700/35 dark:border-amber-500/35 bg-[#fbf6ea]/80 dark:bg-[#161D2B]/80 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-white">
                Tienes {stats.booksWithoutFinishDate.length}{' '}
                {stats.booksWithoutFinishDate.length === 1
                  ? 'obra leída'
                  : 'obras leídas'}{' '}
                sin fecha de fin asignada
              </h3>
              <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                Al asignar la fecha en la que terminaste cada obra, se organizarán de forma precisa
                en sus correspondientes retos anuales y gráficos de cadencia mensual.
              </p>

              <div className="flex flex-wrap gap-2 pt-2.5">
                {stats.booksWithoutFinishDate.slice(0, 4).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onOpenBookDetail?.(b)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/20 dark:border-slate-700 bg-white/70 dark:bg-slate-800 text-xs font-medium text-stone-800 dark:text-slate-200 hover:border-amber-600 transition"
                  >
                    <span>«{b.nombre}»</span>
                    <ChevronRight className="w-3 h-3 text-amber-600" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Modal Nexus Wrapped / Memoria Literaria ─── */}
      {isWrappedOpen && (
        <ReadingWrappedModal
          isOpen={isWrappedOpen}
          onClose={() => setIsWrappedOpen(false)}
          stats={stats}
          userName={userName}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
