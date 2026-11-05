import { test, expect } from '@playwright/test';

test.describe('Dashboard Unified Cards System', () => {
  test('Hero card ribbon does not collide with title or header on 390px mobile viewport, and full dashboard looks cohesive', async ({ page }) => {
    // 1. Sembrar racha y abrir como invitado
    await page.addInitScript(() => {
      const logs: Record<string, any> = {};
      const histStart = new Date(2026, 4, 1);
      for (let i = 0; i < 42; i++) {
        const d = new Date(histStart);
        d.setDate(d.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        logs[iso] = {
          date: iso,
          pagesRead: 25,
          bookIds: ['hist-b1'],
          pagesByBook: { 'hist-b1': 25 },
          manualPages: 25,
          manualCheckIn: true
        };
      }
      logs['2026-10-30'] = { date: '2026-10-30', pagesRead: 12, bookIds: ['b1'], pagesByBook: { b1: 12 }, manualPages: 12, manualCheckIn: true };
      logs['2026-10-31'] = { date: '2026-10-31', pagesRead: 32, bookIds: ['b1'], pagesByBook: { b1: 32 }, manualPages: 32, manualCheckIn: true };
      logs['2026-11-01'] = { date: '2026-11-01', pagesRead: 58, bookIds: ['b1'], pagesByBook: { b1: 58 }, manualPages: 58, manualCheckIn: true };
      logs['2026-11-02'] = { date: '2026-11-02', pagesRead: 110, bookIds: ['b1'], pagesByBook: { b1: 110 }, manualPages: 110, manualCheckIn: true };
      logs['2026-11-03'] = { date: '2026-11-03', pagesRead: 25, bookIds: ['b1'], pagesByBook: { b1: 25 }, manualPages: 25, manualCheckIn: true };
      logs['2026-11-04'] = { date: '2026-11-04', pagesRead: 45, bookIds: ['b1'], pagesByBook: { b1: 45 }, manualPages: 45, manualCheckIn: true };
      logs['2026-11-05'] = { date: '2026-11-05', pagesRead: 60, bookIds: ['b1'], pagesByBook: { b1: 60 }, manualPages: 60, manualCheckIn: true };

      localStorage.setItem('nexus_reading_streak_logs_v1', JSON.stringify({
        logs,
        bookStartPageByDate: {},
        lastUpdated: new Date().toISOString()
      }));
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Si aparece el botón de cargar 4 libros de muestra, pulsarlo
    const sampleBtn = page.getByRole('button', { name: /cargar 4 libros/i });
    if (await sampleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sampleBtn.click();
      await page.waitForTimeout(1000);
    }

    // 2. Verificar a 390px móvil
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);

    const heroCard = page.locator('.dashboard-card--hero');
    await expect(heroCard).toBeVisible({ timeout: 5000 });

    const ribbon = heroCard.locator('.dashboard-ribbon');
    await expect(ribbon).toBeVisible();

    const titleGroup = heroCard.locator('.dashboard-card-title-group');
    await expect(titleGroup).toBeVisible();

    const ribbonBox = await ribbon.boundingBox();
    const titleBox = await titleGroup.boundingBox();

    expect(ribbonBox).not.toBeNull();
    expect(titleBox).not.toBeNull();

    if (ribbonBox && titleBox) {
      console.log(`Mobile 390px - Title right: ${titleBox.x + titleBox.width}, Ribbon left: ${ribbonBox.x}`);
      // El título no debe tocar la cinta
      expect(titleBox.x + titleBox.width).toBeLessThan(ribbonBox.x);
    }

    // Captura de la tarjeta hero a 390px
    await heroCard.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/hero-card-mobile-390.png'
    });

    // Captura móvil completa en claro
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/dashboard-mobile-390-light.png',
      fullPage: true
    });

    // Captura móvil completa en oscuro
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/dashboard-mobile-390-dark.png',
      fullPage: true
    });

    // 3. Desktop 1280px
    await page.setViewportSize({ width: 1280, height: 950 });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);

    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/dashboard-desktop-1280-light.png',
      fullPage: true
    });

    // Desktop oscuro
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);

    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/dashboard-desktop-1280-dark.png',
      fullPage: true
    });
  });
});
