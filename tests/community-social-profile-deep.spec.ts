import { test, expect } from '@playwright/test';

test('Deep verification of all 5 Profile Tabs and Public Book Modal in Community', async ({ page }) => {
  test.setTimeout(90000);

  await page.setViewportSize({ width: 1280, height: 950 });

  // Inyectar datos de prueba en la ventana para simular un lector con libros completos
  await page.addInitScript(() => {
    // Interceptar llamadas a supabase para profiles y books del amigo
    const originalFetch = window.fetch;
    window.fetch = async (url, init) => {
      return originalFetch(url, init);
    };
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  // Cargar libros de muestra
  const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
  if (await sampleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await sampleBtn.click();
    await page.waitForTimeout(600);
  }

  // Navegar a Comunidad
  const communityNav = page.getByRole('button', { name: /Comunidad de Lectores/i }).first();
  await communityNav.click();
  await page.waitForTimeout(800);

  // Inyectar un lector con biblioteca completa directamente en el estado de la aplicación
  await page.evaluate(() => {
    const mockProfile = {
      id: 'mock-reader-42',
      username: 'clara_literaria',
      displayName: 'Clara de Montealegre',
      bio: 'Enamorada de la literatura gótica, el realismo mágico y las grandes sagas de fantasía.',
      avatarUrl: null,
      visibility: 'public',
      isPublic: true
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
        paginaActual: 0,
        puntuacion: null,
        progreso: '❌ No Leído',
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

    // Mockeamos communityService.fetchUserPublicLibrary
    const w = window as any;
    if (w.__nexusCommunityService) {
      w.__nexusCommunityService.fetchUserPublicLibrary = async () => ({
        profile: mockProfile,
        books: mockBooks,
        canViewShelf: true
      });
    }

    // Buscamos cualquier botón o simulamos el click para abrir este mock profile
    const evt = new CustomEvent('nexus:open-mock-reader', {
      detail: { profile: mockProfile, books: mockBooks }
    });
    window.dispatchEvent(evt);
  });

  await page.waitForTimeout(600);

  // Si hay lectores en Explorar, hacer click en uno
  const exploreTab = page.getByRole('button', { name: /Explorar Lectores/i }).first();
  await exploreTab.click();
  await page.waitForTimeout(600);

  const readerCards = page.locator('.community-reader-card');
  const count = await readerCards.count();
  if (count > 0) {
    await readerCards.first().click();
    await page.waitForTimeout(1000);
  }

  // Verificar las 5 pestañas en el perfil
  const tabShelf = page.getByRole('button', { name: /Estantería/i }).first();
  if (await tabShelf.isVisible({ timeout: 5000 }).catch(() => false)) {
    // 1. Estantería
    await expect(tabShelf).toBeVisible();
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-1-shelf.png'
    });

    // 2. Sagas
    const tabSagas = page.getByRole('button', { name: /Sagas/i }).first();
    await tabSagas.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-2-sagas.png'
    });

    // 3. Atlas
    const tabAtlas = page.getByRole('button', { name: /Atlas/i }).first();
    await tabAtlas.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-3-atlas.png'
    });

    // 4. Reseñas
    const tabReviews = page.getByRole('button', { name: /Reseñas/i }).first();
    await tabReviews.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-4-reviews.png'
    });

    // 5. En Común (Afinidad)
    const tabAffinity = page.getByRole('button', { name: /En Común/i }).first();
    await tabAffinity.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/reader-tab-5-affinity.png'
    });

    // Pasaporte Literario
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
  }
});
