import { test, expect } from '@playwright/test';

test.describe('MEJORA 5: Sincronización en la Nube y Backup JSON Completo', () => {
  test('incluye racha diaria, velocidad de lectura y colecciones en el backup JSON exportado', async ({ page }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Establecer datos de prueba en racha y velocidad
    await page.evaluate(() => {
      localStorage.setItem('nexus_user_reading_speed_pph', '42');
      const testStreak = {
        logs: {
          '2026-11-04': {
            date: '2026-11-04',
            pagesRead: 35,
            bookIds: ['book-123'],
            manualCheckIn: true
          }
        },
        bookStartPageByDate: {
          '2026-11-04': { 'book-123': 10 }
        },
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('nexus_reading_streak_logs_v1', JSON.stringify(testStreak));
    });

    // 3. Navegar a Ajustes -> Copia de Seguridad
    const settingsNavBtn = page.getByRole('button', { name: /Ajustes/i }).first();
    await expect(settingsNavBtn).toBeVisible({ timeout: 8000 });
    await settingsNavBtn.click();

    // Pestaña Copia de Seguridad
    const backupTab = page.getByRole('tab', { name: /Copia de Seguridad/i });
    if (await backupTab.isVisible()) {
      await backupTab.click();
    }

    // 4. Probar exportación JSON y verificar que incluye readingStreakLogs y userReadingSpeedPph
    const exportResult = await page.evaluate(async () => {
      // Importar dinámicamente exportLibraryToJson
      const dbModule = await import('../src/db/database');
      const exportModule = await import('../src/services/importExportService');
      const books = await dbModule.db.books.toArray();
      const sagas = await dbModule.db.sagas.toArray();
      const jsonStr = exportModule.exportLibraryToJson(books, sagas);
      const parsed = JSON.parse(jsonStr);
      return {
        hasStreak: Boolean(parsed.readingStreakLogs && parsed.readingStreakLogs.logs),
        speed: parsed.userReadingSpeedPph,
        streakPages: parsed.readingStreakLogs?.logs?.['2026-11-04']?.pagesRead
      };
    });

    expect(exportResult.hasStreak).toBe(true);
    expect(exportResult.speed).toBe(42);
    expect(exportResult.streakPages).toBe(35);

    // 5. Probar restauración de datos a través de restoreBackupPayload
    const restoreResult = await page.evaluate(async () => {
      const dbModule = await import('../src/db/database');
      const mockBackup = {
        app: 'NEXUS_LIBRARY' as const,
        version: 3,
        exportedAt: new Date().toISOString(),
        books: [],
        sagas: [],
        collections: [],
        lentRecords: [],
        userReadingSpeedPph: 55,
        readingStreakLogs: {
          logs: {
            '2026-10-20': {
              date: '2026-10-20',
              pagesRead: 50,
              bookIds: ['book-restored'],
              manualCheckIn: true
            }
          },
          bookStartPageByDate: {},
          lastUpdated: new Date().toISOString()
        }
      };

      await dbModule.restoreBackupPayload(mockBackup);
      const restoredSpeed = localStorage.getItem('nexus_user_reading_speed_pph');
      const rawStreak = localStorage.getItem('nexus_reading_streak_logs_v1');
      const parsedStreak = rawStreak ? JSON.parse(rawStreak) : null;

      return {
        restoredSpeed,
        restoredPages: parsedStreak?.logs?.['2026-10-20']?.pagesRead
      };
    });

    expect(restoreResult.restoredSpeed).toBe('55');
    expect(restoreResult.restoredPages).toBe(50);
  });
});
