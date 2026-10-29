import { Book, Saga } from '../types/models';
import { db, saveBookRecord, upsertSaga, deleteBookRecord, ensureValidUuid } from '../db/database';

export const SAMPLE_BOOK_IDS = {
  dorianGray: 'a1000000-0000-4000-8000-000000000001',
  cumbresBorrascosas: 'a1000000-0000-4000-8000-000000000002',
  frankenstein: 'a1000000-0000-4000-8000-000000000003',
  sombraDelViento: 'a1000000-0000-4000-8000-000000000004'
} as const;

export const SAMPLE_SAGA_ID = 'a1000000-0000-4000-8000-000000000010';

export const SAMPLE_ISBNS = new Set([
  '9780141439570',
  '9780141439556',
  '9780141439471',
  '9788408043645'
]);

export const SAMPLE_BOOKS: Book[] = [
  {
    id: SAMPLE_BOOK_IDS.dorianGray,
    nombre: 'El retrato de Dorian Gray',
    autor: 'Oscar Wilde',
    genero: '🏛️ Clásicos',
    subgeneros: ['🌍 Clásicos Universales', '🕯️ Gótico Clásico & Romanticismo'],
    fechaPublicacion: 1890,
    paginas: 288,
    puntuacion: 5,
    progreso: '✅ Leído',
    sagaId: null,
    sagaNombre: '',
    volumen: null,
    fechaInicio: '2026-09-10',
    fechaFin: '2026-09-18',
    lecturaVirtual: 'Físico',
    tiempoLectura: '8 días',
    isbn: '9780141439570',
    editorial: 'Lippincott’s Monthly Magazine / Penguin Classics',
    idioma: 'Español',
    edicion: 'Edición Ilustrada de Colección',
    sinopsis:
      'Ambientada en el refinado Londres victoriano, narra la historia de un joven cuya belleza deslumbra al pintor Basil Hallward. Fascinado por las teorías hedonistas de Lord Henry Wotton, Dorian formula el trágico deseo de conservar su juventud eterna mientras su retrato absorbe la decrepitud y las cicatrices morales de sus pecados.',
    notasPersonales:
      'Una obra de una brillantez estética insuperable. El diálogo entre el arte, la moral y la decadencia humana está lleno de aforismos memorables que siguen vigentes.',
    citas: [
      'El único modo de librarse de la tentación es ceder a ella. Resiste, y tu alma enfermará por el deseo de lo que se prohibió a sí misma.',
      'Definir es limitar.',
      'Detrás de toda cosa exquisita que existía, había algo trágico.'
    ],
    portadaUrl: 'https://covers.openlibrary.org/b/id/10642877-L.jpg',
    portadaFallbackUrl: 'https://covers.openlibrary.org/b/isbn/9780141439570-L.jpg',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: SAMPLE_BOOK_IDS.cumbresBorrascosas,
    nombre: 'Cumbres Borrascosas',
    autor: 'Emily Brontë',
    genero: '🏛️ Clásicos',
    subgeneros: ['🕯️ Gótico Clásico & Romanticismo', '💔 Drama'],
    fechaPublicacion: 1847,
    paginas: 416,
    puntuacion: 5,
    progreso: '✅ Leído',
    sagaId: null,
    sagaNombre: '',
    volumen: null,
    fechaInicio: '2026-09-22',
    fechaFin: '2026-10-04',
    lecturaVirtual: 'Físico',
    tiempoLectura: '12 días',
    isbn: '9780141439556',
    editorial: 'Thomas Cautley Newby / Penguin Classics',
    idioma: 'Español',
    edicion: 'Edición Rústica de Lujo',
    sinopsis:
      'Una arrebatadora tragedia de amor, odio y venganza ambientada en los inhóspitos páramos de Yorkshire. La relación salvaje e indómita entre Catherine Earnshaw y el huérfano Heathcliff desencadena una espiral de pasiones destructivas que atormentará a dos generaciones.',
    notasPersonales:
      'Una tormenta visceral. La atmósfera gótica y el retrato psicológico de la obsesión de Heathcliff no tienen parangón en la literatura decimonónica.',
    citas: [
      'Sea de lo que sea que estén hechas nuestras almas, la suya y la mía son iguales.',
      'Si todo lo demás pereciera y él se salvara, yo seguiría existiendo; y si todo lo demás permaneciera y él fuera aniquilado, el universo se convertiría en un extraño vacío.',
      'La traición y la violencia son lanzas puntiagudas que hieren más a quienes las empuñan que a quienes son atacados con ellas.'
    ],
    portadaUrl: 'https://covers.openlibrary.org/b/id/12699298-L.jpg',
    portadaFallbackUrl: 'https://covers.openlibrary.org/b/isbn/9780141439556-L.jpg',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: SAMPLE_BOOK_IDS.frankenstein,
    nombre: 'Frankenstein o el moderno Prometeo',
    autor: 'Mary Shelley',
    genero: '🔭 Ciencia Ficción & Distopía',
    subgeneros: ['🕯️ Terror Gótico', '🌍 Clásicos Universales'],
    fechaPublicacion: 1818,
    paginas: 280,
    puntuacion: 4,
    progreso: '⏳ Leyendo',
    sagaId: null,
    sagaNombre: '',
    volumen: null,
    fechaInicio: '2026-10-18',
    fechaFin: '',
    lecturaVirtual: 'Digital / eBook',
    tiempoLectura: 'En curso',
    isbn: '9780141439471',
    editorial: 'Lackington, Hughes, Harding, Mavor & Jones',
    idioma: 'Español',
    edicion: 'Texto Original de 1818',
    sinopsis:
      'El joven científico ginebrino Víctor Frankenstein desafía las leyes naturales al infundir vida a un ser compuesto por fragmentos de cadáveres humanos. Horrorizado por el resultado de su propia creación, lo abandona a su suerte, desatando una trágica búsqueda de identidad, venganza y redención.',
    notasPersonales:
      'Releyéndolo con fascinación. Mucho más filosófico y desgarrador de lo que el cine suele reflejar; el monstruo posee una elocuencia conmovedora.',
    citas: [
      'Cuidado, pues no conozco el miedo y por tanto soy poderoso.',
      'Soy malvado porque soy desgraciado. ¿Acaso no me rechaza y me odia toda la humanidad?'
    ],
    portadaUrl: 'https://covers.openlibrary.org/b/id/12818862-L.jpg',
    portadaFallbackUrl: 'https://covers.openlibrary.org/b/isbn/9780141439471-L.jpg',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: SAMPLE_BOOK_IDS.sombraDelViento,
    nombre: 'La sombra del viento',
    autor: 'Carlos Ruiz Zafón',
    genero: '🕵️ Misterio, Thriller & Novela Negra',
    subgeneros: ['🕵️ Misterio & Detective', '🕯️ Terror Gótico'],
    fechaPublicacion: 2001,
    paginas: 576,
    puntuacion: 5,
    progreso: '✅ Leído',
    sagaId: SAMPLE_SAGA_ID,
    sagaNombre: 'El Cementerio de los Libros Olvidados',
    volumen: 1,
    fechaInicio: '2026-10-06',
    fechaFin: '2026-10-16',
    lecturaVirtual: 'Físico',
    tiempoLectura: '10 días',
    isbn: '9788408043645',
    editorial: 'Planeta',
    idioma: 'Español',
    edicion: 'Edición Conmemorativa',
    sinopsis:
      'Un amanecer de 1945, un muchacho es conducido por su padre a un misterioso lugar oculto en el corazón de la ciudad vieja de Barcelona: El Cementerio de los Libros Olvidados. Allí, Daniel Sempere encuentra un libro maldito que cambiará el rumbo de su vida y le arrastrará a un laberinto de intrigas, secretos enterrados y pasiones prohibidas.',
    notasPersonales:
      'El mayor homenaje contemporáneo al amor por los libros, las librerías antiguas y el arte de contar historias. Una prosa magnética con una Barcelona mágica y umbría.',
    citas: [
      'Cada libro, cada tomo que ves, tiene alma. El alma de quien lo escribió, y el alma de quienes lo leyeron, vivieron y soñaron con él.',
      'Pocas cosas marcan tanto a un lector como el primer libro que realmente se abre camino en su corazón.',
      'Las palabras con que se envenena el corazón de un hijo, por mezquindad o por ignorancia, se quedan enquistadas en la memoria y tarde o temprano le queman el alma.'
    ],
    portadaUrl: 'https://covers.openlibrary.org/b/id/9036987-L.jpg',
    portadaFallbackUrl: 'https://covers.openlibrary.org/b/isbn/9788408043645-L.jpg',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SAMPLE_SAGA: Saga = {
  id: SAMPLE_SAGA_ID,
  nombre: 'El Cementerio de los Libros Olvidados',
  descripcion: 'Tetralogía gótica y literaria ambientada en la Barcelona misteriosa de Carlos Ruiz Zafón.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

const SAMPLE_ID_SET = new Set<string>([
  ...Object.values(SAMPLE_BOOK_IDS),
  'sample_dorian_gray',
  'sample_cumbres_borrascosas',
  'sample_frankenstein',
  'sample_sombra_del_viento'
]);

/**
 * Carga 4 obras maestras de muestra con sagas, citas, portadas y reseñas en Dexie DB y Supabase.
 */
export async function loadSampleLibrary(userId?: string): Promise<number> {
  // Limpiar cualquier registro previo que haya sido sobreescrito accidentalmente bajo userId
  if (userId) {
    try {
      const validUserId = ensureValidUuid(userId);
      const rogue = await db.books.get(validUserId);
      if (rogue && (SAMPLE_ISBNS.has(rogue.isbn) || rogue.nombre === 'La sombra del viento')) {
        await deleteBookRecord(validUserId);
      }
    } catch (err) {
      console.warn('[SampleLibrary] Limpieza previa de rogue id:', err);
    }
  }

  // 1. Guardar la saga de muestra
  try {
    await upsertSaga(SAMPLE_SAGA.nombre, SAMPLE_SAGA.descripcion, SAMPLE_SAGA.id);
  } catch (err) {
    console.warn('[SampleLibrary] No se pudo guardar la saga de muestra:', err);
  }

  // 2. Guardar los 4 libros de muestra individualmente con sus propios IDs únicos
  let count = 0;
  for (const book of SAMPLE_BOOKS) {
    try {
      await saveBookRecord(book, book.id);
      count++;
    } catch (err) {
      console.warn(`[SampleLibrary] Error al cargar ${book.nombre}:`, err);
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('nexus_sample_library_active', 'true');
  }

  return count;
}

/**
 * Elimina todos los libros de muestra y limpia la saga asociada.
 */
export async function removeSampleLibrary(userId?: string): Promise<number> {
  let count = 0;

  // Eliminar por IDs de muestra actuales
  for (const book of SAMPLE_BOOKS) {
    try {
      await deleteBookRecord(book.id);
      count++;
    } catch (err) {
      console.warn(`[SampleLibrary] Error al eliminar ${book.id}:`, err);
    }
  }

  // Limpiar posibles IDs legacy
  for (const legacyId of ['sample_dorian_gray', 'sample_cumbres_borrascosas', 'sample_frankenstein', 'sample_sombra_del_viento']) {
    try {
      await deleteBookRecord(legacyId);
    } catch {}
  }

  // Limpiar posible libro residual con ID de usuario si coincidía con la muestra
  if (userId) {
    try {
      const validUserId = ensureValidUuid(userId);
      const rogue = await db.books.get(validUserId);
      if (rogue && (SAMPLE_ISBNS.has(rogue.isbn) || rogue.nombre === 'La sombra del viento')) {
        await deleteBookRecord(validUserId);
      }
    } catch {}
  }

  // Comprobar si quedan otros libros en la saga; si no, eliminar la saga de muestra
  try {
    const remainingInSaga = await db.books.where('sagaId').equals(SAMPLE_SAGA_ID).count();
    if (remainingInSaga === 0) {
      await db.sagas.delete(SAMPLE_SAGA_ID);
    }
  } catch {}

  if (typeof window !== 'undefined') {
    localStorage.removeItem('nexus_sample_library_active');
  }

  return count;
}

/**
 * Convierte los libros de muestra en libros definitivos de la biblioteca del usuario.
 */
export async function convertSampleBooksToPermanent(userId?: string): Promise<number> {
  let count = 0;

  for (const book of SAMPLE_BOOKS) {
    const existing = await db.books.get(book.id);
    if (existing) {
      await deleteBookRecord(book.id);
      const permanentBook: Book = {
        ...existing,
        id: crypto.randomUUID ? crypto.randomUUID() : 'b_' + Math.random().toString(36).slice(2, 11),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveBookRecord(permanentBook);
      count++;
    }
  }

  // Comprobar si quedó alguno residual bajo userId
  if (userId) {
    try {
      const validUserId = ensureValidUuid(userId);
      const rogue = await db.books.get(validUserId);
      if (rogue && (SAMPLE_ISBNS.has(rogue.isbn) || rogue.nombre === 'La sombra del viento')) {
        await deleteBookRecord(validUserId);
        const permanentBook: Book = {
          ...rogue,
          id: crypto.randomUUID ? crypto.randomUUID() : 'b_' + Math.random().toString(36).slice(2, 11),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await saveBookRecord(permanentBook);
        count++;
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem('nexus_sample_library_active');
  }

  return count;
}

/**
 * Comprueba si la colección actual contiene libros de muestra.
 */
export function hasSampleBooks(books: Book[]): boolean {
  return books.some((b) => isSampleBook(b.id, b.isbn));
}

/**
 * Comprueba si un libro específico es de muestra.
 */
export function isSampleBook(bookId: string, bookIsbn?: string): boolean {
  if (SAMPLE_ID_SET.has(bookId) || bookId.startsWith('sample_')) {
    return true;
  }
  if (bookIsbn && SAMPLE_ISBNS.has(bookIsbn)) {
    if (typeof window !== 'undefined' && localStorage.getItem('nexus_sample_library_active') === 'true') {
      return true;
    }
  }
  return false;
}
