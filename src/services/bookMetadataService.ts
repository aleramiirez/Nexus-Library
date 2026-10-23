import { BibliographicCandidate, Book } from '../types/models';
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
  },

  async fetchSubjectBooks(
    subjectKey: string,
    limit = 14,
    signal?: AbortSignal
  ): Promise<BibliographicCandidate[]> {
    const cacheKey = `${subjectKey}:${limit}`;
    if (subjectCache.has(cacheKey)) {
      return subjectCache.get(cacheKey)!;
    }

    const url = `https://openlibrary.org/subjects/${encodeURIComponent(subjectKey)}.json?limit=${limit}`;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) return [];
      const data = (await res.json()) as OpenLibrarySubjectResponse;
      if (!Array.isArray(data.works)) return [];

      const candidates = data.works
        .filter((w) => Boolean(w.title))
        .map((w, idx): BibliographicCandidate => {
          const primaryCover = buildOpenLibraryIdCover(w.cover_id);
          const rawCategories = Array.isArray(w.subject) ? w.subject.slice(0, 8) : [];
          const inferred = inferCatalogFromCategories(rawCategories);

          return {
            id: 'ol-subj-' + String(w.key || idx),
            source: 'openlibrary',
            nombre: (w.title || '').trim(),
            autor: Array.isArray(w.authors) && w.authors[0]?.name ? w.authors[0].name.trim() : '',
            fechaPublicacion: parseYear(w.first_publish_year),
            paginas: null,
            isbn: '',
            editorial: '',
            idioma: 'Español',
            edicion: w.edition_count ? `${w.edition_count} ediciones` : '',
            sinopsis: '',
            portadaUrl: primaryCover,
            portadaFallbackUrl: '',
            rawCategories,
            suggestedGenre: inferred.genre,
            suggestedSubgenres: inferred.subgenres
          };
        });

      subjectCache.set(cacheKey, candidates);
      return candidates;
    } catch (err) {
      if (signal?.aborted) throw err;
      return [];
    }
  },

  async fetchRecommendations(
    userBooks: Book[],
    signal?: AbortSignal
  ): Promise<{ reason: string; books: BibliographicCandidate[] }> {
    const existingTitles = new Set(userBooks.map((b) => normalizeText(b.nombre)));

    if (!userBooks || userBooks.length === 0) {
      const classics = await this.fetchSubjectBooks('classic_literature', 12, signal);
      const filtered = classics.filter((c) => !existingTitles.has(normalizeText(c.nombre)));
      return {
        reason: 'Obras maestras universales para inaugurar tu biblioteca',
        books: (filtered.length > 0 ? filtered : classics).slice(0, 8)
      };
    }

    const authorWeights = new Map<string, number>();
    const genreCounts = new Map<string, number>();

    for (const b of userBooks) {
      const author = (b.autor || '').trim();
      if (author && author !== 'Desconocido' && author !== 'Autor' && author !== '—') {
        const weight = (b.puntuacion && b.puntuacion >= 4) ? 3 : (b.progreso === '✅ Leído' ? 2 : 1);
        authorWeights.set(author, (authorWeights.get(author) || 0) + weight);
      }
      if (b.genero) {
        genreCounts.set(b.genero, (genreCounts.get(b.genero) || 0) + 1);
      }
    }

    let topAuthor = '';
    let maxAuthorWeight = 0;
    for (const [author, weight] of authorWeights.entries()) {
      if (weight > maxAuthorWeight) {
        maxAuthorWeight = weight;
        topAuthor = author;
      }
    }

    let topGenre = '';
    let maxGenreCount = 0;
    for (const [genre, count] of genreCounts.entries()) {
      if (count > maxGenreCount) {
        maxGenreCount = count;
        topGenre = genre;
      }
    }

    if (topAuthor && maxAuthorWeight >= 2) {
      try {
        const authorResults = await this.searchBooks(topAuthor, signal);
        const filtered = authorResults.filter((c) => !existingTitles.has(normalizeText(c.nombre)));
        if (filtered.length >= 2) {
          return {
            reason: `Porque has disfrutado de obras de ${topAuthor}`,
            books: filtered.slice(0, 8)
          };
        }
      } catch {
        // Fallback to genre
      }
    }

    const genreToSubjectMap: Record<string, string> = {
      '✨ Fantasía': 'fantasy',
      '🔭 Ciencia Ficción & Distopía': 'science_fiction',
      '🔪 Terror & Suspense': 'horror',
      '🏛️ Clásicos': 'classic_literature',
      '🏇 Aventuras': 'adventure',
      '❤️ Romance & Drama': 'romance',
      '📚 No Ficción': 'history'
    };

    const subject = (topGenre && genreToSubjectMap[topGenre]) || 'fantasy';
    const genreResults = await this.fetchSubjectBooks(subject, 16, signal);
    const filtered = genreResults.filter((c) => !existingTitles.has(normalizeText(c.nombre)));

    return {
      reason: topGenre
        ? `Recomendaciones seleccionadas para tu gusto por ${topGenre}`
        : 'Obras destacadas recomendadas para ti',
      books: (filtered.length > 0 ? filtered : genreResults).slice(0, 8)
    };
  }
};

