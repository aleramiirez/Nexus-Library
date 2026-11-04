import { test, expect } from '@playwright/test';

test.describe('Sagas: Búsqueda interactiva al asignar libro', () => {
  test('permite buscar libros por texto y autor dentro del desplegable de asignación', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 1. Añadir 2 libros independientes
    const addBtn1 = page.getByRole('button', { name: 'Añadir libro' }).first();
    await addBtn1.click();
    await page.locator('#add-book-nombre').fill('El temor de un hombre sabio');
    await page.locator('#add-book-autor').fill('Patrick Rothfuss');
    await page.getByRole('button', { name: /Añadir a mi biblioteca/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    const addBtn2 = page.getByRole('button', { name: 'Añadir libro' }).first();
    await addBtn2.click();
    await page.locator('#add-book-nombre').fill('La música del silencio');
    await page.locator('#add-book-autor').fill('Patrick Rothfuss');
    await page.getByRole('button', { name: /Añadir a mi biblioteca/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // 2. Navegar a la sección de Sagas
    const sagasNavBtn = page.getByRole('button', { name: 'Sagas' }).first();
    await expect(sagasNavBtn).toBeVisible({ timeout: 10000 });
    await sagasNavBtn.click();

    // 3. Crear una nueva saga
    const createSagaBtn = page.getByRole('button', { name: /Nueva Saga/i }).first();
    await createSagaBtn.click();
    const sagaNameInput = page.locator('input[placeholder*="Nacidos de la Bruma"]').first();
    await sagaNameInput.fill('Crónica del Asesino de Reyes');
    await page.getByRole('button', { name: 'Guardar Saga' }).click();
    await expect(page.getByText('Crónica del Asesino de Reyes')).toBeVisible({ timeout: 10000 });

    // 4. Pulsar el botón "Asignar libro"
    const assignBtn = page.getByRole('button', { name: 'Asignar libro' }).first();
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // 5. Abrir el desplegable LibrarySelect
    const selectTrigger = page.locator('button[aria-haspopup="listbox"]').first();
    await expect(selectTrigger).toBeVisible();
    await selectTrigger.click();

    // 6. Verificar que aparece el buscador de texto integrado
    const searchInput = page.locator('input[aria-label="Buscar opciones"]');
    await expect(searchInput).toBeVisible();

    // 7. Filtrar por texto "música"
    await searchInput.fill('música');

    // 8. Verificar que "La música del silencio" está visible y "El temor" ha sido filtrado
    await expect(page.getByRole('option', { name: /La música del silencio/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /El temor de un hombre sabio/i })).not.toBeVisible();

    // 9. Seleccionar el libro filtrado
    await page.getByRole('option', { name: /La música del silencio/i }).click();

    // 10. Vincular a la saga
    const vincularBtn = page.getByRole('button', { name: 'Vincular' });
    await expect(vincularBtn).toBeEnabled();
    await vincularBtn.click();

    // 11. Verificar que el libro aparece asignado dentro de la saga
    await expect(page.getByText('La música del silencio')).toBeVisible({ timeout: 10000 });
  });
});
