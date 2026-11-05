import { test, expect } from '@playwright/test';

test('Verify Community Stories Bar circular framed avatars and dotted parchment cards', async ({ page }) => {
  test.setTimeout(90000);

  await page.setViewportSize({ width: 1280, height: 950 });

  // Inyectar mocks de amigos con foto real, preset y marcos de la Orden
  await page.addInitScript(() => {
    const mockFriends = [
      {
        id: 'friendship-1',
        requesterId: 'me',
        addresseeId: 'friend-1',
        status: 'accepted',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
        friendProfile: {
          id: 'friend-1',
          username: 'alejandro_val',
          displayName: 'Alejandro',
          avatarUrl: 'preset:owl',
          bio: 'Amante de los clásicos y la novela histórica.',
          isPublic: true,
          orderFrame: 'III',
          level: 12
        }
      },
      {
        id: 'friendship-2',
        requesterId: 'me',
        addresseeId: 'friend-2',
        status: 'accepted',
        createdAt: '2026-10-02T10:00:00Z',
        updatedAt: '2026-10-02T10:00:00Z',
        friendProfile: {
          id: 'friend-2',
          username: 'perea7r',
          displayName: 'Perea',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
          bio: 'Devorando fantasía de Brandon Sanderson.',
          isPublic: true,
          orderFrame: 'II',
          level: 6
        }
      },
      {
        id: 'friendship-3',
        requesterId: 'me',
        addresseeId: 'friend-3',
        status: 'accepted',
        createdAt: '2026-10-03T10:00:00Z',
        updatedAt: '2026-10-03T10:00:00Z',
        friendProfile: {
          id: 'friend-3',
          username: 'fernarce',
          displayName: 'Fernando',
          avatarUrl: 'preset:compass',
          bio: 'Explorador del Códice y las crónicas olvidadas.',
          isPublic: true,
          orderFrame: 'VI',
          level: 25
        }
      }
    ];

    const mockActivity = {
      readingNow: [
        {
          friend: mockFriends[1].friendProfile,
          book: {
            id: 'book-perea-1',
            nombre: 'El héroe de las eras',
            autor: 'Brandon Sanderson',
            saga: 'Nacidos de la Bruma Era 1',
            portadaUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80',
            progreso: '⏳ Leyendo',
            paginas: 750,
            paginaActual: 420,
            resena: '',
            citas: []
          }
        }
      ],
      recentReadsAndReviews: [
        {
          friend: mockFriends[0].friendProfile,
          book: {
            id: 'book-ale-1',
            nombre: 'El nombre del viento',
            autor: 'Patrick Rothfuss',
            saga: 'Crónica del Asesino de Reyes',
            portadaUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&q=80',
            progreso: '✅ Leído',
            paginas: 880,
            puntuacion: 4.5,
            resena: 'Una prosa lírica exquisita. Kvothe es un personaje inolvidable.',
            citas: ['Viajé, amé, perdí, confié y fui traicionado.']
          }
        }
      ],
      friendsReadingCounts: {
        'friend-2': 1
      },
      friendsRanks: {
        'friend-1': { orderFrame: 'III', level: 12 },
        'friend-2': { orderFrame: 'II', level: 6 },
        'friend-3': { orderFrame: 'VI', level: 25 }
      }
    };

    (window as any).__MOCK_FRIENDS__ = mockFriends;
    (window as any).__MOCK_ACTIVITY__ = mockActivity;
  });

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const guestBtn = page.getByRole('button', { name: 'Probar' });
  await expect(guestBtn).toBeVisible({ timeout: 10000 });
  await guestBtn.click();

  // Navegar a Comunidad
  const communityNav = page.getByRole('button', { name: /Comunidad de Lectores/i }).first();
  await expect(communityNav).toBeVisible({ timeout: 5000 });
  await communityNav.click();
  await page.waitForTimeout(1000);

  // Asegurar inyección
  await page.evaluate(() => {
    (window as any).__injectCommunityMocks?.((window as any).__MOCK_FRIENDS__, (window as any).__MOCK_ACTIVITY__);
  });
  await page.waitForTimeout(600);

  // Capturar pantalla del Círculo de Amigos y Feed
  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/community-stories-and-feed-light.png'
  });

  // Cambiar a modo oscuro
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await page.waitForTimeout(400);

  await page.screenshot({
    path: 'C:/Users/0021513/.gemini/antigravity/brain/6ebe5c61-ab5d-4713-a258-c2ccfed7ecb8/community-stories-and-feed-dark.png'
  });
});
