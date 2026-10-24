import { BibliographicCandidate, Book } from '../types/models';
import { inferCatalogFromCategories, normalizeText, Genre } from '../constants/catalogs';
import {
  buildOpenLibraryIdCover,
  buildOpenLibraryIsbnCover,
  normalizeCoverUrl
} from './coverService';

const searchCache = new Map<string, BibliographicCandidate[]>();
const subjectCache = new Map<string, BibliographicCandidate[]>();


async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        controller.abort();
      });
    }
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

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
  const response = await fetchWithTimeout(url, { signal }, 4000);
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
  const response = await fetchWithTimeout(url, { signal }, 3500);
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

export const KNOWN_SAGA_PATTERNS: Array<{
  key: string;
  patterns: RegExp[];
}> = [
  {
    key: 'harry_potter_1',
    patterns: [
      /harry potter.*(piedra filosofal|sorcerer|philosopher)/i,
      /^(harry potter y la piedra filosofal|harry potter and the sorcerer's stone|harry potter and the philosopher's stone)/i
    ]
  },
  {
    key: 'harry_potter_2',
    patterns: [
      /harry potter.*(camara secreta|c[aá]mara secreta|chamber of secrets)/i
    ]
  },
  {
    key: 'harry_potter_3',
    patterns: [
      /harry potter.*(prisionero de azkaban|prisoner of azkaban)/i
    ]
  },
  {
    key: 'harry_potter_4',
    patterns: [
      /harry potter.*(caliz de fuego|c[aá]liz de fuego|goblet of fire)/i
    ]
  },
  {
    key: 'harry_potter_5',
    patterns: [
      /harry potter.*(orden del fenix|orden del f[eé]nix|order of the phoenix)/i
    ]
  },
  {
    key: 'harry_potter_6',
    patterns: [
      /harry potter.*(misterio del principe|misterio del pr[ií]ncipe|half blood prince|half-blood prince)/i
    ]
  },
  {
    key: 'harry_potter_7',
    patterns: [
      /harry potter.*(reliquias de la muerte|deathly hallows)/i
    ]
  },
  {
    key: 'harry_potter_general',
    patterns: [
      /harry potter/i
    ]
  },
  {
    key: 'lotr_1',
    patterns: [
      /(senor de los anillos|se[nñ]or de los anillos|lord of the rings).*(comunidad del anillo|fellowship of the ring)/i,
      /comunidad del anillo/i,
      /fellowship of the ring/i
    ]
  },
  {
    key: 'lotr_2',
    patterns: [
      /(senor de los anillos|se[nñ]or de los anillos|lord of the rings).*(dos torres|two towers)/i,
      /las dos torres/i,
      /the two towers/i
    ]
  },
  {
    key: 'lotr_3',
    patterns: [
      /(senor de los anillos|se[nñ]or de los anillos|lord of the rings).*(retorno del rey|return of the king)/i,
      /el retorno del rey/i,
      /the return of the king/i
    ]
  },
  {
    key: 'hobbit',
    patterns: [/^(el )?hobbit/i, /^the hobbit/i]
  },
  {
    key: 'dune',
    patterns: [/^(duna|dune)(\b|:|\()/i]
  },
  {
    key: 'game_of_thrones_1',
    patterns: [
      /(cancion de hielo y fuego|song of ice and fire).*(juego de tronos|game of thrones)/i,
      /^(a )?game of thrones$/i,
      /^(un )?juego de tronos$/i
    ]
  },
  {
    key: 'percy_jackson_1',
    patterns: [
      /percy jackson.*(ladron del rayo|ladr[oó]n del rayo|lightning thief)/i
    ]
  },
  {
    key: 'hunger_games_1',
    patterns: [
      /(los )?juegos del hambre/i,
      /(the )?hunger games/i
    ]
  },
  {
    key: 'narnia_1',
    patterns: [
      /narnia.*(leon.*bruja.*armario|le[oó]n.*bruja.*armario|lion.*witch.*wardrobe)/i
    ]
  }
];

export function isBookAlreadyInLibrary(
  candidate: { nombre: string; autor?: string; isbn?: string; id?: string },
  userBooks: Book[]
): boolean {
  if (!userBooks || userBooks.length === 0) return false;

  const candCleanIsbn = candidate.isbn ? candidate.isbn.replace(/[^0-9X]/gi, '').toUpperCase() : '';
  const candNormTitle = normalizeText(candidate.nombre || '');
  const candNormAuthor = normalizeText(candidate.autor || '');

  // 1. Coincidencia por ISBN
  if (candCleanIsbn) {
    for (const b of userBooks) {
      if (b.isbn) {
        const bookCleanIsbn = b.isbn.replace(/[^0-9X]/gi, '').toUpperCase();
        if (bookCleanIsbn && bookCleanIsbn === candCleanIsbn) return true;
      }
    }
  }

  // 2. Coincidencia por título normalizado exacto
  for (const b of userBooks) {
    const bookNormTitle = normalizeText(b.nombre || '');
    if (bookNormTitle && bookNormTitle === candNormTitle) return true;
  }

  // 3. Patrones de libros y sagas bilingües conocidas
  for (const saga of KNOWN_SAGA_PATTERNS) {
    const candMatches = saga.patterns.some((re) => re.test(candidate.nombre));
    if (candMatches) {
      const userHasMatch = userBooks.some((b) => saga.patterns.some((re) => re.test(b.nombre)));
      if (userHasMatch) {
        if (saga.key !== 'harry_potter_general') return true;
        // Si el usuario ya tiene 2 o más libros de la saga, descartar tomos de la misma
        const hpCount = userBooks.filter((b) => /harry potter/i.test(b.nombre)).length;
        if (hpCount >= 2) return true;
      }
    }
  }

  // 4. Mismo autor + coincidencia de palabras clave distintivas
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'y', 'a',
    'the', 'an', 'of', 'in', 'and', 'to', 'with', 'by', 'for', 'on', 'edition', 'edicion',
    'libro', 'book', 'vol', 'volumen', 'volume', 'tomo', 'part', 'parte', 'serie', 'series'
  ]);

  const candTokens = candNormTitle
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  for (const b of userBooks) {
    const bookNormAuthor = normalizeText(b.autor || '');
    const isSameAuthor =
      candNormAuthor &&
      bookNormAuthor &&
      (candNormAuthor.includes(bookNormAuthor) || bookNormAuthor.includes(candNormAuthor));

    if (isSameAuthor) {
      const bookNormTitle = normalizeText(b.nombre || '');
      if (
        candNormTitle.includes(bookNormTitle) ||
        bookNormTitle.includes(candNormTitle)
      ) {
        return true;
      }

      const bookTokens = new Set(
        bookNormTitle
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w))
      );

      const commonTokens = candTokens.filter((t) => bookTokens.has(t));
      if (commonTokens.length >= 2) return true;
      if (candTokens.length === 1 && bookTokens.has(candTokens[0])) return true;
    }
  }

  return false;
}

