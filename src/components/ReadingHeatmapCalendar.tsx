import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Book } from '../types/models';
import { readingStreakService } from '../services/readingStreakService';

interface ReadingHeatmapCalendarProps {
  books: Book[];
  initialYear?: number;
}

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const MONTH_NAMES_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const WEEKDAY_NAMES_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const WEEKDAY_NAMES_FULL = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
];

const ROW_LABELS = ['Lun', '', 'Mié', '', 'Vie', '', 'Dom'];

interface DayCellData {
  dayIndex: number; // 0..364 o 365
  dateObj: Date;
  iso: string;
  dayNumber: number;
  monthShort: string;
  monthFull: string;
  weekdayShort: string;
  weekdayFull: string;
  pages: number;
  levelClass: string;
  isToday: boolean;
  isFuture: boolean;
}

export const ReadingHeatmapCalendar: React.FC<ReadingHeatmapCalendarProps> = ({
  books,
  initialYear
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || currentYear);
  const [selectedDay, setSelectedDay] = useState<DayCellData | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayCellData | null>(null);
  const [editPagesInput, setEditPagesInput] = useState('');
  const [tick, setTick] = useState(0);

  const scRef = useRef<HTMLDivElement>(null);

  // Suscribirse a cambios en la racha para actualizar el mapa en vivo
  useEffect(() => {
    return readingStreakService.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  // Años disponibles (año actual y hasta 3 anteriores)
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
  }, [books, selectedYear, tick]);

  const handleSelectDay = (day: DayCellData) => {
    if (day.isFuture) return;
    setSelectedDay(day);
    setEditPagesInput(day.pages > 0 ? String(day.pages) : '0');
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

  const handleSaveSelectedDayPages = () => {
    if (!selectedDay) return;
    const p = parseInt(editPagesInput.trim(), 10);
    const pagesToSave = isNaN(p) ? 0 : Math.max(0, p);
    readingStreakService.setManualReadingLogForDate(selectedDay.iso, pagesToSave, pagesToSave > 0);
    setSelectedDay((prev) => (prev ? { ...prev, pages: pagesToSave } : null));
  };

  const handleDeleteSelectedDayEntry = () => {
    if (!selectedDay) return;
    readingStreakService.setManualReadingLogForDate(selectedDay.iso, 0, false);
    setEditPagesInput('0');
    setSelectedDay((prev) => (prev ? { ...prev, pages: 0 } : null));
  };

  // Helpers de fechas locales
  const isLeap = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || (selectedYear % 400 === 0);
  const daysInYear = isLeap ? 366 : 365;

  const toIso = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());

  // Construir array de los 365/366 días del año seleccionado
  const daysArray: DayCellData[] = useMemo(() => {
    const list: DayCellData[] = [];
    for (let d = 0; d < daysInYear; d++) {
      const dateObj = new Date(selectedYear, 0, d + 1);
      const m = dateObj.getMonth();
      const dayNum = dateObj.getDate();
      const iso = toIso(selectedYear, m, dayNum);
      const isToday = iso === todayIso;
      const isFuture = iso > todayIso;

      const entry = heatmapMap.get(iso);
      const pages = !isFuture && entry ? entry.pagesRead : 0;

      let levelClass = 'l0';
      if (isFuture) {
        levelClass = 'fu';
      } else if (pages === 0) {
        levelClass = 'l0';
      } else if (pages < 20) {
        levelClass = 'l1';
      } else if (pages < 50) {
        levelClass = 'l2';
      } else if (pages < 100) {
        levelClass = 'l3';
      } else {
        levelClass = 'l4';
      }

      const wIdx = dateObj.getDay();

      list.push({
        dayIndex: d,
        dateObj,
        iso,
        dayNumber: dayNum,
        monthShort: MONTH_NAMES_SHORT[m],
        monthFull: MONTH_NAMES_FULL[m],
        weekdayShort: WEEKDAY_NAMES_SHORT[wIdx],
        weekdayFull: WEEKDAY_NAMES_FULL[wIdx],
        pages,
        levelClass,
        isToday,
        isFuture
      });
    }
    return list;
  }, [selectedYear, daysInYear, heatmapMap, todayIso]);

  // Estadísticas del año
  const {
    activeDays,
    totalPages,
    dailyAvg,
    bestStreakLen,
    bestStreakStartIdx,
    bestMonthName,
    bestWeekdayName
  } = useMemo(() => {
    let act = 0;
    let sum = 0;
    const monthTotals = new Array(12).fill(0);
    const weekdayTotals = new Array(7).fill(0);

    let best = 0;
    let bestStart = 0;
    let run = 0;
    let runStart = 0;

    daysArray.forEach((day, i) => {
      if (!day.isFuture && day.pages > 0) {
        act++;
        sum += day.pages;
        monthTotals[day.dateObj.getMonth()] += day.pages;
        weekdayTotals[day.dateObj.getDay()] += day.pages;

        if (run === 0) runStart = i;
        run++;
        if (run > best) {
          best = run;
          bestStart = runStart;
        }
      } else {
        run = 0;
      }
    });

    const avg = act > 0 ? Math.round(sum / act) : 0;
    const bMonth = monthTotals.indexOf(Math.max(...monthTotals));
    const bWeekday = weekdayTotals.indexOf(Math.max(...weekdayTotals));

    return {
      activeDays: act,
      totalPages: sum,
      dailyAvg: avg,
      bestStreakLen: best,
      bestStreakStartIdx: bestStart,
      bestMonthName: MONTH_NAMES_FULL[bMonth] || 'Ninguno',
      bestWeekdayName: WEEKDAY_NAMES_FULL[bWeekday] || 'Ninguno'
    };
  }, [daysArray]);

  // Cuadrícula: columnas semanales de Lunes (0) a Domingo (6)
  const firstDayOfYear = new Date(selectedYear, 0, 1);
  const mondayOffset = (firstDayOfYear.getDay() + 6) % 7;
  const totalColumns = Math.ceil((mondayOffset + daysInYear) / 7);

  // Posiciones de los meses para las cabeceras de columnas
  const monthHeaders = useMemo(() => {
    return MONTH_NAMES_SHORT.map((mShort, mIdx) => {
      const monthFirstDate = new Date(selectedYear, mIdx, 1);
      const dayIdx = Math.round(
        (monthFirstDate.getTime() - firstDayOfYear.getTime()) / (1000 * 60 * 60 * 24)
      );
      const col = Math.floor((mondayOffset + dayIdx) / 7);
      return { label: mShort, col };
    });
  }, [selectedYear, mondayOffset, firstDayOfYear]);

  // Desplazamiento horizontal inicial centrado en "HOY" en móvil
  useEffect(() => {
    if (scRef.current) {
      if (selectedYear === currentYear) {
        const todayDayIdx = daysArray.findIndex((d) => d.isToday);
        if (todayDayIdx >= 0) {
          const col = Math.floor((mondayOffset + todayDayIdx) / 7);
          scRef.current.scrollLeft = Math.max(0, col * 19 - scRef.current.clientWidth + 90);
        }
      } else {
        scRef.current.scrollLeft = 0;
      }
    }
  }, [selectedYear, currentYear, daysArray, mondayOffset]);

  // Texto de la mejor racha con fechas
  const bestStreakDateText = useMemo(() => {
    if (bestStreakLen <= 0) return '';
    const startDay = daysArray[bestStreakStartIdx];
    const endDay = daysArray[bestStreakStartIdx + bestStreakLen - 1];
    if (!startDay || !endDay) return '';
    return `(${startDay.weekdayShort} ${startDay.dayNumber} ${startDay.monthShort} → ${endDay.weekdayShort} ${endDay.dayNumber} ${endDay.monthShort})`;
  }, [bestStreakLen, bestStreakStartIdx, daysArray]);

  const activeDisplayDay = hoveredDay || selectedDay;

  return (
    <section className="nx-heatmap-w" aria-label="Mapa de calor de lectura anual">
      {/* Cabecera y Selector de Año */}
      <div className="nx-heatmap-hd">
        <div className="nx-heatmap-tt">
          <div className="nx-heatmap-ic" aria-hidden="true">
            <Calendar className="w-5 h-5 text-amber-100" />
          </div>
          <div>
            <h2 className="nx-heatmap-title">Mapa de Calor de Lectura Anual</h2>
            <p className="nx-heatmap-sub">
              Visualización completa de constancia y páginas leídas en {selectedYear}
            </p>
          </div>
        </div>

        <div className="nx-heatmap-yr" role="group" aria-label="Selector de año">
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => {
                setSelectedYear(yr);
                setSelectedDay(null);
                setHoveredDay(null);
              }}
              className={yr === selectedYear ? 'on' : ''}
              aria-pressed={yr === selectedYear}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Estadísticas con carácter */}
      <div className="nx-heatmap-stats">
        {/* Días con lectura */}
        <div className="nx-heatmap-sx">
          <svg className="nx-heatmap-rg" viewBox="0 0 56 56" aria-hidden="true">
            <defs>
              <linearGradient id="nxHeatmapRingGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E5C158" />
                <stop offset="100%" stopColor="#C2485A" />
              </linearGradient>
            </defs>
            <circle className="bgc" cx="28" cy="28" r="22" />
            <circle
              className="fg"
              cx="28"
              cy="28"
              r="22"
              strokeDasharray="138.2"
              strokeDashoffset={138.2 * (1 - activeDays / daysInYear)}
            />
          </svg>
          <div>
            <div className="nx-heatmap-lb">Días con lectura</div>
            <div className="nx-heatmap-nm">
              {activeDays}
              <small>/ {daysInYear}</small>
            </div>
            <div className="nx-heatmap-nt">
              {Math.round((activeDays / daysInYear) * 100)}% del año con la llama encendida
            </div>
          </div>
        </div>

        {/* Páginas anuales */}
        <div className="nx-heatmap-sx">
          <div>
            <div className="nx-heatmap-lb">Páginas anuales</div>
            <div className="nx-heatmap-nm">{totalPages.toLocaleString('es-ES')}</div>
            <div className="nx-heatmap-nt">
              ≈ {Math.round(totalPages / 350)} novelas de 350 páginas
            </div>
          </div>
        </div>

        {/* Media diaria activa */}
        <div className="nx-heatmap-sx">
          <div>
            <div className="nx-heatmap-lb">Media diaria activa</div>
            <div className="nx-heatmap-nm">
              ~{dailyAvg}
              <small>p/día</small>
            </div>
            <div className="nx-heatmap-nt">solo contando los días que lees</div>
          </div>
        </div>
      </div>

      {/* Fila de chips «Lo que cuentan tus sellos» */}
      {bestStreakLen > 0 && (
        <div className="nx-heatmap-in">
          <span className="nx-heatmap-ch">
            🔥 Mejor racha: <b>{bestStreakLen} {bestStreakLen === 1 ? 'día' : 'días'}</b> {bestStreakDateText}
          </span>
          <span className="nx-heatmap-ch">
            📆 Mes más lector: <b>{bestMonthName}</b>
          </span>
          <span className="nx-heatmap-ch">
            ⭐ Tu día fuerte: <b>{bestWeekdayName}</b>
          </span>
        </div>
      )}

      {/* Cuadrícula Ceremonial de Sellos de Lacre (52+ semanas) */}
      <div className="nx-heatmap-cal">
        <div className="nx-heatmap-sc" ref={scRef}>
          <div className="nx-heatmap-hw">
            {/* Etiquetas de días de la semana a la izquierda (Lun, Mié, Vie, Dom) */}
            <div className="nx-heatmap-rl" aria-hidden="true">
              {ROW_LABELS.map((lbl, idx) => (
                <span key={idx}>{lbl}</span>
              ))}
            </div>

            <div className="nx-heatmap-hs">
              {/* Etiquetas de los meses alineadas en cabecera */}
              <div className="nx-heatmap-mw" aria-hidden="true">
                {monthHeaders.map((m) => (
                  <span
                    key={m.label}
                    className="nx-heatmap-ml"
                    style={{ left: `calc(${m.col} * (var(--z) + var(--g)))` }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>

              {/* Matriz de sellos (filas = Lun..Dom, columnas = semanas) */}
              <div className="nx-heatmap-hm">
                {Array.from({ length: totalColumns * 7 }).map((_, i) => {
                  const d = i - mondayOffset;
                  if (d < 0 || d >= daysInYear) {
                    return <div key={`empty-${i}`} className="nx-heatmap-c x" aria-hidden="true" />;
                  }

                  const day = daysArray[d];
                  const col = Math.floor(i / 7);
                  const isSelected = selectedDay?.iso === day.iso;

                  // Cordón vertical entre días consecutivos leídos dentro de la misma columna
                  const nextD = d + 1;
                  const hasNextInColumn = i % 7 < 6 && nextD < daysInYear;
                  const nextDay = hasNextInColumn ? daysArray[nextD] : null;

                  const hasCord =
                    Boolean(
                      hasNextInColumn &&
                        !day.isFuture &&
                        day.pages > 0 &&
                        nextDay &&
                        !nextDay.isFuture &&
                        nextDay.pages > 0
                    );

                  const isBestStreakDay =
                    bestStreakLen > 1 &&
                    d >= bestStreakStartIdx &&
                    d < bestStreakStartIdx + bestStreakLen;

                  const isBestStreakCord =
                    hasCord &&
                    isBestStreakDay &&
                    nextD < bestStreakStartIdx + bestStreakLen;

                  const cellClasses = [
                    'nx-heatmap-c',
                    hasCord ? 'k' : '',
                    isBestStreakDay ? 'b' : '',
                    day.isToday ? 't' : '',
                    isSelected ? 'sel' : ''
                  ]
                    .filter(Boolean)
                    .join(' ');

                  const ariaLabel = `${day.weekdayShort} ${day.dayNumber} ${day.monthShort}, ${
                    day.isFuture
                      ? 'día futuro'
                      : day.pages > 0
                        ? `${day.pages} páginas`
                        : 'sin lectura'
                  }`;

                  return (
                    <div
                      key={day.iso}
                      className={cellClasses}
                      tabIndex={!day.isFuture ? 0 : undefined}
                      role={!day.isFuture ? 'button' : undefined}
                      aria-label={ariaLabel}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onFocus={() => setHoveredDay(day)}
                      onBlur={() => setHoveredDay(null)}
                      onClick={() => handleSelectDay(day)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !day.isFuture) {
                          e.preventDefault();
                          handleSelectDay(day);
                        }
                      }}
                    >
                      <b
                        className={`nx-heatmap-s ${day.levelClass} ${!day.isFuture ? 'cursor-pointer' : ''}`}
                        style={{ '--col': col } as React.CSSProperties}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="nx-heatmap-hint">Desliza hacia los lados para recorrer el año →</div>

        {/* Pie con inspección de fecha seleccionada y escala de niveles */}
        <div className="nx-heatmap-ft">
          <div className="nx-heatmap-dt" aria-live="polite">
            {activeDisplayDay ? (
              <>
                <span
                  className={`nx-heatmap-s ${activeDisplayDay.levelClass}`}
                  style={{ width: 16, height: 16, display: 'inline-block', animation: 'none' }}
                />
                <span>
                  <b>
                    {activeDisplayDay.weekdayFull} {activeDisplayDay.dayNumber} de{' '}
                    {activeDisplayDay.monthFull}
                  </b>{' '}
                  ·{' '}
                  {activeDisplayDay.pages > 0
                    ? `${activeDisplayDay.pages} páginas`
                    : 'sin lectura'}
                </span>
              </>
            ) : (
              <span>Toca cualquier día para ver el detalle de páginas.</span>
            )}
          </div>

          <div className="nx-heatmap-lg" aria-hidden="true">
            Menos
            <span className="nx-heatmap-s l0" style={{ transform: 'scale(0.6)' }} />
            <span className="nx-heatmap-s l1" />
            <span className="nx-heatmap-s l2" />
            <span className="nx-heatmap-s l3" />
            <span className="nx-heatmap-s l4" />
            Más
          </div>
        </div>

        {/* Editor manual de lectura al pulsar en un día del mapa de calor */}
        {selectedDay && !selectedDay.isFuture && (
          <div
            className="nx-heatmap-editor-box nx-day-editor-box"
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
                  📅 {selectedDay.weekdayFull} {selectedDay.dayNumber} de {selectedDay.monthFull} {selectedYear}
                </span>
                <span className="opacity-40">·</span>
                <span
                  className={`nx-day-editor-badge ${selectedDay.pages > 0 ? 'has-pages' : ''}`}
                >
                  {selectedDay.pages > 0
                    ? `${selectedDay.pages} ${selectedDay.pages === 1 ? 'pág' : 'págs'} registradas`
                    : 'Sin registro'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
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
                  id="manual-heatmap-pages-input"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="9999"
                  value={editPagesInput}
                  onChange={(e) => setEditPagesInput(e.target.value)}
                  placeholder="0"
                  className="nx-day-number-input"
                  autoFocus
                  aria-label="Páginas leídas en esta fecha"
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
                {selectedDay.pages > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedDayEntry}
                    className="nx-day-delete-btn"
                    title="Eliminar registro de esta fecha"
                  >
                    Borrar día
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveSelectedDayPages}
                  className="nx-day-save-btn"
                >
                  ✓ Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
