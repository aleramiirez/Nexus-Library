import { test, expect } from '@playwright/test';

test('Capture full-page unified Reading Challenge screen', async ({ page }) => {
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

  // Navegar a Reto y Estadísticas
  const statsNavBtn = page.getByRole('button', { name: /Reto & Estadísticas|Estadísticas/i }).first();
  await expect(statsNavBtn).toBeVisible({ timeout: 8000 });
  await statsNavBtn.click();

  const metricCards = page.locator('.dashboard-metric-card');
  await expect(metricCards.first()).toBeVisible({ timeout: 10000 });
  await expect(metricCards).toHaveCount(4);

  const heatmap = page.locator('.nx-heatmap-w');
  await expect(heatmap).toBeVisible({ timeout: 5000 });

  // 1. Escritorio - Modo Claro (Full Page)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-full-light.png',
    fullPage: true
  });

  // 2. Escritorio - Modo Oscuro (Full Page)
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-full-dark.png',
    fullPage: true
  });

  // 3. Móvil (390px) - Modo Claro (Full Page)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-full-mobile-light.png',
    fullPage: true
  });

  // 4. Móvil (390px) - Modo Oscuro (Full Page)
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-full-mobile-dark.png',
    fullPage: true
  });
});
