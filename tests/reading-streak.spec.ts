import { test, expect } from '@playwright/test';

test.describe('Fase 2: Racha Diaria de Lectura y Registro Día a Día', () => {
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

  test('un libro antiguo con fechaInicio y fechaFin NO inventa días en la racha si no tiene logs reales', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Inyectar un libro completado con fechaInicio y fechaFin antiguas pero SIN logs en localStorage
    await page.evaluate(async () => {
      // Limpiar logs reales
      localStorage.removeItem('nexus_reading_streak_logs_v1');

      const openReq = indexedDB.open('NexusLibraryDatabase');
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        openReq.onsuccess = () => resolve(openReq.result);
        openReq.onerror = () => reject(openReq.error);
      });

      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');

      const oldBook = {
        id: 'test-old-finished-book',
        nombre: 'Cien Años de Soledad Antiguo',
        autor: 'Gabriel García Márquez',
        genero: '✨ Fantasía',
        subgeneros: [],
        fechaPublicacion: 1967,
        paginas: 471,
        paginaActual: 471,
        puntuacion: 5,
        progreso: '✅ Leído',
        sagaId: null,
        sagaNombre: '',
        volumen: null,
        fechaInicio: '2026-08-01',
        fechaFin: '2026-08-25',
        lecturaVirtual: '',
        tiempoLectura: '24 días',
        isbn: '9780307474728',
        editorial: '',
        idioma: 'Español',
        edicion: '',
        sinopsis: '',
        portadaUrl: '',
        portadaFallbackUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      store.put(oldBook);

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

    // Verificar que NO inventa días activos en 2026 a partir de las fechas del libro (debe mostrar 0 días activos)
    await expect(page.getByText(/0 días activos en 2026/i)).toBeVisible({ timeout: 10000 });

    // La racha actual debe ser 0 días
    const streakNum = page.locator('.nx-streak-num').first();
    await expect(streakNum).toContainText('0');
  });

  test('actualizar la barra de progreso suma exactamente el delta de páginas en el día actual', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    const calculationResult = await page.evaluate(async () => {
      const streakModule = await import('../src/services/readingStreakService');
      const service = streakModule.readingStreakService;

      // Limpiar racha para prueba pura
      service.clearAllReadingStreakLogs();

      const today = streakModule.getTodayLocalDateString();
      const tomorrow = '2026-11-06';

      // 1. Hoy avanzo de la pág 0 a la 20
      service.recordReadingProgress('book-exact-1', 0, 20, today);
      const step1TodayPages = service.getExportData().logs[today]?.pagesRead;

      // 2. Hoy mismo subo de la 20 a la 35
      service.recordReadingProgress('book-exact-1', 20, 35, today);
      const step2TodayPages = service.getExportData().logs[today]?.pagesRead;

      // 3. Me equivoqué y bajo de la 35 a la 20
      service.recordReadingProgress('book-exact-1', 35, 20, today);
      const step3TodayPages = service.getExportData().logs[today]?.pagesRead;

      // 4. Mañana subo de la 20 a la 70
      service.recordReadingProgress('book-exact-1', 20, 70, tomorrow);
      const step4TodayPages = service.getExportData().logs[today]?.pagesRead;
      const step4TomorrowPages = service.getExportData().logs[tomorrow]?.pagesRead;

      return {
        step1TodayPages,
        step2TodayPages,
        step3TodayPages,
        step4TodayPages,
        step4TomorrowPages
      };
    });

    // Validar resultados paso a paso
    expect(calculationResult.step1TodayPages).toBe(20);
    expect(calculationResult.step2TodayPages).toBe(35);
    expect(calculationResult.step3TodayPages).toBe(20);
    expect(calculationResult.step4TodayPages).toBe(20);
    expect(calculationResult.step4TomorrowPages).toBe(50); // 70 - 20 = 50
  });

  test('hacer clic en un día del calendario del widget permite editar manualmente las páginas de ese día', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Esperar al widget de racha
    await expect(page.getByText(/Hábito y Racha de Lectura/i).first()).toBeVisible({ timeout: 10000 });

    // Localizar la celda de HOY en el widget
    const todaySeal = page.locator('.nx-streak-d.t .nx-streak-s').first();
    await expect(todaySeal).toBeVisible({ timeout: 8000 });

    // Hacer clic en el sello para desplegar el editor manual
    await todaySeal.click();

    // Verificar que el editor inline aparece
    const editorBox = page.locator('.nx-streak-editor-box');
    await expect(editorBox).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/📅.*·/)).toBeVisible();

    // Escribir 42 páginas en el input
    const input = page.locator('#manual-day-pages-input');
    await expect(input).toBeVisible();
    await input.fill('42');

    // Pulsar Guardar
    const saveBtn = editorBox.getByRole('button', { name: 'Guardar' });
    await saveBtn.click();

    // El editor se cierra
    await expect(editorBox).not.toBeVisible();

    // La celda de hoy ahora muestra 42 p
    const todayCell = page.locator('.nx-streak-d.t');
    await expect(todayCell.locator('.nx-streak-pg')).toHaveText('42 p');

    // Reabrir y probar botón Borrar día
    await todaySeal.click();
    await expect(editorBox).toBeVisible();
    const deleteBtn = editorBox.getByRole('button', { name: /Borrar día/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // El editor se cierra y la celda vuelve a no tener páginas
    await expect(editorBox).not.toBeVisible();
    await expect(todayCell.locator('.nx-streak-pg')).toHaveText('');
  });
});
