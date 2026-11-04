import { test, expect } from '@playwright/test';

test.describe('Fase 2: Racha Diaria de Lectura y Mapa de Calor', () => {
  test('permite registrar lectura diaria con botón ceremonial y visualiza el mapa de calor anual', async ({
    page
  }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Verificar que el widget de racha está visible en el inicio
    const streakTitle = page.getByText(/Hábito y Racha de Lectura/i).first();
    await expect(streakTitle).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Racha actual/i).first()).toBeVisible();
    await expect(page.getByText(/Hitos/i).first()).toBeVisible();

    // 3. Probar pulsar "Marcar que he leído hoy" si aún no está registrada la lectura
    const checkInBtn = page.getByRole('button', { name: /Marcar que he leído hoy/i }).first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await expect(page.getByText(/La llama sigue encendida/i).first()).toBeVisible({ timeout: 8000 });
    } else {
      await expect(page.getByText(/La llama sigue encendida/i).first()).toBeVisible();
    }

    // 4. Navegar a Estadísticas y Reto
    const statsNavBtn = page.getByRole('button', { name: /Reto & Estadísticas|Reto de Lectura/i }).first();
    if (await statsNavBtn.isVisible()) {
      await statsNavBtn.click();
      // Verificar que el mapa de calor anual completo se visualiza
      await expect(page.getByText(/Mapa de Calor de Lectura Anual/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Días con lectura/i).first()).toBeVisible();
    }
  });
});
