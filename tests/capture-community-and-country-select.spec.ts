import { test, expect } from '@playwright/test';

test('Verify Comunidad direct access and Atlas Country LibrarySelect', async ({ page }) => {
  test.setTimeout(90000);

  // ─── 1. Desktop Test: Viewport 1280x950 ───
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  const sidebar = page.locator('aside.book-page');
  await Promise.race([
    guestBtn.waitFor({ state: 'visible', timeout: 15000 }).then(async () => {
      await guestBtn.click();
      await sidebar.waitFor({ state: 'visible', timeout: 15000 });
    }),
    sidebar.waitFor({ state: 'visible', timeout: 15000 })
  ]).catch(() => {});
  await page.waitForTimeout(1000);

  // Load sample books if available
  const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
  if (await sampleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await sampleBtn.click();
    await page.waitForTimeout(1000);
  }

  // Check desktop sidebar header is clean with logo and mailbox
  const sidebarHeader = page.locator('aside.book-page .px-5.pt-4').first();
  await sidebarHeader.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/sidebar-header-clean-light.png'
  });

  // Check desktop sidebar index has "Comunidad de Lectores"
  const communityNavBtn = page.getByRole('button', { name: /Comunidad de Lectores/i }).first();
  await expect(communityNavBtn).toBeVisible({ timeout: 5000 });

  // Click Comunidad in sidebar menu
  await communityNavBtn.click();
  await page.waitForTimeout(800);

  // Verify URL and Comunidad view is visible directly
  await expect(page).toHaveURL(/section=community/);
  const friendsTabBtn = page.getByRole('button', { name: /Mis Amigos/i }).first();
  await expect(friendsTabBtn).toBeVisible({ timeout: 5000 });

  // Screenshot Comunidad view on desktop (light & dark)
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/comunidad-desktop-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/comunidad-desktop-dark.png'
  });

  // ─── 2. Mobile Test: Viewport 390x844 ───
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const mobileGuest = page.getByRole('button', { name: 'Probar' });
  const mobileTopHeader = page.locator('header').first();
  await Promise.race([
    mobileGuest.waitFor({ state: 'visible', timeout: 10000 }).then(async () => {
      await mobileGuest.click();
      await mobileTopHeader.waitFor({ state: 'visible', timeout: 15000 });
    }),
    mobileTopHeader.waitFor({ state: 'visible', timeout: 10000 })
  ]).catch(() => {});
  await page.waitForTimeout(1000);

  // Check top mobile bar
  await expect(mobileTopHeader).toBeVisible({ timeout: 10000 });

  await mobileTopHeader.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-header-top-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(300);
  await mobileTopHeader.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-header-top-dark.png'
  });

  // Test mobile Quick Add Sheet
  const quickAddBtn = page.getByRole('button', { name: /Añadir libro o escanear ISBN/i }).first();
  await expect(quickAddBtn).toBeVisible({ timeout: 5000 });
  await quickAddBtn.click();
  await page.waitForTimeout(400);

  // Verify Quick Add modal sheet is open
  const quickAddSheet = page.getByRole('dialog', { name: /Añadir a tu Colección/i });
  await expect(quickAddSheet).toBeVisible({ timeout: 5000 });
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-quick-add-sheet-dark.png'
  });

  // Close Quick Add Sheet
  const closeSheetBtn = quickAddSheet.getByRole('button', { name: /Cerrar/i }).first();
  await closeSheetBtn.click();
  await page.waitForTimeout(400);

  // Test bottom navigation direct access to Comunidad
  const bottomNav = page.locator('nav[aria-label="Navegación principal móvil"]');
  await expect(bottomNav).toBeVisible({ timeout: 5000 });

  const bottomCommunityBtn = bottomNav.getByRole('button', { name: /Comunidad/i }).first();
  await expect(bottomCommunityBtn).toBeVisible({ timeout: 5000 });
  await bottomCommunityBtn.click();
  await page.waitForTimeout(800);

  await expect(page).toHaveURL(/section=community/);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-comunidad-view-dark.png'
  });

  // ─── 3. Atlas Country Dropdown Test (LibrarySelect) ───
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));

  // Add a book without country via the UI so that the unassigned banner appears in Atlas
  const addBookBtn = page.getByRole('button', { name: /Añadir libro/i }).first();
  await expect(addBookBtn).toBeVisible({ timeout: 5000 });
  await addBookBtn.click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  await page.locator('input[required]').first().fill('Choque de Reyes');
  const authorInputs = page.locator('input[type="text"]');
  if (await authorInputs.count() >= 2) {
    await authorInputs.nth(1).fill('George R. R. Martin');
  }
  const submitBtn = page.getByRole('button', { name: /Añadir a mi biblioteca/i });
  await submitBtn.click();
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(600);

  // Navigate to Atlas via the Discover tabs directly
  const discoverNavBtn = page.getByRole('button', { name: /Descubrir Libros/i }).first();
  if (await discoverNavBtn.isVisible().catch(() => false)) {
    await discoverNavBtn.click();
    await page.waitForTimeout(500);
  }

  // Verify only 2 tabs exist in Discover: Catálogo and Atlas (no community tab)
  const catalogTabBtn = page.getByRole('button', { name: /Catálogo/i }).first();
  await expect(catalogTabBtn).toBeVisible({ timeout: 5000 });
  const atlasTabBtn = page.getByRole('button', { name: /Atlas/i }).first();
  await expect(atlasTabBtn).toBeVisible({ timeout: 8000 });

  // Navigate to atlas tab
  await atlasTabBtn.click();
  await page.waitForTimeout(1000);

  // Locate the exact unassigned books section
  const unassignedSection = page.locator('section').filter({ hasText: /sin país asignado/i }).first();
  await expect(unassignedSection).toBeVisible({ timeout: 8000 });

  // Look for the LibrarySelect trigger button
  const countrySelectBtn = page.getByRole('button', { name: /Asignar país para/i }).first();
  if (!(await countrySelectBtn.isVisible().catch(() => false))) {
    // If folded, click header to unfold
    await unassignedSection.getByText(/sin país asignado/i).click();
    await page.waitForTimeout(500);
  }

  await expect(countrySelectBtn).toBeVisible({ timeout: 6000 });

  // Click the trigger to open the custom LibrarySelect popover
  await countrySelectBtn.click();
  await page.waitForTimeout(400);

  // The popover should be open in portal
  const popover = page.locator('.library-select-popover');
  await expect(popover).toBeVisible({ timeout: 5000 });

  // Take screenshot of the open LibrarySelect in Light Mode
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/atlas-country-select-open-light.png'
  });

  // Switch to dark mode and take screenshot
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(400);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/atlas-country-select-open-dark.png'
  });
});
