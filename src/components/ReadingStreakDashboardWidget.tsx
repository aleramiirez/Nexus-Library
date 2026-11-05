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
  const [tick, setTick] = useState(0);

  // Estado para el editor manual de día
  const [editingDay, setEditingDay] = useState<{
    date: string;
    label: string;
    pages: number;
    hasEntry: boolean;
  } | null>(null);
  const [editPagesInput, setEditPagesInput] = useState('');

  // Suscribirse a cambios en la racha
  useEffect(() => {
    return readingStreakService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const stats: ReadingStreakStats = useMemo(() => {
    return readingStreakService.getReadingStreakStats(books);
  }, [books, tick]);

  // 4 semanas completas estructuradas de Lunes a Domingo (28 días)
  const flatDays: CalendarDayView[] = useMemo(() => {
    return readingStreakService.getRecentCalendarWeeks(books, 4).flat();
  }, [books, tick]);

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

  const handleOpenDayEditor = (day: CalendarDayView) => {
    if (day.isFuture) return;
    const monthIdx = Math.max(0, Math.min(11, parseInt(day.date.split('-')[1] || '1', 10) - 1));
    const mFull = MONTH_FULL_LOWER[monthIdx];
    const wFull = [
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    ][day.weekdayIndex] || '';
    const label = `${wFull}, ${day.dayNumber} de ${mFull}`;

    setEditingDay({
      date: day.date,
      label,
      pages: day.pagesRead,
      hasEntry: day.pagesRead > 0 || day.level > 0
    });
    setEditPagesInput(day.pagesRead > 0 ? String(day.pagesRead) : '0');
  };

  const handleStepPages = (delta: number) => {
    const current = parseInt(editPagesInput.trim(), 10) || 0;
    const next = Math.max(0, current + delta);
    setEditPagesInput(String(next));
  };

  const handleShortcutPages = (add: number) => {
    const current = parseInt(editPagesInput.trim(), 10) || 0;
    const next = Math.max(0, current + add);
    setEditPagesInput(String(next));
  };

  const handleSaveDayPages = () => {
    if (!editingDay) return;
    const parsed = parseInt(editPagesInput.trim(), 10);
    const pagesToSave = isNaN(parsed) ? 0 : Math.max(0, parsed);
    readingStreakService.setManualReadingLogForDate(editingDay.date, pagesToSave, pagesToSave > 0);
    if (pagesToSave > 0) {
      soundService.playWaxSeal(true);
      onShowToast?.(`✓ Lectura del ${editingDay.label} guardada (${pagesToSave} págs).`, {
        type: 'success'
      });
    } else {
      soundService.playPageTurn(true);
      onShowToast?.(`Registro del ${editingDay.label} eliminado.`, {
        type: 'info'
      });
    }
    setEditingDay(null);
  };

  const handleDeleteDayEntry = () => {
    if (!editingDay) return;
    readingStreakService.setManualReadingLogForDate(editingDay.date, 0, false);
    soundService.playPageTurn(true);
    onShowToast?.(`Registro del ${editingDay.label} eliminado.`, {
      type: 'info'
    });
    setEditingDay(null);
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
                  className={`nx-streak-s ${lvClass} ${!day.isFuture ? 'cursor-pointer' : ''}`}
                  style={{ '--i': i } as React.CSSProperties}
                  tabIndex={!day.isFuture ? 0 : undefined}
                  role={!day.isFuture ? 'button' : undefined}
                  title={tooltip || undefined}
                  aria-label={ariaLabel}
                  onClick={() => {
                    if (!day.isFuture) {
                      handleOpenDayEditor(day);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !day.isFuture) {
                      e.preventDefault();
                      handleOpenDayEditor(day);
                    }
                  }}
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

        {/* Editor manual de lectura al pulsar en un día */}
        {editingDay && (
          <div
            className="nx-streak-editor-box nx-day-editor-box"
            role="region"
            aria-label="Editor manual de lectura"
          >
            {/* Cabecera editorial con icono, fecha, badge de páginas y botón cerrar */}
            <div className="nx-day-editor-header">
              <div className="nx-day-editor-title-wrap">
                <svg
                  className="nx-day-editor-ribbon-icon"
                  viewBox="0 0 16 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M3 2h10v16l-5-4-5 4z" />
                </svg>
                <span className="nx-day-editor-title">
                  📅 {editingDay.label}
                </span>
                <span className="opacity-40">·</span>
                <span
                  className={`nx-day-editor-badge ${editingDay.pages > 0 ? 'has-pages' : ''}`}
                >
                  {editingDay.pages > 0
                    ? `${editingDay.pages} ${editingDay.pages === 1 ? 'pág' : 'págs'} registradas`
                    : 'Sin registro'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingDay(null)}
                className="nx-day-editor-close"
                aria-label="Cerrar editor"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Fila principal de controles: botones circulares +/- , atajos y acciones */}
            <div className="nx-day-editor-body">
              {/* Selector con botones redondos - y + */}
              <div className="nx-day-input-group">
                <button
                  type="button"
                  onClick={() => handleStepPages(-1)}
                  className="nx-day-step-btn"
                  aria-label="Restar una página"
                  title="-1 pág"
                >
                  −
                </button>
                <input
                  id="manual-day-pages-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="9999"
                  value={editPagesInput}
                  onChange={(e) => setEditPagesInput(e.target.value)}
                  placeholder="0"
                  className="nx-day-number-input"
                  autoFocus
                  aria-label="Páginas leídas ese día"
                />
                <span className="nx-day-suffix">págs</span>
                <button
                  type="button"
                  onClick={() => handleStepPages(1)}
                  className="nx-day-step-btn"
                  aria-label="Sumar una página"
                  title="+1 pág"
                >
                  +
                </button>
              </div>

              {/* Atajos rápidos en pastillas doradas punteadas estilo Dark Academia */}
              <div className="nx-day-shortcuts">
                <button
                  type="button"
                  onClick={() => handleShortcutPages(10)}
                  className="nx-day-shortcut-btn"
                  title="Añadir 10 páginas"
                >
                  +10
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcutPages(25)}
                  className="nx-day-shortcut-btn"
                  title="Añadir 25 páginas"
                >
                  +25
                </button>
                <button
                  type="button"
                  onClick={() => handleShortcutPages(50)}
                  className="nx-day-shortcut-btn"
                  title="Añadir 50 páginas"
                >
                  +50
                </button>
              </div>

              {/* Acciones: Guardar y Borrar */}
              <div className="nx-day-actions">
                {editingDay.hasEntry && (
                  <button
                    type="button"
                    onClick={handleDeleteDayEntry}
                    className="nx-day-delete-btn"
                    title="Eliminar registro de este día"
                  >
                    Borrar día
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveDayPages}
                  className="nx-day-save-btn"
                >
                  ✓ Guardar
                </button>
              </div>
            </div>
          </div>
        )}
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
