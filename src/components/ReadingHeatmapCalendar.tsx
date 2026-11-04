import React, { useState, useMemo } from 'react';
import { Calendar, Flame, ChevronLeft, ChevronRight, BookOpen, Sparkles } from 'lucide-react';
import { Book } from '../types/models';
import { readingStreakService, HeatmapDayData } from '../services/readingStreakService';

interface ReadingHeatmapCalendarProps {
  books: Book[];
  initialYear?: number;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const DAY_LABELS = ['Lun', '', 'Mié', '', 'Vie', '', 'Dom'];

export const ReadingHeatmapCalendar: React.FC<ReadingHeatmapCalendarProps> = ({
  books,
  initialYear
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || currentYear);
  const [selectedDay, setSelectedDay] = useState<HeatmapDayData | null>(null);

  // Generar años disponibles (últimos 3 años y el actual)
  const availableYears = useMemo(() => {
    const years = [currentYear];
    for (let i = 1; i <= 3; i++) {
      years.push(currentYear - i);
    }
    return years.sort((a, b) => b - a);
  }, [currentYear]);

  // Mapa de calor para el año seleccionado
  const heatmapMap = useMemo(() => {
    return readingStreakService.buildReadingHeatmapData(books, selectedYear);
  }, [books, selectedYear]);

  // Resumen del año seleccionado
  const yearSummary = useMemo(() => {
    let totalPages = 0;
    let activeDays = 0;
    heatmapMap.forEach((d) => {
      if (d.pagesRead > 0) {
        totalPages += d.pagesRead;
        activeDays++;
      }
    });
    const avgPerActiveDay = activeDays > 0 ? Math.round(totalPages / activeDays) : 0;
    return { totalPages, activeDays, avgPerActiveDay };
  }, [heatmapMap]);

  // Construir las semanas para la cuadrícula del año (53 columnas × 7 filas)
  const calendarWeeks = useMemo(() => {
    const weeks: Array<Array<{ date: string; data: HeatmapDayData | null }>> = [];

    // Inicio: 1 de enero del año seleccionado
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31);

    // Ajustar para empezar en Lunes (0 = Domingo en JS, queremos 0 = Lunes)
    // Lun = 0, Mar = 1 ... Dom = 6
    const getAdjustedDay = (d: Date) => (d.getDay() + 6) % 7;

    const currentCursor = new Date(startOfYear);
    // Retroceder al lunes de la primera semana
    currentCursor.setDate(currentCursor.getDate() - getAdjustedDay(startOfYear));

    while (currentCursor <= endOfYear || weeks.length < 52) {
      const currentWeek: Array<{ date: string; data: HeatmapDayData | null }> = [];
      for (let dayRow = 0; dayRow < 7; dayRow++) {
        const iso = currentCursor.toISOString().slice(0, 10);
        const isCurrentYear = currentCursor.getFullYear() === selectedYear;

        if (isCurrentYear) {
          const entry = heatmapMap.get(iso) || {
            date: iso,
            pagesRead: 0,
            level: 0,
            bookIds: [],
            source: 'log',
            dayOfWeek: currentCursor.getDay()
          };
          currentWeek.push({ date: iso, data: entry });
        } else {
          currentWeek.push({ date: iso, data: null });
        }
        currentCursor.setDate(currentCursor.getDate() + 1);
      }
      weeks.push(currentWeek);
      if (currentCursor > endOfYear && currentWeek[6].date >= endOfYear.toISOString().slice(0, 10)) {
        break;
      }
    }

    return weeks;
  }, [selectedYear, heatmapMap]);

  // Etiquetas de meses con la columna de semana donde empiezan
  const monthLabels = useMemo(() => {
    const labels: Array<{ monthIndex: number; weekIndex: number; label: string }> = [];
    calendarWeeks.forEach((week, weekIndex) => {
      week.forEach((cell) => {
        if (cell.data) {
          const parts = cell.date.split('-');
          const day = parseInt(parts[2], 10);
          const month = parseInt(parts[1], 10) - 1;
          if (day === 1 && !labels.some((l) => l.monthIndex === month)) {
            labels.push({
              monthIndex: month,
              weekIndex,
              label: MONTH_NAMES_SHORT[month]
            });
          }
        }
      });
    });
    return labels;
  }, [calendarWeeks]);

  const getCellClass = (level: number, isSelected: boolean) => {
    let base = '';
    switch (level) {
      case 1:
        base = 'bg-amber-400/40 dark:bg-amber-600/45 border-amber-500/40';
        break;
      case 2:
        base = 'bg-amber-500/75 dark:bg-amber-500/65 border-amber-500/60';
        break;
      case 3:
        base = 'bg-amber-600 dark:bg-amber-400 border-amber-400 text-stone-900 shadow-[0_0_6px_rgba(245,158,11,0.35)]';
        break;
      case 4:
        base = 'bg-gradient-to-br from-amber-500 via-amber-400 to-amber-200 dark:from-amber-400 dark:to-amber-100 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.55)]';
        break;
      case 0:
      default:
        base = 'bg-amber-950/10 dark:bg-[#151D2A] border-amber-900/10 dark:border-[#222E42]';
        break;
    }
    if (isSelected) {
      base += ' ring-2 ring-amber-600 dark:ring-amber-300 ring-offset-1 ring-offset-[#fffcf5] dark:ring-offset-[#0B0E14]';
    }
    return base;
  };

