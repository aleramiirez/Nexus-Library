import { test, expect } from '@playwright/test';

test.describe('Fase 1: Barra de Progreso y Actualización Rápida Inline', () => {
  test('permite actualizar el progreso de lectura desde el panel de inicio y en la ficha del libro', async ({
    page
  }) => {
    // 1. Acceder en Modo Invitado
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // 2. Si no hay libro en lectura, cargar obras de muestra
    const sampleBtn = page.getByRole('button', { name: /Cargar.*(libros de muestra|catálogo)/i }).first();
    if (await sampleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await sampleBtn.click();
      await page.waitForTimeout(1500);
    }

    // 3. Verificar que aparece el panel de "Leyendo actualmente"
    await expect(page.getByText('Leyendo actualmente')).toBeVisible({ timeout: 10000 });

    // 4. Probar desplegar edición rápida con botón de lápiz abajo a la derecha
    const toggleEditBtn = page.locator('.rpb-btn-edit-toggle');
    await expect(toggleEditBtn).toBeVisible({ timeout: 6000 });
    await expect(toggleEditBtn).toHaveAttribute('aria-label', /Editar avance/i);
    await expect(toggleEditBtn).toHaveAttribute('aria-expanded', 'false');

    await toggleEditBtn.click();
    await expect(toggleEditBtn).toHaveAttribute('aria-label', /Cerrar/i);
    await expect(toggleEditBtn).toHaveAttribute('aria-expanded', 'true');

    // Comprobar panel de edición compacto (# Página | % Porcentaje, atajos, delta)
    const compactPanel = page.locator('#rpb-compact-panel');
    await expect(compactPanel).toBeVisible();
    await expect(page.getByRole('button', { name: '# Página' })).toBeVisible();
    await expect(page.getByRole('button', { name: '% Porcentaje' })).toBeVisible();
    await expect(page.locator('.rpb-delta')).toHaveText('sin cambios');

    // Botón Guardar debe estar deshabilitado inicialmente al no haber cambios
    const saveBtn = page.getByRole('button', { name: /Guardar/i }).first();
    await expect(saveBtn).toBeDisabled();

    // Pulsar atajo +10
    const plus10Btn = page.getByRole('button', { name: '+10' }).first();
    await expect(plus10Btn).toBeVisible();
    await plus10Btn.click();

    // Comprobar que el indicador de delta y el botón de guardar se actualizan
    await expect(page.locator('.rpb-delta')).toContainText('+10');
    await expect(saveBtn).toBeEnabled();

    // Probar botón Cancelar (restaura valor guardado y cierra)
    const cancelBtn = page.getByRole('button', { name: /Cancelar/i }).first();
    await cancelBtn.click();
    await expect(compactPanel).not.toBeVisible();
    await expect(toggleEditBtn).toHaveAttribute('aria-label', /Editar avance/i);

    // Reabrir y guardar un avance real
    await toggleEditBtn.click();
    await expect(compactPanel).toBeVisible();
    await plus10Btn.click();
    await saveBtn.click();

    // Al guardar: se cierra el panel y aparece el toast de confirmación
    await expect(compactPanel).not.toBeVisible();
    const toast = page.locator('.rpb-toast');
    await expect(toast).toContainText(/Avance guardado/i);

    // 5. Abrir ficha del libro y comprobar que los botones de avance (+25p) y slider están en el detalle
    const bookTitle = page.locator('.dashboard-card--hero h3, .library-paper-panel h3').first();
    if (await bookTitle.isVisible()) {
      await bookTitle.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 6000 });
      // Los botones de avance rápido (+25p) están en el detalle
      const detailQuickAdd = page.getByRole('button', { name: /\+25p/i }).first();
      await expect(detailQuickAdd).toBeVisible({ timeout: 6000 });
    }
  });
});
