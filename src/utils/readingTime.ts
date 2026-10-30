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

/**
 * Calcula de forma automática el tiempo de lectura de una obra:
 * 1. Si tiene fecha de inicio y fecha de fin válidas -> días/semanas/meses reales de lectura ("Leído en X días").
 * 2. Si no tiene ambas fechas pero tiene páginas -> estimación basada en 1.8 min/página promedio ("~X h estimadas").
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

  // 2. Estimación inteligente basada en páginas (1.8 min por página promedio)
  if (book.paginas && book.paginas > 0) {
    const totalMinutes = Math.round(book.paginas * 1.8);
    const hours = Math.round(totalMinutes / 60);
    const prog = (book.progreso || '').toLowerCase();
    const isFinished = prog.includes('leído') || prog.includes('leido') || prog === 'read';

    if (hours < 1) {
      return isFinished ? `~${totalMinutes} min` : `~${totalMinutes} min est.`;
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
