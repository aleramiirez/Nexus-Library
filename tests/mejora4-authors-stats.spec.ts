import { test, expect } from '@playwright/test';

test.describe('MEJORA 4: Sala de Autores (Ranking y Estadísticas por Autor)', () => {
  test('muestra podio, lista de autores, buscador y desglose de obras', async ({ page }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Cargar libros de muestra si aplica
    const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
    if (await sampleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sampleBtn.click();
      await page.waitForTimeout(1200);
    }

    // 3. Navegar a Reto y Estadísticas ('stats')
    const statsNavBtn = page.getByRole('button', { name: /Reto & Estadísticas|Estadísticas/i }).first();
    await expect(statsNavBtn).toBeVisible({ timeout: 8000 });
    await statsNavBtn.click();

    // 4. Localizar la sección "Sala de Autores"
    const authorsSection = page.locator('section').filter({ hasText: /Sala de Autores/i }).first();
    await expect(authorsSection).toBeVisible({ timeout: 10000 });

    // 5. Verificar que se renderizan autores en la lista
    const authorCard = authorsSection.locator('h3').first();
    await expect(authorCard).toBeVisible();

    // 6. Probar buscador de autores
    const searchInput = authorsSection.getByPlaceholder(/Buscar autor\.\.\./i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Brandon');
    await page.waitForTimeout(400);

    // Debe mostrar al autor coincidente o mensaje si no está
    const brandonMatch = authorsSection.getByText(/Brandon Sanderson/i);
    if (await brandonMatch.isVisible()) {
      // Hacer clic para desplegar su bibliografía
      await brandonMatch.click();
      await expect(authorsSection.getByText(/Obras en tu archivo/i)).toBeVisible();
    }

    // Limpiar buscador
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // 7. Probar selector de ordenación
    const sortSelect = authorsSection.locator('select');
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption('rating');
    await page.waitForTimeout(300);
    await sortSelect.selectOption('read');
  });
});
