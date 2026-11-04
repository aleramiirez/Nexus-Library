import { Book } from '../types/models';

export function getTodayLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface DailyReadingLog {
  date: string; // 'YYYY-MM-DD'
  pagesRead: number;
  bookIds: string[];
  manualCheckIn?: boolean;
}

export interface ReadingStreakStorageState {
  logs: Record<string, DailyReadingLog>;
  bookStartPageByDate: Record<string, Record<string, number>>;
  lastUpdated: string;
}

export interface HeatmapDayData {
  date: string; // 'YYYY-MM-DD'
  pagesRead: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = sin lectura, 1 = 1-15p, 2 = 16-35p, 3 = 36-65p, 4 = >65p
  bookIds: string[];
  source: 'log' | 'retroactive';
  dayOfWeek: number; // 0 = domingo, 1 = lunes...
}

export interface CalendarDayView {
  date: string; // 'YYYY-MM-DD'
  dayNumber: number; // 1..31
  monthShort: string; // 'Oct', 'Nov'
  weekdayIndex: number; // 0 = Lun, 1 = Mar ... 6 = Dom
  pagesRead: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
  source: 'log' | 'retroactive';
  bookIds: string[];
}

export interface ReadingStreakStats {
  currentStreak: number;
  bestStreak: number;
  readToday: boolean;
  pagesReadToday: number;
  activeDaysThisYear: number;
}

const STORAGE_KEY = 'nexus_reading_streak_logs_v1';
const EVENT_NAME = 'nexus_reading_streak_updated';

function getEmptyState(): ReadingStreakStorageState {
  return {
    logs: {},
    bookStartPageByDate: {},
    lastUpdated: new Date().toISOString()
  };
}

