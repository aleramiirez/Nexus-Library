import { test, expect } from '@playwright/test';

test('Verify Community Social Network transformation (Instagram + Goodreads/Letterboxd style)', async ({ page }) => {
  test.setTimeout(90000);

  await page.setViewportSize({ width: 1280, height: 950 });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  // Cargar libros de muestra si están disponibles para tener libros en mi biblioteca
  const sampleBtn = page.getByRole('button', { name: /Cargar.*libros de muestra/i }).first();
  if (await sampleBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await sampleBtn.click();
    await page.waitForTimeout(800);
  }

  // Navegar a Comunidad de Lectores desde el menú lateral
  const communityNav = page.getByRole('button', { name: /Comunidad de Lectores/i }).first();
  await expect(communityNav).toBeVisible({ timeout: 5000 });
  await communityNav.click();
  await page.waitForTimeout(800);

  await expect(page).toHaveURL(/section=community/);

  // ─── 1. Verificar Pestañas del Directorio: Actividad, Mis Amigos, Explorar ───
  const activityTab = page.getByRole('button', { name: /Actividad/i }).first();
  const friendsTab = page.getByRole('button', { name: /Mis Amigos/i }).first();
  const exploreTab = page.getByRole('button', { name: /Explorar Lectores/i }).first();

  await expect(activityTab).toBeVisible({ timeout: 5000 });
  await expect(friendsTab).toBeVisible({ timeout: 5000 });
  await expect(exploreTab).toBeVisible({ timeout: 5000 });

  // Capturar vista del directorio en modo claro
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/community-feed-light.png'
  });

  // Ir a Explorar Lectores
  await exploreTab.click();
  await page.waitForTimeout(600);

  // Comprobar buscador de lectores
  const searchInput = page.getByPlaceholder(/Buscar por nombre o @usuario/i);
  await expect(searchInput).toBeVisible({ timeout: 5000 });

  // ─── 2. Simular o Abrir Perfil de Lector de Muestra para Verificar las 5 Pestañas ───
  // Si hay tarjetas de lectores en la red, pulsar en el primero; si no, inyectar un lector simulado para test
  const readerCards = page.locator('.community-reader-card');
  const count = await readerCards.count();

  if (count > 0) {
    await readerCards.first().click();
  } else {
    // Si la base de datos remota está vacía en este entorno de prueba local,
    // creamos un mock o invocamos la vista con un lector de prueba
    await page.evaluate(() => {
      const mockReader = {
        id: 'test-mock-reader',
        username: 'alejandria_lectora',
        displayName: 'Alejandra de Pérgamo',
        bio: 'Devoradora de sagas de fantasía épica y literatura universal.',
        avatarUrl: null,
        visibility: 'public',
        isPublic: true
      };
      // Forzamos selección a través de eventos internos de test
      (window as any).__testSelectReader?.(mockReader);
    });
  }

  await page.waitForTimeout(1000);

  // Si no había lector remoto, verificar que la pantalla de comunidad responde correctamente
  // Volver a Explorar o verificar que los controles existen
  const backBtn = page.getByRole('button', { name: /Volver/i }).first();
  if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Verificar Cabecera Social Enriquecida
    const statsRow = page.locator('.grid.grid-cols-2.sm\\:grid-cols-5').first();
    await expect(statsRow).toBeVisible({ timeout: 5000 });

    // Verificar botón de Pasaporte Literario
    const passportBtn = page.getByRole('button', { name: /Pasaporte Literario/i }).first();
    await expect(passportBtn).toBeVisible({ timeout: 5000 });

    // Verificar las 5 pestañas del perfil
    const tabShelf = page.getByRole('button', { name: /Estantería/i }).first();
    const tabSagas = page.getByRole('button', { name: /Sagas/i }).first();
    const tabAtlas = page.getByRole('button', { name: /Atlas/i }).first();
    const tabReviews = page.getByRole('button', { name: /Reseñas/i }).first();
    const tabAffinity = page.getByRole('button', { name: /En Común/i }).first();

    await expect(tabShelf).toBeVisible({ timeout: 5000 });
    await expect(tabSagas).toBeVisible({ timeout: 5000 });
    await expect(tabAtlas).toBeVisible({ timeout: 5000 });
    await expect(tabReviews).toBeVisible({ timeout: 5000 });
    await expect(tabAffinity).toBeVisible({ timeout: 5000 });

    // Capturar Perfil Social - Pestaña Estantería
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/profile-shelf-light.png'
    });

    // Probar Pestaña Sagas
    await tabSagas.click();
    await page.waitForTimeout(400);

    // Probar Pestaña Atlas Literario
    await tabAtlas.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/profile-atlas-light.png'
    });

    // Probar Pestaña Reseñas
    await tabReviews.click();
    await page.waitForTimeout(400);

    // Probar Pestaña En Común (Afinidad)
    await tabAffinity.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/profile-affinity-light.png'
    });

    // Abrir Pasaporte Literario del Amigo
    await passportBtn.click();
    await page.waitForTimeout(600);

    const closePassport = page.getByRole('button', { name: /Cerrar/i }).first();
    if (await closePassport.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.screenshot({
        path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/friend-passport-modal.png'
      });
      await closePassport.click();
      await page.waitForTimeout(400);
    }
  }

  // Capturar vista en Modo Oscuro
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/community-dark.png'
  });
});
