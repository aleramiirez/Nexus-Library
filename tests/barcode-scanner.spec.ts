import { test, expect } from '@playwright/test';

test.describe('Fase 3: Escáner de Código de Barras ISBN', () => {
  test('abre el modal del escáner desde la interfaz y muestra visor ceremonial y fallbacks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Localizar el botón del escáner en la barra lateral o cabecera
    const scanBtn = page.getByRole('button', { name: 'Escanear código de barras (ISBN)' }).first();
    await expect(scanBtn).toBeVisible({ timeout: 10000 });
    await scanBtn.click();

    // Verificar que el modal de escaneo ceremonial se abre
    await expect(page.getByRole('dialog', { name: 'Escanear Código de Barras' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Lente Bibliográfica · Reconocimiento ISBN')).toBeVisible();

    // Verificar que se ofrecen los métodos de respaldo (foto y manual)
    await expect(page.getByRole('button', { name: /Subir o tomar foto/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Escribir ISBN/i })).toBeVisible();

    // Probar el formulario de introducción manual de ISBN
    await page.getByRole('button', { name: /Escribir ISBN/i }).click();
    const manualInput = page.locator('#manual-isbn-input');
    await expect(manualInput).toBeVisible();

    // Cerrar modal con el botón de cerrar
    const closeBtn = page.getByRole('button', { name: 'Cerrar escáner' });
    await closeBtn.click();
    await expect(page.getByRole('dialog', { name: 'Escanear Código de Barras' })).not.toBeVisible();
  });

  test('permite buscar por ISBN manual y previsualizar libro con botones de acción', async ({ page }) => {
    // Interceptar llamadas a Google Books y Open Library para prueba determinista
    await page.route('**/www.googleapis.com/books/v1/volumes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'cien-anios-soledad',
              volumeInfo: {
                title: 'Cien años de soledad',
                authors: ['Gabriel García Márquez'],
                publisher: 'Vintage Español',
                publishedDate: '1967',
                pageCount: 471,
                industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780307474728' }],
                categories: ['Ficción']
              }
            }
          ]
        })
      });
    });

    await page.route('**/openlibrary.org/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          docs: [
            {
              title: 'Cien años de soledad',
              author_name: ['Gabriel García Márquez'],
              first_publish_year: 1967,
              number_of_pages_median: 471,
              isbn: ['9780307474728']
            }
          ]
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Abrir escáner
    const scanBtn = page.getByRole('button', { name: 'Escanear código de barras (ISBN)' }).first();
    await scanBtn.click();

    // Abrir entrada manual
    await page.getByRole('button', { name: /Escribir ISBN/i }).click();
    const manualInput = page.locator('#manual-isbn-input');
    await manualInput.fill('9780307474728');

    // Pulsar Buscar
    const searchBtn = page.getByRole('button', { name: 'Buscar' });
    await searchBtn.click();

    // Verificar que aparece la ficha identificada con título y autor
    await expect(page.getByText('¡Libro identificado con éxito!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Cien años de soledad')).toBeVisible();
    await expect(page.getByText('Gabriel García Márquez')).toBeVisible();

    // Verificar los dos botones de acción obligatorios de la Fase 3
    await expect(page.getByRole('button', { name: /Añadir directamente a mi biblioteca/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Revisar y personalizar ficha antes de guardar/i })).toBeVisible();

    // Pulsar en añadir directamente
    await page.getByRole('button', { name: /Añadir directamente a mi biblioteca/i }).click();

    // Verificar que el modal se cierra tras guardar
    await expect(page.getByRole('dialog', { name: 'Escanear Código de Barras' })).not.toBeVisible();
  });

  test('permite abrir el escáner desde dentro de AddEditBookModal y autocompleta el formulario', async ({ page }) => {
    await page.route('**/www.googleapis.com/books/v1/volumes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'nombre-del-viento',
              volumeInfo: {
                title: 'El nombre del viento',
                authors: ['Patrick Rothfuss'],
                publisher: 'Plaza & Janés',
                publishedDate: '2007',
                pageCount: 662,
                industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788401352836' }],
                categories: ['Fantasía']
              }
            }
          ]
        })
      });
    });

    await page.route('**/openlibrary.org/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          docs: [
            {
              title: 'El nombre del viento',
              author_name: ['Patrick Rothfuss'],
              first_publish_year: 2007,
              number_of_pages_median: 662,
              isbn: ['9788401352836']
            }
          ]
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const guestBtn = page.getByRole('button', { name: 'Probar' });
    await expect(guestBtn).toBeVisible({ timeout: 10000 });
    await guestBtn.click();

    // Abrir modal de añadir libro desde la barra lateral
    const addBtn = page.getByRole('button', { name: 'Añadir libro' }).first();
    await addBtn.click();
    await expect(page.getByRole('dialog', { name: /Nuevo Registro Bibliográfico/i })).toBeVisible();

    // Pulsar el botón "Escanear ISBN" dentro del formulario
    const scanIsbnBtn = page.getByRole('button', { name: 'Escanear código de barras con la cámara (ISBN)' });
    await expect(scanIsbnBtn).toBeVisible();
    await scanIsbnBtn.click();

    // Verificar que se abre el escáner
    await expect(page.getByRole('dialog', { name: 'Escanear Código de Barras' })).toBeVisible();

    // Escribir ISBN manual dentro del escáner
    await page.getByRole('button', { name: /Escribir ISBN/i }).click();
    const manualInput = page.locator('#manual-isbn-input');
    await manualInput.fill('9788401352836');
    await page.getByRole('button', { name: 'Buscar' }).click();

    // En la vista previa del libro encontrado, pulsar "Añadir directamente a mi biblioteca"
    await expect(page.getByText('El nombre del viento')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Añadir directamente a mi biblioteca/i }).click();

    // El escáner se cierra y los campos del formulario quedan autocompletados
    const titleInput = page.locator('#add-book-nombre');
    await expect(titleInput).toHaveValue('El nombre del viento');
  });
});
