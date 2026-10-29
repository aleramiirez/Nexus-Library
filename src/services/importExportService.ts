import { collectionService } from './collectionService';
import { BackupPayload, Book, Saga, StarRating } from '../types/models';
import { normalizeText, ReadingStatus } from '../constants/catalogs';
import { buildOpenLibraryIsbnCover } from './coverService';

export interface ParsedCsvBook {
  nombre: string;
  autor: string;
  isbn: string;
  puntuacion: StarRating;
  progreso: ReadingStatus;
  paginas: number | null;
  fechaPublicacion: number | null;
  editorial: string;
  fechaInicio: string;
  fechaFin: string;
  sinopsis: string;
  notasPersonales: string;
  sagaNombre: string;
  volumen: number | null;
  portadaUrl: string;
  portadaFallbackUrl: string;
}

export interface CsvLibraryParseResult {
  source: 'goodreads' | 'storygraph' | 'nexus' | 'generic';
  books: ParsedCsvBook[];
  sagas: string[];
  totalRows: number;
}

export function isDuplicateBook(
  candidate: { nombre: string; autor: string; isbn: string },
  existingBooks: Array<{ nombre: string; autor: string; isbn: string }>
): { duplicate: boolean; reason?: string } {
  const candIsbn = candidate.isbn.replace(/[^0-9X]/gi, '').toUpperCase();
  if (candIsbn) {
    const byIsbn = existingBooks.find(
      (b) => b.isbn.replace(/[^0-9X]/gi, '').toUpperCase() === candIsbn
    );
    if (byIsbn) {
      return { duplicate: true, reason: 'ISBN coincidente (' + candIsbn + ')' };
    }
  }

  const candTitle = normalizeText(candidate.nombre);
  const candAuthor = normalizeText(candidate.autor);
  if (!candTitle) return { duplicate: false };

  const byTitleAuthor = existingBooks.find((b) => {
    const sameTitle = normalizeText(b.nombre) === candTitle;
    if (!sameTitle) return false;
    if (!candAuthor || !b.autor) return true;
    return normalizeText(b.autor) === candAuthor;
  });

  if (byTitleAuthor) {
    return { duplicate: true, reason: 'Título y autor ya registrados' };
  }

  return { duplicate: false };
}

