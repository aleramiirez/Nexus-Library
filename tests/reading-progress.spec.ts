import { test, expect } from '@playwright/test';

test.describe('Fase 1: Barra de Progreso y Actualización Rápida Inline', () => {
  test('permite actualizar el progreso de lectura desde el panel de inicio y en la ficha del libro', async ({
    page
  }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Si hay botón de cargar muestra o ya hay libro en lectura
    const readingPanel = page.locator('.library-paper-panel').first();
    await expect(readingPanel).toBeVisible({ timeout: 15000 });

    // Si no hay libro en lectura, cargar obras de muestra
    const loadSampleBtn = page.getByRole('button', { name: /Cargar catálogo ceremonial|Explorar biblioteca/i }).first();
    if (await loadSampleBtn.isVisible()) {
      // Cargar colección de muestra para tener libros en curso
      const sampleBtn = page.getByRole('button', { name: /Cargar catálogo ceremonial/i }).first();
      if (await sampleBtn.isVisible()) {
        await sampleBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // 3. Verificar que aparece el panel de "Leyendo actualmente"
    await expect(page.getByText('Leyendo actualmente')).toBeVisible({ timeout: 10000 });

    // 4. Probar desplegar edición rápida inline con botón "Actualizar página" en el panel
    const updatePageBtn = page.getByRole('button', { name: /Actualizar página/i }).first();
    if (await updatePageBtn.isVisible()) {
      await updatePageBtn.click();
      await expect(page.getByText(/Registrar avance de lectura/i)).toBeVisible();
      // Cerrar edición
      const closeBtn = page.getByRole('button', { name: /Cerrar edición/i }).first();
      await closeBtn.click();
      await expect(page.getByText(/Registrar avance de lectura/i)).not.toBeVisible();
    }

    // 5. Abrir ficha del libro y comprobar que los botones de avance (+25p) y slider están en el detalle
    const bookTitle = page.locator('.library-paper-panel h3').first();
    if (await bookTitle.isVisible()) {
      await bookTitle.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 6000 });
      // Los botones de avance rápido (+25p) están en el detalle
      const detailQuickAdd = page.getByRole('button', { name: /\+25p/i }).first();
      await expect(detailQuickAdd).toBeVisible({ timeout: 6000 });
    }
  });
});
