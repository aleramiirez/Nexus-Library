import { test, expect } from '@playwright/test';

test('capture seeded streak card and annual heatmap', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 950 });

  // Sembrar datos directamente en localStorage antes de que la app arranque
  await page.addInitScript(() => {
    const logs: Record<string, any> = {};

    // 1. Racha histórica pasada de 42 días continuos (2026-05-01 al 2026-06-11)
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

    // 2. Racha actual de 7 días continuos hasta hoy (2026-11-05) con todos los niveles solicitados:
    // 2026-10-30: 12 págs (Nivel 1: 1-19)
    logs['2026-10-30'] = {
      date: '2026-10-30',
      pagesRead: 12,
      bookIds: ['b1'],
      pagesByBook: { b1: 12 },
      manualPages: 12,
      manualCheckIn: true
    };
    // 2026-10-31: 32 págs (Nivel 2: 20-49)
    logs['2026-10-31'] = {
      date: '2026-10-31',
      pagesRead: 32,
      bookIds: ['b1'],
      pagesByBook: { b1: 32 },
      manualPages: 32,
      manualCheckIn: true
    };
    // 2026-11-01: 58 págs (Nivel 3: 50-99)
    logs['2026-11-01'] = {
      date: '2026-11-01',
      pagesRead: 58,
      bookIds: ['b1'],
      pagesByBook: { b1: 58 },
      manualPages: 58,
      manualCheckIn: true
    };
    // 2026-11-02: 110 págs (Nivel 4: 100+)
    logs['2026-11-02'] = {
      date: '2026-11-02',
      pagesRead: 110,
      bookIds: ['b1'],
      pagesByBook: { b1: 110 },
      manualPages: 110,
      manualCheckIn: true
    };
    // 2026-11-03: 25 págs (Nivel 2)
    logs['2026-11-03'] = {
      date: '2026-11-03',
      pagesRead: 25,
      bookIds: ['b1'],
      pagesByBook: { b1: 25 },
      manualPages: 25,
      manualCheckIn: true
    };
    // 2026-11-04: 45 págs (Nivel 2)
    logs['2026-11-04'] = {
      date: '2026-11-04',
      pagesRead: 45,
      bookIds: ['b1'],
      pagesByBook: { b1: 45 },
      manualPages: 45,
      manualCheckIn: true
    };
    // 2026-11-05 (HOY): 60 págs (Nivel 3)
    logs['2026-11-05'] = {
      date: '2026-11-05',
      pagesRead: 60,
      bookIds: ['b1'],
      pagesByBook: { b1: 60 },
      manualPages: 60,
      manualCheckIn: true
    };

    const state = {
      logs,
      bookStartPageByDate: {},
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem('nexus_reading_streak_logs_v1', JSON.stringify(state));
  });

  // 1. Navegar y acceder como invitado
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  // Localizar la tarjeta de racha
  const streakSection = page.locator('section[aria-label="Hábito y racha de lectura"]').first();
  await expect(streakSection).toBeVisible({ timeout: 10000 });

  // 1. Captura en Modo Claro (mover el puntero fuera para evitar hover accidental)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);

  await streakSection.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/streak-card-seeded-light.png'
  });

  // 2. Captura en Modo Oscuro
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);

  await streakSection.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/streak-card-seeded-dark.png'
  });

  // 3. Captura del Mapa Anual (365d) para verificar que no ha sufrido cambios visuales
  const annualMapBtn = streakSection.locator('.dashboard-card-action').first();
  await annualMapBtn.click();

  const annualHeatmapSection = page.locator('.nx-heatmap-w').first();
  await expect(annualHeatmapSection).toBeVisible({ timeout: 10000 });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(600);

  await annualHeatmapSection.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/annual-heatmap-check.png'
  });
});
