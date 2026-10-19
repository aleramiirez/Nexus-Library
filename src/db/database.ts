import Dexie, { Table } from 'dexie';
import { BackupPayload, Book, Saga } from '../types/models';
import { normalizeText } from '../constants/catalogs';
import { getActiveUser, supabase } from '../services/supabaseClient';
import { isDuplicateBook } from '../services/importExportService';

export class NexusLibraryDB extends Dexie {
  books!: Table<Book, string>;
  sagas!: Table<Saga, string>;

  constructor() {
    super('NexusLibraryDatabase');

    this.version(1).stores({
      books: 'id, nombre, autor, genero, progreso, sagaId, isbn, puntuacion, createdAt',
      sagas: 'id, &nombre, createdAt'
    });

    this.version(2)
      .stores({
        books: 'id, nombre, autor, genero, progreso, sagaId, isbn, puntuacion, createdAt',
        sagas: 'id, &nombre, createdAt'
      })
      .upgrade(async (tx) => {
        await tx
          .table('books')
          .toCollection()
          .modify((book: Partial<Book>) => {
            if (!Array.isArray(book.subgeneros)) book.subgeneros = [];
            if (book.sagaNombre === undefined) book.sagaNombre = '';
            if (book.portadaFallbackUrl === undefined) book.portadaFallbackUrl = '';
            if (book.tiempoLectura === undefined) book.tiempoLectura = '';
          });
      });
  }
}

export const db = new NexusLibraryDB();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureValidUuid(id?: string | null): string {
  if (id && UUID_REGEX.test(id.trim())) {
    return id.trim().toLowerCase();
  }
  if (!id || !id.trim()) {
    return crypto.randomUUID();
  }
  const str = id.trim();
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  let h3 = 0x9e3779b9 ^ str.length;
  let h4 = 0x85ebca6b ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const raw = hex(h1) + hex(h2) + hex(h3) + hex(h4);
  return (
    raw.slice(0, 8) +
    '-' +
    raw.slice(8, 12) +
    '-4' +
    raw.slice(13, 16) +
    '-a' +
    raw.slice(17, 20) +
    '-' +
    raw.slice(20, 32)
  );
}

interface SupabaseBookRow {
  id: string;
  user_id: string;
  data: Partial<Book>;
  created_at: string;
  updated_at: string;
}

