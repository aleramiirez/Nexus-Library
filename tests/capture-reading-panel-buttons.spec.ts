import { test, expect } from '@playwright/test';

test('Capture reading panel with bottom-right icon buttons', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  const sampleBtn = page.getByRole('button', { name: /cargar 4 libros/i });
  if (await sampleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sampleBtn.click();
    await page.waitForTimeout(1000);
  }

  const heroCard = page.locator('.dashboard-card--hero');
  await expect(heroCard).toBeVisible({ timeout: 5000 });

  const progressWrap = heroCard.locator('.rpb-wrap');
  await expect(progressWrap).toBeVisible();

  // 1. Captura en Modo Claro (normal)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  await heroCard.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-hero-buttons-light.png'
  });

  // 2. Captura con el editor rápido abierto
  const pencilBtn = page.locator('.rpb-btn-edit-toggle');
  await pencilBtn.click();
  await page.waitForTimeout(400);

  await heroCard.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-hero-editing-light.png'
  });

  // Cerrar editor
  await pencilBtn.click();
  await page.waitForTimeout(300);

  // 3. Captura en Modo Oscuro (normal)
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  await heroCard.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-hero-buttons-dark.png'
  });

  // 4. Captura en móvil (390px)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);

  await heroCard.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reading-hero-buttons-mobile-390.png'
  });
});
