import React, { useMemo, useState, useEffect } from 'react';
import { Target, Trophy, ChevronRight, TrendingUp, Flame } from 'lucide-react';
import { Book } from '../types/models';
import { readingChallengeService } from '../services/readingChallengeService';
import { BookCover } from './BookCover';

interface ReadingChallengeDashboardWidgetProps {
  books: Book[];
  currentUserId?: string;
  onNavigateToStats: () => void;
  onOpenBookDetail?: (book: Book) => void;
}

export const ReadingChallengeDashboardWidget: React.FC<ReadingChallengeDashboardWidgetProps> = ({
  books,
  currentUserId,
  onNavigateToStats,
  onOpenBookDetail
}) => {
  const currentYear = new Date().getFullYear();
  const [goalTick, setGoalTick] = useState(0);

  useEffect(() => {
    return readingChallengeService.subscribe(() => setGoalTick((t) => t + 1));
  }, []);

  const stats = useMemo(() => {
    return readingChallengeService.calculateStats(books, currentYear, currentUserId);
  }, [books, currentYear, currentUserId, goalTick]);

  return (
    <div className="rounded-2xl border border-amber-700/30 dark:border-amber-500/25 bg-gradient-to-br from-[#f8f0de] via-[#fbf6ea] to-[#f2dfbe] dark:from-[#111724] dark:via-[#151D2A] dark:to-[#0E131C] p-5 sm:p-6 shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-600/30 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 dark:text-white leading-tight">
                Reto de Lectura {currentYear}
              </h3>
              {stats.paceStatus === 'completed' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> ¡Completado!
                </span>
              ) : stats.paceStatus === 'ahead' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-500/15 border border-amber-600/30 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3 text-amber-700 dark:text-amber-400" /> +{stats.diffFromPace} sobre el ritmo
                </span>
              ) : null}
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
              Has completado <strong>{stats.completedCount}</strong> de tu meta de{' '}
              <strong>{stats.targetGoal} libros</strong> ({stats.percentage}%)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigateToStats}
          className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-200 self-start sm:self-auto group transition"
        >
          <span>Ver reto & estadísticas</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="mt-4 space-y-1.5">
        <div className="w-full h-2.5 rounded-full bg-amber-900/15 dark:bg-slate-800 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700 shadow"
            style={{ width: `${Math.min(100, stats.percentage)}%` }}
          />
        </div>
      </div>

      {/* Miniaturas de libros terminados este año */}
      {stats.completedBooks.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-amber-900/15 dark:border-[#242E42] flex items-center gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400 shrink-0">
            Terminados recientemente:
          </span>
          <div className="flex items-center gap-2">
            {stats.completedBooks.slice(0, 5).map((b) => (
              <div
                key={b.id}
                onClick={() => onOpenBookDetail?.(b)}
                data-book-id={b.id}
                className="w-8 sm:w-9 h-12 sm:h-13 shrink-0 rounded overflow-hidden shadow hover:scale-105 cursor-pointer transition"
                title={`${b.nombre} (por ${b.autor})`}
              >
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
