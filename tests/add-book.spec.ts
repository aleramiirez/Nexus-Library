import { test, expect } from '@playwright/test';

test.describe('Gestión de Libros: Creación y Visualización', () => {
  test('abre el modal artesanal, añade una obra literaria y la muestra en la estantería', async ({ page }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Navegar a la sección de la biblioteca
    const libraryNavBtn = page.getByRole('button', { name: /Mi Biblioteca/i }).first();
    await expect(libraryNavBtn).toBeVisible({ timeout: 15000 });
    await libraryNavBtn.click();

    // 3. Abrir modal para añadir libro
    const addBookBtn = page.getByRole('button', { name: /Añadir.*libro/i }).first();
    await expect(addBookBtn).toBeVisible({ timeout: 10000 });
    await addBookBtn.click();

    // 4. Verificar que el modal de creación está visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Nombre (Título del libro) *')).toBeVisible();

    // 5. Rellenar título (input con atributo required)
    const titleInput = page.locator('input[required]').first();
    await titleInput.fill('El Nombre del Viento');

    // Campo de autor
    const authorInputs = page.locator('input[type="text"]');
    if (await authorInputs.count() >= 2) {
      await authorInputs.nth(1).fill('Patrick Rothfuss');
    }

    // 6. Guardar el libro en la biblioteca
    const submitBtn = page.getByRole('button', { name: /Añadir a mi biblioteca/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 7. Verificar que el modal se cierra y el libro aparece en el santuario
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText('El Nombre del Viento').first()).toBeVisible({ timeout: 10000 });
  });
});
