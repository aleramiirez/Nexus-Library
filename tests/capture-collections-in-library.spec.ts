import { test, expect } from '@playwright/test';

test('Verify Colecciones integrated inside Mi Biblioteca and sidebar decluttered', async ({ page }) => {
  test.setTimeout(90000);

  // ─── 1. Desktop Test: Viewport 1280x950 ───
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  // Load sample books if available
  const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
  if (await sampleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await sampleBtn.click();
    await page.waitForTimeout(1000);
  }

  // Check desktop sidebar: Chapter is now "Series y Análisis"
  const seriesChapter = page.locator('aside.book-page nav').getByText('Series y Análisis');
  await expect(seriesChapter).toBeVisible({ timeout: 5000 });

  // Verify "Colecciones" is NOT a standalone sidebar nav item button anymore
  const sidebarNav = page.locator('aside.book-page nav');
  const collectionsInSidebar = sidebarNav.getByRole('button', { name: /^Colecciones/i });
  await expect(collectionsInSidebar).toHaveCount(0);

  // Take screenshot of decluttered desktop sidebar
  const sidebarContent = page.locator('aside.book-page').first();
  await sidebarContent.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/sidebar-decluttered-light.png'
  });

  // Navigate to "Mi Biblioteca"
  const libraryNavBtn = sidebarNav.getByRole('button', { name: /Mi Biblioteca/i }).first();
  await libraryNavBtn.click();
  await page.waitForTimeout(600);

  // Check top tabs exist: "Todos los Libros" & "Mis Colecciones"
  const allBooksTab = page.getByRole('button', { name: /Todos los Libros/i }).first();
  const myCollectionsTab = page.getByRole('button', { name: /Mis Colecciones/i }).first();

  await expect(allBooksTab).toBeVisible({ timeout: 5000 });
  await expect(myCollectionsTab).toBeVisible({ timeout: 5000 });

  // Screenshot "Todos los Libros" view
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/library-tab-books-light.png'
  });

  // Click on "Mis Colecciones" tab
  await myCollectionsTab.click();
  await page.waitForTimeout(800);

  // Verify URL has tab=collections
  await expect(page).toHaveURL(/tab=collections/);

  // Verify CollectionsScreen is rendered (e.g. "Colecciones & Estanterías" or "Nueva Estantería")
  const newShelfBtn = page.getByRole('button', { name: /Nueva Estantería/i }).first();
  await expect(newShelfBtn).toBeVisible({ timeout: 5000 });

  // Screenshot "Mis Colecciones" view in Light and Dark mode
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/library-tab-collections-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/library-tab-collections-dark.png'
  });

  // Click back to "Todos los Libros"
  await allBooksTab.click();
  await page.waitForTimeout(500);

  // Verify URL does not have tab=collections
  const currentUrl = page.url();
  expect(currentUrl).not.toContain('tab=collections');

  // ─── 2. Mobile Test: Viewport 390x844 ───
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const mobileGuest = page.getByRole('button', { name: 'Probar' });
  await expect(mobileGuest).toBeVisible({ timeout: 10000 });
  await mobileGuest.click();
  await page.waitForTimeout(800);

  // Tap "Biblioteca" in bottom nav
  const bottomLibraryBtn = page.locator('nav[aria-label="Navegación principal móvil"]').getByRole('button', { name: /Biblioteca/i });
  await bottomLibraryBtn.click();
  await page.waitForTimeout(600);

  // Verify mobile tabs are visible
  const mobileBooksTab = page.getByRole('button', { name: /Libros/i }).first();
  const mobileCollectionsTab = page.getByRole('button', { name: /Colecciones/i }).first();

  await expect(mobileBooksTab).toBeVisible({ timeout: 5000 });
  await expect(mobileCollectionsTab).toBeVisible({ timeout: 5000 });

  // Tap Colecciones tab on mobile
  await mobileCollectionsTab.click();
  await page.waitForTimeout(600);

  await expect(page).toHaveURL(/tab=collections/);

  // Mobile screenshots (light & dark)
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-library-collections-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-library-collections-dark.png'
  });
});
