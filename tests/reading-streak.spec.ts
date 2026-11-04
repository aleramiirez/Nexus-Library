import { test, expect } from '@playwright/test';

test.describe('Fase 2: Racha Diaria de Lectura y Mapa de Calor', () => {
  test('permite registrar lectura diaria con botón ceremonial y visualiza el mapa de calor anual', async ({
    page
  }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Verificar que el widget de racha está visible en el inicio
    const streakTitle = page.getByText(/Hábito y Racha de Lectura/i).first();
    await expect(streakTitle).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Racha actual/i).first()).toBeVisible();
    await expect(page.getByText(/Hitos/i).first()).toBeVisible();

    // 3. Probar pulsar "Marcar que he leído hoy" si aún no está registrada la lectura
    const checkInBtn = page.getByRole('button', { name: /Marcar que he leído hoy/i }).first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await expect(page.getByText(/La llama sigue encendida/i).first()).toBeVisible({ timeout: 8000 });
    } else {
      await expect(page.getByText(/La llama sigue encendida/i).first()).toBeVisible();
    }

    // 4. Navegar a Estadísticas y Reto
    const statsNavBtn = page.getByRole('button', { name: /Reto & Estadísticas|Reto de Lectura/i }).first();
    if (await statsNavBtn.isVisible()) {
      await statsNavBtn.click();
      // Verificar que el mapa de calor anual completo se visualiza
      await expect(page.getByText(/Mapa de Calor de Lectura Anual/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Días con lectura/i).first()).toBeVisible();
    }
  });

  test('incluye libros pausados y lecturas activas en la racha continua retroactiva', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Inyectar un libro pausado (25 al 29 de octubre) y un libro en lectura (30 de octubre a hoy)
    await page.evaluate(async () => {
      const openReq = indexedDB.open('NexusLibraryDatabase');
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        openReq.onsuccess = () => resolve(openReq.result);
        openReq.onerror = () => reject(openReq.error);
      });

      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');

      const book1 = {
        id: 'test-paused-book',
        nombre: 'Libro Pausado Test',
        autor: 'Autor Test',
        genero: '✨ Fantasía',
        subgeneros: [],
        fechaPublicacion: 2020,
        paginas: 300,
        paginaActual: 100,
        puntuacion: null,
        progreso: '⏸️ Pausado',
        sagaId: null,
        sagaNombre: '',
        volumen: null,
        fechaInicio: '2026-10-25',
        fechaFin: '2026-10-29',
        lecturaVirtual: '',
        tiempoLectura: '',
        isbn: '1234567890123',
        editorial: '',
        idioma: 'Español',
        edicion: '',
        sinopsis: '',
        portadaUrl: '',
        portadaFallbackUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const book2 = {
        id: 'test-reading-book',
        nombre: 'Juego de Tronos Test',
        autor: 'George R.R. Martin',
        genero: '✨ Fantasía',
        subgeneros: [],
        fechaPublicacion: 1996,
        paginas: 800,
        paginaActual: 375,
        puntuacion: null,
        progreso: '⏳ Leyendo',
        sagaId: null,
        sagaNombre: '',
        volumen: null,
        fechaInicio: '2026-10-30',
        fechaFin: '',
        lecturaVirtual: '',
        tiempoLectura: '',
        isbn: '9876543210987',
        editorial: '',
        idioma: 'Español',
        edicion: '',
        sinopsis: '',
        portadaUrl: '',
        portadaFallbackUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.put(book1);
      store.put(book2);

      await new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const guestBtnAfterReload = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtnAfterReload).toBeVisible({ timeout: 10000 });
    await guestBtnAfterReload.click();

    // Esperar a que el dashboard cargue
    await expect(page.getByText(/Hábito y Racha de Lectura/i).first()).toBeVisible({ timeout: 10000 });

    // Verificar que la racha actual reconoce la suma continua de ambos (11 días)
    await expect(page.getByText(/11\s*días/i).first()).toBeVisible({ timeout: 10000 });

    // Verificar que el cambio de mes a noviembre muestra la etiqueta 'NOV'
    await expect(page.locator('.nx-streak-mo', { hasText: 'NOV' })).toBeVisible();

    // Verificar que el sello 'HOY' está en el día actual local (día 4)
    const todayCell = page.locator('.nx-streak-d.t');
    await expect(todayCell.locator('.nx-streak-tg')).toHaveText('HOY');
    await expect(todayCell.locator('.nx-streak-s')).toHaveText(new Date().getDate().toString());

    // Verificar que el día 29 de octubre tiene lecturas asignadas del libro pausado (20 p)
    const day29Cell = page.locator('.nx-streak-d').filter({ has: page.locator('[aria-label*="29 de octubre"]') });
    await expect(day29Cell.locator('.nx-streak-pg')).toHaveText('20 p');
  });
});