const DISMISSED_STORAGE_KEY = 'nexus_dismissed_recommendations';

export const dismissedRecommendationsService = {
  getDismissedIds(): Set<string> {
    try {
      if (typeof window === 'undefined') return new Set();
      const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (!stored) return new Set();
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  },

  dismiss(id: string): void {
    try {
      if (typeof window === 'undefined') return;
      const current = this.getDismissedIds();
      current.add(id);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...current]));
    } catch {
      // Ignored
    }
  },

  undismiss(id: string): void {
    try {
      if (typeof window === 'undefined') return;
      const current = this.getDismissedIds();
      current.delete(id);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...current]));
    } catch {
      // Ignored
    }
  }
};

export const AUTHOR_AFFINITY_MAP: Record<
  string,
  {
    similarAuthors: string[];
    suggestedQueries: string[];
    genre: Genre;
  }
> = {
  'j k rowling': {
    similarAuthors: ['Philip Pullman', 'Neil Gaiman', 'Rick Riordan', 'Jonathan Stroud', 'C.S. Lewis', 'Patrick Rothfuss'],
    suggestedQueries: ['La materia oscura', 'El libro del cementerio', 'El ladrón del rayo', 'El amuleto de Samarcanda', 'El león la bruja y el armario'],
    genre: '✨ Fantasía'
  },
  'jk rowling': {
    similarAuthors: ['Philip Pullman', 'Neil Gaiman', 'Rick Riordan', 'Jonathan Stroud', 'C.S. Lewis', 'Patrick Rothfuss'],
    suggestedQueries: ['La materia oscura', 'El libro del cementerio', 'El ladrón del rayo', 'El amuleto de Samarcanda', 'El león la bruja y el armario'],
    genre: '✨ Fantasía'
  },
  'brandon sanderson': {
    similarAuthors: ['Patrick Rothfuss', 'Robert Jordan', 'Joe Abercrombie', 'Steven Erikson', 'Brian McClellan', 'Robin Hobb'],
    suggestedQueries: ['El nombre del viento', 'El ojo del mundo', 'La voz de las espadas', 'Los jardines de la luna', 'Aprendiz de asesino'],
    genre: '✨ Fantasía'
  },
  'patrick rothfuss': {
    similarAuthors: ['Brandon Sanderson', 'Scott Lynch', 'Robin Hobb', 'Joe Abercrombie', 'Ursula K. Le Guin'],
    suggestedQueries: ['El camino de los reyes', 'Las mentiras de Locke Lamora', 'El temor de un hombre sabio', 'Un mago de Terramar'],
    genre: '✨ Fantasía'
  },
  'stephen king': {
    similarAuthors: ['Joe Hill', 'Shirley Jackson', 'Dan Simmons', 'Clive Barker', 'Mariana Enriquez', 'H.P. Lovecraft'],
    suggestedQueries: ['Fantasmas del pasado', 'La maldición de Hill House', 'El terror', 'Nuestra parte de noche', 'Libros de sangre'],
    genre: '🔪 Terror & Suspense'
  },
  'isaac asimov': {
    similarAuthors: ['Arthur C. Clarke', 'Philip K. Dick', 'Frank Herbert', 'Ray Bradbury', 'Stanislaw Lem', 'Liu Cixin'],
    suggestedQueries: ['2001 una odisea espacial', 'Sueñan los androides con ovejas electricas', 'Dune', 'Crónicas marcianas', 'Solaris', 'El problema de los tres cuerpos'],
    genre: '🔭 Ciencia Ficción & Distopía'
  },
  'frank herbert': {
    similarAuthors: ['Isaac Asimov', 'Dan Simmons', 'Arthur C. Clarke', 'Ursula K. Le Guin', 'Alastair Reynolds'],
    suggestedQueries: ['Fundación', 'Hyperion', 'La mano izquierda de la oscuridad', 'Cántico por Leibowitz'],
    genre: '🔭 Ciencia Ficción & Distopía'
  },
  'gabriel garcia marquez': {
    similarAuthors: ['Isabel Allende', 'Jorge Luis Borges', 'Julio Cortázar', 'Juan Rulfo', 'Laura Esquivel', 'Mario Vargas Llosa'],
    suggestedQueries: ['La casa de los espíritus', 'Ficciones', 'Rayuela', 'Pedro Páramo', 'Como agua para chocolate', 'La ciudad y los perros'],
    genre: '🏛️ Clásicos'
  },
  'j r r tolkien': {
    similarAuthors: ['George R.R. Martin', 'Ursula K. Le Guin', 'Tad Williams', 'Guy Gavriel Kay', 'C.S. Lewis'],
    suggestedQueries: ['Juego de tronos', 'Un mago de Terramar', 'Añoranzas y pesares', 'Tigana'],
    genre: '✨ Fantasía'
  },
  'jrr tolkien': {
    similarAuthors: ['George R.R. Martin', 'Ursula K. Le Guin', 'Tad Williams', 'Guy Gavriel Kay', 'C.S. Lewis'],
    suggestedQueries: ['Juego de tronos', 'Un mago de Terramar', 'Añoranzas y pesares', 'Tigana'],
    genre: '✨ Fantasía'
  },
  'george r r martin': {
    similarAuthors: ['Joe Abercrombie', 'Bernard Cornwell', 'Robin Hobb', 'Scott Lynch', 'Patrick Rothfuss'],
    suggestedQueries: ['La voz de las espadas', 'El último reino', 'El asesino real', 'Las mentiras de Locke Lamora'],
    genre: '✨ Fantasía'
  },
  'agatha christie': {
    similarAuthors: ['Arthur Conan Doyle', 'John Dickson Carr', 'Georges Simenon', 'Dorothy L. Sayers', 'Gillian Flynn'],
    suggestedQueries: ['Estudio en escarlata', 'El sabueso de los Baskerville', 'El hombre del revés', 'Perdida'],
    genre: '🔪 Terror & Suspense'
  },
  'arthur conan doyle': {
    similarAuthors: ['Agatha Christie', 'Edgar Allan Poe', 'G.K. Chesterton', 'Wilkie Collins'],
    suggestedQueries: ['Diez negritos', 'Asesinato en el Orient Express', 'Los crímenes de la calle Morgue', 'La piedra lunar'],
    genre: '🔪 Terror & Suspense'
  },
  'jane austen': {
    similarAuthors: ['Charlotte Brontë', 'Emily Brontë', 'Louisa May Alcott', 'Virginia Woolf', 'Elizabeth Gaskell'],
    suggestedQueries: ['Jane Eyre', 'Cumbres borrascosas', 'Mujercitas', 'Norte y sur', 'Al faro'],
    genre: '❤️ Romance & Drama'
  }
};

