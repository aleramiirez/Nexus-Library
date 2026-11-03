import { test, expect } from '@playwright/test';

test.describe('Persistencia Local-First y Sincronización', () => {
  test('persiste datos en IndexedDB (Dexie) de forma reactiva y soberana', async ({ page }) => {
    // 1. Entrar en modo invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Comprobar que IndexedDB ("NexusLibraryDatabase") se inicializa correctamente
    const isIndexedDBInitialized = await page.evaluate(async () => {
      return new Promise<boolean>((resolve) => {
        const req = indexedDB.open('NexusLibraryDatabase');
        req.onsuccess = () => {
          const db = req.result;
          const hasBooks = db.objectStoreNames.contains('books');
          const hasSagas = db.objectStoreNames.contains('sagas');
          db.close();
          resolve(hasBooks && hasSagas);
        };
        req.onerror = () => resolve(false);
      });
    });

    expect(isIndexedDBInitialized).toBe(true);

    // 3. Navegar a la biblioteca y crear un libro
    const libraryNavBtn = page.getByRole('button', { name: /Mi Biblioteca/i }).first();
    await expect(libraryNavBtn).toBeVisible({ timeout: 15000 });
    await libraryNavBtn.click();

    const addBookBtn = page.getByRole('button', { name: /Añadir.*libro/i }).first();
    await addBookBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const titleInput = page.locator('input[required]').first();
    await titleInput.fill('El Temor de un Hombre Sabio');

    const submitBtn = page.getByRole('button', { name: /Añadir a mi biblioteca/i });
    await submitBtn.click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // 4. Verificar que el libro quedó registrado en la tabla 'books' de Dexie
    const storedBooksCount = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        const req = indexedDB.open('NexusLibraryDatabase');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('books', 'readonly');
          const store = tx.objectStore('books');
          const countReq = store.count();
          countReq.onsuccess = () => {
            db.close();
            resolve(countReq.result);
          };
          countReq.onerror = () => {
            db.close();
            resolve(0);
          };
        };
        req.onerror = () => resolve(0);
      });
    });

    expect(storedBooksCount).toBeGreaterThanOrEqual(1);
  });
});
