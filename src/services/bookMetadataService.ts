import { BibliographicCandidate } from '../types/models';
import { inferCatalogFromCategories, normalizeText } from '../constants/catalogs';
import {
  buildOpenLibraryIdCover,
  buildOpenLibraryIsbnCover,
  normalizeCoverUrl
} from './coverService';

const searchCache = new Map<string, BibliographicCandidate[]>();

export function extractCleanIsbn(query: string): string | null {
  const cleaned = query.replace(/[^0-9X]/gi, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(cleaned) || /^\d{13}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

function normalizeLanguageCode(lang?: string): string {
  if (!lang) return '';
  const code = lang.toLowerCase().trim();
  if (code === 'spa' || code === 'es' || code.startsWith('es-')) return 'Español';
  if (code === 'eng' || code === 'en' || code.startsWith('en-')) return 'Inglés';
  if (code === 'fre' || code === 'fra' || code === 'fr') return 'Francés';
  if (code === 'ita' || code === 'it') return 'Italiano';
  if (code === 'ger' || code === 'deu' || code === 'de') return 'Alemán';
  if (code === 'por' || code === 'pt') return 'Portugués';
  return lang.toUpperCase();
}

function parseYear(rawDate?: string | number | null): number | null {
  if (typeof rawDate === 'number' && rawDate > 1000 && rawDate < 2100) {
    return rawDate;
  }
  if (typeof rawDate === 'string') {
    const match = rawDate.match(/\b(1\d{3}|20\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  publish_year?: number[];
  number_of_pages_median?: number;
  isbn?: string[];
  publisher?: string[];
  language?: string[];
  subject?: string[];
  cover_i?: number;
  edition_count?: number;
}

async function searchOpenLibrary(
  query: string,
  isbnQuery: string | null,
  signal?: AbortSignal
): Promise<BibliographicCandidate[]> {
  const params = new URLSearchParams();
  if (isbnQuery) {
    params.set('isbn', isbnQuery);
  } else {
    params.set('q', query);
  }
  params.set(
    'fields',
    'key,title,author_name,first_publish_year,publish_year,number_of_pages_median,isbn,publisher,language,subject,cover_i,edition_count'
  );
  params.set('limit', '10');

  const url = 'https://openlibrary.org/search.json?' + params.toString();
  const response = await fetch(url, { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  if (!Array.isArray(data.docs)) return [];

  return data.docs
    .filter((doc) => Boolean(doc.title))
    .map((doc, idx): BibliographicCandidate => {
      const isbns = Array.isArray(doc.isbn) ? doc.isbn : [];
      const matchedIsbn =
        (isbnQuery && isbns.find((i) => i.replace(/[^0-9X]/gi, '') === isbnQuery)) ||
        isbns.find((i) => i.length === 13) ||
        isbns[0] ||
        '';

      const isbnCover = matchedIsbn ? buildOpenLibraryIsbnCover(matchedIsbn) : '';
      const idCover = buildOpenLibraryIdCover(doc.cover_i);
      const primaryCover = isbnCover || idCover;
      const fallbackCover = isbnCover && idCover ? idCover : '';

      const languages = Array.isArray(doc.language) ? doc.language : [];
      const prefersSpanish = languages.includes('spa') ? 'spa' : languages[0] || '';
      const rawCategories = Array.isArray(doc.subject) ? doc.subject.slice(0, 12) : [];
      const inferred = inferCatalogFromCategories(rawCategories);

      return {
        id: 'ol-' + String(doc.key || idx) + '-' + matchedIsbn,
        source: 'openlibrary',
        nombre: (doc.title || '').trim(),
        autor: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '',
        fechaPublicacion:
          parseYear(doc.first_publish_year) ||
          (Array.isArray(doc.publish_year) ? parseYear(doc.publish_year[0]) : null),
        paginas:
          typeof doc.number_of_pages_median === 'number' && doc.number_of_pages_median > 0
            ? doc.number_of_pages_median
            : null,
        isbn: matchedIsbn,
        editorial: Array.isArray(doc.publisher) && doc.publisher[0] ? doc.publisher[0] : '',
        idioma: normalizeLanguageCode(prefersSpanish),
        edicion:
          doc.edition_count && doc.edition_count > 1
            ? String(doc.edition_count) + ' ediciones registradas'
            : '',
        sinopsis: '',
        portadaUrl: primaryCover,
        portadaFallbackUrl: fallbackCover,
        rawCategories,
        suggestedGenre: inferred.genre,
        suggestedSubgenres: inferred.subgenres
      };
    });
}

interface GoogleBooksItem {
  id?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    imageLinks?: {
      extraLarge?: string;
      large?: string;
      medium?: string;
      small?: string;
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

async function searchGoogleBooks(
  query: string,
  isbnQuery: string | null,
  signal?: AbortSignal
): Promise<BibliographicCandidate[]> {
  const qParam = isbnQuery ? 'isbn:' + isbnQuery : query;
  const params = new URLSearchParams({
    q: qParam,
    maxResults: '12',
    printType: 'books'
  });

  const url = 'https://www.googleapis.com/books/v1/volumes?' + params.toString();
  const response = await fetch(url, { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as { items?: GoogleBooksItem[] };
  if (!Array.isArray(data.items)) return [];

  return data.items
    .filter((item) => Boolean(item.volumeInfo?.title))
    .map((item, idx): BibliographicCandidate => {
      const info = item.volumeInfo!;
      const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
      const isbn13 = identifiers.find((id) => id.type === 'ISBN_13')?.identifier;
      const isbn10 = identifiers.find((id) => id.type === 'ISBN_10')?.identifier;
      const isbn = isbn13 || isbn10 || '';

      const links = info.imageLinks || {};
      const googleCover = normalizeCoverUrl(
        links.extraLarge ||
          links.large ||
          links.medium ||
          links.thumbnail ||
          links.smallThumbnail ||
          ''
      );
      const olCover = isbn ? buildOpenLibraryIsbnCover(isbn) : '';

      const rawCategories = Array.isArray(info.categories) ? info.categories : [];
      const inferred = inferCatalogFromCategories(rawCategories);

      return {
        id: 'gb-' + String(item.id || idx) + '-' + isbn,
        source: 'googlebooks',
        nombre: (info.title || '').trim(),
        autor: Array.isArray(info.authors) ? info.authors.join(', ') : '',
        fechaPublicacion: parseYear(info.publishedDate),
        paginas: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : null,
        isbn,
        editorial: info.publisher ? info.publisher.trim() : '',
        idioma: normalizeLanguageCode(info.language),
        edicion: info.subtitle ? info.subtitle.trim() : '',
        sinopsis: info.description ? info.description.replace(/<[^>]+>/g, '').trim() : '',
        portadaUrl: googleCover || olCover,
        portadaFallbackUrl: googleCover && olCover ? olCover : '',
        rawCategories,
        suggestedGenre: inferred.genre,
        suggestedSubgenres: inferred.subgenres
      };
    });
}

function mergeAndRankCandidates(
  olResults: BibliographicCandidate[],
  gbResults: BibliographicCandidate[],
  rawQuery: string,
  isbnQuery: string | null
): BibliographicCandidate[] {
  const combined: BibliographicCandidate[] = [];
  const byKey = new Map<string, BibliographicCandidate>();

  const makeDedupeKey = (c: BibliographicCandidate) => {
    const cleanIsbn = c.isbn.replace(/[^0-9X]/gi, '');
    if (cleanIsbn) return 'isbn:' + cleanIsbn;
    return 'ta:' + normalizeText(c.nombre) + '::' + normalizeText(c.autor);
  };

  for (const candidate of [...olResults, ...gbResults]) {
    const key = makeDedupeKey(candidate);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, { ...candidate });
      combined.push(byKey.get(key)!);
    } else {
      if (!existing.portadaUrl && candidate.portadaUrl) {
        existing.portadaUrl = candidate.portadaUrl;
      } else if (existing.portadaUrl && candidate.portadaUrl && !existing.portadaFallbackUrl) {
        existing.portadaFallbackUrl = candidate.portadaUrl;
      }
      if (!existing.paginas && candidate.paginas) existing.paginas = candidate.paginas;
      if (!existing.fechaPublicacion && candidate.fechaPublicacion) {
        existing.fechaPublicacion = candidate.fechaPublicacion;
      }
      if (!existing.editorial && candidate.editorial) existing.editorial = candidate.editorial;
      if (!existing.sinopsis && candidate.sinopsis) existing.sinopsis = candidate.sinopsis;
      if (!existing.isbn && candidate.isbn) existing.isbn = candidate.isbn;
      if (existing.idioma !== 'Español' && candidate.idioma === 'Español') {
        existing.idioma = 'Español';
        existing.nombre = candidate.nombre || existing.nombre;
      }
      if (!existing.suggestedGenre && candidate.suggestedGenre) {
        existing.suggestedGenre = candidate.suggestedGenre;
      }
      if (existing.suggestedSubgenres.length === 0 && candidate.suggestedSubgenres.length > 0) {
        existing.suggestedSubgenres = candidate.suggestedSubgenres;
      }
    }
  }

  const queryNorm = normalizeText(rawQuery);

  return combined.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (isbnQuery) {
      if (a.isbn.replace(/[^0-9X]/gi, '') === isbnQuery) scoreA += 100;
      if (b.isbn.replace(/[^0-9X]/gi, '') === isbnQuery) scoreB += 100;
    }

    if (a.idioma === 'Español') scoreA += 25;
    if (b.idioma === 'Español') scoreB += 25;

    if (a.portadaUrl) scoreA += 20;
    if (b.portadaUrl) scoreB += 20;

    if (a.autor) scoreA += 10;
    if (b.autor) scoreB += 10;

    if (a.paginas) scoreA += 6;
    if (b.paginas) scoreB += 6;

    if (normalizeText(a.nombre).startsWith(queryNorm)) scoreA += 12;
    if (normalizeText(b.nombre).startsWith(queryNorm)) scoreB += 12;

    return scoreB - scoreA;
  });
}

export const bookMetadataService = {
  async searchBooks(query: string, signal?: AbortSignal): Promise<BibliographicCandidate[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const cacheKey = trimmed.toLowerCase();
    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey)!;
    }

    const isbnQuery = extractCleanIsbn(trimmed);

    const [olSettled, gbSettled] = await Promise.allSettled([
      searchOpenLibrary(trimmed, isbnQuery, signal),
      searchGoogleBooks(trimmed, isbnQuery, signal)
    ]);

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const olResults = olSettled.status === 'fulfilled' ? olSettled.value : [];
    const gbResults = gbSettled.status === 'fulfilled' ? gbSettled.value : [];

    const ranked = mergeAndRankCandidates(olResults, gbResults, trimmed, isbnQuery);
    searchCache.set(cacheKey, ranked);
    return ranked;
  },

  async findBestMatchForBook(input: {
    nombre: string;
    autor?: string;
    isbn?: string;
  }): Promise<BibliographicCandidate | null> {
    const cleanIsbn = input.isbn ? extractCleanIsbn(input.isbn) : null;
    if (cleanIsbn) {
      const byIsbn = await this.searchBooks(cleanIsbn);
      if (byIsbn.length > 0) return byIsbn[0];
    }

    const combinedQuery = [input.nombre, input.autor].filter(Boolean).join(' ').trim();
    if (!combinedQuery) return null;

    const candidates = await this.searchBooks(combinedQuery);
    if (candidates.length === 0) return null;

    const targetTitle = normalizeText(input.nombre);
    const targetAuthor = input.autor ? normalizeText(input.autor) : '';

    const verified = candidates.find((c) => {
      const candTitle = normalizeText(c.nombre);
      const titleMatch =
        candTitle === targetTitle ||
        candTitle.includes(targetTitle) ||
        targetTitle.includes(candTitle);
      if (!titleMatch) return false;
      if (!targetAuthor || !c.autor) return true;
      const candAuthor = normalizeText(c.autor);
      return candAuthor.includes(targetAuthor) || targetAuthor.includes(candAuthor);
    });

    return verified || candidates[0];
  }
};
