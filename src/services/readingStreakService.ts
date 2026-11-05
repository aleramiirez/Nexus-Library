import { Book } from '../types/models';
import { supabase } from './supabaseClient';

export function formatDateToLocalIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDateString(): string {
  return formatDateToLocalIso(new Date());
}

export interface DailyReadingLog {
  date: string; // 'YYYY-MM-DD'
  pagesRead: number; // Total del día (suma de pagesByBook + manualPages)
  bookIds: string[];
  pagesByBook?: Record<string, number>; // Páginas reales avanzadas en cada libro ese día
  manualPages?: number; // Páginas añadidas manualmente sin libro o por ajuste directo
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

  public invalidateCache(): void {
    this.stateCache = null;
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
    this.syncToCloud().catch(() => {});
  }

  /**
   * Exporta el estado completo de racha diaria para la copia de seguridad JSON.
   */
  public getExportData(): ReadingStreakStorageState {
    this.stateCache = null;
    return this.loadState();
  }

  /**
   * Importa registros de racha diaria fusionándolos con los existentes.
   */
  public importData(importedState?: Partial<ReadingStreakStorageState>): void {
    if (!importedState || typeof importedState.logs !== 'object') return;
    this.stateCache = null;
    const currentState = this.loadState();
    const mergedLogs = { ...currentState.logs };

    for (const [date, log] of Object.entries(importedState.logs)) {
      if (!mergedLogs[date]) {
        mergedLogs[date] = log;
      } else {
        const current = mergedLogs[date];
        const combinedBooks = Array.from(new Set([...current.bookIds, ...log.bookIds]));
        const mergedPagesByBook: Record<string, number> = {
          ...(current.pagesByBook || {}),
          ...(log.pagesByBook || {})
        };
        const manualPages = Math.max(current.manualPages || 0, log.manualPages || 0);
        const bookPagesSum = Object.values(mergedPagesByBook).reduce((acc, v) => acc + (v || 0), 0);
        const totalPages = Math.max(current.pagesRead, log.pagesRead, bookPagesSum + manualPages);

        mergedLogs[date] = {
          date,
          pagesRead: totalPages,
          bookIds: combinedBooks,
          pagesByBook: mergedPagesByBook,
          manualPages,
          manualCheckIn: current.manualCheckIn || log.manualCheckIn
        };
      }
    }

    const mergedStartPages = {
      ...(importedState.bookStartPageByDate || {}),
      ...(currentState.bookStartPageByDate || {})
    };

    const newState: ReadingStreakStorageState = {
      logs: mergedLogs,
      bookStartPageByDate: mergedStartPages,
      lastUpdated: new Date().toISOString()
    };

    this.saveState(newState);
  }