export interface RecommendOptions {
  subFilter?: 'mix' | 'authors' | 'classics';
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

export const CURATED_FALLBACK_RECOMMENDATIONS: BibliographicCandidate[] = [
  {
    id: 'curated-pullman',
    source: 'openlibrary',
    nombre: 'La brújula dorada',
    autor: 'Philip Pullman',
    fechaPublicacion: 1995,
    paginas: 399,
    isbn: '9788466662451',
    editorial: 'Ediciones B',
    idioma: 'Español',
    edicion: 'La materia oscura I',
    sinopsis: 'Lyra Belacqua emprende un viaje épico al gélido Norte para salvar a su mejor amigo y desentrañar el misterio del Polvo.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8314115-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🧙 Fantasía Épica'],
    recommendationReason: 'Afín a tu lectura de J.K. Rowling'
  },
  {
    id: 'curated-gaiman',
    source: 'openlibrary',
    nombre: 'El libro del cementerio',
    autor: 'Neil Gaiman',
    fechaPublicacion: 2008,
    paginas: 320,
    isbn: '9788416035045',
    editorial: 'Roca Editorial',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Nadie Owens es un niño normal criado por los fantasmas y habitantes de un antiguo cementerio.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8231856-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🪄 Fantasía Juvenil'],
    recommendationReason: 'Afín a tu lectura de J.K. Rowling'
  },
  {
    id: 'curated-riordan',
    source: 'openlibrary',
    nombre: 'El ladrón del rayo',
    autor: 'Rick Riordan',
    fechaPublicacion: 2005,
    paginas: 288,
    isbn: '9788498386264',
    editorial: 'Salamandra',
    idioma: 'Español',
    edicion: 'Percy Jackson I',
    sinopsis: 'Un joven descubre que su verdadero padre es Poseidón y se ve envuelto en una guerra de dioses en el mundo actual.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/11181163-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🏺 Mitología & Epopeya'],
    recommendationReason: 'Afín a tu lectura de J.K. Rowling'
  },
  {
    id: 'curated-rothfuss',
    source: 'openlibrary',
    nombre: 'El nombre del viento',
    autor: 'Patrick Rothfuss',
    fechaPublicacion: 2007,
    paginas: 872,
    isbn: '9788401352836',
    editorial: 'Plaza & Janés',
    idioma: 'Español',
    edicion: 'Crónica del Asesino de Reyes I',
    sinopsis: 'Kvothe relata su extraordinaria historia: desde sus días en una troupe de artistas hasta convertirse en leyenda viviente.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8235123-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🧙 Fantasía Épica'],
    recommendationReason: 'Imprescindible de Fantasía'
  },
  {
    id: 'curated-dune',
    source: 'openlibrary',
    nombre: 'Dune',
    autor: 'Frank Herbert',
    fechaPublicacion: 1965,
    paginas: 704,
    isbn: '9788466353779',
    editorial: 'Debolsillo',
    idioma: 'Español',
    edicion: 'Crónicas de Dune I',
    sinopsis: 'En el inhóspito planeta desértico Arrakis, el joven Paul Atreides debe vengar a su familia y cumplir un destino místico.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/10524458-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['science_fiction'],
    suggestedGenre: '🔭 Ciencia Ficción & Distopía',
    suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
    recommendationReason: 'Obra cumbre de Ciencia Ficción'
  },
  {
    id: 'curated-asimov-fundacion',
    source: 'openlibrary',
    nombre: 'Fundación',
    autor: 'Isaac Asimov',
    fechaPublicacion: 1951,
    paginas: 256,
    isbn: '9788499899534',
    editorial: 'Debolsillo',
    idioma: 'Español',
    edicion: 'Ciclo de la Fundación I',
    sinopsis: 'Hari Seldon prevé la caída del Imperio Galáctico y crea la Fundación para preservar el saber de la humanidad.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['science_fiction'],
    suggestedGenre: '🔭 Ciencia Ficción & Distopía',
    suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
    recommendationReason: 'Obra cumbre de Ciencia Ficción'
  },
  {
    id: 'curated-1984',
    source: 'openlibrary',
    nombre: '1984',
    autor: 'George Orwell',
    fechaPublicacion: 1949,
    paginas: 326,
    isbn: '9788499890944',
    editorial: 'Debolsillo',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Winston Smith vive en una sociedad totalitaria gobernada por el Gran Hermano donde el pensamiento disidente es castigado.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/7222246-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['classic_literature'],
    suggestedGenre: '🏛️ Clásicos',
    suggestedSubgenres: ['🏚️ Post-Apocalíptico'],
    recommendationReason: 'Clásico universal imprescindible'
  },
  {
    id: 'curated-borges',
    source: 'openlibrary',
    nombre: 'Ficciones',
    autor: 'Jorge Luis Borges',
    fechaPublicacion: 1944,
    paginas: 224,
    isbn: '9788420633114',
    editorial: 'Alianza',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Colección de relatos laberínticos sobre espejos, bibliotecas infinitas, enigmas y la naturaleza del tiempo.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8315123-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['classic_literature'],
    suggestedGenre: '🏛️ Clásicos',
    suggestedSubgenres: ['🧙 Fantasía Épica'],
    recommendationReason: 'Joya literaria aclamada'
  },
  {
    id: 'curated-garcia-marquez',
    source: 'openlibrary',
    nombre: 'Cien años de soledad',
    autor: 'Gabriel García Márquez',
    fechaPublicacion: 1967,
    paginas: 471,
    isbn: '9788439720775',
    editorial: 'Random House',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'La saga de la familia Buendía a lo largo de siete generaciones en el mítico pueblo de Macondo.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/11142512-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['classic_literature'],
    suggestedGenre: '🏛️ Clásicos',
    suggestedSubgenres: ['💔 Drama'],
    recommendationReason: 'Obra cumbre de la literatura'
  },
  {
    id: 'curated-hill-house',
    source: 'openlibrary',
    nombre: 'La maldición de Hill House',
    autor: 'Shirley Jackson',
    fechaPublicacion: 1959,
    paginas: 240,
    isbn: '9788494029868',
    editorial: 'Valdemar',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Cuatro investigadores se alojan en Hill House, una mansión siniestra con un historial de sucesos inexplicables.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8228190-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['horror'],
    suggestedGenre: '🔪 Terror & Suspense',
    suggestedSubgenres: ['👻 Terror Sobrenatural'],
    recommendationReason: 'Joya del terror gótico'
  }
];

