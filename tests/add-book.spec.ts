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

  test('autocompleta automáticamente el número de volumen siguiente al seleccionar una saga', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 1. Añadir el primer libro de una saga ("Cuentos de Dunk y Egg", Vol. 1)
    const addBtn1 = page.getByRole('button', { name: 'Añadir libro' }).first();
    await addBtn1.click();
    await page.locator('#add-book-nombre').fill('El caballero errante');
    // Ir a pestaña Lectura & Saga
    await page.getByRole('button', { name: /Lectura & Saga/i }).first().click();
    // Crear nueva saga "Cuentos de Dunk y Egg"
    await page.getByRole('button', { name: 'Nueva saga' }).click();
    const sagaInput = page.locator('input[placeholder*="Nombre de la saga"]');
    await sagaInput.fill('Cuentos de Dunk y Egg');
    const volInput = page.locator('#add-book-volumen');
    await volInput.fill('1');
    await page.getByRole('button', { name: /Añadir a mi biblioteca/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // 2. Añadir el segundo libro ("La espada leal", Vol. 2)
    const addBtn2 = page.getByRole('button', { name: 'Añadir libro' }).first();
    await addBtn2.click();
    await page.locator('#add-book-nombre').fill('La espada leal');
    await page.getByRole('button', { name: /Lectura & Saga/i }).first().click();
    // Seleccionar el chip de la saga recién creada
    await page.getByRole('button', { name: /Cuentos de Dunk y Egg/i }).click();
    // Debe haber autocompletado con el volumen 2 (porque el último era 1)
    await expect(volInput).toHaveValue('2');
    await page.getByRole('button', { name: /Añadir a mi biblioteca/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10000 });

    // 3. Abrir el formulario para el tercer libro y verificar que sugiere el volumen 3
    const addBtn3 = page.getByRole('button', { name: 'Añadir libro' }).first();
    await addBtn3.click();
    await page.locator('#add-book-nombre').fill('El caballero misterioso');
    await page.getByRole('button', { name: /Lectura & Saga/i }).first().click();
    // Seleccionar chip de la saga
    await page.getByRole('button', { name: /Cuentos de Dunk y Egg/i }).click();
    // ¡Verificar que el volumen se autocompleta con 3 automáticamente!
    await expect(volInput).toHaveValue('3');
    await expect(page.getByText('Libro número 3 de la serie.')).toBeVisible();
  });
});
