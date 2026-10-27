import { Book, StarRating } from '../types/models';
import { GENRES } from '../constants/catalogs';

export interface MonthCadence {
  monthIndex: number; // 0..11
  monthName: string; // 'Ene', 'Feb', ...
  monthFullName: string; // 'Enero', 'Febrero', ...
  booksCount: number;
  pagesCount: number;
  books: Book[];
}

export type PaceStatus = 'ahead' | 'on_track' | 'behind' | 'completed';

export interface YearReadingStats {
  year: number | 'all';
  targetGoal: number;
  completedBooks: Book[];
  completedCount: number;
  percentage: number;
  diffFromPace: number;
  paceStatus: PaceStatus;
  daysInYear: number;
  currentDayOfYear: number;
  totalPagesRead: number;
  avgPagesPerBook: number;
  estimatedHoursRead: number;
  avgRating: number | null;
  ratedCount: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
  longestBook: Book | null;
  shortestBook: Book | null;
  topGenre: string | null;
  genreDistribution: { genre: string; count: number; percentage: number }[];
  topAuthor: string | null;
  authorDistribution: { author: string; count: number }[];
  monthlyCadence: MonthCadence[];
  favoriteBooks: Book[];
  booksWithoutFinishDate: Book[];
}

const MONTH_NAMES_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic'
];

const MONTH_NAMES_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getBookCompletionYear(book: Book): number | null {
  if (book.fechaFin && book.fechaFin.trim().length >= 4) {
    const y = parseInt(book.fechaFin.slice(0, 4), 10);
    if (!isNaN(y) && y > 1900 && y < 2100) return y;
  }
  if (book.updatedAt) {
    const d = new Date(book.updatedAt);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  if (book.createdAt) {
    const d = new Date(book.createdAt);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return null;
}

function getBookCompletionMonth(book: Book): number | null {
  if (book.fechaFin && book.fechaFin.trim().length >= 7) {
    const parts = book.fechaFin.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(m) && m >= 0 && m <= 11) return m;
    }
  }
  if (book.updatedAt) {
    const d = new Date(book.updatedAt);
    if (!isNaN(d.getTime())) return d.getMonth();
  }
  return null;
}

class ReadingChallengeService {
  private getStorageKey(year: number, userId?: string): string {
    const uid = userId && userId.trim() ? userId.trim() : 'local';
    return `nexus_challenge_goal_${year}_${uid}`;
  }

