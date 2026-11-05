import { test, expect } from '@playwright/test';

test('Capture Settings, Library, and Dashboard unified boxes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
  if (await sampleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await sampleBtn.click();
    await page.waitForTimeout(1000);
  }

  // 1. Captura de los Quick KPIs en el Dashboard
  const kpiSection = page.locator('.dashboard-quick-kpi').first();
  await expect(kpiSection).toBeVisible({ timeout: 8000 });

  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  const kpiGrid = page.locator('.grid-cols-2.sm\\:grid-cols-3').first();
  await kpiGrid.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/dashboard-quick-kpis-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  await kpiGrid.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/dashboard-quick-kpis-dark.png'
  });

  // 2. Navegar a Mi Biblioteca
  const libraryNavBtn = page.getByRole('button', { name: /Mi Biblioteca/i }).first();
  await libraryNavBtn.click();
  await page.waitForTimeout(600);

  // Abrir filtros
  const filterBtn = page.getByRole('button', { name: /Filtros/i }).first();
  await expect(filterBtn).toBeVisible({ timeout: 5000 });
  await filterBtn.click();
  await page.waitForTimeout(400);

  const filterCard = page.locator('section, div').filter({ hasText: /Filtros del Catálogo/i }).first();
  await expect(filterCard).toBeVisible({ timeout: 5000 });

  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await filterCard.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/library-filters-light.png'
  });

  // Cambiar a vista de lista
  const listModeBtn = page.getByTitle(/Vista de lista compacta/i).first();
  if (await listModeBtn.isVisible().catch(() => false)) {
    await listModeBtn.click();
    await page.waitForTimeout(500);

    const listTable = page.locator('table').first();
    if (await listTable.isVisible().catch(() => false)) {
      await listTable.screenshot({
        path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/library-list-table-light.png'
      });
    }
  }

  // 3. Navegar a Ajustes
  const settingsNavBtn = page.getByRole('button', { name: /Ajustes/i }).first();
  await settingsNavBtn.click();
  await page.waitForTimeout(600);

  // Pestaña Apariencia
  const appearanceTabBtn = page.getByRole('button', { name: /Apariencia/i });
  await appearanceTabBtn.click();
  await page.waitForTimeout(500);

  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/settings-appearance-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/settings-appearance-dark.png'
  });

  // Pestaña Copias / Backup
  const backupTabBtn = page.getByRole('button', { name: /Copias/i });
  await backupTabBtn.click();
  await page.waitForTimeout(500);

  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/settings-backup-light.png'
  });
});
