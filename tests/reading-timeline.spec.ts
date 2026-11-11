import { test, expect } from '@playwright/test';

test.describe('Línea de Tiempo Literaria (Timeline del Año)', () => {
  test('permite alternar entre Reto & Métricas y la Cronología Literaria interactiva', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 950 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 1. Entrar como invitado
    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Cargar muestra si está disponible
    const sampleBtn = page.getByRole('button', { name: /Explorar con 4 libros de muestra|Cargar.*muestra/i }).first();
    if (await sampleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await sampleBtn.click();
      await page.waitForTimeout(600);
    }

    // 2. Navegar a Reto & Estadísticas
    const statsNavBtn = page.getByRole('button', { name: /Reto & Estadísticas|Estadísticas/i }).first();
    await expect(statsNavBtn).toBeVisible({ timeout: 10000 });
    await statsNavBtn.click();

    // 3. Verificar selector de vista inicial
    const metricsBtn = page.getByRole('button', { name: /Reto & Métricas/i }).first();
    const timelineBtn = page.getByRole('button', { name: /Línea de Tiempo/i }).first();
    await expect(metricsBtn).toBeVisible({ timeout: 10000 });
    await expect(timelineBtn).toBeVisible({ timeout: 10000 });

    // 4. Cambiar a la vista de Línea de Tiempo
    await timelineBtn.click();
    await expect(page.getByText(/Cronología Literaria/i).first()).toBeVisible({ timeout: 6000 });

    // Verificar controles del timeline: botones de orden, buscador y meses
    const sortBtn = page.getByRole('button', { name: /Recientes|Antiguos/i }).first();
    await expect(sortBtn).toBeVisible();
    await sortBtn.click();
    await expect(page.getByRole('button', { name: /Recientes|Antiguos/i }).first()).toBeVisible();

    // 5. Volver a la vista de Reto & Métricas
    await metricsBtn.click();
    await expect(page.getByText(/Cadencia Mensual de Lectura/i).first()).toBeVisible({ timeout: 6000 });
  });
});
