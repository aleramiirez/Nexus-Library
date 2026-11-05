import { test, expect } from '@playwright/test';

test('Verify Comunidad direct access and Atlas Country LibrarySelect', async ({ page }) => {
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

  // Check desktop sidebar header has the Comunidad button
  const communityHeaderBtn = page.getByRole('button', { name: /Comunidad y Círculo de Lectores/i }).first();
  await expect(communityHeaderBtn).toBeVisible({ timeout: 5000 });

  // Sidebar header screenshot (showing Comunidad next to Mail)
  const sidebarHeader = page.locator('aside.book-page .px-5.pt-4').first();
  await sidebarHeader.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/sidebar-header-comunidad-light.png'
  });

  // Click Comunidad header button
  await communityHeaderBtn.click();
  await page.waitForTimeout(800);

  // Verify URL and Comunidad view is visible
  await expect(page).toHaveURL(/tab=community/);
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
  await expect(mobileGuest).toBeVisible({ timeout: 10000 });
  await mobileGuest.click();
  await page.waitForTimeout(1000);

  // Check top mobile bar
  const mobileTopHeader = page.locator('header').first();
  await expect(mobileTopHeader).toBeVisible({ timeout: 10000 });

  await mobileTopHeader.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-header-top-light.png'
  });

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(300);
  await mobileTopHeader.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/mobile-header-top-dark.png'
  });

  // Click Comunidad on mobile
  const mobileCommunityBtn = mobileTopHeader.getByRole('button', { name: /Comunidad y Círculo de Lectores/i });
  await expect(mobileCommunityBtn).toBeVisible({ timeout: 5000 });
  await mobileCommunityBtn.click();
  await page.waitForTimeout(800);

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

  // Navigate to atlas tab
  const atlasTabBtn = page.getByRole('button', { name: /Atlas/i }).first();
  await expect(atlasTabBtn).toBeVisible({ timeout: 8000 });
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