interface OpenLibrarySubjectResponse {
  name?: string;
  work_count?: number;
  works?: Array<{
    key?: string;
    title?: string;
    authors?: Array<{ key?: string; name?: string }>;
    cover_id?: number;
    first_publish_year?: number;
    edition_count?: number;
    subject?: string[];
  }>;
}

const subjectCache = new Map<string, BibliographicCandidate[]>();

export interface DiscoverCategory {
  id: string;
  name: string;
  icon: string;
  subjectKey: string;
  description: string;
}

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  {
    id: 'fantasy',
    name: 'Fantasía & Épica',
    icon: '✨',
    subjectKey: 'fantasy',
    description: 'Mundos imaginarios, magia ancestral, reinos caídos y grandes gestas heroicas.'
  },
  {
    id: 'scifi',
    name: 'Ciencia Ficción & Distopía',
    icon: '🔭',
    subjectKey: 'science_fiction',
    description: 'Exploración espacial, futuros distópicos, tecnología y el destino de la humanidad.'
  },
  {
    id: 'horror',
    name: 'Terror & Suspense',
    icon: '🔪',
    subjectKey: 'horror',
    description: 'Misterios oscuros, horror gótico, casas encantadas y suspense psicológico.'
  },
  {
    id: 'action',
    name: 'Acción & Aventuras',
    icon: '⚔️',
    subjectKey: 'adventure',
    description: 'Expediciones lejanas, duelos de honor, supervivencia y travesías épicas.'
  },
  {
    id: 'classics',
    name: 'Clásicos Universales',
    icon: '🏛️',
    subjectKey: 'classic_literature',
    description: 'Las obras maestras fundamentales que han definido la historia de la literatura.'
  },
  {
    id: 'mystery',
    name: 'Misterio & Detectives',
    icon: '🕵️',
    subjectKey: 'mystery_and_detective_stories',
    description: 'Casos sin resolver, detectives sagaces, acertijos y crímenes intrigantes.'
  },
  {
    id: 'romance',
    name: 'Romance & Drama',
    icon: '❤️',
    subjectKey: 'romance',
    description: 'Historias de amor apasionadas, lazos profundos y destinos entrelazados.'
  },
  {
    id: 'history',
    name: 'Historia & No Ficción',
    icon: '📚',
    subjectKey: 'history',
    description: 'Crónicas de civilizaciones, biografías de grandes personajes y divulgación.'
  }
];

export function candidateToBookInput(
  cand: BibliographicCandidate
): Omit<Book, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    nombre: cand.nombre.trim(),
    autor: cand.autor.trim(),
    genero: cand.suggestedGenre || '',
    subgeneros: cand.suggestedSubgenres || [],
    fechaPublicacion: cand.fechaPublicacion,
    paginas: cand.paginas,
    puntuacion: null,
    progreso: '❌ No Leído',
    sagaId: null,
    sagaNombre: '',
    volumen: null,
    fechaInicio: '',
    fechaFin: '',
    lecturaVirtual: '',
    tiempoLectura: '',
    isbn: cand.isbn || '',
    editorial: cand.editorial || '',
    idioma: cand.idioma || 'Español',
    edicion: cand.edicion || '',
    sinopsis: cand.sinopsis || '',
    portadaUrl: cand.portadaUrl || '',
    portadaFallbackUrl: cand.portadaFallbackUrl || ''
  };
}
