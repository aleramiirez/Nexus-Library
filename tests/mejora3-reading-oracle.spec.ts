import { test, expect } from '@playwright/test';

test.describe('MEJORA 3: El Oráculo del Archivo (¿Qué leo ahora?)', () => {
  test('permite consultar al oráculo con distintos filtros y comenzar lectura', async ({ page }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Cargar libros de muestra si aplica
    const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
    if (await sampleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sampleBtn.click();
      await page.waitForTimeout(1200);
    }

    // 3. Navegar a Mi Biblioteca y abrir el Oráculo
    const libraryNavBtn = page.getByRole('button', { name: /Mi Biblioteca/i }).first();
    await libraryNavBtn.click();

    const oracleBtn = page.getByRole('button', { name: /El Oráculo del Archivo/i });
    await expect(oracleBtn).toBeVisible({ timeout: 10000 });
    await oracleBtn.click();

    // 4. Verificar modal del Oráculo
    const oracleModal = page.getByRole('dialog', { name: /El Oráculo del Archivo/i });
    await expect(oracleModal).toBeVisible({ timeout: 8000 });

    // Probar los botones de criterio
    const quickTab = oracleModal.getByRole('button', { name: /Lectura rápida/i });
    await expect(quickTab).toBeVisible();
    await quickTab.click();
    await page.waitForTimeout(500);

    const countryTab = oracleModal.getByRole('button', { name: /Nuevo país/i });
    await expect(countryTab).toBeVisible();
    await countryTab.click();
    await page.waitForTimeout(500);

    const sagaTab = oracleModal.getByRole('button', { name: /Continuar saga/i });
    await expect(sagaTab).toBeVisible();
    await sagaTab.click();
    await page.waitForTimeout(500);

    const allTab = oracleModal.getByRole('button', { name: /Puro azar/i });
    await expect(allTab).toBeVisible();
    await allTab.click();
    await page.waitForTimeout(500);

    // Botón preguntar de nuevo
    const rollAgainBtn = oracleModal.getByRole('button', { name: /Preguntar de nuevo/i });
    await expect(rollAgainBtn).toBeVisible();
    await rollAgainBtn.click();
    await page.waitForTimeout(600);

    // Comenzar a leer ahora
    const startReadingBtn = oracleModal.getByRole('button', { name: /Comenzar a leer ahora/i });
    if (await startReadingBtn.isVisible()) {
      await startReadingBtn.click();
      // Debe cerrar el oráculo y abrir el temporizador de sesión de lectura
      await expect(oracleModal).not.toBeVisible({ timeout: 5000 });
      const sessionModal = page.getByRole('dialog', { name: /Sesión de Lectura en Vivo/i });
      await expect(sessionModal).toBeVisible({ timeout: 8000 });
    }
  });

  test('permite abrir el oráculo también desde Mi Biblioteca', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Navegar a Mi Biblioteca
    const libraryNavBtn = page.getByRole('button', { name: /Mi Biblioteca/i }).first();
    await libraryNavBtn.click();

    // Botón del Oráculo en la barra de herramientas de la biblioteca
    const oracleToolbarBtn = page.getByRole('button', { name: /El Oráculo del Archivo/i });
    await expect(oracleToolbarBtn).toBeVisible({ timeout: 8000 });
    await oracleToolbarBtn.click();

    const oracleModal = page.getByRole('dialog', { name: /El Oráculo del Archivo/i });
    await expect(oracleModal).toBeVisible();

    // Cerrar con botón X
    const closeBtn = oracleModal.getByRole('button', { name: /Cerrar/i }).first();
    await closeBtn.click();
    await expect(oracleModal).not.toBeVisible();
  });
});
