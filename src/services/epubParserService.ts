import { Genre, Subgenre, inferCatalogFromCategories, normalizeText } from '../constants/catalogs';
import {
  bookMetadataService,
  extractCleanIsbn,
  extractSeriesAndVolumeFromText,
  resolveKnownSagaAndVolume,
  sanitizeSagaCandidate
} from './bookMetadataService';

export interface ParsedEbookFile {
  id: string;
  fileName: string;
  fileSize: number;
  format: 'EPUB' | 'FB2' | 'PDF' | 'MOBI' | 'OTRO';
  sourceFormat: string;
  nombre: string;
  autor: string;
  isbn: string;
  editorial: string;
  idioma: string;
  edicion: string;
  lecturaVirtual: string;
  fechaPublicacion: number | null;
  paginas: number | null;
  sinopsis: string;
  genero: Genre | '';
  subgeneros: Subgenre[];
  sagaNombre: string;
  volumen: number | null;
  portadaDataUrl?: string;
  epubEmbeddedCoverDataUrl?: string;
  portadaUrl: string;
  portadaFallbackUrl: string;
  enrichedFromCatalog?: boolean;
}

interface ZipEntry {
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/**
 * Normaliza códigos de idioma ISO (es, spa, en, eng...) al formato de la aplicación.
 */
function normalizeLanguage(raw?: string | null): string {
  if (!raw) return '';
  const code = raw.toLowerCase().trim();
  if (code === 'spa' || code === 'es' || code.startsWith('es-')) return 'Español';
  if (code === 'eng' || code === 'en' || code.startsWith('en-')) return 'Inglés';
  if (code === 'fre' || code === 'fra' || code === 'fr' || code.startsWith('fr-')) return 'Francés';
  if (code === 'ita' || code === 'it' || code.startsWith('it-')) return 'Italiano';
  if (code === 'ger' || code === 'deu' || code === 'de' || code.startsWith('de-')) return 'Alemán';
  if (code === 'por' || code === 'pt' || code.startsWith('pt-')) return 'Portugués';
  if (code === 'cat' || code === 'ca' || code.startsWith('ca-')) return 'Catalán';
  return raw.trim();
}

/**
 * Si el autor viene como "Apellido, Nombre" (ej. "Sanderson, Brandon"), lo invierte a "Brandon Sanderson".
 */
function normalizeAuthorName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  // Si solo hay una coma y no parece una lista de varios autores
  const parts = trimmed.split(',');
  if (parts.length === 2 && parts[0].trim() && parts[1].trim() && !parts[1].includes('&')) {
    const last = parts[0].trim();
    const first = parts[1].trim();
    if (first.split(' ').length <= 3 && last.split(' ').length <= 3) {
      return `${first} ${last}`;
    }
  }
  return trimmed;
}

/**
 * Limpia etiquetas HTML de la sinopsis de un EPUB y devuelve texto limpio.
 */