interface SupabaseSagaRow {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncMigrationResult {
  synced: boolean;
  migratedBooks: number;
  migratedSagas: number;
  totalRemoteBooks: number;
  totalRemoteSagas: number;
  error?: string;
}

const ACTIVE_OWNER_KEY = 'nexus_library_active_owner_id';

function getSyncedIdsCacheKey(userId: string): string {
  return `nexus_library_synced_ids_${userId}`;
}

function getMigrationVerifiedKey(userId: string): string {
  return `nexus_library_migration_verified_${userId}`;
}

export async function clearLocalCacheOnSignOut(): Promise<void> {
  const prevOwner = localStorage.getItem(ACTIVE_OWNER_KEY);
  if (prevOwner && localStorage.getItem(getMigrationVerifiedKey(prevOwner))) {
    await db.transaction('rw', db.books, db.sagas, async () => {
      await db.books.clear();
      await db.sagas.clear();
    });
  }
  localStorage.removeItem(ACTIVE_OWNER_KEY);
}

function readSyncedIds(userId: string): { bookIds: Set<string>; sagaIds: Set<string> } {
  try {
    const raw = localStorage.getItem(getSyncedIdsCacheKey(userId));
    if (!raw) return { bookIds: new Set(), sagaIds: new Set() };
    const parsed = JSON.parse(raw) as { bookIds?: string[]; sagaIds?: string[] };
    return {
      bookIds: new Set(Array.isArray(parsed.bookIds) ? parsed.bookIds : []),
      sagaIds: new Set(Array.isArray(parsed.sagaIds) ? parsed.sagaIds : [])
    };
  } catch {
    return { bookIds: new Set(), sagaIds: new Set() };
  }
}

function writeSyncedIds(userId: string, bookIds: Iterable<string>, sagaIds: Iterable<string>): void {
  try {
    localStorage.setItem(
      getSyncedIdsCacheKey(userId),
      JSON.stringify({
        bookIds: Array.from(bookIds),
        sagaIds: Array.from(sagaIds),
        updatedAt: new Date().toISOString()
      })
    );
  } catch {
    // ignore storage quota errors
  }
}

function addBookIdToSyncedCache(userId: string, bookId: string): void {
  const current = readSyncedIds(userId);
  current.bookIds.add(bookId);
  writeSyncedIds(userId, current.bookIds, current.sagaIds);
}

function removeBookIdFromSyncedCache(userId: string, bookId: string): void {
  const current = readSyncedIds(userId);
  current.bookIds.delete(bookId);
  writeSyncedIds(userId, current.bookIds, current.sagaIds);
}

function addSagaIdToSyncedCache(userId: string, sagaId: string): void {
  const current = readSyncedIds(userId);
  current.sagaIds.add(sagaId);
  writeSyncedIds(userId, current.bookIds, current.sagaIds);
}

function removeSagaIdFromSyncedCache(userId: string, sagaId: string): void {
  const current = readSyncedIds(userId);
  current.sagaIds.delete(sagaId);
  writeSyncedIds(userId, current.bookIds, current.sagaIds);
}

export function mapRowToBook(row: SupabaseBookRow): Book {
  const d = row.data || {};
  return {
    id: row.id,
    nombre: d.nombre ?? '',
    autor: d.autor ?? '',
    genero: d.genero ?? '',
    subgeneros: Array.isArray(d.subgeneros) ? d.subgeneros : [],
    fechaPublicacion: d.fechaPublicacion ?? null,
    paginas: d.paginas ?? null,
    puntuacion: d.puntuacion ?? null,
    progreso: d.progreso ?? '❌ No Leído',
    sagaId: d.sagaId ?? null,
    sagaNombre: d.sagaNombre ?? '',
    volumen: d.volumen ?? null,
    fechaInicio: d.fechaInicio ?? '',
    fechaFin: d.fechaFin ?? '',
    lecturaVirtual: d.lecturaVirtual ?? '',
    tiempoLectura: d.tiempoLectura ?? '',
    isbn: d.isbn ?? '',
    editorial: d.editorial ?? '',
    idioma: d.idioma ?? '',
    edicion: d.edicion ?? '',
    sinopsis: d.sinopsis ?? '',
    portadaUrl: d.portadaUrl ?? '',
    portadaFallbackUrl: d.portadaFallbackUrl ?? '',
    portadaDataUrl: d.portadaDataUrl,
    createdAt: row.created_at || d.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || d.updatedAt || new Date().toISOString()
  };
}

export function mapRowToSaga(row: SupabaseSagaRow): Saga {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

async function upsertBookToSupabase(userId: string, book: Book): Promise<void> {
  const payload: SupabaseBookRow = {
    id: book.id,
    user_id: userId,
    data: book,
    created_at: book.createdAt,
    updated_at: book.updatedAt
  };
  const { error } = await supabase
    .from('books')
    .upsert(payload, { onConflict: 'id,user_id' });
  if (error) {
    throw new Error(`Error al guardar el libro en Supabase: ${error.message}`);
  }
  addBookIdToSyncedCache(userId, book.id);
}

async function upsertSagaToSupabase(userId: string, saga: Saga): Promise<void> {
  const payload: SupabaseSagaRow = {
    id: saga.id,
    user_id: userId,
    nombre: saga.nombre,
    descripcion: saga.descripcion,
    created_at: saga.createdAt,
    updated_at: saga.updatedAt
  };
  const { error } = await supabase
    .from('sagas')
    .upsert(payload, { onConflict: 'id,user_id' });
  if (error) {
    throw new Error(`Error al guardar la saga en Supabase: ${error.message}`);
  }
  addSagaIdToSyncedCache(userId, saga.id);
}

/**
 * Sincroniza y migra de forma segura los datos locales de IndexedDB/Dexie hacia Supabase
 * sin duplicados y sin borrar el almacenamiento local antes de verificar la migración.
 */
export async function syncAndMigrateWithSupabase(): Promise<SyncMigrationResult> {
  const user = await getActiveUser();
  if (!user) {
    return {
      synced: false,
      migratedBooks: 0,
      migratedSagas: 0,
      totalRemoteBooks: 0,
      totalRemoteSagas: 0
    };
  }

  try {
    const previousOwnerId = localStorage.getItem(ACTIVE_OWNER_KEY);
    if (previousOwnerId && previousOwnerId !== user.id) {
      // Otro usuario distinto tenía sesión en este mismo navegador: limpiamos su caché local
      // para que sus libros no se mezclen ni migren a la cuenta del nuevo usuario.
      await db.transaction('rw', db.books, db.sagas, async () => {
        await db.books.clear();
        await db.sagas.clear();
      });
    }

    const [remoteSagasRes, remoteBooksRes] = await Promise.all([
      supabase.from('sagas').select('*').eq('user_id', user.id),
      supabase.from('books').select('*').eq('user_id', user.id)
    ]);

    if (remoteSagasRes.error) {
      throw new Error(`Error al consultar sagas en Supabase: ${remoteSagasRes.error.message}`);
    }
    if (remoteBooksRes.error) {
      throw new Error(`Error al consultar libros en Supabase: ${remoteBooksRes.error.message}`);
    }

    const remoteSagas = (remoteSagasRes.data as SupabaseSagaRow[]).map(mapRowToSaga);
    const remoteBooks = (remoteBooksRes.data as SupabaseBookRow[]).map(mapRowToBook);

    const localSagas = await db.sagas.toArray();
    const localBooks = await db.books.toArray();
    const previouslySynced = readSyncedIds(user.id);

    let migratedSagas = 0;
    let migratedBooks = 0;

    // Mapa para resolver sagaId local -> saga remota (id y nombre)
    const sagaRemap = new Map<string, { id: string; nombre: string }>();
    const currentRemoteSagasById = new Map<string, Saga>(remoteSagas.map((s) => [s.id, s]));
    const currentRemoteSagasByNormName = new Map<string, Saga>(
      remoteSagas.map((s) => [normalizeText(s.nombre), s])
    );

    // 1. Migrar Sagas locales no presentes en Supabase
    for (const localSaga of localSagas) {
      const validLocalId = ensureValidUuid(localSaga.id);
      const normName = normalizeText(localSaga.nombre);
      const existingById = currentRemoteSagasById.get(validLocalId);
      const existingByName = currentRemoteSagasByNormName.get(normName);
      const existingRemote = existingById || existingByName;

      if (existingRemote) {
        sagaRemap.set(localSaga.id, { id: existingRemote.id, nombre: existingRemote.nombre });
        if (localSaga.updatedAt > existingRemote.updatedAt) {
          const updatedSaga: Saga = {
            ...existingRemote,
            descripcion: localSaga.descripcion || existingRemote.descripcion,
            updatedAt: localSaga.updatedAt
          };
          await upsertSagaToSupabase(user.id, updatedSaga);
          currentRemoteSagasById.set(updatedSaga.id, updatedSaga);
          currentRemoteSagasByNormName.set(normalizeText(updatedSaga.nombre), updatedSaga);
        }
      } else if (!previouslySynced.sagaIds.has(validLocalId)) {
        const sagaToMigrate: Saga = {
          ...localSaga,
          id: validLocalId
        };
        await upsertSagaToSupabase(user.id, sagaToMigrate);
        currentRemoteSagasById.set(sagaToMigrate.id, sagaToMigrate);
        currentRemoteSagasByNormName.set(normName, sagaToMigrate);
        sagaRemap.set(localSaga.id, { id: sagaToMigrate.id, nombre: sagaToMigrate.nombre });
        migratedSagas++;
      }
    }

    // 2. Migrar Libros locales no presentes en Supabase (sin duplicados)
    const currentRemoteBooksById = new Map<string, Book>(remoteBooks.map((b) => [b.id, b]));
    const remoteBooksList: Book[] = [...remoteBooks];

    for (const localBook of localBooks) {
      const validBookId = ensureValidUuid(localBook.id);

      // Resolver relación con saga
      let resolvedSagaId: string | null = null;
      let resolvedSagaNombre = localBook.sagaNombre?.trim() || '';

      if (localBook.sagaId && sagaRemap.has(localBook.sagaId)) {
        const mapped = sagaRemap.get(localBook.sagaId)!;
        resolvedSagaId = mapped.id;
        resolvedSagaNombre = mapped.nombre;
      } else if (localBook.sagaId && currentRemoteSagasById.has(ensureValidUuid(localBook.sagaId))) {
        const remSaga = currentRemoteSagasById.get(ensureValidUuid(localBook.sagaId))!;
        resolvedSagaId = remSaga.id;
        resolvedSagaNombre = remSaga.nombre;
      } else if (resolvedSagaNombre) {
        const normSagaName = normalizeText(resolvedSagaNombre);
        const byName = currentRemoteSagasByNormName.get(normSagaName);
        if (byName) {
          resolvedSagaId = byName.id;
          resolvedSagaNombre = byName.nombre;
        } else {
          const now = new Date().toISOString();
          const newSaga: Saga = {
            id: crypto.randomUUID(),
            nombre: resolvedSagaNombre,
            descripcion: '',
            createdAt: now,
            updatedAt: now
          };
          await upsertSagaToSupabase(user.id, newSaga);
          currentRemoteSagasById.set(newSaga.id, newSaga);
          currentRemoteSagasByNormName.set(normSagaName, newSaga);
          resolvedSagaId = newSaga.id;
          migratedSagas++;
        }
      }

      const preparedBook: Book = {
        ...localBook,
        id: validBookId,
        sagaId: resolvedSagaId,
        sagaNombre: resolvedSagaNombre
      };

      const existingById = currentRemoteBooksById.get(validBookId);
      if (existingById) {
        if (preparedBook.updatedAt > existingById.updatedAt) {
          await upsertBookToSupabase(user.id, preparedBook);
          currentRemoteBooksById.set(validBookId, preparedBook);
        }
        continue;
      }

      // Evitar duplicados por ISBN o Título+Autor si ya existe en Supabase
      const dupCheck = isDuplicateBook(
        {
          nombre: preparedBook.nombre,
          autor: preparedBook.autor,
          isbn: preparedBook.isbn
        },
        remoteBooksList
      );

      if (dupCheck.duplicate) {
        continue;
      }

      // Si no había sido sincronizado antes y eliminado en el servidor, migrarlo a Supabase
      if (!previouslySynced.bookIds.has(validBookId)) {
        await upsertBookToSupabase(user.id, preparedBook);
        currentRemoteBooksById.set(validBookId, preparedBook);
        remoteBooksList.push(preparedBook);
        migratedBooks++;
      }
    }

    // 3. Verificar en Supabase los datos finales antes de actualizar la caché local
    const [verifySagasRes, verifyBooksRes] = await Promise.all([
      supabase.from('sagas').select('*').eq('user_id', user.id),
      supabase.from('books').select('*').eq('user_id', user.id)
    ]);

    if (verifySagasRes.error || verifyBooksRes.error) {
      throw new Error(
        verifySagasRes.error?.message ||
          verifyBooksRes.error?.message ||
          'No se pudo verificar la migración en Supabase.'
      );
    }

    const verifiedSagas = (verifySagasRes.data as SupabaseSagaRow[]).map(mapRowToSaga);
    const verifiedBooks = (verifyBooksRes.data as SupabaseBookRow[]).map(mapRowToBook);

    // Sincronizar Dexie con los registros verificados de Supabase (conservando el almacenamiento local)
    await db.transaction('rw', db.books, db.sagas, async () => {
      const verifiedSagaIds = new Set(verifiedSagas.map((s) => s.id));
      const verifiedBookIds = new Set(verifiedBooks.map((b) => b.id));

      // Eliminar de Dexie únicamente aquellos registros que ya estaban sincronizados antes y fueron borrados en la nube,
      // o cuyos IDs antiguos fueron remapeados y ya están presentes con su UUID verificado.
      for (const ls of localSagas) {
        if (!verifiedSagaIds.has(ls.id) && (previouslySynced.sagaIds.has(ls.id) || ls.id !== ensureValidUuid(ls.id))) {
          await db.sagas.delete(ls.id);
        }
      }
      for (const lb of localBooks) {
        if (!verifiedBookIds.has(lb.id) && (previouslySynced.bookIds.has(lb.id) || lb.id !== ensureValidUuid(lb.id))) {
          await db.books.delete(lb.id);
        }
      }

      if (verifiedSagas.length > 0) {
        await db.sagas.bulkPut(verifiedSagas);
      }
      if (verifiedBooks.length > 0) {
        await db.books.bulkPut(verifiedBooks);
      }
    });

    writeSyncedIds(
      user.id,
      verifiedBooks.map((b) => b.id),
      verifiedSagas.map((s) => s.id)
    );

    localStorage.setItem(ACTIVE_OWNER_KEY, user.id);
    localStorage.setItem(
      getMigrationVerifiedKey(user.id),
      JSON.stringify({
        verifiedAt: new Date().toISOString(),
        booksCount: verifiedBooks.length,
        sagasCount: verifiedSagas.length
      })
    );

    return {
      synced: true,
      migratedBooks,
      migratedSagas,
      totalRemoteBooks: verifiedBooks.length,
      totalRemoteSagas: verifiedSagas.length
    };
  } catch (err: unknown) {
    return {
      synced: false,
      migratedBooks: 0,
      migratedSagas: 0,
      totalRemoteBooks: 0,
      totalRemoteSagas: 0,
      error: err instanceof Error ? err.message : 'Error al sincronizar con Supabase.'
    };
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export function calculateReadingTimeLabel(
  fechaInicio: string,
  fechaFin: string,
  existingLabel?: string
): string {
  if (fechaInicio && fechaFin) {
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
      const diffMs = end.getTime() - start.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return String(days) + ' ' + (days === 1 ? 'día' : 'días');
    }
  }
  return existingLabel || '';
}

export async function findOrCreateSagaByName(
  nombreRaw: string,
  descripcion = ''
): Promise<Saga | null> {
  const cleanName = nombreRaw.trim();
  if (!cleanName) return null;

  const targetNorm = normalizeText(cleanName);
  const allSagas = await db.sagas.toArray();
  const existing = allSagas.find((s) => normalizeText(s.nombre) === targetNorm);
  if (existing) {
    return existing;
  }

  const user = await getActiveUser();
  if (user) {
    const { data: remoteExisting } = await supabase
      .from('sagas')
      .select('*')
      .eq('user_id', user.id);
    if (Array.isArray(remoteExisting)) {
      const match = (remoteExisting as SupabaseSagaRow[]).find(
        (r) => normalizeText(r.nombre) === targetNorm
      );
      if (match) {
        const mapped = mapRowToSaga(match);
        await db.sagas.put(mapped);
        return mapped;
      }
    }
  }

  const now = new Date().toISOString();
  const newSaga: Saga = {
    id: crypto.randomUUID(),
    nombre: cleanName,
    descripcion: descripcion.trim(),
    createdAt: now,
    updatedAt: now
  };

  if (user) {
    await upsertSagaToSupabase(user.id, newSaga);
  }
  await db.sagas.put(newSaga);
  return newSaga;
}

export async function saveBookRecord(
  bookData: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<Book> {
  let sagaId = bookData.sagaId ? ensureValidUuid(bookData.sagaId) : null;
  let sagaNombre = bookData.sagaNombre.trim();

  if (sagaNombre && !sagaId) {
    const saga = await findOrCreateSagaByName(sagaNombre);
    sagaId = saga ? saga.id : null;
    sagaNombre = saga ? saga.nombre : '';
  } else if (sagaId) {
    const saga = await db.sagas.get(sagaId);
    if (saga) {
      sagaNombre = saga.nombre;
    } else {
      sagaId = null;
      sagaNombre = '';
    }
  }

  const now = new Date().toISOString();
  const tiempoLectura = calculateReadingTimeLabel(
    bookData.fechaInicio,
    bookData.fechaFin,
    bookData.tiempoLectura
  );

  let recordToSave: Book;

  if (existingId) {
    const validId = ensureValidUuid(existingId);
    const current = await db.books.get(existingId);
    recordToSave = {
      ...bookData,
      id: validId,
      sagaId,
      sagaNombre,
      tiempoLectura,
      createdAt: current?.createdAt || now,
      updatedAt: now
    };
  } else {
    recordToSave = {
      ...bookData,
      id: crypto.randomUUID(),
      sagaId,
      sagaNombre,
      tiempoLectura,
      createdAt: now,
      updatedAt: now
    };
  }

  const user = await getActiveUser();
  if (user) {
    await upsertBookToSupabase(user.id, recordToSave);
  }

  await db.books.put(recordToSave);
  return recordToSave;
}

export async function updateBookQuickStatus(
  bookId: string,
  newStatus: Book['progreso']
): Promise<void> {
  const book = await db.books.get(bookId);
  if (!book) return;

  const today = new Date().toISOString().slice(0, 10);
  let fechaInicio = book.fechaInicio;
  let fechaFin = book.fechaFin;

  if (newStatus === '⏳ Leyendo' && !fechaInicio) {
    fechaInicio = today;
  }
  if (newStatus === '✅ Leído' && !fechaFin) {
    fechaFin = today;
  }

  const tiempoLectura = calculateReadingTimeLabel(fechaInicio, fechaFin, book.tiempoLectura);
  const updatedBook: Book = {
    ...book,
    progreso: newStatus,
    fechaInicio,
    fechaFin,
    tiempoLectura,
    updatedAt: new Date().toISOString()
  };

  const user = await getActiveUser();
  if (user) {
    await upsertBookToSupabase(user.id, updatedBook);
  }

  await db.books.put(updatedBook);
}

export async function updateBookQuickRating(
  bookId: string,
  puntuacion: Book['puntuacion']
): Promise<void> {
  const book = await db.books.get(bookId);
  if (!book) return;

  const updatedBook: Book = {
    ...book,
    puntuacion,
    updatedAt: new Date().toISOString()
  };

  const user = await getActiveUser();
  if (user) {
    await upsertBookToSupabase(user.id, updatedBook);
  }

  await db.books.put(updatedBook);
}

export async function assignBookToSagaRecord(
  bookId: string,
  saga: Saga,
  volumen: number | null
): Promise<void> {
  const book = await db.books.get(bookId);
  if (!book) return;

  const updatedBook: Book = {
    ...book,
    sagaId: saga.id,
    sagaNombre: saga.nombre,
    volumen,
    updatedAt: new Date().toISOString()
  };

  const user = await getActiveUser();
  if (user) {
    await upsertBookToSupabase(user.id, updatedBook);
  }

  await db.books.put(updatedBook);
}

export async function updateBookPartialRecord(
  bookId: string,
  changes: Partial<Book>
): Promise<void> {
  const book = await db.books.get(bookId);
  if (!book) return;

  const updatedBook: Book = {
    ...book,
    ...changes,
    id: book.id,
    updatedAt: new Date().toISOString()
  };

  const user = await getActiveUser();
  if (user) {
    await upsertBookToSupabase(user.id, updatedBook);
  }

  await db.books.put(updatedBook);
}

export async function deleteBookRecord(bookId: string): Promise<void> {
  const user = await getActiveUser();
  if (user) {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)
      .eq('user_id', user.id);
    if (error) {
      throw new Error(`Error al eliminar el libro en Supabase: ${error.message}`);
    }
    removeBookIdFromSyncedCache(user.id, bookId);
  }
  await db.books.delete(bookId);
}

export async function upsertSaga(
  nombre: string,
  descripcion: string,
  sagaId?: string
): Promise<Saga> {
  const cleanName = nombre.trim();
  if (!cleanName) {
    throw new Error('El nombre de la saga es obligatorio.');
  }

  const allSagas = await db.sagas.toArray();
  const duplicate = allSagas.find(
    (s) => normalizeText(s.nombre) === normalizeText(cleanName) && s.id !== sagaId
  );
  if (duplicate) {
    throw new Error('Ya existe una saga registrada con el nombre "' + duplicate.nombre + '".');
  }

  const now = new Date().toISOString();
  const user = await getActiveUser();

  if (sagaId) {
    const validSagaId = ensureValidUuid(sagaId);
    const existing = await db.sagas.get(sagaId);
    const updated: Saga = {
      id: validSagaId,
      nombre: cleanName,
      descripcion: descripcion.trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    if (user) {
      await upsertSagaToSupabase(user.id, updated);
    }
    await db.sagas.put(updated);

    const linkedBooks = await db.books.where('sagaId').equals(validSagaId).toArray();
    for (const b of linkedBooks) {
      const updatedBook: Book = {
        ...b,
        sagaNombre: cleanName,
        updatedAt: now
      };
      if (user) {
        await upsertBookToSupabase(user.id, updatedBook);
      }
      await db.books.put(updatedBook);
    }

    return updated;
  }

  const created: Saga = {
    id: crypto.randomUUID(),
    nombre: cleanName,
    descripcion: descripcion.trim(),
    createdAt: now,
    updatedAt: now
  };

  if (user) {
    await upsertSagaToSupabase(user.id, created);
  }
  await db.sagas.put(created);
  return created;
}

export async function deleteSagaAndUnlinkBooks(sagaId: string): Promise<void> {
  const user = await getActiveUser();
  const now = new Date().toISOString();
  const linkedBooks = await db.books.where('sagaId').equals(sagaId).toArray();

  for (const b of linkedBooks) {
    const unlinkedBook: Book = {
      ...b,
      sagaId: null,
      sagaNombre: '',
      volumen: null,
      updatedAt: now
    };
    if (user) {
      await upsertBookToSupabase(user.id, unlinkedBook);
    }
    await db.books.put(unlinkedBook);
  }

  if (user) {
    const { error } = await supabase
      .from('sagas')
      .delete()
      .eq('id', sagaId)
      .eq('user_id', user.id);
    if (error) {
      throw new Error(`Error al eliminar la saga en Supabase: ${error.message}`);
    }
    removeSagaIdFromSyncedCache(user.id, sagaId);
  }

  await db.sagas.delete(sagaId);
}

export async function restoreBackupPayload(
  backup: BackupPayload
): Promise<{ addedBooks: number; skippedDuplicates: number }> {
  let addedBooks = 0;
  let skippedDuplicates = 0;
  const user = await getActiveUser();

  const existingSagas = await db.sagas.toArray();
  const sagaByNormName = new Map<string, Saga>(
    existingSagas.map((s) => [normalizeText(s.nombre), s])
  );
  const sagaIdMap = new Map<string, Saga>();

  for (const saga of backup.sagas) {
    const validId = ensureValidUuid(saga.id);
    const normName = normalizeText(saga.nombre);
    const alreadyByName = sagaByNormName.get(normName);

    if (alreadyByName) {
      sagaIdMap.set(saga.id, alreadyByName);
      continue;
    }

    const existsById = await db.sagas.get(validId);
    if (existsById) {
      sagaIdMap.set(saga.id, existsById);
      continue;
    }

    const cleanSaga: Saga = {
      ...saga,
      id: validId,
      createdAt: saga.createdAt || new Date().toISOString(),
      updatedAt: saga.updatedAt || new Date().toISOString()
    };

    if (user) {
      await upsertSagaToSupabase(user.id, cleanSaga);
    }
    await db.sagas.put(cleanSaga);
    sagaByNormName.set(normName, cleanSaga);
    sagaIdMap.set(saga.id, cleanSaga);
  }

  const currentBooks = await db.books.toArray();
  for (const b of backup.books) {
    const validId = ensureValidUuid(b.id);
    const alreadyById = currentBooks.some((cb) => cb.id === validId);
    const dupCheck = isDuplicateBook(
      { nombre: b.nombre, autor: b.autor, isbn: b.isbn },
      currentBooks
    );

    if (alreadyById || dupCheck.duplicate) {
      skippedDuplicates++;
      continue;
    }

    let resolvedSagaId = b.sagaId ? ensureValidUuid(b.sagaId) : null;
    let resolvedSagaNombre = b.sagaNombre || '';
    if (b.sagaId && sagaIdMap.has(b.sagaId)) {
      const mapped = sagaIdMap.get(b.sagaId)!;
      resolvedSagaId = mapped.id;
      resolvedSagaNombre = mapped.nombre;
    }

    const cleanBook: Book = {
      ...b,
      id: validId,
      sagaId: resolvedSagaId,
      sagaNombre: resolvedSagaNombre,
      createdAt: b.createdAt || new Date().toISOString(),
      updatedAt: b.updatedAt || new Date().toISOString()
    };

    if (user) {
      await upsertBookToSupabase(user.id, cleanBook);
    }
    await db.books.put(cleanBook);
    currentBooks.push(cleanBook);
    addedBooks++;
  }

  return { addedBooks, skippedDuplicates };
}
