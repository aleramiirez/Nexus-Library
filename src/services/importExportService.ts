import { collectionService } from './collectionService';
import { readingStreakService } from './readingStreakService';
import { getUserReadingSpeedPph } from '../utils/readingTime';
import { BackupPayload, Book, Saga, StarRating } from '../types/models';
import { normalizeText, ReadingStatus } from '../constants/catalogs';
import { buildOpenLibraryIsbnCover } from './coverService';
import { extractSeriesAndVolumeFromText } from './bookMetadataService';

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
  resena?: string;
  vecesLeido?: number;
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
  const readingStreakLogs = readingStreakService.getExportData();
  const userReadingSpeedPph = getUserReadingSpeedPph();
  const payload: BackupPayload = {
    app: 'NEXUS_LIBRARY',
    version: 3,
    exportedAt: new Date().toISOString(),
    books,
    sagas,
    collections,
    lentRecords,
    readingStreakLogs,
    userReadingSpeedPph
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
export function parseBookTitleAndSeries(
  rawTitle: string,
  author?: string
): {
  cleanTitle: string;
  sagaNombre: string;
  volumen: number | null;
} {
  const extracted = extractSeriesAndVolumeFromText(rawTitle, { author });
  return {
    cleanTitle: extracted.cleanTitle || rawTitle.trim(),
    sagaNombre: extracted.sagaNombre,
    volumen: extracted.volumen
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

export function cleanIsbn(raw?: string): string {
  if (!raw) return '';
  let str = raw.trim();
  // Limpia formato raro de Goodreads o Excel como ="978..." o ="0441172717"
  if (str.startsWith('=')) {
    str = str.slice(1).trim();
  }
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1).trim();
  }
  const cleaned = str.replace(/[^0-9Xx]/g, '').toUpperCase();
  return cleaned;
}

/**
 * Parsea un archivo CSV exportado desde Goodreads, The StoryGraph o Nexus Library,
 * extrayendo libros, estados de lectura, puntuaciones, notas personales, reseñas,
 * número de veces leído, sagas y números de volumen.
 */
export function importFromCSV(csvText: string): CsvLibraryParseResult {
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
  const authorIdx = findColIndex('author', 'autor', 'authors', 'autores');
  const isbn13Idx = findColIndex('isbn13', 'isbn 13', 'isbn-13');
  const isbnIdx = findColIndex('isbn/uid', 'isbn');
  const myRatingIdx = findColIndex('my rating', 'star rating', 'puntuacion', 'puntuación', 'rating');
  const shelfIdx = findColIndex('exclusive shelf', 'read status', 'status', 'progreso', 'shelf', 'bookshelves');
  const readCountIdx = findColIndex('read count', 'read_count', 'veces leido', 'veces leído', 'veces_leido', 'times read');
  const dateReadIdx = findColIndex('date read', 'fecha fin', 'read dates', 'finished', 'date finished');
  const dateAddedIdx = findColIndex('date added', 'fecha inicio', 'added', 'date started');
  const pagesIdx = findColIndex('number of pages', 'páginas', 'paginas', 'pages', 'page count');
  const yearIdx = findColIndex('year published', 'original publication year', 'fecha de publicación', 'publicación', 'publicacion', 'year');
  const publisherIdx = findColIndex('publisher', 'editorial');
  const reviewIdx = findColIndex('my review', 'review', 'reseña', 'resena');
  const privateNotesIdx = findColIndex('private notes', 'notas personales', 'notas');
  const sagaIdx = findColIndex('saga', 'serie', 'series');
  const volumenIdx = findColIndex('volumen', 'volume', 'tomo', 'libro');
  const synopsisIdx = findColIndex('sinopsis', 'synopsis', 'description', 'resumen');

  if (titleIdx === -1 || authorIdx === -1) {
    throw new Error(
      'El archivo CSV no contiene columnas válidas de "Title" y "Author". Asegúrate de exportar tu biblioteca desde Goodreads, The StoryGraph o Nexus Library.'
    );
  }

  const isGoodreads = headers.some(
    (h) => h.includes('goodreads') || h === 'book id' || h === 'exclusive shelf'
  );
  const isStorygraph = headers.some(
    (h) => h === 'star rating' || h === 'read status' || h === 'read dates' || h.includes('storygraph')
  );
  const isNexus = headers.some(
    (h) =>
      h === 'subgénero' ||
      h === 'subgenero' ||
      h === 'lectura virtual' ||
      h === 'tiempo de lectura'
  );

  let source: CsvLibraryParseResult['source'] = 'generic';
  if (isGoodreads) source = 'goodreads';
  else if (isStorygraph) source = 'storygraph';
  else if (isNexus) source = 'nexus';

  const parsedBooks: ParsedCsvBook[] = [];
  const sagasSet = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const rawTitle = row[titleIdx] || '';
    const rawAuthor = row[authorIdx] || '';

    if (!rawTitle.trim()) continue;

    // Título y saga: extrae saga de títulos estilo Goodreads "El Imperio Final (Nacidos de la Bruma, #1)"
    let cleanTitle = rawTitle.trim();
    let sagaNombre = sagaIdx !== -1 ? (row[sagaIdx] || '').trim() : '';
    let volumen = volumenIdx !== -1 ? parseInt(row[volumenIdx], 10) : null;
    if (volumen !== null && Number.isNaN(volumen)) volumen = null;

    const seriesExtracted = parseBookTitleAndSeries(rawTitle, rawAuthor);
    if (seriesExtracted.cleanTitle) {
      cleanTitle = seriesExtracted.cleanTitle;
    }
    if (!sagaNombre && seriesExtracted.sagaNombre) {
      sagaNombre = seriesExtracted.sagaNombre;
    }
    if (volumen === null && seriesExtracted.volumen !== null) {
      volumen = seriesExtracted.volumen;
    }

    if (sagaNombre) {
      sagasSet.add(sagaNombre);
    }

    // ISBN (limpiando ="...")
    let rawIsbnVal = (isbn13Idx !== -1 ? row[isbn13Idx] : '') || (isbnIdx !== -1 ? row[isbnIdx] : '');
    const isbn = cleanIsbn(rawIsbnVal);

    // Rating (Goodreads usa 1-5, StoryGraph soporta decimales ej. 4.5; si es 0 -> null)
    let puntuacion: StarRating = null;
    if (myRatingIdx !== -1) {
      const rawRating = parseFloat(row[myRatingIdx]);
      if (!Number.isNaN(rawRating) && rawRating > 0) {
        const halfRounded = Math.round(rawRating * 2) / 2;
        const clamped = Math.max(0.5, Math.min(5, halfRounded));
        puntuacion = clamped as StarRating;
      }
    }

    // Fechas
    const fechaFin = dateReadIdx !== -1 ? parseStandardDateString(row[dateReadIdx]) : '';
    let fechaInicio = dateAddedIdx !== -1 ? parseStandardDateString(row[dateAddedIdx]) : '';

    // Estado de lectura
    let progreso: ReadingStatus = '❌ No Leído';
    const rawShelf = (shelfIdx !== -1 ? row[shelfIdx] : '').toLowerCase();

    if (
      rawShelf.includes('currently-reading') ||
      rawShelf.includes('currently reading') ||
      rawShelf.includes('leyendo') ||
      rawShelf.includes('reading')
    ) {
      progreso = '⏳ Leyendo';
    } else if (
      rawShelf.includes('to-read') ||
      rawShelf.includes('to read') ||
      rawShelf.includes('no le') ||
      rawShelf.includes('por leer') ||
      rawShelf.includes('pendiente') ||
      rawShelf.includes('pendientes')
    ) {
      progreso = '❌ No Leído';
    } else if (
      rawShelf === 'read' ||
      rawShelf.includes('leído') ||
      rawShelf.includes('leido') ||
      rawShelf.includes('completed') ||
      rawShelf.includes('finished')
    ) {
      progreso = '✅ Leído';
    } else if (
      rawShelf.includes('paused') ||
      rawShelf.includes('paus') ||
      rawShelf.includes('abandon') ||
      rawShelf.includes('dnf')
    ) {
      progreso = '⏸️ Pausado';
    } else if (fechaFin) {
      progreso = '✅ Leído';
    }

    if (progreso === '⏳ Leyendo' && !fechaInicio) {
      fechaInicio = new Date().toISOString().slice(0, 10);
    }

    // Veces leído (Read Count de Goodreads)
    let vecesLeido = progreso === '✅ Leído' ? 1 : 0;
    if (readCountIdx !== -1) {
      const parsedCount = parseInt(row[readCountIdx], 10);
      if (!Number.isNaN(parsedCount) && parsedCount >= 0) {
        vecesLeido = parsedCount;
      }
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

    // Reseña y notas personales (Goodreads: My Review -> resena, StoryGraph: Review -> resena)
    const resena = reviewIdx !== -1 ? (row[reviewIdx] || '').trim() : '';
    let notasPersonales = privateNotesIdx !== -1 ? (row[privateNotesIdx] || '').trim() : '';
    if (!notasPersonales && resena) {
      notasPersonales = resena;
    }

    // Sinopsis
    const sinopsis = synopsisIdx !== -1 ? (row[synopsisIdx] || '').trim() : '';

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
      sinopsis,
      notasPersonales,
      resena,
      vecesLeido,
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

export const parseGoodreadsOrStorygraphCsv = importFromCSV;
