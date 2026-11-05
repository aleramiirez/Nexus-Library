import { test, expect } from '@playwright/test';

test('Deep verification of Bookshelf, Sagas Vitrines, and 3D Book Detail Modal in Community', async ({ page }) => {
  test.setTimeout(90000);

  await page.setViewportSize({ width: 1280, height: 950 });

  // Definir mock del lector seleccionado y sus libros
  const mockProfile = {
    id: 'mock-reader-42',
    username: 'clara_literaria',
    displayName: 'Clara de Montealegre',
    bio: 'Enamorada de la literatura gótica, el realismo mágico y las grandes sagas de fantasía.',
    avatarUrl: null,
    visibility: 'public',
    isPublic: true,
    orderFrame: 'IV',
    level: 16
  };

  const mockBooks = [
    {
      id: 'mock-book-1',
      nombre: 'Cien Años de Soledad',
      autor: 'Gabriel García Márquez',
      genero: 'Realismo Mágico',
      subgeneros: [],
      fechaPublicacion: 1967,
      paginas: 471,
      paginaActual: 471,
      puntuacion: 5,
      progreso: '✅ Leído',
      pais: 'Colombia',
      resena: 'Una de las experiencias literarias más sobrecogedoras de mi vida. La familia Buendía perdura para siempre en la memoria.',
      citas: ['Muchos años después, frente al pelotón de fusilamiento...', 'El secreto de una buena vejez no es otra cosa que un pacto honrado con la soledad.'],
      formato: 'Físico (Tapa dura)',
      propiedad: 'Propio',
      sagaNombre: 'Macondo',
      volumen: 1,
      portadaUrl: ''
    },
    {
      id: 'mock-book-2',
      nombre: 'El Nombre del Viento',
      autor: 'Patrick Rothfuss',
      genero: 'Fantasía Épica',
      subgeneros: [],
      fechaPublicacion: 2007,
      paginas: 662,
      paginaActual: 330,
      puntuacion: 4.5,
      progreso: '⏳ Leyendo',
      pais: 'Estados Unidos',
      resena: 'La prosa de Rothfuss tiene una cadencia musical que te atrapa desde el primer silencio en tres partes.',
      citas: ['He robado princesas a reyes en el sueño. Incendié la ciudad de Trebon.'],
      formato: 'Digital (Ebook)',
      propiedad: 'Propio',
      sagaNombre: 'Crónica del Asesino de Reyes',
      volumen: 1,
      portadaUrl: ''
    },
    {
      id: 'mock-book-3',
      nombre: 'El Temor de un Hombre Sabio',
      autor: 'Patrick Rothfuss',
      genero: 'Fantasía Épica',
      subgeneros: [],
      fechaPublicacion: 2011,
      paginas: 1190,
      paginaActual: 120,
      puntuacion: 4,
      progreso: '⏸️ Pausado',
      pais: 'Estados Unidos',
      resena: '',
      citas: [],
      formato: 'Digital (Ebook)',
      propiedad: 'Propio',
      sagaNombre: 'Crónica del Asesino de Reyes',
      volumen: 2,
      portadaUrl: ''
    },
    {
      id: 'mock-book-4',
      nombre: 'Don Quijote de la Mancha',
      autor: 'Miguel de Cervantes',
      genero: 'Clásico',
      subgeneros: [],
      fechaPublicacion: 1605,
      paginas: 863,
      paginaActual: 863,
      puntuacion: 5,
      progreso: '✅ Leído',
      pais: 'España',
      resena: 'Insuperable e inmortal. Cada relectura revela una nueva capa de lucidez e ironía.',
      citas: ['La libertad, Sancho, es uno de los más preciosos dones que a los hombres dieron los cielos.'],
      formato: 'Físico (Rústica)',
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

  // 1. Verificar pestaña 📚 Estantería con diseño de balda de madera (BookShelf)
  const tabShelf = page.getByRole('button', { name: /Estantería/i }).first();
  await expect(tabShelf).toBeVisible({ timeout: 8000 });
  await tabShelf.click();
  await page.waitForTimeout(500);

  // Verificar que la estantería física de madera (.bookcase) está presente
  const woodShelf = page.locator('.bookcase');
  await expect(woodShelf).toBeVisible({ timeout: 5000 });

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-shelf-wooden.png'
  });

  // Conmutar a vista de Cuadrícula
  const gridBtn = page.getByRole('button', { name: /Cuadrícula/i }).first();
  await expect(gridBtn).toBeVisible();
  await gridBtn.click();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-shelf-grid.png'
  });

  // Volver a vista de Balda
  const shelfBtn = page.getByRole('button', { name: /Balda/i }).first();
  await expect(shelfBtn).toBeVisible();
  await shelfBtn.click();
  await page.waitForTimeout(400);

  // Abrir libro desde la balda física para verificar el BookDetailModal con animación 3D
  const firstBook = page.locator('.shelf-book').first();
  await expect(firstBook).toBeVisible();
  await firstBook.click();
  await page.waitForTimeout(800);

  // Verificar que el BookDetailModal está abierto y muestra la valoración del lector
  const bookDialog = page.getByRole('dialog').first();
  await expect(bookDialog).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Valoración de Clara de Montealegre').filter({ hasNotText: 'xyzNonExistent' }).locator('visible=true')).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-book-detail-flip-modal.png'
  });

  // Cerrar modal pulsando "Cerrar ficha"
  const closeFichaBtn = page.getByRole('button', { name: /Cerrar ficha/i }).first();
  if (await closeFichaBtn.isVisible()) {
    await closeFichaBtn.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);

  // 2. Verificar pestaña 🏛️ Sagas con vitrinas de madera (SagaVitrine en vit-grid)
  const tabSagas = page.locator('main').getByRole('button', { name: /Sagas/i }).first();
  await expect(tabSagas).toBeVisible();
  await tabSagas.click();
  await page.waitForTimeout(500);

  // Verificar contenedor de vitrinas
  const vitGrid = page.locator('.vit-grid');
  await expect(vitGrid).toBeVisible({ timeout: 5000 });

  const vitrines = page.locator('.saga-vitrine');
  await expect(vitrines.first()).toBeVisible();

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-sagas-vitrines-closed.png'
  });

  // Abrir una vitrina pulsando su botón toggle
  const firstToggle = page.locator('.vit-toggle').first();
  await expect(firstToggle).toBeVisible();
  await firstToggle.click();
  await page.waitForTimeout(600);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-sagas-vitrine-open.png'
  });

  // Pulsar un tomo dentro de la vitrina para abrir BookDetailModal
  const vitrineBookBtn = page.locator('.vit-book-btn').first();
  if (await vitrineBookBtn.isVisible()) {
    await vitrineBookBtn.click();
    await page.waitForTimeout(800);

    const vitrineDialog = page.getByRole('dialog').first();
    await expect(vitrineDialog).toBeVisible({ timeout: 5000 });
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-saga-book-detail-modal.png'
    });

    const closeFichaBtn2 = page.getByRole('button', { name: /Cerrar ficha/i }).first();
    if (await closeFichaBtn2.isVisible()) {
      await closeFichaBtn2.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }

  // 3. Pestaña 🌍 Atlas
  const tabAtlas = page.locator('main').getByRole('button', { name: /Atlas/i }).first();
  await tabAtlas.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-3-atlas.png'
  });

  // 4. Pestaña 💬 Reseñas
  const tabReviews = page.locator('main').getByRole('button', { name: /Reseñas/i }).first();
  await tabReviews.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-4-reviews.png'
  });

  // 5. Pestaña 🤝 En Común
  const tabAffinity = page.locator('main').getByRole('button', { name: /En Común/i }).first();
  await tabAffinity.click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-5-affinity.png'
  });

  // Pasaporte Literario modal
  const passportBtn = page.getByRole('button', { name: /Pasaporte Literario/i }).first();
  if (await passportBtn.isVisible()) {
    await passportBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-passport-modal-open.png'
    });

    const closeBtn = page.getByRole('button', { name: /Cerrar/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }
});
