import { test, expect } from '@playwright/test';

test('Verify Atlas map country conquest synchronization and realistic book texture across tabs', async ({ page }) => {
  test.setTimeout(90000);

  await page.setViewportSize({ width: 1280, height: 950 });

  const mockProfile = {
    id: 'mock-reader-us-conquest',
    username: 'robert_frost',
    displayName: 'Robert Frost',
    bio: 'Poeta y lector empedernido de letras norteamericanas.',
    avatarUrl: null,
    visibility: 'public',
    isPublic: true,
    orderFrame: 'IV',
    level: 18
  };

  const mockBooks = [
    {
      id: 'us-book-1',
      nombre: 'El Gran Gatsby',
      autor: 'F. Scott Fitzgerald',
      genero: 'Clásico',
      subgeneros: [],
      fechaPublicacion: 1925,
      paginas: 218,
      paginaActual: 218,
      puntuacion: 5,
      progreso: '✅ Leído',
      pais: 'EEUU', // Alias común de Estados Unidos
      resena: 'Una elegía insuperable a las ilusiones de la era del jazz.',
      citas: ['Así seguimos adelante, botes contra la corriente...'],
      formato: 'Físico (Tapa dura)',
      propiedad: 'Propio',
      sagaNombre: '',
      volumen: null,
      portadaUrl: ''
    },
    {
      id: 'us-book-2',
      nombre: 'Moby Dick',
      autor: 'Herman Melville',
      genero: 'Aventura',
      subgeneros: [],
      fechaPublicacion: 1851,
      paginas: 635,
      paginaActual: 320,
      puntuacion: 4.5,
      progreso: '⏳ Leyendo',
      pais: 'Estados Unidos', // Nombre completo en español
      resena: 'La obsesión humana llevada al océano.',
      citas: ['Llamadme Ismael.'],
      formato: 'Digital (Ebook)',
      propiedad: 'Propio',
      sagaNombre: '',
      volumen: null,
      portadaUrl: ''
    }
  ];

  // Inyectar en window antes de cargar
  await page.addInitScript(({ profile, books }) => {
    (window as any).__MOCK_SELECTED_READER__ = { profile, books };
  }, { profile: mockProfile, books: mockBooks });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  // Navegar a Comunidad
  const communityNav = page.getByRole('button', { name: /Comunidad de Lectores/i }).first();
  await expect(communityNav).toBeVisible({ timeout: 5000 });
  await communityNav.click();
  await page.waitForTimeout(800);

  // Asegurar inyección si no se cargó por initScript
  await page.evaluate(({ profile, books }) => {
    if (typeof (window as any).__injectSelectedReader === 'function') {
      (window as any).__injectSelectedReader(profile, books);
    }
  }, { profile: mockProfile, books: mockBooks });

  await page.waitForTimeout(800);

  // 1. Pestaña 🌍 Atlas
  const tabAtlas = page.locator('main').getByRole('button', { name: /Atlas/i }).first();
  await expect(tabAtlas).toBeVisible({ timeout: 8000 });
  await tabAtlas.click();
  await page.waitForTimeout(800);

  // Verificar que el pill de Estados Unidos muestra el estado conquistado ('conquered')
  const usPill = page.locator('button.la-pill[data-code="US"]');
  await expect(usPill).toBeVisible({ timeout: 5000 });
  const usPillClass = await usPill.getAttribute('class');
  console.log('US Pill Class:', usPillClass);
  expect(usPillClass).toContain('la-pill--conquered');

  // Pulsar el pill de Estados Unidos para ver el detalle de sus libros
  await usPill.click();
  await page.waitForTimeout(600);

  // El detalle del país debe mostrar Estados Unidos con sus libros
  await expect(page.locator('h3', { hasText: 'Estados Unidos' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('El Gran Gatsby').first()).toBeVisible();
  await expect(page.getByText('Moby Dick').first()).toBeVisible();

  // Capturar screenshot del Atlas mostrando el país conquistado y sus libros
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-atlas-us-conquered-verified.png'
  });

  // 2. Pestaña 📚 Estantería en Cuadrícula
  const tabShelf = page.locator('main').getByRole('button', { name: /Estantería/i }).first();
  await tabShelf.click();
  await page.waitForTimeout(500);

  const gridBtn = page.getByRole('button', { name: /Cuadrícula/i }).first();
  await expect(gridBtn).toBeVisible({ timeout: 5000 });
  await gridBtn.click();
  await page.waitForTimeout(500);

  // Verificar que los libros tienen la clase .book-cover y están presentes
  const covers = page.locator('.book-cover');
  expect(await covers.count()).toBeGreaterThan(0);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-shelf-grid-textured-verified.png'
  });

  // 3. Pestaña 💬 Reseñas
  const tabReviews = page.locator('main').getByRole('button', { name: /Reseñas/i }).first();
  await tabReviews.click();
  await page.waitForTimeout(500);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-reviews-textured-verified.png'
  });
});