  const formatDetailDate = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${day} de ${MONTH_NAMES[mIdx] || parts[1]} de ${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="rounded-2xl border border-amber-900/20 dark:border-[#263147] bg-[#fbf6ea]/95 dark:bg-[#121824]/95 p-5 sm:p-6 shadow-sm space-y-5 transition-colors">
      {/* Cabecera y Selector de Año */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-900/15 dark:border-[#242F43] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-600/35 text-amber-800 dark:text-amber-300">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900 dark:text-[#f8f5ee]">
              Mapa de Calor de Lectura Anual
            </h3>
            <p className="text-xs text-stone-600 dark:text-slate-400">
              Visualización completa de constancia y páginas leídas en {selectedYear}
            </p>
          </div>
        </div>

        {/* Selector de años */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => {
                setSelectedYear(yr);
                setSelectedDay(null);
              }}
              className={
                'px-3 py-1 rounded-lg text-xs font-semibold border transition shadow-xs ' +
                (selectedYear === yr
                  ? 'border-amber-600 bg-amber-500 text-slate-950 font-bold'
                  : 'border-amber-900/20 dark:border-[#2C384F] bg-[#fbf6ea] dark:bg-[#171F2E] text-stone-700 dark:text-slate-300 hover:border-amber-500/50')
              }
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Métricas del año seleccionado */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-xl border border-amber-900/15 dark:border-[#253045] bg-[#f6edd9]/70 dark:bg-[#151D2A]/80 p-3 text-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
            Días con lectura
          </span>
          <p className="font-serif text-xl sm:text-3xl font-bold text-amber-950 dark:text-amber-300 mt-1">
            {yearSummary.activeDays} <span className="text-xs sm:text-sm font-normal text-stone-500">/ 365</span>
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/15 dark:border-[#253045] bg-[#f6edd9]/70 dark:bg-[#151D2A]/80 p-3 text-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
            Páginas anuales
          </span>
          <p className="font-serif text-xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            {yearSummary.totalPages.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-amber-900/15 dark:border-[#253045] bg-[#f6edd9]/70 dark:bg-[#151D2A]/80 p-3 text-center">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-stone-600 dark:text-slate-400">
            Media diaria activa
          </span>
          <p className="font-serif text-xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mt-1">
            ~{yearSummary.avgPerActiveDay} <span className="text-xs font-normal text-stone-500">p/día</span>
          </p>
        </div>
      </div>

      {/* Cuadrícula del Mapa de Calor (Scrolleable horizontalmente en móviles con total fluidez) */}
      <div className="overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <div className="inline-block min-w-[760px] space-y-1.5">
          {/* Etiquetas de meses */}
          <div className="flex text-[11px] font-semibold text-stone-600 dark:text-slate-400 pl-8">
            {monthLabels.map((m) => (
              <span
                key={m.monthIndex}
                style={{ marginLeft: `${m.weekIndex === 0 ? 0 : 44}px` }}
                className="w-8 shrink-0"
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Cuadrícula 7 filas (Lunes a Domingo) */}
          <div className="flex gap-1.5">
            {/* Etiquetas de días a la izquierda */}
            <div className="flex flex-col justify-between text-[9px] font-medium text-stone-500 dark:text-slate-400 w-6 shrink-0 py-0.5">
              {DAY_LABELS.map((lbl, idx) => (
                <span key={idx} className="h-3 flex items-center">
                  {lbl}
                </span>
              ))}
            </div>

            {/* Columnas de semanas */}
            <div className="flex gap-1">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((cell, dIdx) => {
                    if (!cell.data) {
                      return (
                        <div
                          key={dIdx}
                          className="w-3 h-3 rounded-xs opacity-0 pointer-events-none"
                        />
                      );
                    }
                    const day = cell.data;
                    const isSelected = selectedDay?.date === day.date;
                    const tooltip = `${formatDetailDate(day.date)}: ${day.pagesRead} páginas`;

                    return (
                      <button
                        key={dIdx}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        title={tooltip}
                        className={
                          'w-3 h-3 rounded-xs border transition-transform hover:scale-125 focus:outline-hidden ' +
                          getCellClass(day.level, isSelected)
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leyenda y Detalle de día seleccionado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-amber-900/10 dark:border-[#222E42] text-xs">
        {/* Detalle interactivo del día pulsado */}
        {selectedDay ? (
          <div className="flex items-center gap-2 text-stone-800 dark:text-slate-200 bg-amber-500/15 dark:bg-amber-400/10 border border-amber-600/35 dark:border-amber-400/30 px-3 py-1.5 rounded-xl animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>{formatDetailDate(selectedDay.date)}:</strong>{' '}
              {selectedDay.pagesRead > 0
                ? `${selectedDay.pagesRead} páginas leídas`
                : 'Sin páginas registradas este día'}
            </span>
          </div>
        ) : (
          <span className="text-stone-500 dark:text-slate-400 italic">
            Toca cualquier día de la cuadrícula para ver el detalle de páginas.
          </span>
        )}

        {/* Leyenda de intensidades */}
        <div className="flex items-center gap-1.5 text-[11px] text-stone-600 dark:text-slate-400 self-end sm:self-auto">
          <span>Menos</span>
          <div className="w-3 h-3 rounded-xs bg-amber-950/10 dark:bg-[#151D2A] border border-amber-900/15 dark:border-[#222E42]" title="0 páginas" />
          <div className="w-3 h-3 rounded-xs bg-amber-400/40 dark:bg-amber-600/45 border border-amber-500/40" title="1-15 páginas" />
          <div className="w-3 h-3 rounded-xs bg-amber-500/75 dark:bg-amber-500/65 border border-amber-500/60" title="16-35 páginas" />
          <div className="w-3 h-3 rounded-xs bg-amber-600 dark:bg-amber-400 border border-amber-400" title="36-65 páginas" />
          <div className="w-3 h-3 rounded-xs bg-gradient-to-br from-amber-500 to-amber-200 border border-amber-300" title=">65 páginas" />
          <span>Más</span>
        </div>
      </div>
    </div>
  );
};
