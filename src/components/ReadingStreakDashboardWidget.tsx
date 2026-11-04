import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Trophy, Calendar, Check, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { Book } from '../types/models';
import { readingStreakService, ReadingStreakStats, HeatmapDayData } from '../services/readingStreakService';
import { soundService } from '../services/soundService';

interface ReadingStreakDashboardWidgetProps {
  books: Book[];
  onNavigateToStats?: () => void;
  onShowToast?: (message: string, options?: { type?: 'success' | 'info' | 'error' }) => void;
}

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const ReadingStreakDashboardWidget: React.FC<ReadingStreakDashboardWidgetProps> = ({
  books,
  onNavigateToStats,
  onShowToast
}) => {
  const [, setTick] = useState(0);

  // Suscribirse a cambios en la racha
  useEffect(() => {
    return readingStreakService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const stats: ReadingStreakStats = useMemo(() => {
    return readingStreakService.getReadingStreakStats(books);
  }, [books]);

  const recentDays: HeatmapDayData[] = useMemo(() => {
    return readingStreakService.getRecentDaysData(books, 28);
  }, [books]);

  const handleManualCheckIn = () => {
    readingStreakService.markReadTodayManually(20);
    soundService.playWaxSeal(true);
    soundService.playBrassBell(true);
    onShowToast?.('🔥 ¡Lectura de hoy registrada! Mantén encendida tu racha ceremonial.', {
      type: 'success'
    });
  };

  const formatDayTooltip = (day: HeatmapDayData): string => {
    const parts = day.date.split('-');
    if (parts.length === 3) {
      const dayNum = parseInt(parts[2], 10);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const monthName = MONTH_NAMES_SHORT[monthIdx] || parts[1];
      if (day.pagesRead > 0) {
        return `${dayNum} de ${monthName}: ${day.pagesRead} págs leídas`;
      }
      return `${dayNum} de ${monthName}: sin lectura registrada`;
    }
    return day.date;
  };

  const getDayColorClass = (level: number, isToday: boolean): string => {
    let base = '';
    switch (level) {
      case 1:
        base = 'bg-amber-400/40 dark:bg-amber-600/40 border-amber-500/40';
        break;
      case 2:
        base = 'bg-amber-500/70 dark:bg-amber-500/60 border-amber-500/60';
        break;
      case 3:
        base = 'bg-amber-600/90 dark:bg-amber-400/80 border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.35)]';
        break;
      case 4:
        base = 'bg-gradient-to-br from-amber-500 to-amber-300 dark:from-amber-400 dark:to-amber-200 border-amber-300 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.55)]';
        break;
      case 0:
      default:
        base = 'bg-amber-950/10 dark:bg-[#1A2232] border-amber-900/10 dark:border-[#273349]';
        break;
    }
    if (isToday) {
      base += ' ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-1 ring-offset-[#fbf6ea] dark:ring-offset-[#131926]';
    }
    return base;
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-amber-900/20 dark:border-[#273248] bg-[#fbf6ea]/95 dark:bg-[#131926]/95 p-4 sm:p-5 shadow-sm space-y-4 transition-colors">
      {/* Cabecera del Widget */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#242F43] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-600/35 text-amber-800 dark:text-amber-300">
            <Flame className={'w-5 h-5 ' + (stats.readToday ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-stone-400')} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900 dark:text-[#f8f5ee] flex items-center gap-1.5">
              <span>Hábito y Racha de Lectura</span>
            </h3>
            <p className="text-[11px] text-stone-600 dark:text-slate-400">
              {stats.activeDaysThisYear} días activos en {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {onNavigateToStats && (
          <button
            type="button"
            onClick={onNavigateToStats}
            className="text-xs font-semibold text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:underline transition-colors flex items-center gap-0.5"
          >
            <span>Mapa anual (365d)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Métricas destacadas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-amber-900/15 dark:border-[#253045] bg-[#f6edd9]/70 dark:bg-[#161E2E]/80 p-2.5 sm:p-3 text-center">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400 flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Racha actual</span>
          </span>
          <p className="font-serif text-lg sm:text-2xl font-bold text-amber-950 dark:text-amber-300 mt-0.5">
            {stats.currentStreak} {stats.currentStreak === 1 ? 'día' : 'días'}
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/15 dark:border-[#253045] bg-[#f6edd9]/70 dark:bg-[#161E2E]/80 p-2.5 sm:p-3 text-center">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400 flex items-center justify-center gap-1">
            <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Mejor racha</span>
          </span>
          <p className="font-serif text-lg sm:text-2xl font-bold text-stone-800 dark:text-stone-200 mt-0.5">
            {stats.bestStreak} {stats.bestStreak === 1 ? 'día' : 'días'}
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/15 dark:border-[#253045] bg-[#f6edd9]/70 dark:bg-[#161E2E]/80 p-2.5 sm:p-3 text-center">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400 flex items-center justify-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Páginas hoy</span>
          </span>
          <p className="font-serif text-lg sm:text-2xl font-bold text-stone-800 dark:text-stone-200 mt-0.5">
            {stats.pagesReadToday}
          </p>
        </div>
      </div>

      {/* Mini-calendario de los últimos 28 días (4 semanas) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-slate-400">
          <span className="font-medium">Últimas 4 semanas (28 días):</span>
          <div className="flex items-center gap-1 text-[10px]">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 rounded-xs bg-amber-950/10 dark:bg-[#1A2232] border border-amber-900/15" />
            <div className="w-2.5 h-2.5 rounded-xs bg-amber-400/40 dark:bg-amber-600/40" />
            <div className="w-2.5 h-2.5 rounded-xs bg-amber-500/70 dark:bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-xs bg-amber-600 dark:bg-amber-400" />
            <span>Más</span>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 p-2 rounded-xl border border-amber-900/15 dark:border-[#232E43] bg-[#f5ecda]/60 dark:bg-[#101622]/80">
          {recentDays.map((day) => {
            const isToday = day.date === todayIso;
            const tooltip = formatDayTooltip(day);
            return (
              <div
                key={day.date}
                title={tooltip}
                className={
                  'h-6 sm:h-7 rounded-md border flex items-center justify-center cursor-default transition-transform hover:scale-110 ' +
                  getDayColorClass(day.level, isToday)
                }
              >
                {day.pagesRead > 0 ? (
                  <span className="text-[9px] font-bold opacity-80">{day.pagesRead}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón interactivo de registro rápido de hoy */}
      <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
        {stats.readToday ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-600/40 dark:border-emerald-500/40 bg-emerald-500/15 text-emerald-950 dark:text-emerald-300 text-xs font-semibold shadow-2xs">
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>✓ Lectura de hoy registrada ({stats.pagesReadToday} págs)</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleManualCheckIn}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-amber-600 bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-xs flex items-center gap-1.5 active:scale-95"
            title="Registra que has leído hoy para no perder tu racha"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 Marcar que he leído hoy</span>
          </button>
        )}

        <span className="text-[11px] text-stone-500 dark:text-slate-400 italic">
          {stats.readToday
            ? '¡Excelente constancia hoy!'
            : 'Unos minutos al día mantienen viva la llama'}
        </span>
      </div>
    </div>
  );
};
