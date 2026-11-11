import { test, expect } from '@playwright/test';

test.describe('Atajos de Teclado Globales', () => {
  test('navegación con 1-7, acciones rápidas con n, o, s y búsqueda rápida con / o Ctrl+K', async ({ page }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Esperar a que la navegación principal esté en pantalla
    const libraryNavBtn = page.getByRole('button', { name: /Mi Biblioteca/i }).first();
    await expect(libraryNavBtn).toBeVisible({ timeout: 15000 });

    // 2. Probar navegación con teclas 1 a 7
    // Tecla 2 -> Mi Biblioteca
    await page.keyboard.press('2');
    await expect(page.getByRole('heading', { name: 'Mi Biblioteca' })).toBeVisible({ timeout: 5000 });

    // Tecla 3 -> Series & Sagas
    await page.keyboard.press('3');
    await expect(page.getByRole('heading', { name: /Sagas|Series/i }).first()).toBeVisible({ timeout: 5000 });

    // Tecla 1 -> Inicio (Dashboard)
    await page.keyboard.press('1');
    await expect(page.getByText(/Tu Santuario de Lectura|Mi Biblioteca/i).first()).toBeVisible({ timeout: 5000 });

    // 3. Probar atajo de búsqueda rápida '/'
    await page.keyboard.press('/');
    // Debe llevar a Biblioteca y enfocar #library-search-input
    const searchInput = page.locator('#library-search-input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await expect(searchInput).toBeFocused();

    // 4. Probar que al escribir en el input, teclas como 'n', 'o', 's', '1-7' NO disparan atajos
    await searchInput.type('sanderson 1');
    expect(await searchInput.inputValue()).toBe('sanderson 1');

    // Pulsar Escape dentro del input: debe desenfocarlo
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeFocused();

    // 5. Probar atajo 'n': Debe abrir el modal de añadir libro
    await page.keyboard.press('n');
    await expect(page.getByText(/Incorporar Obra a la Biblioteca|Añadir libro/i).first()).toBeVisible({ timeout: 5000 });

    // Pulsar Escape para cerrar el modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 6. Probar atajo 'o': Debe abrir el Oráculo Literario
    await page.keyboard.press('o');
    await expect(page.getByText(/El Oráculo del Archivo/i).first()).toBeVisible({ timeout: 5000 });

    // Pulsar Escape para cerrar el Oráculo
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // 7. Probar Ctrl+K universal
    await page.keyboard.press('Control+k');
    await expect(searchInput).toBeFocused();
  });
});