export function exportLibraryToJson(books: Book[], sagas: Saga[], userId?: string): string {
  const { collections, lentRecords } = collectionService.exportData(userId);
  const payload: BackupPayload = {
    app: 'NEXUS_LIBRARY',
    version: 2,
    exportedAt: new Date().toISOString(),
    books,
    sagas,
    collections,
    lentRecords
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackupJson(jsonText: string): BackupPayload {
  const parsed = JSON.parse(jsonText) as Partial<BackupPayload>;
  if (
    parsed.app !== 'NEXUS_LIBRARY' ||
    !Array.isArray(parsed.books) ||
    !Array.isArray(parsed.sagas)
  ) {
    throw new Error(
      'El archivo JSON no tiene el formato de copia de seguridad válido de NEXUS LIBRARY.'
    );
  }
  return parsed as BackupPayload;
}

export function exportLibraryToCsv(books: Book[]): string {
  const headers = [
    'Nombre',
    'Autor',
    'Género',
    'Subgénero',
    'Fecha de Publicación',
    'Páginas',
    'Puntuacion',
    'Progreso',
    'Saga',
    'Volumen',
    'Fecha Inicio',
    'Fecha Fin',
    'Lectura Virtual',
    'Tiempo de Lectura',
    'ISBN',
    'Editorial',
    'Idioma',
    'Portada',
    'Notas Personales',
    'Citas'
  ];

  const escapeCsvCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const rows = books.map((b) =>
    [
      b.nombre,
      b.autor,
      b.genero,
      b.subgeneros.join(', '),
      b.fechaPublicacion ?? '',
      b.paginas ?? '',
      b.puntuacion ? '⭐'.repeat(b.puntuacion) : '',
      b.progreso,
      b.sagaNombre,
      b.volumen ?? '',
      b.fechaInicio,
      b.fechaFin,
      b.lecturaVirtual,
      b.tiempoLectura,
      b.isbn,
      b.editorial,
      b.idioma,
      b.portadaUrl,
      b.notasPersonales ?? '',
      (b.citas || []).join(' /// ')
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Analizador RFC 4180 robusto para archivos CSV con soporte de multilínea en celdas,
 * comillas escapadas (""), espacios y UTF-8 BOM.
 */
export function parseCsvRows(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(cleanRawCell(currentCell));
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(cleanRawCell(currentCell));
      currentCell = '';
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(cleanRawCell(currentCell));
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function cleanRawCell(val: string): string {
  let res = val.trim();
  // Limpia notación de fórmula Excel/Goodreads como ="0441172717"
  if (res.startsWith('=')) {
    res = res.slice(1).trim();
    if (res.startsWith('"') && res.endsWith('"')) {
      res = res.slice(1, -1).trim();
    }
  }
  return res;
}

/**
 * Extrae título limpio, nombre de saga y número de volumen desde títulos de Goodreads
 * como "The Way of Kings (The Stormlight Archive, #1)" o "Dune (Dune #1)".
 */
export function parseBookTitleAndSeries(rawTitle: string): {
  cleanTitle: string;
  sagaNombre: string;
  volumen: number | null;
} {
  const trimmed = rawTitle.trim();
  const match = trimmed.match(
    /^(.*?)\s*\(([^()]+?)(?:,\s*#?\s*([0-9]+(?:\.[0-9]+)?)|(?:,\s*|\s+)(?:#|Book|Vol\.?|Libro|Parte)\s*([0-9]+(?:\.[0-9]+)?))?\)$/i
  );

  if (match) {
    const clean = match[1].trim();
    const seriesCandidate = match[2].trim().replace(/,+$/, '').trim();
    const rawVol = match[3] || match[4];
    const vol = rawVol ? parseFloat(rawVol) : null;

    const nonSeriesKeywords =
      /\b(hardcover|paperback|ebook|kindle|audiobook|mass market|edici[oó]n|edition|tapa dura|tapa blanda|c[oó]mic|graphic novel|ilustrado|illustrated|volumen|volume)\b/i;

    if (!nonSeriesKeywords.test(seriesCandidate)) {
      return {
        cleanTitle: clean || trimmed,
        sagaNombre: seriesCandidate,
        volumen: vol !== null && !Number.isNaN(vol) ? vol : null
      };
    }
  }

  return {
    cleanTitle: trimmed,
    sagaNombre: '',
    volumen: null
  };
}

function parseStandardDateString(rawDate?: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();
  if (!trimmed) return '';

  // Formato YYYY/MM/DD o YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Formato DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return '';
}

function cleanIsbn(raw?: string): string {
  if (!raw) return '';
  const cleaned = raw.replace(/[^0-9Xx]/g, '').toUpperCase();
  return cleaned;
}

/**
 * Parsea un archivo CSV exportado desde Goodreads o StoryGraph, extrayendo libros,
 * estados de lectura, puntuaciones, notas personales/reseñas, sagas y números de volumen.
 */
export function parseGoodreadsOrStorygraphCsv(csvText: string): CsvLibraryParseResult {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error('El archivo CSV está vacío o no contiene filas de datos.');
  }

  const rawHeaders = rows[0];
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());

  // Detección de columnas
  const findColIndex = (...candidates: string[]): number => {
    for (const cand of candidates) {
      const idx = headers.findIndex((h) => h === cand || h.includes(cand));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const titleIdx = findColIndex('title', 'título', 'titulo', 'nombre');
  const authorIdx = findColIndex('author', 'autor', 'authors');
  const isbn13Idx = findColIndex('isbn13', 'isbn 13');
  const isbnIdx = findColIndex('isbn/uid', 'isbn');
  const myRatingIdx = findColIndex('my rating', 'star rating', 'puntuacion', 'puntuación', 'rating');
  const shelfIdx = findColIndex('exclusive shelf', 'status', 'progreso', 'shelf', 'bookshelves');
  const dateReadIdx = findColIndex('date read', 'fecha fin', 'read dates', 'finished');
  const dateAddedIdx = findColIndex('date added', 'fecha inicio', 'added');
  const pagesIdx = findColIndex('number of pages', 'páginas', 'paginas', 'pages');
  const yearIdx = findColIndex('year published', 'original publication year', 'publicación', 'year');
  const publisherIdx = findColIndex('publisher', 'editorial');
  const reviewIdx = findColIndex('my review', 'review', 'reseña', 'resena', 'notas personales', 'private notes');
  const privateNotesIdx = findColIndex('private notes');

  if (titleIdx === -1 || authorIdx === -1) {
    throw new Error(
      'El archivo CSV no contiene columnas válidas de "Title" y "Author". Asegúrate de exportar tu biblioteca desde Goodreads o StoryGraph.'
    );
  }

  const isGoodreads = headers.some((h) => h.includes('goodreads') || h === 'book id' || h === 'exclusive shelf');
  const isStorygraph = headers.some((h) => h === 'star rating' || h === 'read dates' || h.includes('storygraph'));

  let source: CsvLibraryParseResult['source'] = 'generic';
  if (isGoodreads) source = 'goodreads';
  else if (isStorygraph) source = 'storygraph';

  const parsedBooks: ParsedCsvBook[] = [];
  const sagasSet = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawTitle = row[titleIdx] || '';
    const rawAuthor = row[authorIdx] || '';

    if (!rawTitle.trim()) continue;

    const { cleanTitle, sagaNombre, volumen } = parseBookTitleAndSeries(rawTitle);
    if (sagaNombre) {
      sagasSet.add(sagaNombre);
    }

    // ISBN
    let rawIsbnVal = (isbn13Idx !== -1 ? row[isbn13Idx] : '') || (isbnIdx !== -1 ? row[isbnIdx] : '');
    const isbn = cleanIsbn(rawIsbnVal);

    // Rating
    let puntuacion: StarRating = null;
    if (myRatingIdx !== -1) {
      const rawRating = parseFloat(row[myRatingIdx]);
      if (!Number.isNaN(rawRating) && rawRating > 0) {
        const rounded = Math.max(1, Math.min(5, Math.round(rawRating)));
        puntuacion = rounded as StarRating;
      }
    }

    // Fechas
    const fechaFin = dateReadIdx !== -1 ? parseStandardDateString(row[dateReadIdx]) : '';
    let fechaInicio = dateAddedIdx !== -1 ? parseStandardDateString(row[dateAddedIdx]) : '';

    // Estado de lectura
    let progreso: ReadingStatus = '❌ No Leído';
    const rawShelf = (shelfIdx !== -1 ? row[shelfIdx] : '').toLowerCase();

    if (rawShelf.includes('currently-reading') || rawShelf.includes('leyendo')) {
      progreso = '⏳ Leyendo';
    } else if (rawShelf.includes('to-read') || rawShelf.includes('no le') || rawShelf.includes('por leer') || rawShelf.includes('pendientes')) {
      progreso = '❌ No Leído';
    } else if (rawShelf === 'read' || rawShelf.includes('leído') || rawShelf.includes('leido')) {
      progreso = '✅ Leído';
    } else if (rawShelf.includes('abandon') || rawShelf.includes('dnf') || rawShelf.includes('paus')) {
      progreso = '⏸️ Pausado';
    } else if (fechaFin) {
      progreso = '✅ Leído';
    }

    // Si está marcado como leído y no hay fecha de fin pero sí fecha de inicio, podemos ordenarlas
    if (progreso === '⏳ Leyendo' && !fechaInicio) {
      fechaInicio = new Date().toISOString().slice(0, 10);
    }

    // Páginas
    let paginas: number | null = null;
    if (pagesIdx !== -1) {
      const p = parseInt(row[pagesIdx], 10);
      if (!Number.isNaN(p) && p > 0) paginas = p;
    }

    // Año publicación
    let fechaPublicacion: number | null = null;
    if (yearIdx !== -1) {
      const y = parseInt(row[yearIdx], 10);
      if (!Number.isNaN(y) && y > 0 && y <= new Date().getFullYear() + 2) {
        fechaPublicacion = y;
      }
    }

    // Editorial
    const editorial = publisherIdx !== -1 ? (row[publisherIdx] || '').trim() : '';

    // Reseña / Notas personales
    let notasPersonales = reviewIdx !== -1 ? (row[reviewIdx] || '').trim() : '';
    if (privateNotesIdx !== -1 && privateNotesIdx !== reviewIdx) {
      const priv = (row[privateNotesIdx] || '').trim();
      if (priv) {
        notasPersonales = notasPersonales ? `${notasPersonales}\n\n[Notas privadas]: ${priv}` : priv;
      }
    }

    // Portada inicial mediante ISBN si está disponible
    const portadaUrl = isbn ? buildOpenLibraryIsbnCover(isbn) : '';

    parsedBooks.push({
      nombre: cleanTitle,
      autor: rawAuthor.trim(),
      isbn,
      puntuacion,
      progreso,
      paginas,
      fechaPublicacion,
      editorial,
      fechaInicio,
      fechaFin,
      sinopsis: '',
      notasPersonales,
      sagaNombre,
      volumen,
      portadaUrl,
      portadaFallbackUrl: ''
    });
  }

  return {
    source,
    books: parsedBooks,
    sagas: Array.from(sagasSet),
    totalRows: rows.length - 1
  };
}
