import { test, expect } from '@playwright/test';

test.describe('MEJORA 2: Temporizador de Sesión de Lectura en Vivo + Velocidad Personalizada', () => {
  test('permite iniciar sesión de lectura con cronómetro, alternar modos y registrar avance', async ({ page }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Cargar libros de muestra si no hay obras en curso
    const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
    if (await sampleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sampleBtn.click();
      await page.waitForTimeout(1200);
    }

    // 3. Buscar el botón "⏱️ Iniciar sesión" en el panel de inicio
    const startSessionBtn = page.getByRole('button', { name: /Iniciar sesión/i }).first();
    await expect(startSessionBtn).toBeVisible({ timeout: 10000 });
    await startSessionBtn.click();

    // 4. Verificar que se abre el modal de Sesión de Lectura
    const sessionDialog = page.getByRole('dialog', { name: /Sesión de Lectura en Vivo/i });
    await expect(sessionDialog).toBeVisible({ timeout: 8000 });

    // Alternar a Pomodoro 25m y volver a Cronómetro libre
    const pomodoroBtn = sessionDialog.getByRole('button', { name: /Pomodoro 25m/i });
    await pomodoroBtn.click();
    await expect(sessionDialog.getByText('25:00')).toBeVisible();

    const freeTimerBtn = sessionDialog.getByRole('button', { name: /Cronómetro libre/i });
    await freeTimerBtn.click();
    await expect(sessionDialog.getByText('00:00')).toBeVisible();

    // Iniciar temporizador
    const playBtn = sessionDialog.getByRole('button', { name: /Iniciar lectura/i });
    await playBtn.click();
    await expect(sessionDialog.getByRole('button', { name: /Pausar sesión/i })).toBeVisible({ timeout: 5000 });

    // Probar sonido ambiente
    const ambientBtn = sessionDialog.getByRole('button', { name: /Sonido biblioteca/i });
    if (await ambientBtn.isVisible()) {
      await ambientBtn.click();
      await expect(sessionDialog.getByText(/Ambiente activo/i)).toBeVisible();
      // Apagar sonido ambiente
      await sessionDialog.getByRole('button', { name: /Ambiente activo/i }).click();
    }

    // 5. Finalizar sesión
    const finishBtn = sessionDialog.getByRole('button', { name: /Finalizar sesión de lectura/i });
    await finishBtn.click();

    // Verificar prompt: "¿En qué página te has quedado?"
    await expect(sessionDialog.getByText(/¿En qué página te has quedado\?/i)).toBeVisible();

    // Introducir nueva página
    const endPageInput = sessionDialog.locator('#reading-session-end-page');
    await expect(endPageInput).toBeVisible();
    const currentVal = parseInt(await endPageInput.inputValue(), 10) || 0;
    await endPageInput.fill(String(currentVal + 15));

    // Confirmar y guardar
    const saveBtn = sessionDialog.getByRole('button', { name: /Guardar y registrar/i });
    await saveBtn.click();

    // Verificar que el modal se cierra tras guardar
    await expect(sessionDialog).not.toBeVisible({ timeout: 8000 });
  });
});