export const SUBJECT_KEY_TO_CATEGORY_ID: Record<string, string> = {
  fantasy: 'fantasy',
  science_fiction: 'scifi',
  horror: 'horror',
  adventure: 'action',
  classic_literature: 'classics',
  mystery_and_detective_stories: 'mystery',
  romance: 'romance',
  history: 'history'
};

export const CURATED_CATEGORY_BOOKS: Record<string, BibliographicCandidate[]> = {
  fantasy: [
    {
      id: 'curated-rothfuss',
      source: 'openlibrary',
      nombre: 'El nombre del viento',
      autor: 'Patrick Rothfuss',
      fechaPublicacion: 2007,
      paginas: 872,
      isbn: '9788401352836',
      editorial: 'Plaza & Janés',
      idioma: 'Español',
      edicion: 'Crónica del Asesino de Reyes I',
      sinopsis: 'Kvothe relata su extraordinaria historia: desde sus días en una troupe de artistas hasta convertirse en leyenda viviente.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235123-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Imprescindible de la fantasía moderna'
    },
    {
      id: 'curated-sanderson-kings',
      source: 'openlibrary',
      nombre: 'El camino de los reyes',
      autor: 'Brandon Sanderson',
      fechaPublicacion: 2010,
      paginas: 1200,
      isbn: '9788466657662',
      editorial: 'Nova',
      idioma: 'Español',
      edicion: 'El Archivo de las Tormentas I',
      sinopsis: 'En Roshar, un mundo asolado por tempestades, cuatro personajes enfrentan su destino en una guerra legendaria.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8301726-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Obra maestra de la fantasía épica contemporánea'
    },
    {
      id: 'curated-elantris',
      source: 'openlibrary',
      nombre: 'Elantris',
      autor: 'Brandon Sanderson',
      fechaPublicacion: 2005,
      paginas: 650,
      isbn: '9788466658843',
      editorial: 'Nova',
      idioma: 'Español',
      edicion: 'Edición X Aniversario',
      sinopsis: 'La ciudad de los dioses ha caído en desgracia y sus habitantes son convertidos en leprosos vivientes.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/11130386-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'La aclamada primera novela del Cosmere'
    },
    {
      id: 'curated-pullman',
      source: 'openlibrary',
      nombre: 'Luces del norte',
      autor: 'Philip Pullman',
      fechaPublicacion: 1995,
      paginas: 448,
      isbn: '9788466665049',
      editorial: 'Roca Editorial',
      idioma: 'Español',
      edicion: 'La Materia Oscura I',
      sinopsis: 'Lyra Belacqua emprende un viaje al polo norte para rescatar a niños desaparecidos y descubrir los secretos del Polvo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231991-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🏺 Mitología & Epopeya'],
      recommendationReason: 'Clásico de la fantasía moderna'
    },
    {
      id: 'curated-lewis-narnia',
      source: 'openlibrary',
      nombre: 'El león, la bruja y el armario',
      autor: 'C.S. Lewis',
      fechaPublicacion: 1950,
      paginas: 240,
      isbn: '9788408062783',
      editorial: 'Destino',
      idioma: 'Español',
      edicion: 'Las Crónicas de Narnia II',
      sinopsis: 'Cuatro hermanos descubren un armario mágico que conduce al reino encantado de Narnia bajo el yugo de la Bruja Blanca.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/10526978-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Fantasía universal atemporal'
    },
    {
      id: 'curated-sapkowski-witcher',
      source: 'openlibrary',
      nombre: 'El último deseo',
      autor: 'Andrzej Sapkowski',
      fechaPublicacion: 1993,
      paginas: 288,
      isbn: '9788498890457',
      editorial: 'Alamut',
      idioma: 'Español',
      edicion: 'Saga de Geralt de Rivia I',
      sinopsis: 'Geralt de Rivia es un brujo mutado genéticamente que caza monstruos en un mundo lleno de intrigas y magia.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8367746-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Comienzo de la célebre saga del Brujo'
    }
  ],
  scifi: [
    {
      id: 'curated-dune',
      source: 'openlibrary',
      nombre: 'Dune',
      autor: 'Frank Herbert',
      fechaPublicacion: 1965,
      paginas: 704,
      isbn: '9788466353779',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: 'Crónicas de Dune I',
      sinopsis: 'En el inhóspito planeta desértico Arrakis, el joven Paul Atreides debe vengar a su familia y cumplir un destino místico.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/10524458-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Obra cumbre de Ciencia Ficción'
    },
    {
      id: 'curated-asimov-fundacion',
      source: 'openlibrary',
      nombre: 'Fundación',
      autor: 'Isaac Asimov',
      fechaPublicacion: 1951,
      paginas: 256,
      isbn: '9788499899534',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: 'Ciclo de la Fundación I',
      sinopsis: 'Hari Seldon prevé la caída del Imperio Galáctico y crea la Fundación para preservar el saber de la humanidad.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Obra cumbre de Ciencia Ficción'
    },
    {
      id: 'curated-neuromancer',
      source: 'openlibrary',
      nombre: 'Neuromante',
      autor: 'William Gibson',
      fechaPublicacion: 1984,
      paginas: 320,
      isbn: '9788445076620',
      editorial: 'Minotauro',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Case es un hacker de capa caída en el ciberespacio de Chiba contratado para una última incursión legendaria.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235284-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Piedra angular del movimiento cyberpunk'
    },
    {
      id: 'curated-philip-dick',
      source: 'openlibrary',
      nombre: '¿Sueñan los androides con ovejas eléctricas?',
      autor: 'Philip K. Dick',
      fechaPublicacion: 1968,
      paginas: 288,
      isbn: '9788445002964',
      editorial: 'Minotauro',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Rick Deckard persigue androides rebeldes en una Tierra posnuclear donde la empatía es el único bien preciado.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228741-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'La novela de culto que inspiró Blade Runner'
    },
    {
      id: 'curated-fahrenheit-451',
      source: 'openlibrary',
      nombre: 'Fahrenheit 451',
      autor: 'Ray Bradbury',
      fechaPublicacion: 1953,
      paginas: 192,
      isbn: '9788497593793',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Guy Montag es un bombero cuya misión es quemar libros prohibidos, hasta que una joven le abre los ojos al poder del pensamiento libre.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225261-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['🏚️ Post-Apocalíptico'],
      recommendationReason: 'Distopía fundamental sobre el amor a los libros'
    },
    {
      id: 'curated-bradbury-cronicas',
      source: 'openlibrary',
      nombre: 'Crónicas marcianas',
      autor: 'Ray Bradbury',
      fechaPublicacion: 1950,
      paginas: 272,
      isbn: '9788445076538',
      editorial: 'Minotauro',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Relatos poéticos y melancólicos sobre la colonización humana de Marte y el encuentro con sus civilizaciones nativas.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231855-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Lirismo y ciencia ficción inolvidable'
    }
  ],
  horror: [
    {
      id: 'curated-hill-house',
      source: 'openlibrary',
      nombre: 'La maldición de Hill House',
      autor: 'Shirley Jackson',
      fechaPublicacion: 1959,
      paginas: 240,
      isbn: '9788494029868',
      editorial: 'Valdemar',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Cuatro investigadores se alojan en Hill House, una mansión siniestra con un historial de sucesos inexplicables.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228190-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Joya del terror gótico psicológico'
    },
    {
      id: 'curated-dracula',
      source: 'openlibrary',
      nombre: 'Drácula',
      autor: 'Bram Stoker',
      fechaPublicacion: 1897,
      paginas: 576,
      isbn: '9788491050070',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El conde Drácula viaja desde los Cárpatos a Inglaterra, desatando una pesadilla gótica en cartas y diarios.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231853-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'El clásico indiscutible del terror gótico'
    },
    {
      id: 'curated-frankenstein',
      source: 'openlibrary',
      nombre: 'Frankenstein',
      autor: 'Mary Shelley',
      fechaPublicacion: 1818,
      paginas: 288,
      isbn: '9788491050100',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Victor Frankenstein desafía a la naturaleza creando vida a partir de materia inerte, con trágicas consecuencias.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228691-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Cuna de la ciencia ficción y el horror'
    },
    {
      id: 'curated-shining',
      source: 'openlibrary',
      nombre: 'El resplandor',
      autor: 'Stephen King',
      fechaPublicacion: 1977,
      paginas: 656,
      isbn: '9788497593724',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Jack Torrance acepta cuidar el aislado Hotel Overlook durante el crudo invierno junto a su familia.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235212-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Obra cumbre del terror psicológico moderno'
    },
    {
      id: 'curated-enriquez-noche',
      source: 'openlibrary',
      nombre: 'Nuestra parte de noche',
      autor: 'Mariana Enriquez',
      fechaPublicacion: 2019,
      paginas: 672,
      isbn: '9788433998859',
      editorial: 'Anagrama',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Un padre y un hijo atraviesan Argentina en los años de la dictadura, perseguidos por una sociedad secreta que adora la Oscuridad.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/12470198-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Gran revelación del terror en español'
    },
    {
      id: 'curated-lovecraft-montanas',
      source: 'openlibrary',
      nombre: 'En las montañas de la locura',
      autor: 'H.P. Lovecraft',
      fechaPublicacion: 1936,
      paginas: 176,
      isbn: '9788420651231',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Una expedición científica en la Antártida descubre vestigios de una civilización primordial y terrorífica.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231840-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Clásico absoluto del terror cósmico'
    }
  ],
  action: [
    {
      id: 'curated-mosqueteros',
      source: 'openlibrary',
      nombre: 'Los tres mosqueteros',
      autor: 'Alexandre Dumas',
      fechaPublicacion: 1844,
      paginas: 736,
      isbn: '9788491050209',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El joven D Artagnan viaja a París para unirse al cuerpo de mosqueteros del rey y vive innumerables duelos y aventuras.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225432-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🗺️ Aventura Histórica'],
      recommendationReason: 'La gran novela clásica de capas y espadas'
    },
    {
      id: 'curated-isla-tesoro',
      source: 'openlibrary',
      nombre: 'La isla del tesoro',
      autor: 'Robert Louis Stevenson',
      fechaPublicacion: 1883,
      paginas: 288,
      isbn: '9788491050186',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Jim Hawkins halla el mapa de un tesoro pirata y zarpa en la Hispaniola junto al intrigante Long John Silver.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228414-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🌊 Aventura Náutica'],
      recommendationReason: 'El canon eterno de las aventuras de piratas'
    },
    {
      id: 'curated-montecristo',
      source: 'openlibrary',
      nombre: 'El conde de Montecristo',
      autor: 'Alexandre Dumas',
      fechaPublicacion: 1844,
      paginas: 1200,
      isbn: '9788491050193',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Edmond Dantès es traicionado y encarcelado injustamente en el Castillo de If, de donde escapará para tramar su venganza.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231920-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🗺️ Aventura Histórica'],
      recommendationReason: 'Una de las mayores historias de intriga y justicia'
    },
    {
      id: 'curated-verne-20000',
      source: 'openlibrary',
      nombre: 'Veinte mil leguas de viaje submarino',
      autor: 'Jules Verne',
      fechaPublicacion: 1870,
      paginas: 512,
      isbn: '9788420651200',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El profesor Aronnax explora las profundidades abisales a bordo del submarino Nautilus al mando del Capitán Nemo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231971-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🌊 Aventura Náutica'],
      recommendationReason: 'Aventura oceánica visionaria'
    },
    {
      id: 'curated-verne-80dias',
      source: 'openlibrary',
      nombre: 'La vuelta al mundo en ochenta días',
      autor: 'Jules Verne',
      fechaPublicacion: 1872,
      paginas: 288,
      isbn: '9788420651217',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Phileas Fogg y su mayordomo Picaporte aceptan una apuesta para circunnavegar el planeta en tiempo récord.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228512-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🗺️ Aventura Histórica'],
      recommendationReason: 'Clásico inolvidable de viajes y aventuras'
    },
    {
      id: 'curated-tom-sawyer',
      source: 'openlibrary',
      nombre: 'Las aventuras de Tom Sawyer',
      autor: 'Mark Twain',
      fechaPublicacion: 1876,
      paginas: 272,
      isbn: '9788491050216',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Las travesuras del joven Tom y su amigo Huckleberry Finn a orillas del majestuoso río Misisipi.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8226019-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['⚔️ Acción & Combate'],
      recommendationReason: 'Homenaje universal a la libertad juvenil'
    }
  ],
  classics: [
    {
      id: 'curated-garcia-marquez',
      source: 'openlibrary',
      nombre: 'Cien años de soledad',
      autor: 'Gabriel García Márquez',
      fechaPublicacion: 1967,
      paginas: 471,
      isbn: '9788439720775',
      editorial: 'Random House',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La saga de la familia Buendía a lo largo de siete generaciones en el mítico pueblo de Macondo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/11142512-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Obra cumbre de la literatura hispanoamericana'
    },
    {
      id: 'curated-1984',
      source: 'openlibrary',
      nombre: '1984',
      autor: 'George Orwell',
      fechaPublicacion: 1949,
      paginas: 326,
      isbn: '9788499890944',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Winston Smith vive en una sociedad totalitaria gobernada por el Gran Hermano donde el pensamiento disidente es castigado.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/7222246-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['🏚️ Post-Apocalíptico'],
      recommendationReason: 'Clásico universal imprescindible'
    },
    {
      id: 'curated-borges',
      source: 'openlibrary',
      nombre: 'Ficciones',
      autor: 'Jorge Luis Borges',
      fechaPublicacion: 1944,
      paginas: 224,
      isbn: '9788420633114',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Colección de relatos laberínticos sobre espejos, bibliotecas infinitas, enigmas y la naturaleza del tiempo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8315123-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Joya literaria aclamada'
    },
    {
      id: 'curated-dorian-gray',
      source: 'openlibrary',
      nombre: 'El retrato de Dorian Gray',
      autor: 'Oscar Wilde',
      fechaPublicacion: 1890,
      paginas: 288,
      isbn: '9788491050223',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Dorian Gray conserva su juventud eterna mientras su retrato al óleo envejece y muestra la degradación de su alma.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225320-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Brillante fábula sobre la belleza y la moral'
    },
    {
      id: 'curated-crimen-castigo',
      source: 'openlibrary',
      nombre: 'Crimen y castigo',
      autor: 'Fiódor Dostoyevski',
      fechaPublicacion: 1866,
      paginas: 672,
      isbn: '9788491050230',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El estudiante Raskólnikov comete un asesinato justificándolo con ideales de grandeza, cayendo en un torbellino de culpa.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228694-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Cumbre de la novela psicológica universal'
    },
    {
      id: 'curated-quijote',
      source: 'openlibrary',
      nombre: 'Don Quijote de la Mancha',
      autor: 'Miguel de Cervantes',
      fechaPublicacion: 1605,
      paginas: 1100,
      isbn: '9788420412146',
      editorial: 'Alfaguara',
      idioma: 'Español',
      edicion: 'Edición RAE',
      sinopsis: 'Alonso Quijano pierde el juicio leyendo libros de caballerías y sale por los campos de La Mancha con su fiel Sancho Panza.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231852-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'La obra más célebre de las letras en español'
    }
  ],
  mystery: [
    {
      id: 'curated-estudio-escarlata',
      source: 'openlibrary',
      nombre: 'Estudio en escarlata',
      autor: 'Arthur Conan Doyle',
      fechaPublicacion: 1887,
      paginas: 224,
      isbn: '9788420651187',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El doctor John Watson conoce al excéntrico detective consultor Sherlock Holmes y resuelven su primer misterio juntos.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231851-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'El nacimiento de la leyenda de Sherlock Holmes'
    },
    {
      id: 'curated-diez-negritos',
      source: 'openlibrary',
      nombre: 'Diez negritos',
      autor: 'Agatha Christie',
      fechaPublicacion: 1939,
      paginas: 256,
      isbn: '9788467045437',
      editorial: 'Espasa',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Diez personas desconocidas son invitadas a una mansión en una isla solitaria y van muriendo una a una según una canción infantil.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235290-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'La novela de misterio más vendida de todos los tiempos'
    },
    {
      id: 'curated-sabueso-baskerville',
      source: 'openlibrary',
      nombre: 'El sabueso de los Baskerville',
      autor: 'Arthur Conan Doyle',
      fechaPublicacion: 1902,
      paginas: 256,
      isbn: '9788420651194',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Sherlock Holmes y Watson viajan a los páramos de Dartmoor para investigar la maldición de una bestia espectral.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225330-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'La más célebre aventura de Sherlock Holmes'
    },
    {
      id: 'curated-halcon-maltes',
      source: 'openlibrary',
      nombre: 'El halcón maltés',
      autor: 'Dashiell Hammett',
      fechaPublicacion: 1930,
      paginas: 288,
      isbn: '9788420651248',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El detective privado Sam Spade es contratado para seguir a un hombre y se ve envuelto en la búsqueda de una codiciada estatuilla de oro.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228740-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'Fundamento absoluto de la novela negra clásica'
    },
    {
      id: 'curated-orient-express',
      source: 'openlibrary',
      nombre: 'Asesinato en el Orient Express',
      autor: 'Agatha Christie',
      fechaPublicacion: 1934,
      paginas: 256,
      isbn: '9788467045444',
      editorial: 'Espasa',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El detective Hércules Poirot viaja a bordo del legendario tren cuando queda atrapado por la nieve y ocurre un crimen desconcertante.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235288-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'Uno de los giros de resolución más aclamados'
    },
    {
      id: 'curated-sombra-viento',
      source: 'openlibrary',
      nombre: 'La sombra del viento',
      autor: 'Carlos Ruiz Zafón',
      fechaPublicacion: 2001,
      paginas: 576,
      isbn: '9788408043645',
      editorial: 'Planeta',
      idioma: 'Español',
      edicion: 'El Cementerio de los Libros Olvidados I',
      sinopsis: 'Daniel Sempere es conducido al Cementerio de los Libros Olvidados y elige una novela que cambiará su vida para siempre.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235310-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🧠 Thriller Psicológico'],
      recommendationReason: 'Un homenaje inolvidable a la literatura y el misterio'
    }
  ],
  romance: [
    {
      id: 'curated-orgullo-prejuicio',
      source: 'openlibrary',
      nombre: 'Orgullo y prejuicio',
      autor: 'Jane Austen',
      fechaPublicacion: 1813,
      paginas: 448,
      isbn: '9788491050247',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Elizabeth Bennet y el altivo señor Darcy deben superar sus prejuicios y malentendidos en la Inglaterra georgiana.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225318-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'La cumbre indiscutible de la novela romántica'
    },
    {
      id: 'curated-cumbres-borrascosas',
      source: 'openlibrary',
      nombre: 'Cumbres borrascosas',
      autor: 'Emily Brontë',
      fechaPublicacion: 1847,
      paginas: 416,
      isbn: '9788491050254',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La tormentosa e indomable pasión entre Heathcliff y Catherine Earnshaw en los desolados páramos de Yorkshire.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228710-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Intensidad romántica y tragedia gótica'
    },
    {
      id: 'curated-jane-eyre',
      source: 'openlibrary',
      nombre: 'Jane Eyre',
      autor: 'Charlotte Brontë',
      fechaPublicacion: 1847,
      paginas: 560,
      isbn: '9788491050261',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La institutriz Jane Eyre entra al servicio del señor Rochester en Thornfield Hall, descubriendo un secreto demoledor.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228712-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'Poderosa historia de amor, dignidad y valentía'
    },
    {
      id: 'curated-sentido-sensibilidad',
      source: 'openlibrary',
      nombre: 'Sentido y sensibilidad',
      autor: 'Jane Austen',
      fechaPublicacion: 1811,
      paginas: 384,
      isbn: '9788491050278',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Las hermanas Elinor y Marianne Dashwood experimentan el amor y el desengaño desde caracteres opuestos.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225325-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'Agudeza psicológica y ternura intemporal'
    },
    {
      id: 'curated-amor-colera',
      source: 'openlibrary',
      nombre: 'El amor en los tiempos del cólera',
      autor: 'Gabriel García Márquez',
      fechaPublicacion: 1985,
      paginas: 496,
      isbn: '9788439720782',
      editorial: 'Random House',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Florentino Ariza espera más de medio siglo el momento de reiterar su juramento de amor eterno a Fermina Daza.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235305-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'Una oda inolvidable al amor maduro y perseverante'
    },
    {
      id: 'curated-agua-chocolate',
      source: 'openlibrary',
      nombre: 'Como agua para chocolate',
      autor: 'Laura Esquivel',
      fechaPublicacion: 1989,
      paginas: 272,
      isbn: '9788497593687',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Tita transmite sus pasiones y desdichas a través de los exquisitos platillos que cocina en su rancho mexicano.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235295-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Fusión deliciosa de amor, cocina y magia'
    }
  ],
  history: [
    {
      id: 'curated-sapiens',
      source: 'openlibrary',
      nombre: 'Sapiens: De animales a dioses',
      autor: 'Yuval Noah Harari',
      fechaPublicacion: 2014,
      paginas: 496,
      isbn: '9788499926223',
      editorial: 'Debate',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Breve historia de la humanidad: desde los primeros homínidos hasta las revoluciones cognitiva, agrícola y científica.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235320-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Fenómeno mundial de divulgación histórica'
    },
    {
      id: 'curated-pilares-tierra',
      source: 'openlibrary',
      nombre: 'Los pilares de la tierra',
      autor: 'Ken Follett',
      fechaPublicacion: 1989,
      paginas: 1072,
      isbn: '9788497592475',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La construcción de una catedral gótica en Kingsbridge enmarca las pasiones, intrigas y luchas de poder del medievo inglés.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235325-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'El gran clásico de la novela histórica medieval'
    },
    {
      id: 'curated-diamond-armas',
      source: 'openlibrary',
      nombre: 'Armas, gérmenes y acero',
      autor: 'Jared Diamond',
      fechaPublicacion: 1997,
      paginas: 592,
      isbn: '9788499926483',
      editorial: 'Debate',
      idioma: 'Español',
      edicion: 'Premio Pulitzer',
      sinopsis: 'Explicación geográfica y ecológica de los destinos dispares de las distintas sociedades humanas.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235330-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Ensayo fundamental de antropología e historia'
    },
    {
      id: 'curated-infinito-junco',
      source: 'openlibrary',
      nombre: 'El infinito en un junco',
      autor: 'Irene Vallejo',
      fechaPublicacion: 2019,
      paginas: 452,
      isbn: '9788417902407',
      editorial: 'Siruela',
      idioma: 'Español',
      edicion: 'Premio Nacional de Ensayo',
      sinopsis: 'La invención de los libros en el mundo antiguo: un viaje fascinante por papiros, pergaminos y bibliotecas legendarias.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/11142512-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Una hermosa carta de amor a los libros y su historia'
    },
    {
      id: 'curated-memorias-adriano',
      source: 'openlibrary',
      nombre: 'Memorias de Adriano',
      autor: 'Marguerite Yourcenar',
      fechaPublicacion: 1951,
      paginas: 336,
      isbn: '9788435015608',
      editorial: 'Edhasa',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El emperador Adriano medita sobre el poder, el amor, el arte y la muerte en una extensa carta a Marco Aurelio.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228720-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Prosa magistral y recreación histórica sublime'
    },
    {
      id: 'curated-breve-historia',
      source: 'openlibrary',
      nombre: 'Una breve historia de casi todo',
      autor: 'Bill Bryson',
      fechaPublicacion: 2003,
      paginas: 640,
      isbn: '9788427202351',
      editorial: 'RBA',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Un ameno recorrido por los grandes enigmas de la ciencia: desde el Big Bang hasta el surgimiento de la civilización.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235335-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🧪 Divulgación Científica'],
      recommendationReason: 'Divulgación científica brillante y accesible'
    }
  ]
};

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

    const categoryId = SUBJECT_KEY_TO_CATEGORY_ID[subjectKey] || subjectKey;
    const curated = CURATED_CATEGORY_BOOKS[categoryId] || [];

    const url = `https://openlibrary.org/subjects/${encodeURIComponent(subjectKey)}.json?limit=${limit}`;
    try {
      const res = await fetchWithTimeout(url, { signal }, 7500);
      if (!res.ok) return curated;
      const data = (await res.json()) as OpenLibrarySubjectResponse;
      if (!Array.isArray(data.works) || data.works.length === 0) return curated;

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

      // Combinar obras de Open Library con la selección curada asegurando calidad y variedad
      const existingTitles = new Set(candidates.map((c) => normalizeText(c.nombre)));
      const combined = [...candidates];
      for (const cur of curated) {
        if (!existingTitles.has(normalizeText(cur.nombre))) {
          combined.push(cur);
        }
      }

      if (combined.length > 0) {
        subjectCache.set(cacheKey, combined);
      }
      return combined.length > 0 ? combined : curated;
    } catch (err) {
      if (signal?.aborted) throw err;
      return curated;
    }
  },

  async fetchRecommendations(
    userBooks: Book[],
    options?: RecommendOptions
  ): Promise<{ reason: string; books: BibliographicCandidate[] }> {
    const subFilter = options?.subFilter || 'mix';
    const signal = options?.signal;
    const forceRefresh = Boolean(options?.forceRefresh);
    const dismissedIds = dismissedRecommendationsService.getDismissedIds();

    const isAvailable = (cand: BibliographicCandidate): boolean => {
      if (!cand || !cand.nombre) return false;
      if (dismissedIds.has(cand.id)) return false;
      return !isBookAlreadyInLibrary(cand, userBooks);
    };

    if (!userBooks || userBooks.length === 0) {
      let classics: BibliographicCandidate[] = [];
      try {
        classics = await this.fetchSubjectBooks('classic_literature', 16, signal);
      } catch {
        classics = [];
      }
      const available = classics.filter(isAvailable);
      const pool = available.length >= 4 ? available : CURATED_FALLBACK_RECOMMENDATIONS.filter(isAvailable);
      const booksWithReason = pool.slice(0, 8).map((b) => ({
        ...b,
        recommendationReason: b.recommendationReason || 'Clásico imprescindible'
      }));
      return {
        reason: 'Obras maestras universales para inaugurar tu biblioteca personal',
        books: booksWithReason
      };
    }

    // 1. Perfil del lector
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

    const sortedAuthors = [...authorWeights.entries()].sort((a, b) => b[1] - a[1]);
    const sortedGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);

    const topAuthor = sortedAuthors[0]?.[0] || '';
    const topGenre = sortedGenres[0]?.[0] || '';

    const genreToSubjectMap: Record<string, string> = {
      '✨ Fantasía': 'fantasy',
      '🔭 Ciencia Ficción & Distopía': 'science_fiction',
      '🔪 Terror & Suspense': 'horror',
      '🏛️ Clásicos': 'classic_literature',
      '🏇 Aventuras': 'adventure',
      '❤️ Romance & Drama': 'romance',
      '📚 No Ficción': 'history'
    };

    const affinityCandidates: BibliographicCandidate[] = [];
    const genreCandidates: BibliographicCandidate[] = [];
    const classicCandidates: BibliographicCandidate[] = [];

    // 2. Ejecutar tareas de red en PARALELO para garantizar respuesta en < 2 segundos
    const tasks: Promise<BibliographicCandidate[]>[] = [];

    // Tarea A: Afinidad de autor (1 autor afín por búsqueda)
    if (topAuthor) {
      const topAuthorNorm = normalizeText(topAuthor);
      const affinity = AUTHOR_AFFINITY_MAP[topAuthorNorm];
      const authorToQuery = affinity
        ? (forceRefresh ? affinity.similarAuthors[1] || affinity.similarAuthors[0] : affinity.similarAuthors[0])
        : topAuthor;

      if (authorToQuery) {
        tasks.push(
          this.searchBooks(authorToQuery, signal)
            .then((results) => {
              return results.filter(isAvailable).map((c) => ({
                ...c,
                recommendationReason: affinity
                  ? `Afín a tu lectura de ${topAuthor}`
                  : `Por tu interés en ${topAuthor}`
              }));
            })
            .catch(() => [])
        );
      }
    }

    // Tarea B: Género predilecto
    const subject = (topGenre && genreToSubjectMap[topGenre]) || 'fantasy';
    const genreLimit = forceRefresh ? 20 : 14;
    tasks.push(
      this.fetchSubjectBooks(subject, genreLimit, signal)
        .then((results) => {
          return results.filter(isAvailable).map((c) => ({
            ...c,
            recommendationReason: topGenre
              ? `Imprescindible en ${topGenre.replace(/^[^\s]+\s/, '')}`
              : 'Destacado del catálogo'
          }));
        })
        .catch(() => [])
    );

    // Tarea C: Clásicos universales
    tasks.push(
      this.fetchSubjectBooks('classic_literature', 14, signal)
        .then((results) => {
          return results.filter(isAvailable).map((c) => ({
            ...c,
            recommendationReason: 'Joya literaria aclamada'
          }));
        })
        .catch(() => [])
    );

    // Esperar a que terminen en paralelo (máximo ~2-3s con timeout)
    const settled = await Promise.allSettled(tasks);
    for (const item of settled) {
      if (item.status === 'fulfilled' && Array.isArray(item.value)) {
        for (const cand of item.value) {
          if (cand.recommendationReason?.startsWith('Afín') || cand.recommendationReason?.startsWith('Por tu')) {
            affinityCandidates.push(cand);
          } else if (cand.recommendationReason?.startsWith('Imprescindible') || cand.recommendationReason?.startsWith('Destacado')) {
            genreCandidates.push(cand);
          } else {
            classicCandidates.push(cand);
          }
        }
      }
    }

    // Si la red devolvió pocos resultados por lentitud o error, completar de inmediato con la colección curada
    for (const fallback of CURATED_FALLBACK_RECOMMENDATIONS) {
      if (isAvailable(fallback)) {
        if (fallback.suggestedGenre === topGenre) {
          genreCandidates.push({ ...fallback });
        } else {
          classicCandidates.push({ ...fallback });
        }
      }
    }

    // Deduplicar colecciones por clave única
    const dedupeCandidates = (list: BibliographicCandidate[]): BibliographicCandidate[] => {
      const seen = new Set<string>();
      const out: BibliographicCandidate[] = [];
      for (const item of list) {
        const key = `${normalizeText(item.nombre)}::${normalizeText(item.autor)}`;
        if (!seen.has(key) && isAvailable(item)) {
          seen.add(key);
          out.push(item);
        }
      }
      return out;
    };

    const cleanAffinity = dedupeCandidates(affinityCandidates);
    const cleanGenre = dedupeCandidates(genreCandidates);
    const cleanClassics = dedupeCandidates(classicCandidates);

    const shuffleArray = <T>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    let selected: BibliographicCandidate[] = [];
    let mainReason = 'Recomendaciones personalizadas para tus gustos';

    if (subFilter === 'authors') {
      selected = dedupeCandidates([...(forceRefresh ? shuffleArray(cleanAffinity) : cleanAffinity), ...cleanGenre, ...cleanClassics]);
      mainReason = topAuthor
        ? `Nuevos autores afines al estilo de ${topAuthor}`
        : 'Autores seleccionados para tu perfil';
    } else if (subFilter === 'classics') {
      selected = dedupeCandidates([...(forceRefresh ? shuffleArray(cleanClassics) : cleanClassics), ...cleanGenre, ...cleanAffinity]);
      mainReason = 'Obras maestras y joyas universales que deberías leer';
    } else {
      // 'mix': 3 afines, 3 género, 2 clásicos
      const poolAffinity = forceRefresh ? shuffleArray(cleanAffinity) : cleanAffinity;
      const poolGenre = forceRefresh ? shuffleArray(cleanGenre) : cleanGenre;
      const poolClassics = forceRefresh ? shuffleArray(cleanClassics) : cleanClassics;

      const mix = [
        ...poolAffinity.slice(0, 3),
        ...poolGenre.slice(0, 3),
        ...poolClassics.slice(0, 2),
        ...poolAffinity.slice(3),
        ...poolGenre.slice(3),
        ...poolClassics.slice(2)
      ];
      selected = dedupeCandidates(mix);
      mainReason = topAuthor && topGenre
        ? `Sugerencias basadas en tu afinidad por ${topAuthor} y la ${topGenre.replace(/^[^\s]+\s/, '')}`
        : topGenre
        ? `Selección especial para tu pasión por la ${topGenre.replace(/^[^\s]+\s/, '')}`
        : 'Selección personalizada basada en tus lecturas';
    }

    // Fallback de seguridad si quedan pocos libros
    if (selected.length < 4) {
      try {
        const fallbackBooks = await this.fetchSubjectBooks('adventure', 16, signal);
        for (const fb of fallbackBooks) {
          if (isAvailable(fb)) {
            fb.recommendationReason = 'Aventura épica recomendada';
            selected.push(fb);
          }
        }
      } catch {
        // Ignorado
      }
    }

    return {
      reason: mainReason,
      books: dedupeCandidates(selected).slice(0, 8)
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