function stripHtmlToText(html: string): string {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.textContent || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Extrae un año válido (1000..2099) de una cadena de fecha.
 */
function extractYear(raw?: string | null): number | null {
  if (!raw) return null;
  const match = raw.match(/\b(1\d{3}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

/**
 * Resuelve una ruta relativa dentro del ZIP respecto a la carpeta del archivo .opf.
 */
function resolveZipPath(baseDir: string, relativeHref: string): string {
  let cleanHref = relativeHref.split('#')[0].split('?')[0];
  try {
    cleanHref = decodeURIComponent(cleanHref);
  } catch {
    // mantener sin decodificar si falla
  }
  if (cleanHref.startsWith('/')) return cleanHref.slice(1);

  const stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
  const parts = cleanHref.split('/');
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

/**
 * Lee el Directorio Central de un archivo ZIP (.epub) para localizar sus entradas al instante.
 */
function readZipCentralDirectory(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const len = buffer.byteLength;
  if (len < 22) return [];

  // Buscar firma End of Central Directory (0x06054b50) desde el final
  const minEocdOffset = Math.max(0, len - 65557);
  let eocdOffset = -1;
  for (let i = len - 22; i >= minEocdOffset; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return [];

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder('utf-8');
  const entries: ZipEntry[] = [];

  let ptr = cdOffset;
  for (let i = 0; i < totalEntries && ptr + 46 <= len; i++) {
    const sig = view.getUint32(ptr, true);
    if (sig !== 0x02014b50) break;

    const compressionMethod = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const uncompressedSize = view.getUint32(ptr + 24, true);
    const fileNameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localHeaderOffset = view.getUint32(ptr + 42, true);

    const nameBytes = bytes.subarray(ptr + 46, ptr + 46 + fileNameLen);
    const fileName = decoder.decode(nameBytes);

    entries.push({
      fileName,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });

    ptr += 46 + fileNameLen + extraLen + commentLen;
  }

  return entries;
}

/**
 * Extrae y descomprime (si usa Deflate) los bytes de una entrada concreta del ZIP.
 */
async function extractZipEntryBytes(
  buffer: ArrayBuffer,
  entry: ZipEntry
): Promise<Uint8Array | null> {
  const view = new DataView(buffer);
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.byteLength) return null;

  const sig = view.getUint32(offset, true);
  if (sig !== 0x04034b50) return null;

  const localNameLen = view.getUint16(offset + 26, true);
  const localExtraLen = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + localNameLen + localExtraLen;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.byteLength) return null;

  const rawSlice = new Uint8Array(buffer, dataStart, entry.compressedSize);

  if (entry.compressionMethod === 0) {
    return rawSlice;
  }

  if (entry.compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(rawSlice).catch(() => {});
      writer.close().catch(() => {});

      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let totalLen = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLen += value.byteLength;
        }
      }

      const result = new Uint8Array(totalLen);
      let pos = 0;
      for (const chunk of chunks) {
        result.set(chunk, pos);
        pos += chunk.byteLength;
      }
      return result;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Redimensiona una imagen en bytes (portada incrustada en EPUB/FB2) a un Data URL nítido,
 * validando que tenga dimensiones y proporción de portada (descarta logos o separadores).
 */
async function resizeImageBytesToDataUrl(
  bytes: Uint8Array,
  mimeType = 'image/jpeg'
): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined;
  const blob = new Blob([bytes as unknown as BlobPart], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load error'));
      el.src = objectUrl;
    });

    const natW = img.naturalWidth || img.width || 0;
    const natH = img.naturalHeight || img.height || 0;

    // Descartar iconos, logotipos editoriales pequeños o banners horizontales
    if (natW < 140 || natH < 180) {
      return undefined;
    }
    const aspect = natH / natW;
    if (aspect < 0.95 || aspect > 2.6) {
      return undefined;
    }

    const maxW = 600;
    const maxH = 900;
    let width = natW;
    let height = natH;

    if (width > maxW || height > maxH) {
      const ratio = Math.min(maxW / width, maxH / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, width, height);

    const webp = canvas.toDataURL('image/webp', 0.88);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Extrae Título, Autor, Saga y Volumen a partir del nombre del archivo cuando faltan metadatos.
 * Soporta patrones habituales como:
 * - "Autor - Título [Saga 01].epub"
 * - "Autor - Saga 01 - Título.epub"
 * - "Título (Saga, #1) (Autor).epub"
 * - "[Saga 02] Autor - Título.epub"
 */
export function parseFilenameMetadata(fileName: string): {
  nombre: string;
  autor: string;
  sagaNombre: string;
  volumen: number | null;
} {
  let base = fileName.replace(/\.[^.]+$/, '').trim();
  // Eliminar sufijos comunes de descarga como (Z-Library), ePubLibre, v1.0, etc.
  base = base
    .replace(
      /[\[(](?:z-lib\.org|z-library|annas-archive|epublibre|lectulandia|bajaebooks|epub|ebook|español|spanish|esp|spa|eng|v\d+(?:\.\d+)?|r\d+(?:\.\d+)?)[\])]/gi,
      ''
    )
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let sagaNombre = '';
  let volumen: number | null = null;

  // 1. Detectar [Saga #1], [Saga - 01], (Saga 01) o (Saga, #1)
  const bracketOrParenRegex =
    /[\[(]([^[\]()]+?)(?:,\s*|\s+-\s+|\s+)(?:#|vol(?:umen|\.)?\s*|libro\s*|book\s*|tomo\s*)?(\d+(?:\.\d+)?)[\])]/i;
  const seriesGroupMatch = base.match(bracketOrParenRegex);
  if (seriesGroupMatch) {
    const rawSaga = seriesGroupMatch[1].trim();
    const rawVol = Math.floor(Number(seriesGroupMatch[2])) || null;
    const validSaga = sanitizeSagaCandidate(rawSaga, { volume: rawVol });
    if (validSaga && rawVol !== null) {
      sagaNombre = validSaga;
      volumen = rawVol;
      base = base
        .replace(seriesGroupMatch[0], '')
        .replace(/\s+-\s+-\s+/g, ' - ')
        .replace(/^-\s+|\s+-$/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  let autor = '';
  let nombre = base;

  if (base.includes(' - ')) {
    const parts = base
      .split(' - ')
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length >= 3 && !sagaNombre) {
      // Patrón "Autor - Saga 01 - Título" o "Saga 01 - Título - Autor"
      const middleSeriesMatch = parts[1].match(
        /^(.+?)\s+(?:#|vol(?:umen|\.)?\s*|libro\s*)?0*(\d{1,2})$/i
      );
      const firstSeriesMatch = parts[0].match(
        /^(.+?)\s+(?:#|vol(?:umen|\.)?\s*|libro\s*)?0*(\d{1,2})$/i
      );

      if (middleSeriesMatch) {
        const candSaga = sanitizeSagaCandidate(middleSeriesMatch[1], {
          author: parts[0],
          bookTitle: parts.slice(2).join(' - '),
          volume: Number(middleSeriesMatch[2])
        });
        if (candSaga) {
          autor = normalizeAuthorName(parts[0]);
          sagaNombre = candSaga;
          volumen = Number(middleSeriesMatch[2]) || null;
          nombre = parts.slice(2).join(' - ');
        }
      } else if (firstSeriesMatch) {
        const candSaga = sanitizeSagaCandidate(firstSeriesMatch[1], {
          bookTitle: parts[1],
          author: parts[2],
          volume: Number(firstSeriesMatch[2])
        });
        if (candSaga) {
          sagaNombre = candSaga;
          volumen = Number(firstSeriesMatch[2]) || null;
          nombre = parts[1];
          autor = normalizeAuthorName(parts.slice(2).join(' - '));
        }
      }
    }

    if (!nombre || nombre === base) {
      if (parts.length >= 2) {
        // Si la primera parte es solo un número ("01 - El camino de los reyes - Brandon Sanderson")
        if (/^0*\d{1,2}$/.test(parts[0]) && parts.length >= 3) {
          if (volumen === null) volumen = Number(parts[0]);
          autor = normalizeAuthorName(parts[1]);
          nombre = parts.slice(2).join(' - ');
        } else if (/^0*\d{1,2}$/.test(parts[0]) && parts.length === 2) {
          if (volumen === null) volumen = Number(parts[0]);
          nombre = parts[1];
        } else {
          autor = normalizeAuthorName(parts[0]);
          nombre = parts.slice(1).join(' - ');
        }
      }
    }
  } else {
    const parenAuthor = base.match(/^(.+?)\s*\(([^0-9()]+)\)$/);
    if (parenAuthor) {
      const candidateAuthor = parenAuthor[2].trim();
      const validAsSaga = sanitizeSagaCandidate(candidateAuthor);
      // Si lo que hay entre paréntesis no es una edición ni saga, tratarlo como autor
      if (candidateAuthor.split(/\s+/).length <= 4 && !/edici[oó]n|saga|trilog[ií]a/i.test(candidateAuthor)) {
        nombre = parenAuthor[1].trim();
        autor = normalizeAuthorName(candidateAuthor);
      } else if (validAsSaga) {
        nombre = parenAuthor[1].trim();
      }
    }
  }

  // Extraer o refinar serie desde el título resultante y el diccionario de sagas conocidas
  const extracted = extractSeriesAndVolumeFromText(nombre, { author: autor });
  nombre = extracted.cleanTitle || nombre;
  if (!sagaNombre && extracted.sagaNombre) {
    sagaNombre = extracted.sagaNombre;
    volumen = volumen ?? extracted.volumen;
  } else if (sagaNombre) {
    const known = resolveKnownSagaAndVolume({
      title: nombre,
      author: autor,
      rawSaga: sagaNombre,
      rawVolume: volumen
    });
    if (known) {
      sagaNombre = known.sagaNombre;
      volumen = known.volumen ?? volumen;
    } else {
      sagaNombre = sanitizeSagaCandidate(sagaNombre, {
        bookTitle: nombre,
        author: autor,
        volume: volumen
      });
      if (!sagaNombre) volumen = null;
    }
  }

  return {
    nombre: nombre || 'Libro sin título',
    autor,
    sagaNombre,
    volumen
  };
}

/**
 * Parsea un archivo .epub extrayendo el archivo .opf (metadatos Dublin Core, serie Calibre/EPUB3)
 * y la imagen de portada incrustada.
 */
async function parseEpubBuffer(
  buffer: ArrayBuffer,
  fallbackMeta: ReturnType<typeof parseFilenameMetadata>
): Promise<Partial<ParsedEbookFile>> {
  const entries = readZipCentralDirectory(buffer);
  if (entries.length === 0) return {};

  const decoder = new TextDecoder('utf-8');
  const findEntry = (path: string): ZipEntry | undefined => {
    const normalized = path.replace(/^\/+/, '').toLowerCase();
    return (
      entries.find((e) => e.fileName.toLowerCase() === normalized) ||
      entries.find((e) => decodeURIComponent(e.fileName).toLowerCase() === normalized)
    );
  };

  // 1. Localizar el archivo .opf desde META-INF/container.xml o buscando *.opf
  let opfPath = '';
  const containerEntry = findEntry('META-INF/container.xml');
  if (containerEntry) {
    const containerBytes = await extractZipEntryBytes(buffer, containerEntry);
    if (containerBytes) {
      const xmlText = decoder.decode(containerBytes);
      const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
      const rootfile = doc.querySelector('rootfile');
      opfPath = rootfile?.getAttribute('full-path') || '';
    }
  }

  const opfEntry =
    (opfPath ? findEntry(opfPath) : undefined) ||
    entries.find((e) => e.fileName.toLowerCase().endsWith('.opf'));

  if (!opfEntry) return {};

  const opfBytes = await extractZipEntryBytes(buffer, opfEntry);
  if (!opfBytes) return {};

  const opfDir = opfEntry.fileName.includes('/')
    ? opfEntry.fileName.slice(0, opfEntry.fileName.lastIndexOf('/'))
    : '';

  const opfXml = decoder.decode(opfBytes);
  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml');

  const getTagText = (localName: string): string => {
    const el =
      opfDoc.getElementsByTagNameNS('*', localName)[0] ||
      opfDoc.querySelector(localName);
    return el?.textContent?.trim() || '';
  };

  const getAllTagTexts = (localName: string): string[] => {
    const els = Array.from(opfDoc.getElementsByTagNameNS('*', localName));
    if (els.length === 0) {
      return Array.from(opfDoc.querySelectorAll(localName))
        .map((e) => e.textContent?.trim() || '')
        .filter(Boolean);
    }
    return els.map((e) => e.textContent?.trim() || '').filter(Boolean);
  };

  const rawTitle = getTagText('title');
  const creators = getAllTagTexts('creator').map(normalizeAuthorName).filter(Boolean);
  const rawDescription = getTagText('description');
  const rawPublisher = getTagText('publisher');
  const rawLanguage = getTagText('language');
  const dates = getAllTagTexts('date');
  const subjects = getAllTagTexts('subject');
  const identifiers = getAllTagTexts('identifier');

  // Detectar ISBN entre los <dc:identifier>
  let detectedIsbn = '';
  for (const idVal of identifiers) {
    const cleaned = extractCleanIsbn(idVal.replace(/^urn:isbn:/i, ''));
    if (cleaned) {
      detectedIsbn = cleaned;
      break;
    }
  }

  // Detectar Saga y Volumen (Calibre meta o EPUB 3 belongs-to-collection)
  let calibreSaga = '';
  let calibreVol: number | null = null;
  let epub3Saga = '';
  let epub3Vol: number | null = null;

  const metaEls = Array.from(opfDoc.querySelectorAll('meta'));
  for (const meta of metaEls) {
    const nameAttr = (meta.getAttribute('name') || '').toLowerCase();
    const propAttr = (meta.getAttribute('property') || '').toLowerCase();
    const contentAttr = (meta.getAttribute('content') || meta.textContent || '').trim();

    if (nameAttr === 'calibre:series' && contentAttr) {
      calibreSaga = contentAttr;
    } else if (nameAttr === 'calibre:series_index' && contentAttr) {
      const n = Math.floor(Number(contentAttr));
      if (n > 0 && n < 200) calibreVol = n;
    } else if (propAttr === 'belongs-to-collection' && contentAttr) {
      const metaId = meta.getAttribute('id');
      const isSetType =
        metaId &&
        metaEls.some(
          (m) =>
            m.getAttribute('refines') === `#${metaId}` &&
            (m.getAttribute('property') || '').toLowerCase() === 'collection-type' &&
            (m.textContent || '').trim().toLowerCase() === 'set'
        );
      if (!isSetType) {
        epub3Saga = contentAttr;
      }
    } else if (propAttr === 'group-position' && contentAttr) {
      const n = Math.floor(Number(contentAttr));
      if (n > 0 && n < 200) epub3Vol = n;
    }
  }

  // Estimar número de páginas a partir del texto XHTML total del libro
  const htmlBytesTotal = entries
    .filter((e) => /\.(?:xhtml|html|htm|xml)$/i.test(e.fileName) && !e.fileName.endsWith('.opf'))
    .reduce((acc, e) => acc + (e.uncompressedSize || 0), 0);
  const estimatedPages =
    htmlBytesTotal > 15000 ? Math.max(30, Math.min(2500, Math.round(htmlBytesTotal / 2150))) : null;

  // Localizar la portada incrustada en el <manifest> (sin usar la primera imagen arbitraria como fallback)
  const manifestItems = Array.from(opfDoc.getElementsByTagNameNS('*', 'item'));
  let coverId = '';
  for (const meta of metaEls) {
    if ((meta.getAttribute('name') || '').toLowerCase() === 'cover') {
      coverId = meta.getAttribute('content') || '';
      if (coverId) break;
    }
  }

  const isImageItem = (item: Element) =>
    (item.getAttribute('media-type') || '').toLowerCase().startsWith('image/');

  const coverItem =
    manifestItems.find(
      (item) =>
        isImageItem(item) &&
        (item.getAttribute('properties') || '').toLowerCase().split(/\s+/).includes('cover-image')
    ) ||
    (coverId
      ? manifestItems.find((item) => item.getAttribute('id') === coverId && isImageItem(item))
      : undefined) ||
    manifestItems.find((item) => {
      if (!isImageItem(item)) return false;
      const id = (item.getAttribute('id') || '').toLowerCase();
      const href = (item.getAttribute('href') || '').toLowerCase();
      return (
        id.includes('cover') ||
        id.includes('portada') ||
        id.includes('cubierta') ||
        href.includes('cover') ||
        href.includes('portada') ||
        href.includes('cubierta')
      );
    });

  let portadaDataUrl: string | undefined;
  if (coverItem) {
    const href = coverItem.getAttribute('href') || '';
    const mimeType = coverItem.getAttribute('media-type') || 'image/jpeg';
    if (href) {
      const resolvedPath = resolveZipPath(opfDir, href);
      const imageEntry =
        findEntry(resolvedPath) ||
        entries.find((e) => e.fileName.toLowerCase().endsWith('/' + href.toLowerCase()));
      if (imageEntry && imageEntry.uncompressedSize < 15 * 1024 * 1024) {
        const imgBytes = await extractZipEntryBytes(buffer, imageEntry);
        if (imgBytes && imgBytes.byteLength > 1500) {
          portadaDataUrl = await resizeImageBytesToDataUrl(imgBytes, mimeType);
        }
      }
    }
  }

  const cleanSynopsis = stripHtmlToText(rawDescription);
  const resolvedAuthor = creators.join(', ') || fallbackMeta.autor;

  // Extraer posible saga desde <dc:title> y sinopsis, limpiando el título si traía "(Saga 1)"
  const titleSeries = extractSeriesAndVolumeFromText(rawTitle || fallbackMeta.nombre, {
    synopsis: cleanSynopsis,
    author: resolvedAuthor,
    publisher: rawPublisher
  });

  const resolvedTitle = titleSeries.cleanTitle || rawTitle || fallbackMeta.nombre;

  // Validar candidatos de saga de Calibre y EPUB3 descartando colecciones editoriales
  const validCalibreSaga = sanitizeSagaCandidate(calibreSaga, {
    bookTitle: resolvedTitle,
    author: resolvedAuthor,
    publisher: rawPublisher,
    volume: calibreVol
  });

  // En EPUB3 comerciales, belongs-to-collection sin group-position suele ser la colección editorial ("Andanzas", "Booket")
  const validEpub3Saga =
    epub3Vol !== null || resolveKnownSagaAndVolume({ title: resolvedTitle, author: resolvedAuthor, rawSaga: epub3Saga })
      ? sanitizeSagaCandidate(epub3Saga, {
          bookTitle: resolvedTitle,
          author: resolvedAuthor,
          publisher: rawPublisher,
          volume: epub3Vol
        })
      : '';

  let finalSagaNombre =
    validCalibreSaga ||
    titleSeries.sagaNombre ||
    validEpub3Saga ||
    sanitizeSagaCandidate(fallbackMeta.sagaNombre, {
      bookTitle: resolvedTitle,
      author: resolvedAuthor,
      publisher: rawPublisher,
      volume: fallbackMeta.volumen
    });

  let finalVolumen =
    (validCalibreSaga ? calibreVol : null) ??
    titleSeries.volumen ??
    (validEpub3Saga ? epub3Vol : null) ??
    fallbackMeta.volumen;

  // Canonizar mediante el diccionario de sagas conocidas si aplica
  const knownResolution = resolveKnownSagaAndVolume({
    title: resolvedTitle,
    author: resolvedAuthor,
    rawSaga: finalSagaNombre,
    rawVolume: finalVolumen,
    synopsis: cleanSynopsis
  });

  if (knownResolution) {
    finalSagaNombre = knownResolution.sagaNombre;
    finalVolumen = knownResolution.volumen ?? finalVolumen;
  }

  if (!finalSagaNombre) {
    finalVolumen = null;
  }

  const catalogInference = inferCatalogFromCategories([
    ...subjects,
    resolvedTitle,
    cleanSynopsis
  ]);

  let pubYear: number | null = null;
  for (const d of dates) {
    pubYear = extractYear(d);
    if (pubYear) break;
  }

  return {
    nombre: resolvedTitle,
    autor: resolvedAuthor,
    isbn: detectedIsbn,
    editorial: rawPublisher,
    idioma: normalizeLanguage(rawLanguage),
    fechaPublicacion: pubYear,
    paginas: estimatedPages,
    sinopsis: cleanSynopsis,
    genero: catalogInference.genre,
    subgeneros: catalogInference.subgenres,
    sagaNombre: finalSagaNombre,
    volumen: finalVolumen,
    portadaDataUrl,
    epubEmbeddedCoverDataUrl: portadaDataUrl
  };
}

/**
 * Parsea un archivo .fb2 (FictionBook XML) extrayendo metadatos y portada en base64.
 */
async function parseFb2File(
  file: File,
  fallbackMeta: ReturnType<typeof parseFilenameMetadata>
): Promise<Partial<ParsedEbookFile>> {
  try {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    const titleInfo = doc.querySelector('description > title-info') || doc;

    const bookTitle = titleInfo.querySelector('book-title')?.textContent?.trim() || '';
    const authorEls = Array.from(titleInfo.querySelectorAll('author'));
    const authors = authorEls
      .map((a) => {
        const first = a.querySelector('first-name')?.textContent?.trim() || '';
        const middle = a.querySelector('middle-name')?.textContent?.trim() || '';
        const last = a.querySelector('last-name')?.textContent?.trim() || '';
        return [first, middle, last].filter(Boolean).join(' ');
      })
      .filter(Boolean);

    const annotation = stripHtmlToText(
      titleInfo.querySelector('annotation')?.innerHTML || ''
    );
    const lang = normalizeLanguage(titleInfo.querySelector('lang')?.textContent);
    const dateStr =
      titleInfo.querySelector('date')?.getAttribute('value') ||
      titleInfo.querySelector('date')?.textContent ||
      '';
    const sequence = titleInfo.querySelector('sequence');
    const rawSeqSaga = sequence?.getAttribute('name')?.trim() || '';
    const rawSeqVol = Number(sequence?.getAttribute('number')) || null;
    const publisher = doc.querySelector('publish-info > publisher')?.textContent?.trim() || '';
    const isbnRaw = doc.querySelector('publish-info > isbn')?.textContent?.trim() || '';
    const isbn = extractCleanIsbn(isbnRaw) || '';
    const genres = Array.from(titleInfo.querySelectorAll('genre'))
      .map((g) => g.textContent?.trim() || '')
      .filter(Boolean);

    let portadaDataUrl: string | undefined;
    const binaryEl = doc.querySelector('binary[content-type^="image/"]') || doc.querySelector('binary');
    if (binaryEl?.textContent) {
      const base64 = binaryEl.textContent.replace(/\s+/g, '');
      const mime = binaryEl.getAttribute('content-type') || 'image/jpeg';
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      portadaDataUrl = await resizeImageBytesToDataUrl(bytes, mime);
    }

    const resolvedAuthor = authors.join(', ') || fallbackMeta.autor;
    const titleSeries = extractSeriesAndVolumeFromText(bookTitle || fallbackMeta.nombre, {
      synopsis: annotation,
      author: resolvedAuthor,
      publisher
    });

    const resolvedTitle = titleSeries.cleanTitle || bookTitle || fallbackMeta.nombre;
    const validSeqSaga = sanitizeSagaCandidate(rawSeqSaga, {
      bookTitle: resolvedTitle,
      author: resolvedAuthor,
      publisher,
      volume: rawSeqVol
    });

    let finalSagaNombre = validSeqSaga || titleSeries.sagaNombre || fallbackMeta.sagaNombre;
    let finalVolumen =
      (validSeqSaga ? rawSeqVol : null) ?? titleSeries.volumen ?? fallbackMeta.volumen;

    const known = resolveKnownSagaAndVolume({
      title: resolvedTitle,
      author: resolvedAuthor,
      rawSaga: finalSagaNombre,
      rawVolume: finalVolumen,
      synopsis: annotation
    });

    if (known) {
      finalSagaNombre = known.sagaNombre;
      finalVolumen = known.volumen ?? finalVolumen;
    }
    if (!finalSagaNombre) finalVolumen = null;

    const catalogInference = inferCatalogFromCategories([...genres, resolvedTitle, annotation]);

    return {
      nombre: resolvedTitle,
      autor: resolvedAuthor,
      isbn,
      editorial: publisher,
      idioma: lang,
      fechaPublicacion: extractYear(dateStr),
      sinopsis: annotation,
      genero: catalogInference.genre,
      subgeneros: catalogInference.subgenres,
      sagaNombre: finalSagaNombre,
      volumen: finalVolumen,
      portadaDataUrl,
      epubEmbeddedCoverDataUrl: portadaDataUrl
    };
  } catch {
    return {};
  }
}

/**
 * Procesa cualquier archivo de libro (.epub, .fb2, .pdf, .mobi, .azw3) y devuelve su ficha extraída.
 */
export async function parseEbookFile(file: File): Promise<ParsedEbookFile> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const format: ParsedEbookFile['format'] =
    ext === 'epub'
      ? 'EPUB'
      : ext === 'fb2'
      ? 'FB2'
      : ext === 'pdf'
      ? 'PDF'
      : ext === 'mobi' || ext === 'azw' || ext === 'azw3'
      ? 'MOBI'
      : 'OTRO';

  const fallbackMeta = parseFilenameMetadata(file.name);
  let extracted: Partial<ParsedEbookFile> = {};

  if (format === 'EPUB') {
    try {
      const buffer = await file.arrayBuffer();
      extracted = await parseEpubBuffer(buffer, fallbackMeta);
    } catch {
      extracted = {};
    }
  } else if (format === 'FB2') {
    extracted = await parseFb2File(file, fallbackMeta);
  }

  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fileName: file.name,
    fileSize: file.size,
    format,
    sourceFormat: ext || format.toLowerCase(),
    nombre: extracted.nombre || fallbackMeta.nombre,
    autor: extracted.autor || fallbackMeta.autor,
    isbn: extracted.isbn || '',
    editorial: extracted.editorial || '',
    idioma: extracted.idioma || '',
    edicion: `eBook (.${ext || format.toLowerCase()})`,
    lecturaVirtual: `Archivo .${ext || format.toLowerCase()}`,
    fechaPublicacion: extracted.fechaPublicacion ?? null,
    paginas: extracted.paginas ?? null,
    sinopsis: extracted.sinopsis || '',
    genero: extracted.genero || '',
    subgeneros: extracted.subgeneros || [],
    sagaNombre: extracted.sagaNombre || fallbackMeta.sagaNombre,
    volumen: extracted.volumen ?? fallbackMeta.volumen,
    portadaDataUrl: extracted.portadaDataUrl,
    epubEmbeddedCoverDataUrl: extracted.epubEmbeddedCoverDataUrl ?? extracted.portadaDataUrl,
    portadaUrl: '',
    portadaFallbackUrl: '',
    enrichedFromCatalog: false
  };
}

/**
 * Completa y mejora los campos del archivo extraído consultando el catálogo bibliográfico online:
 * - Obtiene portadas editoriales limpias de alta resolución (Apple Books / Google Books / Open Library)
 * - Detecta o corrige el nombre de la saga y el número de volumen
 * - Completa sinopsis, género, editorial, ISBN y número de páginas
 */
export async function enrichParsedEbookFromCatalog(
  item: ParsedEbookFile,
  options?: { preferCatalogCover?: boolean }
): Promise<ParsedEbookFile> {
  const preferCatalogCover = options?.preferCatalogCover ?? true;
  try {
    const match = await bookMetadataService.findBestMatchForBook({
      nombre: item.nombre,
      autor: item.autor,
      isbn: item.isbn
    });

    if (!match) return item;

    const embeddedCover = item.epubEmbeddedCoverDataUrl ?? item.portadaDataUrl;
    const hasCatalogCover = Boolean(match.portadaUrl && match.portadaUrl.trim());
    const catalogCoverUrl = match.portadaUrl || item.portadaUrl;
    const catalogFallbackUrl = match.portadaFallbackUrl || item.portadaFallbackUrl;

    // Si preferimos la portada limpia del catálogo y existe una disponible, dejamos portadaDataUrl vacío
    // para que BookCover muestre la portada editorial oficial (conservando epubEmbeddedCoverDataUrl por si quiere alternar)
    const activeDataUrl =
      preferCatalogCover && hasCatalogCover ? undefined : embeddedCover;

    const resolvedTitle = item.nombre || match.nombre;
    const resolvedAuthor = item.autor || match.autor;
    const resolvedPublisher = item.editorial || match.editorial;
    const resolvedSynopsis = item.sinopsis || match.sinopsis;

    let finalSaga = item.sagaNombre || match.suggestedSaga || '';
    let finalVol = item.volumen ?? match.suggestedVolume ?? null;

    if (!finalSaga && resolvedSynopsis) {
      const fromSyn = extractSeriesAndVolumeFromText(resolvedTitle, {
        synopsis: resolvedSynopsis,
        author: resolvedAuthor,
        publisher: resolvedPublisher
      });
      if (fromSyn.sagaNombre) {
        finalSaga = fromSyn.sagaNombre;
        finalVol = finalVol ?? fromSyn.volumen;
      }
    }

    const known = resolveKnownSagaAndVolume({
      title: resolvedTitle,
      author: resolvedAuthor,
      rawSaga: finalSaga,
      rawVolume: finalVol,
      synopsis: resolvedSynopsis
    });
    if (known) {
      finalSaga = known.sagaNombre;
      finalVol = known.volumen ?? finalVol;
    } else if (finalSaga) {
      finalSaga = sanitizeSagaCandidate(finalSaga, {
        bookTitle: resolvedTitle,
        author: resolvedAuthor,
        publisher: resolvedPublisher,
        volume: finalVol
      });
      if (!finalSaga) finalVol = null;
    }

    return {
      ...item,
      nombre: resolvedTitle,
      autor: resolvedAuthor,
      isbn: item.isbn || match.isbn,
      editorial: resolvedPublisher,
      idioma: item.idioma || match.idioma,
      fechaPublicacion: item.fechaPublicacion ?? match.fechaPublicacion,
      paginas: match.paginas ?? item.paginas,
      sinopsis: resolvedSynopsis,
      genero: item.genero || match.suggestedGenre,
      subgeneros:
        item.subgeneros.length > 0 ? item.subgeneros : match.suggestedSubgenres,
      sagaNombre: finalSaga,
      volumen: finalVol,
      portadaDataUrl: activeDataUrl,
      epubEmbeddedCoverDataUrl: embeddedCover,
      portadaUrl: catalogCoverUrl,
      portadaFallbackUrl: catalogFallbackUrl,
      enrichedFromCatalog: true
    };
  } catch {
    return item;
  }
}
