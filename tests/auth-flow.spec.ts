import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación y Modo Invitado', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('muestra la pantalla de bienvenida y permite alternar entre login y registro', async ({ page }) => {
    await expect(page.getByText('Bienvenido de nuevo')).toBeVisible({ timeout: 10000 });

    const registerTab = page.getByRole('button', { name: 'Crear Cuenta' });
    await registerTab.click();
    await expect(page.getByText('Crea tu biblioteca')).toBeVisible();
    await expect(page.getByText('Repetir contraseña')).toBeVisible();

    const loginTab = page.getByRole('button', { name: 'Iniciar Sesión' });
    await loginTab.click();
    await expect(page.getByText('Bienvenido de nuevo')).toBeVisible();
  });

  test('valida campos obligatorios en el formulario', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: 'Entrar a mi Biblioteca' });
    await submitBtn.click();

    const emailInput = page.locator('input[type="email"]');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
  });

  test('permite el acceso soberano en Modo Invitado al pulsar "Probar"', async ({ page }) => {
    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible();
    await guestBtn.click();

    await expect(page.getByText(/Panel de Lectura NEXUS|Mi Biblioteca/i).first()).toBeVisible({
      timeout: 15000,
    });
  });
});
