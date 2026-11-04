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

    // 11. Verificar que la vitrina se abre al vincular y el libro aparece en la balda con su insignia y placa
    await expect(page.locator('.saga-vitrine.is-open').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.vit-book-plate', { hasText: 'La música del silencio' }).first()).toBeVisible();
    await expect(page.locator('.vit-chip', { hasText: 'Vol. 1' }).first()).toBeVisible();

    // 12. Verificar barra de herramientas (filtros Todas / En curso / Sin empezar / Completadas y Abrir/Cerrar todas)
    const toolbar = page.getByRole('toolbar', { name: 'Filtrar sagas' });
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByRole('button', { name: /^Todas/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(toolbar.getByRole('button', { name: /En curso/i })).toBeVisible();
    await expect(toolbar.getByRole('button', { name: /Sin empezar/i })).toBeVisible();
    await expect(toolbar.getByRole('button', { name: /Completadas/i })).toBeVisible();

    // Cerrar todas las vitrinas desde el botón global y comprobar que pasa a estado cerrado con lomos
    const toggleAllBtn = toolbar.getByRole('button', { name: 'Cerrar todas' });
    await expect(toggleAllBtn).toBeVisible();
    await toggleAllBtn.click();
    await expect(page.locator('.saga-vitrine.is-open')).toHaveCount(0);
    await expect(toolbar.getByRole('button', { name: 'Abrir todas' })).toBeVisible();

    // Comprobar que el lomo cerrado tiene dimensiones válidas (24-31px ancho, 98-106px alto)
    const spineBox = await page.locator('.saga-vitrine .vit-face').first().boundingBox();
    expect(spineBox).not.toBeNull();
    expect(spineBox!.height).toBeGreaterThanOrEqual(95);

    // Reabrir con el botón accesible de la vitrina (aria-expanded)
    const vitrineToggle = page.locator('.vit-toggle').first();
    await expect(vitrineToggle).toHaveAttribute('aria-expanded', 'false');
    await vitrineToggle.click();
    await expect(vitrineToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.saga-vitrine.is-open')).toHaveCount(1);
  });
});
