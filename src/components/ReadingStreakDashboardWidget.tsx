import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Trophy, Calendar, Check, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { Book } from '../types/models';
import {
  readingStreakService,
  ReadingStreakStats,
  CalendarDayView
} from '../services/readingStreakService';
import { soundService } from '../services/soundService';

interface ReadingStreakDashboardWidgetProps {
  books: Book[];
  onNavigateToStats?: () => void;
  onShowToast?: (message: string, options?: { type?: 'success' | 'info' | 'error' }) => void;
}

const WEEKDAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAY_NAMES_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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

  // Semanas reales estructuradas de Lunes a Domingo (4 semanas)
  const recentWeeks: CalendarDayView[][] = useMemo(() => {
    return readingStreakService.getRecentCalendarWeeks(books, 4);
  }, [books]);

  const handleManualCheckIn = () => {
    readingStreakService.markReadTodayManually(25);
    soundService.playWaxSeal(true);
    soundService.playBrassBell(true);
    onShowToast?.('🔥 ¡Lectura de hoy registrada! Mantén viva tu llama ceremonial.', {
      type: 'success'
    });
  };

  const getDayTooltip = (day: CalendarDayView): string => {
    const weekday = WEEKDAY_NAMES_FULL[day.weekdayIndex] || '';
    if (day.isFuture) {
      return `${weekday}, ${day.dayNumber} de ${day.monthShort} (Día próximo)`;
    }
    if (day.pagesRead > 0) {
      return `${weekday}, ${day.dayNumber} de ${day.monthShort}: ${day.pagesRead} páginas leídas`;
    }
    return `${weekday}, ${day.dayNumber} de ${day.monthShort}: sin lectura registrada`;
  };

  const getCellClasses = (day: CalendarDayView): string => {
    if (day.isFuture) {
      return 'border border-dashed border-amber-900/15 dark:border-[#222E40] bg-amber-950/5 dark:bg-[#0e1420]/40 text-stone-400 dark:text-slate-600 opacity-60';
    }

    let colorStyle = '';
    switch (day.level) {
      case 1:
        colorStyle = 'bg-amber-400/35 dark:bg-amber-700/40 border-amber-500/35 text-amber-950 dark:text-amber-200';
        break;
      case 2:
        colorStyle = 'bg-amber-500/60 dark:bg-amber-600/55 border-amber-500/50 text-amber-950 dark:text-amber-100 font-bold';
        break;
      case 3:
        colorStyle = 'bg-amber-600/85 dark:bg-amber-500/80 border-amber-400 text-stone-950 font-bold shadow-xs';
        break;
      case 4:
        colorStyle = 'bg-gradient-to-br from-amber-500 to-amber-300 dark:from-amber-400 dark:to-amber-200 border-amber-300 text-slate-950 font-black shadow-sm';
        break;
      case 0:
      default:
        colorStyle = 'bg-[#f4ead4]/60 dark:bg-[#141C29]/80 border-amber-900/10 dark:border-[#20293B] text-stone-600 dark:text-slate-400';
        break;
    }

    if (day.isToday) {
      colorStyle += ' ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-1 ring-offset-[#fbf6ea] dark:ring-offset-[#131926] shadow-[0_0_10px_rgba(245,158,11,0.45)]';
    }

    return colorStyle;
  };

  return (
    <div className="rounded-2xl border border-amber-900/20 dark:border-[#273248] bg-[#fbf6ea]/95 dark:bg-[#131926]/95 p-4 sm:p-5 shadow-sm space-y-4 transition-colors">
      {/* Cabecera del Widget */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-900/10 dark:border-[#242F43] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-600/35 text-amber-800 dark:text-amber-300">
            <Flame
              className={
                'w-5 h-5 ' +
                (stats.readToday ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-stone-400')
              }
            />
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

      {/* Calendario Semanal de las Últimas 4 Semanas (Lunes a Domingo) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-slate-400">
          <span className="font-medium">Calendario de lectura (últimas 4 semanas):</span>
          <div className="flex items-center gap-1 text-[10px]">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 rounded-xs bg-[#f4ead4] dark:bg-[#141C29] border border-amber-900/15" />
            <div className="w-2.5 h-2.5 rounded-xs bg-amber-400/35 dark:bg-amber-700/40" />
            <div className="w-2.5 h-2.5 rounded-xs bg-amber-500/60 dark:bg-amber-600/55" />
            <div className="w-2.5 h-2.5 rounded-xs bg-amber-600 dark:bg-amber-400" />
            <span>Más</span>
          </div>
        </div>

        <div className="p-2 sm:p-3 rounded-xl border border-amber-900/15 dark:border-[#232E43] bg-[#f5ecda]/60 dark:bg-[#101622]/80 space-y-2">
          {/* Cabecera de los 7 días de la semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-[11px] uppercase font-bold text-stone-600 dark:text-slate-400">
            {WEEKDAY_NAMES_SHORT.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>

          {/* Cuadrícula semanal: 4 semanas × 7 días */}
          <div className="space-y-1.5 sm:space-y-2">
            {recentWeeks.map((week, wIdx) => (
              <div key={wIdx} className="grid grid-cols-7 gap-1 sm:gap-2">
                {week.map((day) => {
                  const tooltip = getDayTooltip(day);
                  return (
                    <div
                      key={day.date}
                      title={tooltip}
                      className={
                        'h-11 sm:h-12 rounded-xl border flex flex-col justify-between p-1 sm:p-1.5 cursor-default transition-all hover:scale-105 ' +
                        getCellClasses(day)
                      }
                    >
                      {/* Fila superior: Día del mes y badge HOY */}
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] sm:text-[11px] font-bold leading-none">
                          {day.dayNumber}
                          {day.dayNumber === 1 && (
                            <span className="text-[8px] font-normal opacity-70 ml-0.5">
                              {day.monthShort}
                            </span>
                          )}
                        </span>
                        {day.isToday && (
                          <span className="text-[8px] font-black tracking-tight text-amber-950 dark:text-amber-200 bg-amber-400 dark:bg-amber-500 px-1 py-0.2 rounded">
                            HOY
                          </span>
                        )}
                      </div>

                      {/* Fila inferior: Páginas leídas o indicador */}
                      <div className="text-right">
                        {day.isFuture ? (
                          <span className="text-[9px] opacity-40">·</span>
                        ) : day.pagesRead > 0 ? (
                          <span className="text-[9px] sm:text-[10px] font-black leading-none tracking-tight">
                            {day.pagesRead}p
                          </span>
                        ) : (
                          <span className="text-[9px] opacity-35 leading-none">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