class ReadingStreakService {
  private listeners: Set<() => void> = new Set();
  private stateCache: ReadingStreakStorageState | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.stateCache = null;
          this.notify();
        }
      });
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in readingStreakService listener:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    }
  }

  private loadState(): ReadingStreakStorageState {
    if (this.stateCache) return this.stateCache;
    if (typeof window === 'undefined' || !window.localStorage) {
      return getEmptyState();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ReadingStreakStorageState;
        if (parsed && typeof parsed.logs === 'object') {
          this.stateCache = {
            logs: parsed.logs || {},
            bookStartPageByDate: parsed.bookStartPageByDate || {},
            lastUpdated: parsed.lastUpdated || new Date().toISOString()
          };
          return this.stateCache;
        }
      }
    } catch (err) {
      console.warn('Error al cargar logs de racha:', err);
    }
    this.stateCache = getEmptyState();
    return this.stateCache;
  }

  private saveState(state: ReadingStreakStorageState): void {
    this.stateCache = state;
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      state.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('Error al guardar logs de racha:', err);
    }
    this.notify();
  }

  /**
   * Registra el avance de lectura de un libro.
   * Protección contra errores de tecleo: guarda la página inicial del día para ese libro.
   */
  public recordBookReadingProgress(
    bookId: string,
    newPage: number,
    previousPage: number,
    pagesDelta?: number,
    dateStr?: string
  ): void {
    const state = this.loadState();
    const today = dateStr || getTodayLocalDateString();

    if (!state.bookStartPageByDate[today]) {
      state.bookStartPageByDate[today] = {};
    }

    // Si es la primera interacción de hoy con este libro, fijamos la página de inicio
    if (state.bookStartPageByDate[today][bookId] === undefined) {
      state.bookStartPageByDate[today][bookId] = previousPage;
    }

    const startPage = state.bookStartPageByDate[today][bookId];
    // Páginas netas leídas hoy en este libro
    const netPagesForBookToday = Math.max(0, newPage - startPage);

    // Obtener o crear el log del día
    const currentLog: DailyReadingLog = state.logs[today] || {
      date: today,
      pagesRead: 0,
      bookIds: []
    };

    if (!currentLog.bookIds.includes(bookId)) {
      currentLog.bookIds.push(bookId);
    }

    // Si se pasa delta manual o calculamos con netPages
    if (typeof pagesDelta === 'number' && pagesDelta > 0) {
      currentLog.pagesRead = Math.max(currentLog.pagesRead, netPagesForBookToday, pagesDelta);
    } else {
      currentLog.pagesRead = Math.max(currentLog.pagesRead, netPagesForBookToday);
    }

    state.logs[today] = currentLog;
    this.saveState(state);
  }

  /**
   * Marca el día de hoy manualmente como leído ("🔥 He leído hoy").
   */
  public markReadTodayManually(pagesOptional?: number, bookId?: string): void {
    const state = this.loadState();
    const today = getTodayLocalDateString();

    const currentLog: DailyReadingLog = state.logs[today] || {
      date: today,
      pagesRead: 0,
      bookIds: []
    };

    currentLog.manualCheckIn = true;
    const addedPages = pagesOptional && pagesOptional > 0 ? pagesOptional : 15;
    currentLog.pagesRead = Math.max(currentLog.pagesRead, addedPages);

    if (bookId && !currentLog.bookIds.includes(bookId)) {
      currentLog.bookIds.push(bookId);
    }

    state.logs[today] = currentLog;
    this.saveState(state);
  }

  /**
   * Genera el mapa de calor completo combinando los logs locales y el historial de libros.
   * Si year está definido, se filtran los resultados para ese año (útil para el mapa anual de 365 días).
   * Si year es undefined, incluye todo el histórico (útil para rachas continuas y calendarios recientes).
   */
  public buildReadingHeatmapData(books: Book[], year?: number): Map<string, HeatmapDayData> {
    const state = this.loadState();
    const prefix = year ? `${year}-` : '';

    const map = new Map<string, HeatmapDayData>();

    // 1. Añadir registros directos del log local
    Object.values(state.logs).forEach((log) => {
      if ((!prefix || log.date.startsWith(prefix)) && log.pagesRead > 0) {
        const d = new Date(log.date + 'T00:00:00');
        map.set(log.date, {
          date: log.date,
          pagesRead: log.pagesRead,
          level: this.calculateLevel(log.pagesRead),
          bookIds: log.bookIds || [],
          source: 'log',
          dayOfWeek: d.getDay()
        });
      }
    });

    const today = getTodayLocalDateString();

    // 2. Fusión retroactiva con la biblioteca (libros completados, en curso y pausados)
    books.forEach((book) => {
      // 2.1 Libros completados ('✅ Leído')
      if (book.progreso === '✅ Leído') {
        const fin = book.fechaFin ? book.fechaFin.trim() : '';
        const ini = book.fechaInicio ? book.fechaInicio.trim() : '';
        const pages = book.paginas || 50;

        if (ini && fin && ini <= fin) {
          const dIni = new Date(ini + 'T00:00:00');
          const dFin = new Date(fin + 'T00:00:00');
          const diffDays = Math.max(1, Math.round((dFin.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          if (diffDays <= 120) {
            // Reparto proporcional entre los días leídos
            const pagesPerDay = Math.max(1, Math.round(pages / diffDays));
            const cursor = new Date(dIni);

            while (cursor <= dFin) {
              const iso = cursor.toISOString().slice(0, 10);
              if (!prefix || iso.startsWith(prefix)) {
                const existing = map.get(iso);
                const currentP = existing ? existing.pagesRead : 0;
                const newP = currentP > 0 ? currentP : pagesPerDay;
                const booksList = existing ? Array.from(new Set([...existing.bookIds, book.id])) : [book.id];

                map.set(iso, {
                  date: iso,
                  pagesRead: newP,
                  level: this.calculateLevel(newP),
                  bookIds: booksList,
                  source: existing ? existing.source : 'retroactive',
                  dayOfWeek: cursor.getDay()
                });
              }
              cursor.setDate(cursor.getDate() + 1);
            }
          } else if (!prefix || fin.startsWith(prefix)) {
            // Rango demasiado largo (> 120 días), asignar la finalización al día de fin
            this.assignDayRetroactive(map, fin, pages, book.id);
          }
        } else if (fin && (!prefix || fin.startsWith(prefix))) {
          this.assignDayRetroactive(map, fin, pages, book.id);
        } else if (ini && (!prefix || ini.startsWith(prefix))) {
          this.assignDayRetroactive(map, ini, Math.min(30, pages), book.id);
        }
      }

      // 2.2 Libros en curso ('⏳ Leyendo') con fecha de inicio
      if (book.progreso === '⏳ Leyendo' && book.fechaInicio) {
        const ini = book.fechaInicio.trim();
        if (ini && ini <= today) {
          const dIni = new Date(ini + 'T00:00:00');
          const dHoy = new Date(today + 'T00:00:00');
          const diffDays = Math.max(1, Math.round((dHoy.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          // Rango sensato (hasta 90 días atrás para lecturas activas en curso)
          if (diffDays <= 90) {
            const pagesTotal =
              typeof book.paginaActual === 'number' && book.paginaActual > 0
                ? book.paginaActual
                : book.paginas && book.paginas > 0
                  ? Math.min(book.paginas, diffDays * 25)
                  : diffDays * 25;

            const pagesPerDay = Math.max(1, Math.round(pagesTotal / diffDays));
            const cursor = new Date(dIni);

            while (cursor <= dHoy) {
              const iso = cursor.toISOString().slice(0, 10);
              if (!prefix || iso.startsWith(prefix)) {
                const existing = map.get(iso);
                const currentP = existing ? existing.pagesRead : 0;
                // Si ya había páginas leídas (por ejemplo registradas hoy), tomar el máximo
                const newP = Math.max(currentP, pagesPerDay);
                const booksList = existing ? Array.from(new Set([...existing.bookIds, book.id])) : [book.id];

                map.set(iso, {
                  date: iso,
                  pagesRead: newP,
                  level: this.calculateLevel(newP),
                  bookIds: booksList,
                  source: existing && existing.source === 'log' ? 'log' : 'retroactive',
                  dayOfWeek: cursor.getDay()
                });
              }
              cursor.setDate(cursor.getDate() + 1);
            }
          }
        }
      }

      // 2.3 Libros pausados ('⏸️ Pausado') con lectura registrada antes de detenerse
      if (book.progreso === '⏸️ Pausado') {
        const ini = (book.fechaInicio ? book.fechaInicio.trim() : '') || (book.fechaFin ? book.fechaFin.trim() : '');
        if (ini && ini <= today) {
          // Determinar la fecha en que se detuvo la lectura antes de pausar:
          let fin = book.fechaFin ? book.fechaFin.trim() : '';

          if (!fin || fin < ini) {
            // Si el usuario no especificó fechaFin, buscar si hay una siguiente lectura que empezó después
            const nextBookStarts = books
              .filter((b) => b.id !== book.id && b.fechaInicio && b.fechaInicio.trim() > ini)
              .map((b) => b.fechaInicio.trim())
              .sort();

            if (nextBookStarts.length > 0) {
              // El día anterior al comienzo del siguiente libro (ej. pausó el 29 y el 30 empezó Juego de tronos)
              const nextStart = nextBookStarts[0];
              const dNext = new Date(nextStart + 'T00:00:00');
              dNext.setDate(dNext.getDate() - 1);
              const dayBeforeNext = dNext.toISOString().slice(0, 10);
              fin = dayBeforeNext >= ini ? dayBeforeNext : ini;
            } else if (book.updatedAt) {
              const updatedIso = book.updatedAt.slice(0, 10);
              if (updatedIso >= ini && updatedIso <= today) {
                fin = updatedIso;
              }
            }
          }

          if (!fin || fin < ini) {
            fin = ini;
          }
          if (fin > today) {
            fin = today;
          }

          const dIni = new Date(ini + 'T00:00:00');
          const dFin = new Date(fin + 'T00:00:00');
          const diffDays = Math.max(1, Math.round((dFin.getTime() - dIni.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          if (diffDays <= 90) {
            const pagesTotal =
              typeof book.paginaActual === 'number' && book.paginaActual > 0
                ? book.paginaActual
                : book.paginas && book.paginas > 0
                  ? Math.min(book.paginas, diffDays * 25)
                  : diffDays * 25;

            const pagesPerDay = Math.max(1, Math.round(pagesTotal / diffDays));
            const cursor = new Date(dIni);

            while (cursor <= dFin) {
              const iso = cursor.toISOString().slice(0, 10);
              if (!prefix || iso.startsWith(prefix)) {
                const existing = map.get(iso);
                const currentP = existing ? existing.pagesRead : 0;
                const newP = Math.max(currentP, pagesPerDay);
                const booksList = existing ? Array.from(new Set([...existing.bookIds, book.id])) : [book.id];

                map.set(iso, {
                  date: iso,
                  pagesRead: newP,
                  level: this.calculateLevel(newP),
                  bookIds: booksList,
                  source: existing && existing.source === 'log' ? 'log' : 'retroactive',
                  dayOfWeek: cursor.getDay()
                });
              }
              cursor.setDate(cursor.getDate() + 1);
            }
          } else if (!prefix || fin.startsWith(prefix)) {
            this.assignDayRetroactive(map, fin, 25, book.id);
          }
        }
      }
    });

    return map;
  }

  private assignDayRetroactive(
    map: Map<string, HeatmapDayData>,
    dateStr: string,
    pages: number,
    bookId: string
  ): void {
    const existing = map.get(dateStr);
    if (!existing || existing.pagesRead < 10) {
      const d = new Date(dateStr + 'T00:00:00');
      const pagesToSet = Math.max(15, Math.min(pages, 60));
      const bList = existing ? Array.from(new Set([...existing.bookIds, bookId])) : [bookId];
      map.set(dateStr, {
        date: dateStr,
        pagesRead: pagesToSet,
        level: this.calculateLevel(pagesToSet),
        bookIds: bList,
        source: 'retroactive',
        dayOfWeek: isNaN(d.getTime()) ? 0 : d.getDay()
      });
    }
  }

  private calculateLevel(pages: number): 0 | 1 | 2 | 3 | 4 {
    if (pages <= 0) return 0;
    if (pages <= 15) return 1;
    if (pages <= 35) return 2;
    if (pages <= 65) return 3;
    return 4;
  }

  /**
   * Calcula las métricas de racha activa y récord histórico.
   */
  public getReadingStreakStats(books: Book[]): ReadingStreakStats {
    const currentYear = new Date().getFullYear();
    const heatmap = this.buildReadingHeatmapData(books);
    const today = getTodayLocalDateString();

    const todayEntry = heatmap.get(today);
    const readToday = Boolean(todayEntry && todayEntry.pagesRead > 0);
    const pagesReadToday = todayEntry ? todayEntry.pagesRead : 0;

    // Calcular días activos este año
    let activeDaysThisYear = 0;
    heatmap.forEach((entry) => {
      if (entry.pagesRead > 0 && entry.date.startsWith(`${currentYear}-`)) {
        activeDaysThisYear++;
      }
    });

    // Calcular racha actual
    // Se preserva si leíste hoy O si leíste ayer (para no perder la racha por la mañana)
    let currentStreak = 0;
    const checkDate = new Date();

    if (!readToday) {
      // Probar si ayer hubo lectura
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdayStr = checkDate.toISOString().slice(0, 10);
      const yEntry = heatmap.get(yesterdayStr);
      if (!yEntry || yEntry.pagesRead <= 0) {
        currentStreak = 0;
      } else {
        // Ayer leyó: la racha sigue viva contando desde ayer
        while (true) {
          const iso = checkDate.toISOString().slice(0, 10);
          const entry = heatmap.get(iso);
          if (entry && entry.pagesRead > 0) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    } else {
      // Hoy ya leyó: contar desde hoy hacia atrás
      while (true) {
        const iso = checkDate.toISOString().slice(0, 10);
        const entry = heatmap.get(iso);
        if (entry && entry.pagesRead > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calcular mejor racha histórica
    let bestStreak = currentStreak;
    const allDates = Array.from(heatmap.keys()).sort();
    let runningStreak = 0;
    let prevDateTime: number | null = null;

    for (const dStr of allDates) {
      const entry = heatmap.get(dStr);
      if (entry && entry.pagesRead > 0) {
        const currTime = new Date(dStr + 'T00:00:00').getTime();
        if (prevDateTime !== null) {
          const diffDays = Math.round((currTime - prevDateTime) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            runningStreak++;
          } else {
            runningStreak = 1;
          }
        } else {
          runningStreak = 1;
        }
        prevDateTime = currTime;
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      }
    }

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      readToday,
      pagesReadToday,
      activeDaysThisYear
    };
  }

  /**
   * Obtiene los últimos N días para el mini-widget de racha (ej: 28 días).
   */
  public getRecentDaysData(books: Book[], daysCount = 28): HeatmapDayData[] {
    const heatmap = this.buildReadingHeatmapData(books);
    const result: HeatmapDayData[] = [];

    const now = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const existing = heatmap.get(iso);

      if (existing) {
        result.push(existing);
      } else {
        result.push({
          date: iso,
          pagesRead: 0,
          level: 0,
          bookIds: [],
          source: 'log',
          dayOfWeek: d.getDay()
        });
      }
    }

    return result;
  }

  /**
   * Obtiene las últimas N semanas completas (Lunes a Domingo) para un calendario real y ordenado.
   */
  public getRecentCalendarWeeks(books: Book[], weeksCount = 4): CalendarDayView[][] {
    const heatmap = this.buildReadingHeatmapData(books);
    const today = getTodayLocalDateString();

    const now = new Date();
    // 0 = Lunes, 6 = Domingo
    const currentDayOfWeek = (now.getDay() + 6) % 7;

    // Lunes de la semana actual
    const mondayThisWeek = new Date(now);
    mondayThisWeek.setDate(now.getDate() - currentDayOfWeek);
    mondayThisWeek.setHours(0, 0, 0, 0);

    // Lunes de hace (weeksCount - 1) semanas
    const startMonday = new Date(mondayThisWeek);
    startMonday.setDate(mondayThisWeek.getDate() - (weeksCount - 1) * 7);

    const weeks: CalendarDayView[][] = [];
    const cursor = new Date(startMonday);

    const MONTH_NAMES_SHORT = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    for (let w = 0; w < weeksCount; w++) {
      const currentWeek: CalendarDayView[] = [];
      for (let d = 0; d < 7; d++) {
        const iso = cursor.toISOString().slice(0, 10);
        const isToday = iso === today;
        const isFuture = iso > today;
        const existing = heatmap.get(iso);

        currentWeek.push({
          date: iso,
          dayNumber: cursor.getDate(),
          monthShort: MONTH_NAMES_SHORT[cursor.getMonth()],
          weekdayIndex: d,
          pagesRead: existing && !isFuture ? existing.pagesRead : 0,
          level: existing && !isFuture ? existing.level : 0,
          isToday,
          isFuture,
          source: existing ? existing.source : 'log',
          bookIds: existing ? existing.bookIds : []
        });

        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }
}

export const readingStreakService = new ReadingStreakService();
