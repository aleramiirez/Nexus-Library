import { test, expect } from '@playwright/test';

test('Capture Cadencia, Extremos, and Breakdowns close-up', async ({ page }) => {
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

  const cadenceCard = page.locator('section').filter({ hasText: /Cadencia Mensual de Lectura/i }).first();
  await expect(cadenceCard).toBeVisible({ timeout: 10000 });

  // 1. Cadencia Card - Light & Dark
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await cadenceCard.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-cadence-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await cadenceCard.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-cadence-dark.png'
  });

  // 2. Extremos y Favoritos - Light & Dark
  const extremosSection = page.locator('section').filter({ hasText: /Extremos de Lectura/i }).first();
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await extremosSection.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-extremos-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await extremosSection.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-extremos-dark.png'
  });

  // 3. Desgloses por Género, Autores y Puntuaciones
  const desglosesSection = page.locator('section').filter({ hasText: /Géneros Más Leídos/i }).first();
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await desglosesSection.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-desgloses-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await desglosesSection.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-challenge-desgloses-dark.png'
  });
});
