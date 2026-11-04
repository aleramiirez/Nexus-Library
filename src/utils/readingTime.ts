/**
 * Utilidades para cálculo inteligente y automático del tiempo de lectura.
 */

export interface ReadingTimeParams {
  fechaInicio?: string | null;
  fechaFin?: string | null;
  paginas?: number | null;
  progreso?: string | null;
  tiempoLectura?: string | null;
}

export const USER_READING_SPEED_STORAGE_KEY = 'nexus_user_reading_speed_pph';
export const DEFAULT_PAGES_PER_HOUR = 33.33; // ~1.8 min por página

/**
 * Obtiene la velocidad de lectura personalizada del usuario en páginas por hora (PPH).
 */
export function getUserReadingSpeedPph(): number {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_PAGES_PER_HOUR;
  }
  try {
    const raw = localStorage.getItem(USER_READING_SPEED_STORAGE_KEY);
    if (raw) {
      const val = parseFloat(raw);
      if (Number.isFinite(val) && val >= 5 && val <= 250) {
        return val;
      }
    }
  } catch {
    // Ignorar errores de localStorage
  }
  return DEFAULT_PAGES_PER_HOUR;
}

/**
 * Retorna el número de minutos por página según la velocidad personalizada del lector.
 */
export function getUserMinutesPerPage(): number {
  const pph = getUserReadingSpeedPph();
  return 60 / pph;
}

/**
 * Actualiza la media ponderada de velocidad de lectura del usuario tras una sesión real.
 * Requiere que la sesión haya durado al menos 3 minutos y se hayan avanzado páginas.
 */
export function updateUserReadingSpeed(pagesRead: number, durationMinutes: number): number {
  if (pagesRead <= 0 || durationMinutes < 3) {
    return getUserReadingSpeedPph();
  }

  const sessionPph = (pagesRead / durationMinutes) * 60;
  // Filtrar valores no realistas (<5 pph o >250 pph)
  if (sessionPph < 5 || sessionPph > 250) {
    return getUserReadingSpeedPph();
  }

  const currentPph = getUserReadingSpeedPph();
  // Media ponderada: 65% inercia histórica, 35% sesión recién completada
  const updatedPph = Math.round((currentPph * 0.65 + sessionPph * 0.35) * 10) / 10;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(USER_READING_SPEED_STORAGE_KEY, String(updatedPph));
    } catch {
      // Ignorar modo incógnito
    }
  }

  return updatedPph;
}

/**
 * Calcula de forma automática el tiempo de lectura de una obra:
 * 1. Si tiene fecha de inicio y fecha de fin válidas -> días/semanas/meses reales de lectura ("Leído en X días").
 * 2. Si no tiene ambas fechas pero tiene páginas -> estimación basada en la velocidad real del lector ("~X h estimadas").
 * 3. Si ya tenía un valor manual previo válido -> fallback respetuoso.
 * 4. Si no hay datos suficientes -> "Sin calcular" o fallback configurado.
 */
export function calculateReadingTime(
  book: ReadingTimeParams,
  options: { emptyFallback?: string } = {}
): string {
  const { emptyFallback = 'Sin calcular' } = options;

  // 1. Duración real basada en fechas de lectura
  if (book.fechaInicio && book.fechaFin) {
    const start = new Date(book.fechaInicio);
    const end = new Date(book.fechaFin);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffMs = end.getTime() - start.getTime();
      if (diffMs >= 0) {
        const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
        if (diffDays === 1) return 'Leído en 1 día';
        if (diffDays <= 30) return `Leído en ${diffDays} días`;
        const diffWeeks = Math.round(diffDays / 7);
        if (diffWeeks <= 8) return `Leído en ${diffWeeks} semanas`;
        const diffMonths = Math.round(diffDays / 30);
        return `Leído en ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
      }
    }
  }

  // 2. Estimación inteligente basada en páginas y velocidad real del lector
  if (book.paginas && book.paginas > 0) {
    const minutesPerPage = getUserMinutesPerPage();
    const totalMinutes = Math.round(book.paginas * minutesPerPage);
    const hours = Math.round(totalMinutes / 60);
    const prog = (book.progreso || '').toLowerCase();
    const isFinished = prog.includes('leído') || prog.includes('leido') || prog === 'read';

    if (hours < 1) {
      return isFinished ? `~${Math.max(1, totalMinutes)} min` : `~${Math.max(1, totalMinutes)} min est.`;
    }
    return isFinished ? `~${hours} h lectura` : `~${hours} h estimadas`;
  }

  // 3. Fallback a tiempo manual guardado previamente
  if (
    book.tiempoLectura &&
    book.tiempoLectura.trim() &&
    book.tiempoLectura.trim() !== 'Sin calcular'
  ) {
    return book.tiempoLectura.trim();
  }

  return emptyFallback;
}

/**
 * Calcula el tiempo estimado que le queda al lector para terminar el libro
 * en base a las páginas restantes y su velocidad personalizada.
 */
export function calculateRemainingReadingTime(remainingPages: number): string {
  if (remainingPages <= 0) return 'Completado';
  const minutesPerPage = getUserMinutesPerPage();
  const totalMinutes = Math.round(remainingPages * minutesPerPage);
  const hours = Math.round(totalMinutes / 60);

  if (hours < 1) {
    return `~${Math.max(1, totalMinutes)} min restantes`;
  }
  return `~${hours} h restantes`;
}
