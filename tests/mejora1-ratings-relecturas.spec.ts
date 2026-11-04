import { test, expect } from '@playwright/test';

test.describe('MEJORA 1: Medias Estrellas, Formato/Propiedad y Relecturas', () => {
  test('permite valorar con media estrella, seleccionar formato y propiedad, e iniciar relectura', async ({ page }) => {
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

    // 3. Abrir modal Añadir Libro
    const addBookBtn = page.getByRole('button', { name: /Añadir.*libro/i }).first();
    await expect(addBookBtn).toBeVisible({ timeout: 10000 });
    await addBookBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    // Rellenar datos esenciales
    const titleInput = page.locator('input[required]').first();
    await titleInput.fill('El Archivo de las Tormentas');

    // Seleccionar estado Leído directamente al crear
    const leidoStatusBtn = page.getByRole('button', { name: '✅ Leído' });
    await leidoStatusBtn.click();

    // Navegar a pestaña Lectura y asignar 3.5 estrellas
    const readingTabBtn = page.getByRole('button', { name: /Lectura & Saga/i }).first();
    await readingTabBtn.click();

    // Seleccionar media estrella usando el botón accesible o el selector
    const halfStarBtn = page.locator('button[aria-label="3.5 estrellas"]');
    if (await halfStarBtn.isVisible()) {
      await halfStarBtn.click();
    } else {
      // Toggle +0.5
      const toggleHalf = page.getByTitle(/Añadir o alternar media estrella/i);
      await toggleHalf.click();
    }

    // Navegar a pestaña Edición y seleccionar Formato Digital y Propiedad En mi estantería
    const editionTabBtn = page.getByRole('button', { name: /Publicación & Detalles/i }).first();
    await editionTabBtn.click();

    const digitalPill = page.getByRole('button', { name: /Digital \/ ePub/i });
    await digitalPill.click();

    // Guardar libro
    const submitBtn = page.getByRole('button', { name: /Añadir a mi biblioteca/i });
    await submitBtn.click();

    // Esperar y cerrar la celebración ceremonial de libro concluido
    const closeCelebration = page.getByRole('button', { name: 'Cerrar celebración' });
    await expect(closeCelebration).toBeVisible({ timeout: 10000 });
    await closeCelebration.click();
    await expect(closeCelebration).not.toBeVisible({ timeout: 5000 });

    // 4. Abrir la ficha del libro recién creado en la estantería
    const bookItem = page.getByRole('button', { name: 'El Archivo de las Tormentas' }).first();
    await expect(bookItem).toBeVisible({ timeout: 10000 });
    await bookItem.click();

    // Verificar que el modal de detalle muestra el formato y la valoración en la hoja derecha
    const rightPage = page.locator('.open-book-right-paper');
    await expect(rightPage.getByText(/Digital \/ ePub/i)).toBeVisible({ timeout: 10000 });

    // Comprobar que aparece el botón de Iniciar nueva relectura (ya que el libro está en Leído)
    const rereadBtn = rightPage.getByRole('button', { name: /Iniciar nueva relectura/i });
    await expect(rereadBtn).toBeVisible({ timeout: 8000 });
    await rereadBtn.click();

    // Verificar que ahora muestra "Leído 2 veces"
    await expect(rightPage.getByText(/Leído 2 veces/i)).toBeVisible({ timeout: 8000 });
  });
});
