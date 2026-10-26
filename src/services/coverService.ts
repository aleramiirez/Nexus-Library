import { BibliographicCandidate, EditionCoverOption } from '../types/models';

export function normalizeCoverUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  if (url.startsWith('http://')) {
    url = 'https://' + url.slice('http://'.length);
  }

  url = url.replace('&edge=curl', '').replace('?edge=curl&', '?');
  return url;
}

export function buildOpenLibraryIsbnCover(isbn: string): string {
  const clean = isbn.replace(/[^0-9X]/gi, '');
  if (!clean) return '';
  return 'https://covers.openlibrary.org/b/isbn/' + clean + '-L.jpg?default=false';
}

export function buildOpenLibraryIdCover(coverId?: number | null): string {
  if (!coverId || coverId <= 0) return '';
  return 'https://covers.openlibrary.org/b/id/' + String(coverId) + '-L.jpg?default=false';
}

export function getAuthorInitials(author: string): string {
  if (!author) return 'NL';
  const parts = author
    .split(',')[0]
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'NL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function tryCacheCoverDataUrl(url: string): Promise<string | undefined> {
  if (!url) return undefined;
  if (url.startsWith('data:image/')) return url;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(url, { mode: 'cors', signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.size > 500000) {
      return undefined;
    }
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4500
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

const editionCoversCache = new Map<string, EditionCoverOption[]>();

export interface FetchEditionCoversParams {
  title: string;
  author?: string;
  isbn?: string;
  existingCandidates?: BibliographicCandidate[];
  signal?: AbortSignal;
}

/**
 * Busca portadas de distintas ediciones de un libro usando:
 * 1. Portadas de candidatos ya encontrados en la búsqueda bibliográfica
 * 2. Endpoints de Open Library Search y Open Library Works Editions
 * 3. Volúmenes de Google Books
 * De-duplica por URL de imagen y ordena con criterio editorial.
 */
export async function fetchEditionCovers({
  title,
  author,
  isbn,
  existingCandidates = [],
  signal
}: FetchEditionCoversParams): Promise<EditionCoverOption[]> {
  const cleanTitle = (title || '').trim();
  const cleanAuthor = (author || '').trim();
  const cleanIsbn = (isbn || '').replace(/[^0-9X]/gi, '');

  if (!cleanTitle && !cleanIsbn) return [];

  const cacheKey = `${cleanTitle.toLowerCase()}:::${cleanAuthor.toLowerCase()}:::${cleanIsbn}`;
  const cached = editionCoversCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const resultsMap = new Map<string, EditionCoverOption>();

  const registerOption = (opt: EditionCoverOption) => {
    const normUrl = normalizeCoverUrl(opt.url);
    if (!normUrl) return;

    const existing = resultsMap.get(normUrl);
    if (!existing) {
      resultsMap.set(normUrl, { ...opt, url: normUrl });
    } else {
      if (!existing.publisher && opt.publisher) existing.publisher = opt.publisher;
      if (!existing.year && opt.year) existing.year = opt.year;
      if (!existing.title && opt.title) existing.title = opt.title;
      if (!existing.isbn && opt.isbn) existing.isbn = opt.isbn;
      if (opt.source === 'candidate') existing.source = 'candidate';
    }
  };

  // 1. Agregar portadas de los candidatos ya existentes en memoria
  for (const cand of existingCandidates) {
    if (cand.portadaUrl) {
      registerOption({
        id: `cand-${cand.id}`,
        url: cand.portadaUrl,
        fallbackUrl: cand.portadaFallbackUrl,
        title: cand.nombre,
        publisher: cand.editorial,
        year: cand.fechaPublicacion,
        isbn: cand.isbn,
        source: 'candidate',
        badge: 'Candidato'
      });
    }
    if (cand.portadaFallbackUrl && cand.portadaFallbackUrl !== cand.portadaUrl) {
      registerOption({
        id: `cand-fallback-${cand.id}`,
        url: cand.portadaFallbackUrl,
        title: cand.nombre,
        publisher: cand.editorial,
        year: cand.fechaPublicacion,
        isbn: cand.isbn,
        source: 'candidate',
        badge: 'Alternativa'
      });
    }
  }

  // 2. Tareas en paralelo: Open Library Editions + Open Library Search + Google Books
  const tasks: Promise<void>[] = [];

  // Tarea A: Open Library Search y Open Library Works Editions
  tasks.push(
    (async () => {
      try {
        const params = new URLSearchParams();
        if (cleanIsbn) {
          params.set('isbn', cleanIsbn);
        } else {
          params.set('q', [cleanTitle, cleanAuthor].filter(Boolean).join(' '));
        }
        params.set('fields', 'key,title,author_name,cover_i,isbn,publisher,publish_year,edition_count');
        params.set('limit', '18');

        const searchUrl = 'https://openlibrary.org/search.json?' + params.toString();
        const res = await fetchWithTimeout(searchUrl, { signal }, 4500);
        if (!res.ok) return;

        interface OLSearchDoc {
          key?: string;
          title?: string;
          cover_i?: number;
          isbn?: string[];
          publisher?: string[];
          publish_year?: number[];
        }

        const data = (await res.json()) as { docs?: OLSearchDoc[] };
        const docs = Array.isArray(data.docs) ? data.docs : [];

        // Registrar portadas directas de los docs devueltos
        for (const doc of docs) {
          if (doc.cover_i && doc.cover_i > 0) {
            registerOption({
              id: `ol-id-${doc.cover_i}`,
              url: buildOpenLibraryIdCover(doc.cover_i),
              title: doc.title,
              publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
              year: Array.isArray(doc.publish_year) ? doc.publish_year[0] : undefined,
              source: 'openlibrary'
            });
          }

          if (Array.isArray(doc.isbn) && doc.isbn.length > 0) {
            const firstIsbn = doc.isbn.find((i) => i.length === 13) || doc.isbn[0];
            if (firstIsbn) {
              registerOption({
                id: `ol-isbn-${firstIsbn}`,
                url: buildOpenLibraryIsbnCover(firstIsbn),
                title: doc.title,
                publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
                year: Array.isArray(doc.publish_year) ? doc.publish_year[0] : undefined,
                isbn: firstIsbn,
                source: 'openlibrary'
              });
            }
          }
        }

        // Si tenemos un work key (/works/OL...W), buscar las ediciones registradas para ese work
        const primaryWork = docs.find((d) => d.key && d.key.startsWith('/works/'));
        if (primaryWork?.key) {
          try {
            const editionsUrl = `https://openlibrary.org${primaryWork.key}/editions.json?limit=35`;
            const editionsRes = await fetchWithTimeout(editionsUrl, { signal }, 4500);
            if (editionsRes.ok) {
              interface OLEditionEntry {
                title?: string;
                covers?: number[];
                publish_date?: string;
                publishers?: string[];
                isbn_13?: string[];
                isbn_10?: string[];
              }
              const edData = (await editionsRes.json()) as { entries?: OLEditionEntry[] };
              const entries = Array.isArray(edData.entries) ? edData.entries : [];

              for (const entry of entries) {
                const year = parseYear(entry.publish_date);
                const publisher = Array.isArray(entry.publishers) ? entry.publishers[0] : undefined;

                if (Array.isArray(entry.covers)) {
                  for (const coverId of entry.covers) {
                    if (typeof coverId === 'number' && coverId > 0) {
                      registerOption({
                        id: `ol-ed-id-${coverId}`,
                        url: buildOpenLibraryIdCover(coverId),
                        title: entry.title || cleanTitle,
                        publisher,
                        year,
                        source: 'openlibrary'
                      });
                    }
                  }
                }

                const isbn13 = Array.isArray(entry.isbn_13) ? entry.isbn_13[0] : undefined;
                const isbn10 = Array.isArray(entry.isbn_10) ? entry.isbn_10[0] : undefined;
                const entryIsbn = isbn13 || isbn10;
                if (entryIsbn) {
                  registerOption({
                    id: `ol-ed-isbn-${entryIsbn}`,
                    url: buildOpenLibraryIsbnCover(entryIsbn),
                    title: entry.title || cleanTitle,
                    publisher,
                    year,
                    isbn: entryIsbn,
                    source: 'openlibrary'
                  });
                }
              }
            }
          } catch {
            // Ignorar fallo específico de editions si la búsqueda principal ya dio resultados
          }
        }
      } catch {
        // Fallo suave de Open Library
      }
    })()
  );

  // Tarea B: Google Books Volumes
  tasks.push(
    (async () => {
      try {
        let qParam = '';
        if (cleanIsbn) {
          qParam = `isbn:${cleanIsbn}`;
        } else {
          qParam = [cleanTitle, cleanAuthor].filter(Boolean).join(' ');
        }

        const params = new URLSearchParams({
          q: qParam,
          maxResults: '16',
          printType: 'books'
        });

        const gbUrl = 'https://www.googleapis.com/books/v1/volumes?' + params.toString();
        const res = await fetchWithTimeout(gbUrl, { signal }, 3500);
        if (!res.ok) return;

        interface GBVolumeItem {
          id?: string;
          volumeInfo?: {
            title?: string;
            publisher?: string;
            publishedDate?: string;
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

        const data = (await res.json()) as { items?: GBVolumeItem[] };
        const items = Array.isArray(data.items) ? data.items : [];

        for (const item of items) {
          const info = item.volumeInfo;
          if (!info) continue;

          const links = info.imageLinks || {};
          const rawImg =
            links.extraLarge ||
            links.large ||
            links.medium ||
            links.thumbnail ||
            links.smallThumbnail ||
            '';

          const googleCover = normalizeCoverUrl(rawImg);
          if (!googleCover) continue;

          const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
          const isbn13 = identifiers.find((id) => id.type === 'ISBN_13')?.identifier;
          const isbn10 = identifiers.find((id) => id.type === 'ISBN_10')?.identifier;

          registerOption({
            id: `gb-${item.id || googleCover}`,
            url: googleCover,
            title: info.title || cleanTitle,
            publisher: info.publisher,
            year: parseYear(info.publishedDate),
            isbn: isbn13 || isbn10,
            source: 'googlebooks'
          });
        }
      } catch {
        // Fallo suave de Google Books (ej. rate limit 429)
      }
    })()
  );

  await Promise.allSettled(tasks);

  const finalOptions = Array.from(resultsMap.values());

  // Ordenar con prioridad:
  // 1. Candidatos seleccionados/encontrados
  // 2. Portadas con editorial y año conocidos
  // 3. Portadas más recientes
  finalOptions.sort((a, b) => {
    if (a.source === 'candidate' && b.source !== 'candidate') return -1;
    if (b.source === 'candidate' && a.source !== 'candidate') return 1;

    const hasInfoA = (a.publisher ? 2 : 0) + (a.year ? 1 : 0);
    const hasInfoB = (b.publisher ? 2 : 0) + (b.year ? 1 : 0);
    if (hasInfoA !== hasInfoB) return hasInfoB - hasInfoA;

    const yearA = typeof a.year === 'number' ? a.year : parseYear(String(a.year || '')) || 0;
    const yearB = typeof b.year === 'number' ? b.year : parseYear(String(b.year || '')) || 0;
    return yearB - yearA;
  });

  if (finalOptions.length > 0) {
    editionCoversCache.set(cacheKey, finalOptions);
  }

  return finalOptions;
}

/**
 * Busca portadas alternativas mediante un término libre de búsqueda
 * (ej. "Dune edición ilustrada", "El nombre del viento décimo aniversario").
 */
export async function searchAlternativeCovers(
  query: string,
  signal?: AbortSignal
): Promise<EditionCoverOption[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const resultsMap = new Map<string, EditionCoverOption>();

  const registerOption = (opt: EditionCoverOption) => {
    const normUrl = normalizeCoverUrl(opt.url);
    if (!normUrl) return;
    if (!resultsMap.has(normUrl)) {
      resultsMap.set(normUrl, { ...opt, url: normUrl });
    }
  };

  const tasks: Promise<void>[] = [];

  // Open Library
  tasks.push(
    (async () => {
      try {
        const params = new URLSearchParams({
          q: clean,
          fields: 'key,title,author_name,cover_i,isbn,publisher,publish_year',
          limit: '15'
        });
        const res = await fetchWithTimeout('https://openlibrary.org/search.json?' + params.toString(), { signal }, 4000);
        if (!res.ok) return;

        const data = await res.json();
        const docs = Array.isArray(data.docs) ? data.docs : [];
        for (const doc of docs) {
          if (doc.cover_i && doc.cover_i > 0) {
            registerOption({
              id: `search-ol-id-${doc.cover_i}`,
              url: buildOpenLibraryIdCover(doc.cover_i),
              title: doc.title,
              publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
              year: Array.isArray(doc.publish_year) ? doc.publish_year[0] : undefined,
              source: 'openlibrary'
            });
          }
          if (Array.isArray(doc.isbn) && doc.isbn[0]) {
            registerOption({
              id: `search-ol-isbn-${doc.isbn[0]}`,
              url: buildOpenLibraryIsbnCover(doc.isbn[0]),
              title: doc.title,
              publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
              year: Array.isArray(doc.publish_year) ? doc.publish_year[0] : undefined,
              source: 'openlibrary'
            });
          }
        }
      } catch {
        // Ignorar
      }
    })()
  );

  // Google Books
  tasks.push(
    (async () => {
      try {
        const params = new URLSearchParams({
          q: clean,
          maxResults: '15',
          printType: 'books'
        });
        const res = await fetchWithTimeout('https://www.googleapis.com/books/v1/volumes?' + params.toString(), { signal }, 3500);
        if (!res.ok) return;

        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];
        for (const item of items) {
          const info = item.volumeInfo;
          const links = info?.imageLinks || {};
          const raw = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
          const norm = normalizeCoverUrl(raw);
          if (norm) {
            registerOption({
              id: `search-gb-${item.id || norm}`,
              url: norm,
              title: info.title,
              publisher: info.publisher,
              year: parseYear(info.publishedDate),
              source: 'googlebooks'
            });
          }
        }
      } catch {
        // Ignorar
      }
    })()
  );

  await Promise.allSettled(tasks);
  return Array.from(resultsMap.values());
}

/**
 * Procesa un archivo de imagen subido por el usuario (localmente):
 * - Valida tipo de archivo
 * - Redimensiona suavemente en un canvas para mantener proporción de portada
 * - Devuelve un data URL compacto (~100-250KB) apto para almacenamiento local y offline
 */
export async function processImageFileUpload(
  file: File,
  maxDimension = 1200
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error('La imagen es demasiado pesada (máximo 12MB).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado.'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          reject(new Error('Dimensiones de imagen inválidas.'));
          return;
        }

        // Escalar si supera la dimensión máxima
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            dataUrl: String(reader.result),
            width: img.naturalWidth,
            height: img.naturalHeight
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Probar webp con fallback a jpeg
        let dataUrl = canvas.toDataURL('image/webp', 0.88);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        }

        resolve({ dataUrl, width, height });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