  public getGoal(year: number, userId?: string): number {
    if (typeof window === 'undefined' || !window.localStorage) return 12;
    const key = this.getStorageKey(year, userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 500) {
        return parsed;
      }
    }
    // Meta por defecto sugerida
    return 12;
  }

  public setGoal(year: number, target: number, userId?: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const key = this.getStorageKey(year, userId);
    const safeTarget = Math.max(1, Math.min(500, Math.round(target)));
    localStorage.setItem(key, String(safeTarget));
  }

  public getAvailableYears(books: Book[]): number[] {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>();
    yearsSet.add(currentYear);

    for (const b of books) {
      if (b.progreso === '✅ Leído') {
        const y = getBookCompletionYear(b);
        if (y !== null) {
          yearsSet.add(y);
        }
      }
    }

    return Array.from(yearsSet).sort((a, b) => b - a);
  }

  public calculateStats(
    books: Book[],
    selectedYear: number | 'all',
    userId?: string
  ): YearReadingStats {
    const now = new Date();
    const currentYear = now.getFullYear();
    const targetGoal =
      selectedYear === 'all'
        ? this.getGoal(currentYear, userId) * 2
        : this.getGoal(selectedYear, userId);

    // 1. Filtrar libros leídos
    const readBooks = books.filter((b) => b.progreso === '✅ Leído');

    // 2. Filtrar por año seleccionado
    let completedBooks: Book[] = [];
    const booksWithoutFinishDate: Book[] = [];

    if (selectedYear === 'all') {
      completedBooks = [...readBooks];
    } else {
      for (const b of readBooks) {
        const bookYear = getBookCompletionYear(b);
        if (bookYear === selectedYear) {
          completedBooks.push(b);
        }
        if (!b.fechaFin || !b.fechaFin.trim()) {
          booksWithoutFinishDate.push(b);
        }
      }
    }

    // Ordenar de más reciente a más antiguo por fecha de fin o updatedAt
    completedBooks.sort((a, b) => {
      const dateA = a.fechaFin || a.updatedAt || a.createdAt || '';
      const dateB = b.fechaFin || b.updatedAt || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });

    const completedCount = completedBooks.length;
    const percentage = targetGoal > 0 ? Math.round((completedCount / targetGoal) * 100) : 0;

    // 3. Ritmo y cadencia respecto al día del año
    const activeYearNum = typeof selectedYear === 'number' ? selectedYear : currentYear;
    const daysInYear = isLeapYear(activeYearNum) ? 366 : 365;
    const currentDayOfYear =
      activeYearNum === currentYear
        ? getDayOfYear(now)
        : activeYearNum < currentYear
          ? daysInYear
          : 0;

    let paceStatus: PaceStatus = 'on_track';
    let diffFromPace = 0;

    if (completedCount >= targetGoal) {
      paceStatus = 'completed';
      diffFromPace = completedCount - targetGoal;
    } else if (activeYearNum < currentYear) {
      paceStatus = 'behind';
      diffFromPace = targetGoal - completedCount;
    } else if (activeYearNum > currentYear) {
      paceStatus = 'on_track';
      diffFromPace = 0;
    } else {
      // Año actual en curso: calcular libros esperados a la fecha actual
      const expectedBooks = Math.round((currentDayOfYear / daysInYear) * targetGoal);
      const diff = completedCount - expectedBooks;
      if (diff > 0) {
        paceStatus = 'ahead';
        diffFromPace = diff;
      } else if (diff < 0) {
        paceStatus = 'behind';
        diffFromPace = Math.abs(diff);
      } else {
        paceStatus = 'on_track';
        diffFromPace = 0;
      }
    }

    // 4. Páginas y horas estimadas
    let totalPagesRead = 0;
    let booksWithPages = 0;
    let longestBook: Book | null = null;
    let shortestBook: Book | null = null;

    for (const b of completedBooks) {
      const p = b.paginas;
      if (typeof p === 'number' && p > 0) {
        totalPagesRead += p;
        booksWithPages++;
        if (!longestBook || p > (longestBook.paginas || 0)) {
          longestBook = b;
        }
        if (!shortestBook || p < (shortestBook.paginas || Infinity)) {
          shortestBook = b;
        }
      }
    }

    const avgPagesPerBook =
      booksWithPages > 0 ? Math.round(totalPagesRead / booksWithPages) : 0;
    // Estimación media: ~1.8 minutos por página (aprox 33 páginas por hora)
    const estimatedHoursRead = Math.round((totalPagesRead * 1.8) / 60);

    // 5. Valoraciones
    let ratingSum = 0;
    let ratedCount = 0;
    const ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    const favoriteBooks: Book[] = [];

    for (const b of completedBooks) {
      if (typeof b.puntuacion === 'number' && b.puntuacion >= 1 && b.puntuacion <= 5) {
        ratingSum += b.puntuacion;
        ratedCount++;
        const val = b.puntuacion as 1 | 2 | 3 | 4 | 5;
        ratingDistribution[val] = (ratingDistribution[val] || 0) + 1;
        if (b.puntuacion === 5) {
          favoriteBooks.push(b);
        }
      }
    }

    const avgRating = ratedCount > 0 ? parseFloat((ratingSum / ratedCount).toFixed(2)) : null;

    // Si no hay de 5 estrellas, tomamos los de 4 estrellas como destacados
    if (favoriteBooks.length === 0) {
      for (const b of completedBooks) {
        if (b.puntuacion === 4) {
          favoriteBooks.push(b);
        }
      }
    }

    // 6. Distribución de géneros
    const genreCountMap: Record<string, number> = {};
    for (const b of completedBooks) {
      const g = b.genero && b.genero.trim() ? b.genero.trim() : 'Sin género';
      genreCountMap[g] = (genreCountMap[g] || 0) + 1;
    }

    const genreDistribution = Object.entries(genreCountMap)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: completedCount > 0 ? Math.round((count / completedCount) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const topGenre = genreDistribution.length > 0 ? genreDistribution[0].genre : null;

    // 7. Distribución de autores
    const authorCountMap: Record<string, number> = {};
    for (const b of completedBooks) {
      const a = b.autor && b.autor.trim() ? b.autor.trim() : 'Autor desconocido';
      authorCountMap[a] = (authorCountMap[a] || 0) + 1;
    }

    const authorDistribution = Object.entries(authorCountMap)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topAuthor = authorDistribution.length > 0 ? authorDistribution[0].author : null;

    // 8. Cadencia mensual (Ene..Dic)
    const monthlyCadence: MonthCadence[] = MONTH_NAMES_SHORT.map((name, idx) => ({
      monthIndex: idx,
      monthName: name,
      monthFullName: MONTH_NAMES_FULL[idx],
      booksCount: 0,
      pagesCount: 0,
      books: []
    }));

    for (const b of completedBooks) {
      const m = getBookCompletionMonth(b);
      if (m !== null && m >= 0 && m <= 11) {
        monthlyCadence[m].booksCount++;
        monthlyCadence[m].pagesCount += b.paginas || 0;
        monthlyCadence[m].books.push(b);
      }
    }

    return {
      year: selectedYear,
      targetGoal,
      completedBooks,
      completedCount,
      percentage,
      diffFromPace,
      paceStatus,
      daysInYear,
      currentDayOfYear,
      totalPagesRead,
      avgPagesPerBook,
      estimatedHoursRead,
      avgRating,
      ratedCount,
      ratingDistribution,
      longestBook,
      shortestBook,
      topGenre,
      genreDistribution,
      topAuthor,
      authorDistribution,
      monthlyCadence,
      favoriteBooks: favoriteBooks.slice(0, 6),
      booksWithoutFinishDate
    };
  }
}

export const readingChallengeService = new ReadingChallengeService();