  /**
   * Sincroniza el estado de racha diaria con la nube de Supabase (user_metadata).
   */
  public async syncToCloud(userId?: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return;
      if (userId && user.id !== userId) return;

      const state = this.loadState();
      await supabase.auth.updateUser({
        data: {
          reading_streak_logs: state
        }
      });
    } catch (e) {
      console.warn('Could not sync reading streak to Supabase user_metadata:', e);
    }
  }

  /**
   * Descarga y fusiona el registro de racha diaria desde Supabase user_metadata.
   */
  public async syncFromCloud(userId?: string): Promise<ReadingStreakStorageState> {
    if (typeof window === 'undefined') return this.loadState();
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) return this.loadState();
      if (userId && user.id !== userId) return this.loadState();

      const remoteState = user.user_metadata?.reading_streak_logs as
        | Partial<ReadingStreakStorageState>
        | undefined;

      if (remoteState && typeof remoteState.logs === 'object') {
        const localState = this.loadState();
        const mergedLogs = { ...localState.logs };

        for (const [date, log] of Object.entries(remoteState.logs || {})) {
          if (!mergedLogs[date]) {
            mergedLogs[date] = log;
          } else {
            const current = mergedLogs[date];
            const combinedBookIds = Array.from(new Set([...current.bookIds, ...log.bookIds]));
            const mergedPagesByBook: Record<string, number> = {
              ...(current.pagesByBook || {}),
              ...(log.pagesByBook || {})
            };
            const manualPages = Math.max(current.manualPages || 0, log.manualPages || 0);
            const bookPagesSum = Object.values(mergedPagesByBook).reduce((acc, v) => acc + (v || 0), 0);
            const totalPages = Math.max(current.pagesRead, log.pagesRead, bookPagesSum + manualPages);

            mergedLogs[date] = {
              date,
              pagesRead: totalPages,
              bookIds: combinedBookIds,
              pagesByBook: mergedPagesByBook,
              manualPages,
              manualCheckIn: current.manualCheckIn || log.manualCheckIn
            };
          }
        }

        const mergedStartPages = {
          ...(remoteState.bookStartPageByDate || {}),
          ...(localState.bookStartPageByDate || {})
        };

        const mergedState: ReadingStreakStorageState = {
          logs: mergedLogs,
          bookStartPageByDate: mergedStartPages,
          lastUpdated: new Date().toISOString()
        };

        this.stateCache = mergedState;
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedState));
        }
        this.notify();
        return mergedState;
      } else {
        const localState = this.loadState();
        if (Object.keys(localState.logs).length > 0) {
          this.syncToCloud(user.id).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Could not sync reading streak from Supabase:', e);
    }
    return this.loadState();
  }

  /**
   * Registra el avance de lectura diario de un libro según la fórmula exacta día a día.
   */
  public recordReadingProgress(
    bookId: string,
    previousPage: number,
    newPage: number,
    dateStr?: string
  ): DailyReadingLog | null {
    const state = this.loadState();
    const today = dateStr || getTodayLocalDateString();

    if (!state.bookStartPageByDate[today]) {
      state.bookStartPageByDate[today] = {};
    }

    // 1. Si startPages[today][bookId] aún no existe, fijarlo con previousPage
    if (state.bookStartPageByDate[today][bookId] === undefined) {
      state.bookStartPageByDate[today][bookId] = Math.max(0, previousPage || 0);
    }

    const startPageForToday = state.bookStartPageByDate[today][bookId];
    const safeNew = Math.max(0, newPage || 0);

    // 2. Páginas netas leídas hoy en este libro
    const readInBookToday = Math.max(0, safeNew - startPageForToday);

    // 3. Guardar en log del día
    const log: DailyReadingLog = state.logs[today] || {
      date: today,
      pagesRead: 0,
      bookIds: [],
      pagesByBook: {},
      manualPages: 0
    };

    if (!log.pagesByBook) {
      log.pagesByBook = {};
    }
    log.pagesByBook[bookId] = readInBookToday;

    // Actualizar lista de bookIds activos
    const activeBookIds = Object.keys(log.pagesByBook).filter(
      (bId) => (log.pagesByBook?.[bId] || 0) > 0
    );
    log.bookIds = activeBookIds;

    // 4. Recalcular total del día sumando todos los pagesByBook + manualPages
    const bookPagesSum = Object.values(log.pagesByBook).reduce((acc, v) => acc + (v || 0), 0);
    log.pagesRead = bookPagesSum + (log.manualPages || 0);

    // 5. Si pagesRead === 0 y no hubo check-in manual, eliminar entrada
    if (log.pagesRead === 0 && !log.manualCheckIn) {
      delete state.logs[today];
      this.saveState(state);
      return null;
    } else {
      state.logs[today] = log;
      this.saveState(state);
      return log;
    }
  }

  /**
   * Alias de compatibilidad con código existente
   */
  public recordBookReadingProgress(
    bookId: string,
    newPage: number,
    previousPage: number,
    _pagesDelta?: number,
    dateStr?: string
  ): void {
    this.recordReadingProgress(bookId, previousPage, newPage, dateStr);
  }

  /**
   * Fija o corrige directamente el número total de páginas leídas en una fecha específica (YYYY-MM-DD),
   * o lo elimina si totalPages === 0 y markAsRead === false.
   */
  public setManualReadingLogForDate(
    dateStr: string,
    totalPages: number,
    markAsRead = true
  ): DailyReadingLog | null {
    const state = this.loadState();
    const safePages = Math.max(0, totalPages || 0);

    if (safePages === 0 && !markAsRead) {
      delete state.logs[dateStr];
      if (state.bookStartPageByDate[dateStr]) {
        delete state.bookStartPageByDate[dateStr];
      }
      this.saveState(state);
      this.syncToCloud().catch(() => {});
      return null;
    }

    const existingLog = state.logs[dateStr];
    const log: DailyReadingLog = {
      date: dateStr,
      pagesRead: safePages,
      bookIds: existingLog?.bookIds || [],
      pagesByBook: existingLog?.pagesByBook || {},
      manualPages: safePages,
      manualCheckIn: markAsRead
    };

    state.logs[dateStr] = log;
    this.saveState(state);
    this.syncToCloud().catch(() => {});
    return log;
  }

  /**
   * Reinicia/limpia el historial de racha por completo.
   */
  public clearAllReadingStreakLogs(): void {
    const emptyState = getEmptyState();
    this.saveState(emptyState);
    this.syncToCloud().catch(() => {});
  }

  /**
   * Marca el día de hoy manualmente como leído ("🔥 He leído hoy").
   */
  public markReadTodayManually(pagesOptional?: number, bookId?: string): void {
    const today = getTodayLocalDateString();
    const state = this.loadState();
    const current = state.logs[today];
    const addedPages = pagesOptional && pagesOptional > 0 ? pagesOptional : 15;
    const newTotal = Math.max(current?.pagesRead || 0, addedPages);
    this.setManualReadingLogForDate(today, newTotal, true);
    if (bookId) {
      const updatedState = this.loadState();
      const log = updatedState.logs[today];
      if (log && !log.bookIds.includes(bookId)) {
        log.bookIds.push(bookId);
        this.saveState(updatedState);
      }
    }
  }

  /**
   * Genera el mapa de calor basado 100% en los registros reales de DailyReadingLog.
   * La única fuente de la verdad son los eventos diarios registrados en nexus_reading_streak_logs_v1.
   * Sin suposiciones ni promedios retroactivos entre fechaInicio y fechaFin.
   */
  public buildReadingHeatmapData(_books?: Book[], year?: number): Map<string, HeatmapDayData> {
    const state = this.loadState();
    const prefix = year ? `${year}-` : '';

    const map = new Map<string, HeatmapDayData>();

    // Única fuente de la verdad: registros reales de DailyReadingLog
    Object.values(state.logs).forEach((log) => {
      if ((!prefix || log.date.startsWith(prefix)) && (log.pagesRead > 0 || log.manualCheckIn)) {
        const d = new Date(log.date + 'T00:00:00');
        map.set(log.date, {
          date: log.date,
          pagesRead: log.pagesRead || 0,
          level: this.calculateLevel(log.pagesRead || 0, log.manualCheckIn),
          bookIds: log.bookIds || [],
          source: 'log',
          dayOfWeek: isNaN(d.getTime()) ? 0 : d.getDay()
        });
      }
    });

    return map;
  }

  private calculateLevel(pages: number, manualCheckIn?: boolean): 0 | 1 | 2 | 3 | 4 {
    if (pages <= 0) return manualCheckIn ? 1 : 0;
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
      const yesterdayStr = formatDateToLocalIso(checkDate);
      const yEntry = heatmap.get(yesterdayStr);
      if (!yEntry || yEntry.pagesRead <= 0) {
        currentStreak = 0;
      } else {
        // Ayer leyó: la racha sigue viva contando desde ayer
        while (true) {
          const iso = formatDateToLocalIso(checkDate);
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
        const iso = formatDateToLocalIso(checkDate);
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
      const iso = formatDateToLocalIso(d);
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
        const iso = formatDateToLocalIso(cursor);
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

export function setManualReadingLogForDate(
  dateStr: string,
  totalPages: number,
  markAsRead?: boolean
): DailyReadingLog | null {
  return readingStreakService.setManualReadingLogForDate(dateStr, totalPages, markAsRead);
}

export function clearAllReadingStreakLogs(): void {
  readingStreakService.clearAllReadingStreakLogs();
}

export function recordReadingProgress(
  bookId: string,
  previousPage: number,
  newPage: number,
  dateStr?: string
): DailyReadingLog | null {
  return readingStreakService.recordReadingProgress(bookId, previousPage, newPage, dateStr);
}
