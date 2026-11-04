import React, { useState, useEffect, useMemo } from 'react';
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

const WEEKDAY_HEADERS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const WEEKDAY_SHORT_LOWER = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MONTH_SHORT_LOWER = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_FULL_LOWER = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const MILESTONES = [3, 7, 14, 30, 60, 100];

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

  // 4 semanas completas estructuradas de Lunes a Domingo (28 días)
  const flatDays: CalendarDayView[] = useMemo(() => {
    return readingStreakService.getRecentCalendarWeeks(books, 4).flat();
  }, [books]);

  // Determinar qué tramo del calendario pertenece a la racha activa actual para iluminar el cordón dorado
  const { streakStartIdx, streakEndIdx } = useMemo(() => {
    const todayIdx = flatDays.findIndex((d) => d.isToday);
    if (todayIdx < 0) return { streakStartIdx: -1, streakEndIdx: -1 };

    let endIdx = -1;
    if (flatDays[todayIdx].pagesRead > 0) {
      endIdx = todayIdx;
    } else if (todayIdx > 0 && flatDays[todayIdx - 1].pagesRead > 0) {
      endIdx = todayIdx - 1;
    }

    if (endIdx < 0) return { streakStartIdx: -1, streakEndIdx: -1 };

    let startIdx = endIdx;
    while (startIdx > 0 && !flatDays[startIdx - 1].isFuture && flatDays[startIdx - 1].pagesRead > 0) {
      startIdx--;
    }

    return { streakStartIdx: startIdx, streakEndIdx: endIdx };
  }, [flatDays]);

  const handleManualCheckIn = () => {
    readingStreakService.markReadTodayManually(20);
    soundService.playWaxSeal(true);
    soundService.playBrassBell(true);
    onShowToast?.('🔥 ¡Lectura de hoy registrada! La llama sigue encendida.', {
      type: 'success'
    });
  };

  const progressPercentage = useMemo(() => {
    if (stats.bestStreak <= 0) return 0;
    return Math.min(100, Number(((stats.currentStreak / stats.bestStreak) * 100).toFixed(1)));
  }, [stats.currentStreak, stats.bestStreak]);

  const recordRemainingDays = Math.max(0, stats.bestStreak - stats.currentStreak);

  const getLevelClass = (day: CalendarDayView): string => {
    if (day.isFuture) return 'fu';
    if (day.pagesRead <= 0) return 'l0';
    if (day.pagesRead < 20) return 'l1';
    if (day.pagesRead < 50) return 'l2';
    if (day.pagesRead < 100) return 'l3';
    return 'l4';
  };

  return (
    <section className="nx-streak-w" aria-label="Hábito y racha de lectura">
      {/* Cabecera */}
      <div className="nx-streak-hd">
        <div>
          <h2 className="nx-streak-title">Hábito y Racha de Lectura</h2>
          <p className="nx-streak-sub">
            {stats.activeDaysThisYear} {stats.activeDaysThisYear === 1 ? 'día activo' : 'días activos'} en {new Date().getFullYear()}
          </p>
        </div>

        {onNavigateToStats && (
          <button
            type="button"
            onClick={onNavigateToStats}
            className="nx-streak-lk"
          >
            Mapa anual (365d) ›
          </button>
        )}
      </div>

      {/* Hero: Tarjeta protagonista de Racha Actual + 2 filas compactas */}
      <div className="nx-streak-hero">
        <div className="nx-streak-rc">
          <svg className="nx-streak-fl" viewBox="0 0 24 28" aria-hidden="true">
            <defs>
              <linearGradient id="nxStreakFlameGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#C2381F" />
                <stop offset=".55" stopColor="#F08A24" />
                <stop offset="1" stopColor="#FFD35C" />
              </linearGradient>
            </defs>
            <path
              d="M12 1C12 1 4 9 4 17a8 8 0 0 0 16 0c0-3.5-2-6-3.500-8.500C15.500 10.500 14.500 12 13 12 13 8 13 5 12 1z"
              fill="url(#nxStreakFlameGrad)"
            />
            <path
              d="M12 15c0 0-3 2.500-3 5a3 3 0 0 0 6 0c0-2.500-3-5-3-5z"
              fill="#FFF0B8"
              opacity=".85"
            />
          </svg>

          <div style={{ flex: 1 }}>
            <div className="nx-streak-lb">Racha actual</div>
            <div className="nx-streak-num">
              {stats.currentStreak}
              <small>{stats.currentStreak === 1 ? 'día' : 'días'}</small>
            </div>
            <div className="nx-streak-pr" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
              <i style={{ width: `${progressPercentage}%` }} />
            </div>
            <div className="nx-streak-pt">
              {stats.bestStreak === 0 ? (
                'Comienza hoy tu primera racha de lectura'
              ) : recordRemainingDays > 0 ? (
                `Récord: ${stats.bestStreak} ${stats.bestStreak === 1 ? 'día' : 'días'} · te ${
                  recordRemainingDays === 1 ? 'falta 1' : `faltan ${recordRemainingDays}`
                } para igualarlo`
              ) : (
                `Récord: ${stats.bestStreak} ${stats.bestStreak === 1 ? 'día' : 'días'} · ¡en tu récord personal!`
              )}
            </div>
          </div>
        </div>

        <div className="nx-streak-st">
          <div className="nx-streak-sx">
            <span className="nx-streak-lb">Mejor racha</span>
            <b>
              {stats.bestStreak} {stats.bestStreak === 1 ? 'día' : 'días'}
            </b>
          </div>
          <div className="nx-streak-sx">
            <span className="nx-streak-lb">Páginas hoy</span>
            <b>{stats.pagesReadToday}</b>
          </div>
        </div>
      </div>

      {/* Chips de Hitos */}
      <div className="nx-streak-ms">
        <span className="nx-streak-lb" style={{ marginRight: '.2rem' }}>
          Hitos
        </span>
        {MILESTONES.map((m) => {
          const reached = stats.currentStreak >= m;
          return (
            <span
              key={m}
              className={'nx-streak-mc' + (reached ? ' ok' : '')}
            >
              {reached ? '✓ ' : ''}
              {m} días
            </span>
          );
        })}
      </div>

      {/* Calendario de 4 semanas (Sellos de lacre y cordón) */}
      <div className="nx-streak-cal">
        <div className="nx-streak-wk">
          {WEEKDAY_HEADERS.map((dayName) => (
            <span key={dayName}>{dayName}</span>
          ))}
        </div>

        <div className="nx-streak-gr">
          {flatDays.map((day, i) => {
            const monthIdx = Math.max(0, Math.min(11, parseInt(day.date.split('-')[1] || '1', 10) - 1));
            const mShort = MONTH_SHORT_LOWER[monthIdx];
            const mFull = MONTH_FULL_LOWER[monthIdx];
            const wShort = WEEKDAY_SHORT_LOWER[day.weekdayIndex] || '';

            const nextDay = flatDays[i + 1];
            const hasCord =
              !day.isFuture &&
              day.pagesRead > 0 &&
              i % 7 < 6 &&
              nextDay &&
              !nextDay.isFuture &&
              nextDay.pagesRead > 0;

            const isCurrentCord =
              Boolean(hasCord) &&
              streakEndIdx >= 0 &&
              i >= streakStartIdx &&
              i + 1 <= streakEndIdx;

            const showMonthPill = i === 0 || day.dayNumber === 1;
            const lvClass = getLevelClass(day);

            const tooltip = day.isFuture
              ? ''
              : `${wShort} ${day.dayNumber} ${mShort} · ${
                  day.pagesRead > 0 ? `${day.pagesRead} páginas` : 'sin lectura'
                }`;

            const ariaLabel = `${day.dayNumber} de ${mFull}, ${
              day.isFuture
                ? 'día futuro'
                : day.pagesRead > 0
                  ? `${day.pagesRead} páginas`
                  : 'sin lectura'
            }`;

            const cellClasses = [
              'nx-streak-d',
              hasCord ? 'k' : '',
              isCurrentCord ? 'c' : '',
              day.isToday ? 't' : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={day.date} className={cellClasses}>
                {showMonthPill && (
                  <span className="nx-streak-mo">{mShort.toUpperCase()}</span>
                )}
                {day.isToday && <span className="nx-streak-tg">HOY</span>}

                <div
                  className={`nx-streak-s ${lvClass}`}
                  style={{ '--i': i } as React.CSSProperties}
                  tabIndex={0}
                  title={tooltip || undefined}
                  aria-label={ariaLabel}
                  onClick={
                    day.isToday && !stats.readToday ? handleManualCheckIn : undefined
                  }
                >
                  {day.dayNumber}
                </div>

                <span className="nx-streak-pg">
                  {!day.isFuture && day.pagesRead > 0 ? `${day.pagesRead} p` : ''}
                </span>
              </div>
            );
          })}
        </div>

        <div className="nx-streak-lg" aria-hidden="true">
          Menos
          <span className="nx-streak-s l0" />
          <span className="nx-streak-s l1" />
          <span className="nx-streak-s l2" />
          <span className="nx-streak-s l3" />
          <span className="nx-streak-s l4" />
          Más
        </div>
      </div>

      {/* Pie con línea lateral dorada y frase en cursiva Cormorant */}
      <div className="nx-streak-ft">
        <div className="nx-streak-ink">
          {stats.readToday ? (
            <span>
              <b>
                Hoy has leído {stats.pagesReadToday}{' '}
                {stats.pagesReadToday === 1 ? 'página' : 'páginas'}.
              </b>{' '}
              La llama sigue encendida.
            </span>
          ) : (
            <>
              <span>
                <b>Hoy aún no has sellado tu lectura.</b>
              </span>
              <button
                type="button"
                onClick={handleManualCheckIn}
                className="text-xs font-semibold px-3 py-1 rounded-full border border-[#D8C4A0] dark:border-[#283246] bg-[#F5EAD3] dark:bg-[#151A24] text-[#B07A1E] dark:text-[#E5C158] hover:opacity-90 transition cursor-pointer"
                title="Estampar sello de lectura de hoy"
              >
                🔥 Marcar que he leído hoy
              </button>
            </>
          )}
        </div>

        <i>
          {stats.readToday
            ? '¡Excelente constancia hoy!'
            : 'Unos minutos al día mantienen viva la llama.'}
        </i>
      </div>
    </section>
  );
};
