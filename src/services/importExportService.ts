import { collectionService } from './collectionService';
import { BackupPayload, Book, Saga } from '../types/models';
import { normalizeText } from '../constants/catalogs';

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
    'Portada'
  ];

  const escapeCsvCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n')) {
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
      b.portadaUrl
    ]
      .map(escapeCsvCell)
      .join(',')
  );

  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}
