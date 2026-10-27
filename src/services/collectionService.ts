import { supabase } from './supabaseClient';
import { CustomCollection, LentRecord } from '../types/models';

const COLLECTIONS_KEY_PREFIX = 'nexus_custom_collections_';
const COLLECTIONS_GLOBAL_BACKUP_KEY = 'nexus_custom_collections_global_backup';
const LENT_KEY_PREFIX = 'nexus_lent_records_';

class CollectionService {
  private listeners: Set<() => void> = new Set();

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in collectionService listener:', err);
      }
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus_collections_updated'));
    }
  }
  private getCollectionsStorageKey(userId?: string): string {
    return `${COLLECTIONS_KEY_PREFIX}${userId && userId.trim() ? userId.trim() : 'local'}`;
  }

  private getLentStorageKey(userId?: string): string {
    return `${LENT_KEY_PREFIX}${userId && userId.trim() ? userId.trim() : 'local'}`;
  }

  // ─── Colecciones Personalizadas (Custom Shelves) ───

  public getCollections(userId?: string): CustomCollection[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const userKey = this.getCollectionsStorageKey(userId);
      let raw = localStorage.getItem(userKey);

      // Si el usuario tiene sesión activa pero su clave específica está vacía,
      // comprobamos si existen colecciones creadas como 'local' o en el backup global y las migramos.
      if (!raw && userId && userId.trim()) {
        const localRaw = localStorage.getItem(`${COLLECTIONS_KEY_PREFIX}local`);
        const backupRaw = localStorage.getItem(COLLECTIONS_GLOBAL_BACKUP_KEY);
        const fallbackRaw = localRaw || backupRaw;
        if (fallbackRaw) {
          raw = fallbackRaw;
          try {
            localStorage.setItem(userKey, fallbackRaw);
          } catch {}
        }
      }

      // Si aún no hay datos, intentar recuperar del backup global
      if (!raw) {
        raw = localStorage.getItem(COLLECTIONS_GLOBAL_BACKUP_KEY);
      }

      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((c) => ({
          ...c,
          bookIds: Array.isArray(c.bookIds) ? c.bookIds : []
        }));
      }
      return [];
    } catch (e) {
      console.warn('Error reading collections from localStorage:', e);
      return [];
    }
  }

  public getCollection(id: string, userId?: string): CustomCollection | null {
    const list = this.getCollections(userId);
    return list.find((c) => c.id === id) || null;
  }

  public saveCollections(collections: CustomCollection[], userId?: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload = JSON.stringify(collections);
      localStorage.setItem(this.getCollectionsStorageKey(userId), payload);
      // Guardar también copia de seguridad global local
      localStorage.setItem(COLLECTIONS_GLOBAL_BACKUP_KEY, payload);
      this.notify();

      // Sincronizar en segundo plano con Supabase si hay sesión
      this.syncToCloud(collections, userId).catch(() => {});
    } catch (e) {
      console.error('Error saving collections to localStorage:', e);
    }
  }

  /**
   * Guarda las colecciones en Supabase Auth (user_metadata)
   * para que persistan entre ramas, dominios de Vercel y diferentes navegadores.
   */
  public async syncToCloud(collections: CustomCollection[], userId?: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (userId && user.id !== userId) return;

      await supabase.auth.updateUser({
        data: {
          custom_collections: collections
        }
      });
    } catch (e) {
      console.warn('Could not sync collections to Supabase user_metadata:', e);
    }
  }

  /**
   * Descarga y fusiona las colecciones desde Supabase al iniciar sesión o cargar la app.
   */
  public async syncFromCloud(userId?: string): Promise<CustomCollection[]> {
    if (typeof window === 'undefined') return [];
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return this.getCollections(userId);
      if (userId && user.id !== userId) return this.getCollections(userId);

      const remoteCollections = user.user_metadata?.custom_collections;
      if (Array.isArray(remoteCollections) && remoteCollections.length > 0) {
        const localCollections = this.getCollections(user.id);

        const map = new Map<string, CustomCollection>();
        for (const col of localCollections) {
          map.set(col.id, col);
        }
        for (const col of remoteCollections) {
          if (!map.has(col.id)) {
            map.set(col.id, col);
          } else {
            const existing = map.get(col.id)!;
            const existingTime = new Date(existing.updatedAt || 0).getTime();
            const remoteTime = new Date(col.updatedAt || 0).getTime();
            if (remoteTime >= existingTime) {
              map.set(col.id, col);
            }
          }
        }

        const merged = Array.from(map.values());
        const payload = JSON.stringify(merged);
        const userKey = this.getCollectionsStorageKey(user.id);
        localStorage.setItem(userKey, payload);
        localStorage.setItem(COLLECTIONS_GLOBAL_BACKUP_KEY, payload);
        this.notify();
        return merged;
      } else {
        // Si el usuario remoto aún no tiene colecciones pero localmente sí tenemos,
        // sincronizamos las locales hacia la nube automáticamente.
        const localCollections = this.getCollections(user.id);
        if (localCollections.length > 0) {
          this.syncToCloud(localCollections, user.id).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Could not sync collections from Supabase:', e);
    }
    return this.getCollections(userId);
  }

  public createCollection(
    data: {
      nombre: string;
      descripcion?: string;
      icono?: string;
      color?: string;
      initialBookIds?: string[];
    },
    userId?: string
  ): CustomCollection {
    const collections = this.getCollections(userId);
    const now = new Date().toISOString();
    const newCollection: CustomCollection = {
      id: crypto.randomUUID(),
      nombre: data.nombre.trim(),
      descripcion: data.descripcion ? data.descripcion.trim() : '',
      icono: data.icono || 'Bookmark',
      color: data.color || 'amber',
      bookIds: data.initialBookIds || [],
      createdAt: now,
      updatedAt: now
    };

    collections.unshift(newCollection);
    this.saveCollections(collections, userId);
    return newCollection;
  }

  public updateCollection(
    id: string,
    data: Partial<Omit<CustomCollection, 'id' | 'createdAt'>>,
    userId?: string
  ): CustomCollection | null {
    const collections = this.getCollections(userId);
    const index = collections.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const existing = collections[index];
    const updated: CustomCollection = {
      ...existing,
      ...data,
      nombre: data.nombre !== undefined ? data.nombre.trim() : existing.nombre,
      descripcion: data.descripcion !== undefined ? (data.descripcion || '').trim() : existing.descripcion,
      updatedAt: new Date().toISOString()
    };

    collections[index] = updated;
    this.saveCollections(collections, userId);
    return updated;
  }

  public deleteCollection(id: string, userId?: string): boolean {
    const collections = this.getCollections(userId);
    const filtered = collections.filter((c) => c.id !== id);
    if (filtered.length !== collections.length) {
      this.saveCollections(filtered, userId);
      return true;
    }
    return false;
  }

  public addBookToCollection(collectionId: string, bookId: string, userId?: string): boolean {
    const collections = this.getCollections(userId);
    const target = collections.find((c) => c.id === collectionId);
    if (!target) return false;

    if (!target.bookIds.includes(bookId)) {
      target.bookIds.push(bookId);
      target.updatedAt = new Date().toISOString();
      this.saveCollections(collections, userId);
      return true;
    }
    return false;
  }

  public removeBookFromCollection(collectionId: string, bookId: string, userId?: string): boolean {
    const collections = this.getCollections(userId);
    const target = collections.find((c) => c.id === collectionId);
    if (!target) return false;

    const initialLen = target.bookIds.length;
    target.bookIds = target.bookIds.filter((id) => id !== bookId);
    if (target.bookIds.length !== initialLen) {
      target.updatedAt = new Date().toISOString();
      this.saveCollections(collections, userId);
      return true;
    }
    return false;
  }

  public toggleBookInCollection(collectionId: string, bookId: string, userId?: string): boolean {
    const collections = this.getCollections(userId);
    const target = collections.find((c) => c.id === collectionId);
    if (!target) return false;

    if (target.bookIds.includes(bookId)) {
      target.bookIds = target.bookIds.filter((id) => id !== bookId);
    } else {
      target.bookIds.push(bookId);
    }
    target.updatedAt = new Date().toISOString();
    this.saveCollections(collections, userId);
    return target.bookIds.includes(bookId);
  }

  public getCollectionsForBook(bookId: string, userId?: string): CustomCollection[] {
    const collections = this.getCollections(userId);
    return collections.filter((c) => c.bookIds.includes(bookId));
  }

  public setBookCollections(bookId: string, selectedCollectionIds: string[], userId?: string): void {
    const collections = this.getCollections(userId);
    const selectedSet = new Set(selectedCollectionIds);
    let changed = false;

    for (const c of collections) {
      const contains = c.bookIds.includes(bookId);
      const shouldContain = selectedSet.has(c.id);

      if (shouldContain && !contains) {
        c.bookIds.push(bookId);
        c.updatedAt = new Date().toISOString();
        changed = true;
      } else if (!shouldContain && contains) {
        c.bookIds = c.bookIds.filter((id) => id !== bookId);
        c.updatedAt = new Date().toISOString();
        changed = true;
      }
    }

    if (changed) {
      this.saveCollections(collections, userId);
    }
  }

  public removeBookFromAllCollections(bookId: string, userId?: string): void {
    const collections = this.getCollections(userId);
    let changed = false;

    for (const c of collections) {
      if (c.bookIds.includes(bookId)) {
        c.bookIds = c.bookIds.filter((id) => id !== bookId);
        c.updatedAt = new Date().toISOString();
        changed = true;
      }
    }

    if (changed) {
      this.saveCollections(collections, userId);
    }
  }

  // ─── Registro de Libros Prestados (Lending Ledger) ───

  public getLentRecords(userId?: string): LentRecord[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(this.getLentStorageKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Error reading lent records from localStorage:', e);
      return [];
    }
  }

  public saveLentRecords(records: LentRecord[], userId?: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(this.getLentStorageKey(userId), JSON.stringify(records));
    } catch (e) {
      console.error('Error saving lent records to localStorage:', e);
    }
  }

  public getActiveLentRecordForBook(bookId: string, userId?: string): LentRecord | null {
    const records = this.getLentRecords(userId);
    return records.find((r) => r.bookId === bookId && !r.returned) || null;
  }

  public lendBook(
    data: {
      bookId: string;
      borrowerName: string;
      borrowDate?: string;
      expectedReturnDate?: string;
      notes?: string;
    },
    userId?: string
  ): LentRecord {
    const records = this.getLentRecords(userId);
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const newRecord: LentRecord = {
      id: crypto.randomUUID(),
      bookId: data.bookId,
      borrowerName: data.borrowerName.trim(),
      borrowDate: data.borrowDate || today,
      expectedReturnDate: data.expectedReturnDate || '',
      returned: false,
      notes: (data.notes || '').trim(),
      createdAt: now,
      updatedAt: now
    };

    records.unshift(newRecord);
    this.saveLentRecords(records, userId);
    return newRecord;
  }

  public returnBook(recordId: string, returnedDate?: string, userId?: string): LentRecord | null {
    const records = this.getLentRecords(userId);
    const target = records.find((r) => r.id === recordId);
    if (!target) return null;

    target.returned = true;
    target.returnedDate = returnedDate || new Date().toISOString().slice(0, 10);
    target.updatedAt = new Date().toISOString();

    this.saveLentRecords(records, userId);
    return target;
  }

  public deleteLentRecord(recordId: string, userId?: string): boolean {
    const records = this.getLentRecords(userId);
    const filtered = records.filter((r) => r.id !== recordId);
    if (filtered.length !== records.length) {
      this.saveLentRecords(filtered, userId);
      return true;
    }
    return false;
  }

  public removeBookLentRecords(bookId: string, userId?: string): void {
    const records = this.getLentRecords(userId);
    const filtered = records.filter((r) => r.bookId !== bookId);
    if (filtered.length !== records.length) {
      this.saveLentRecords(filtered, userId);
    }
  }

  // ─── Exportación e Importación para Copia de Seguridad ───

  public exportData(userId?: string): { collections: CustomCollection[]; lentRecords: LentRecord[] } {
    return {
      collections: this.getCollections(userId),
      lentRecords: this.getLentRecords(userId)
    };
  }

  public importData(
    data: { collections?: CustomCollection[]; lentRecords?: LentRecord[] },
    userId?: string
  ): { importedCollections: number; importedLentRecords: number } {
    let importedCollections = 0;
    let importedLentRecords = 0;

    if (Array.isArray(data.collections) && data.collections.length > 0) {
      const current = this.getCollections(userId);
      const currentIds = new Set(current.map((c) => c.id));
      const toAdd = data.collections.filter((c) => c && c.id && !currentIds.has(c.id));
      if (toAdd.length > 0) {
        this.saveCollections([...current, ...toAdd], userId);
        importedCollections = toAdd.length;
      }
    }

    if (Array.isArray(data.lentRecords) && data.lentRecords.length > 0) {
      const current = this.getLentRecords(userId);
      const currentIds = new Set(current.map((r) => r.id));
      const toAdd = data.lentRecords.filter((r) => r && r.id && !currentIds.has(r.id));
      if (toAdd.length > 0) {
        this.saveLentRecords([...current, ...toAdd], userId);
        importedLentRecords = toAdd.length;
      }
    }

    return { importedCollections, importedLentRecords };
  }
}

export const collectionService = new CollectionService();
