import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Captura Visual de Zonas Experience (Estantería y Ficha de Libro)', () => {
  test('captura la estantería artesanal y la ficha ceremonial en libro abierto', async ({ page }) => {
    const screenshotsDir = path.resolve('tests/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Navegar a Mi Biblioteca
    const libraryNavBtn = page.getByRole('button', { name: /Mi Biblioteca/i }).first();
    await expect(libraryNavBtn).toBeVisible({ timeout: 15000 });
    await libraryNavBtn.click();

    // 3. Cargar los libros de muestra para poblar la estantería ornamental de roble
    const sampleBtn = page.getByRole('button', { name: /Explorar con 4 libros de muestra/i });
    await expect(sampleBtn).toBeVisible({ timeout: 10000 });
    await sampleBtn.click();

    // 4. Esperar a que los libros de muestra aparezcan en la estantería de roble
    const firstBook = page.locator('[data-book-id]').first();
    await expect(firstBook).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000); // Dar un instante para transiciones y sombras de madera

    // 5. Captura Visual de la Estantería
    await page.screenshot({
      path: 'tests/screenshots/bookshelf.png',
      fullPage: true,
    });
    expect(fs.existsSync('tests/screenshots/bookshelf.png')).toBe(true);

    // 6. Abrir la Ficha Ceremonial del libro
    await firstBook.click();

    // 7. Esperar a que el modal del libro abierto esté visible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500); // Esperar que las dos páginas, marcapáginas y lacre estén renderizados

    // 8. Captura Visual de la Ficha Ceremonial
    await page.screenshot({
      path: 'tests/screenshots/book-detail.png',
      fullPage: true,
    });
    expect(fs.existsSync('tests/screenshots/book-detail.png')).toBe(true);
  });
});
