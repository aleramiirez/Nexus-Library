import { Book, Saga } from '../types/models';
import { isBookRead, literaryGeographyService } from './literaryGeographyService';
import { readingChallengeService } from './readingChallengeService';

export type OrderRankId = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX' | 'X';

export interface OrderRank {
  id: OrderRankId;
  roman: string;
  name: string;
  latinName: string;
  visualFrame: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  badgeStyle: string;
  avatarRingClass: string;
  description: string;
  frameGradient: string;
  iconName: 'Feather' | 'BookOpen' | 'Compass' | 'ShieldCheck' | 'Key' | 'Scroll' | 'Landmark' | 'Gem' | 'Crown' | 'Sparkles';
}

export const ORDER_RANKS: OrderRank[] = [
  {
    id: 'I',
    roman: 'I',
    name: 'Aprendiz de Pergamino',
    latinName: 'Tiro Chartulae',
    visualFrame: 'Cuerda rústica de cáñamo',
    minLevel: 1,
    maxLevel: 4,
    color: '#8c6b3e',
    badgeStyle: 'bg-stone-500/15 text-stone-800 dark:text-stone-300 border-stone-600/30',
    avatarRingClass: 'border-2 border-stone-400 dark:border-stone-500 shadow-sm',
    description: 'Primeros pasos en los archivos de la biblioteca. Manos que aprenden el tacto y el aroma del papiro.',
    frameGradient: 'from-stone-600 via-stone-500 to-stone-700',
    iconName: 'Feather'
  },
  {
    id: 'II',
    roman: 'II',
    name: 'Ratón de Biblioteca',
    latinName: 'Mus Bibliothecae',
    visualFrame: 'Sello de madera tallada',
    minLevel: 5,
    maxLevel: 9,
    color: '#92400e',
    badgeStyle: 'bg-amber-800/20 text-amber-950 dark:text-amber-200 border-amber-700/40',
    avatarRingClass: 'border-2 border-amber-800 dark:border-amber-600 shadow-md',
    description: 'Asiduo devorador de volúmenes que encuentra su hogar entre anaqueles y páginas encuadernadas.',
    frameGradient: 'from-amber-900 via-amber-800 to-amber-950',
    iconName: 'BookOpen'
  },
  {
    id: 'III',
    roman: 'III',
    name: 'Bibliófilo Andante',
    latinName: 'Bibliophilus Peregrinus',
    visualFrame: 'Borde de pergamino envejecido',
    minLevel: 10,
    maxLevel: 14,
    color: '#d97706',
    badgeStyle: 'bg-amber-600/20 text-amber-900 dark:text-amber-200 border-amber-500/40',
    avatarRingClass: 'border-2 border-amber-600 dark:border-amber-500 shadow-md',
    description: 'Viajero incansable que recorre universos enteros guiado por la brújula del saber y las letras.',
    frameGradient: 'from-amber-600 via-amber-500 to-yellow-600',
    iconName: 'Compass'
  },
  {
    id: 'IV',
    roman: 'IV',
    name: 'Conservador de Tomos',
    latinName: 'Custos Librorum',
    visualFrame: 'Ribete de bronce bruñido',
    minLevel: 15,
    maxLevel: 19,
    color: '#ca8a04',
    badgeStyle: 'bg-yellow-700/20 text-yellow-950 dark:text-yellow-200 border-yellow-600/40',
    avatarRingClass: 'border-2 border-yellow-600 dark:border-yellow-500 shadow-lg',
    description: 'Guardián del buen estado de las obras, catalogando ediciones singulares con reverencia y esmero.',
    frameGradient: 'from-yellow-600 via-amber-600 to-yellow-700',
    iconName: 'ShieldCheck'
  },
  {
    id: 'V',
    roman: 'V',
    name: 'Custodio del Archivo',
    latinName: 'Archivi Praeses',
    visualFrame: 'Filigrana de plata clásica',
    minLevel: 20,
    maxLevel: 24,
    color: '#94a3b8',
    badgeStyle: 'bg-slate-300/30 text-slate-800 dark:text-slate-100 border-slate-400/50',
    avatarRingClass: 'border-2 border-slate-300 dark:border-slate-300 shadow-md shadow-slate-400/20',
    description: 'Protector de manuscritos venerables e índices secretos que solo los iniciados más leales conocen.',
    frameGradient: 'from-slate-400 via-slate-100 to-slate-400',
    iconName: 'Key'
  },
  {
    id: 'VI',
    roman: 'VI',
    name: 'Maestro Encuadernador',
    latinName: 'Magister Ligator',
    visualFrame: 'Filigrana de oro pulido',
    minLevel: 25,
    maxLevel: 29,
    color: '#eab308',
    badgeStyle: 'bg-amber-400/25 text-amber-950 dark:text-amber-100 border-amber-300/50',
    avatarRingClass: 'border-2 border-amber-400 dark:border-amber-300 shadow-lg shadow-amber-500/20',
    description: 'Artífice supremo que une hojas sueltas en volúmenes inmortales engarzados en piel y pan de oro.',
    frameGradient: 'from-amber-400 via-yellow-200 to-amber-500',
    iconName: 'Scroll'
  },
  {
    id: 'VII',
    roman: 'VII',
    name: 'Erudito de Alejandría',
    latinName: 'Eruditus Alexandrinus',
    visualFrame: 'Sello de lacre carmesí con relieve',
    minLevel: 30,
    maxLevel: 34,
    color: '#dc2626',
    badgeStyle: 'bg-red-600/20 text-red-950 dark:text-red-200 border-red-500/40',
    avatarRingClass: 'border-2 border-red-600 dark:border-red-500 shadow-lg shadow-red-600/20',
    description: 'Poseedor de una visión panorámica de la literatura de todos los continentes, épocas y lenguas.',
    frameGradient: 'from-red-800 via-rose-600 to-red-950',
    iconName: 'Landmark'
  },
  {
    id: 'VIII',
    roman: 'VIII',
    name: 'Gran Cronista de la Orden',
    latinName: 'Magnus Chronicator',
    visualFrame: 'Doble anillo dorado y gemas',
    minLevel: 35,
    maxLevel: 39,
    color: '#0284c7',
    badgeStyle: 'bg-sky-500/20 text-sky-950 dark:text-sky-200 border-sky-400/40',
    avatarRingClass: 'border-2 border-sky-500 dark:border-sky-400 ring-1 ring-amber-400/70 shadow-xl shadow-sky-500/20',
    description: 'Relator supremo cuyas palabras tejen la memoria viva de cada obra leída en los anales del tiempo.',
    frameGradient: 'from-amber-400 via-sky-400 to-amber-500',
    iconName: 'Gem'
  },
  {
    id: 'IX',
    roman: 'IX',
    name: 'Archivero Mayor',
    latinName: 'Archivarius Primus',
    visualFrame: 'Corona de laurel dorado sobre tela azulada',
    minLevel: 40,
    maxLevel: 44,
    color: '#4f46e5',
    badgeStyle: 'bg-indigo-600/20 text-indigo-950 dark:text-indigo-200 border-indigo-400/40',
    avatarRingClass: 'border-2 border-indigo-500 dark:border-indigo-400 ring-1 ring-amber-400/80 shadow-xl shadow-indigo-600/30',
    description: 'Luminaria de la Orden con acceso a las estancias vedadas donde reposa el saber primordial.',
    frameGradient: 'from-indigo-700 via-amber-400 to-indigo-900',
    iconName: 'Crown'
  },
  {
    id: 'X',
    roman: 'X',
    name: 'Guardián del Nexus',
    latinName: 'Nexus Custos Supremus',
    visualFrame: 'Corona imperial dorada con estrella central',
    minLevel: 45,
    maxLevel: 50,
    color: '#e11d48',
    badgeStyle: 'bg-gradient-to-r from-amber-500/30 via-rose-500/30 to-amber-500/30 text-amber-950 dark:text-amber-100 border-amber-400/60 font-black',
    avatarRingClass: 'border-2 border-amber-300 dark:border-amber-300 ring-2 ring-rose-500/70 shadow-2xl shadow-amber-500/40',
    description: 'Custodio legendario del Nexus. Su nombre queda cincelado con letras de oro en el Gran Códice.',
    frameGradient: 'from-amber-400 via-rose-500 to-amber-300',
    iconName: 'Sparkles'
  }
];

/**
 * Tabla determinista de umbrales de experiencia acumulada para niveles 1..50.
 * Nivel 1 = 0 XP.
 * Niveles 1-10: 450 - 850 XP por nivel.
 * Escala suavemente hasta ~198.000 XP en nivel 50.
 */
export const LEVEL_THRESHOLDS: number[] = (() => {
  const list = [0];
  let accumulated = 0;
  for (let lvl = 2; lvl <= 50; lvl++) {
    const baseDiff = 400 + (lvl - 1) * 50;
    const accel = lvl > 15 ? Math.floor(Math.pow(lvl - 15, 1.8) * 15) : 0;
    accumulated += baseDiff + accel;
    list.push(accumulated);
  }
  return list;
})();

export interface ReaderXpBreakdown {
  booksBaseXp: number;
  pagesXp: number;
  ratingsXp: number;
  reviewsXp: number;
  quotesXp: number;
  countriesXp: number;
  sagasXp: number;
  challengeXp: number;
  totalXp: number;
  booksReadCount: number;
  totalPagesRead: number;
  countriesCount: number;
  completedSagasCount: number;
  isChallengeCompleted: boolean;
}

export interface ReaderLevelInfo {
  level: number;
  rank: OrderRank;
  totalXp: number;
  currentLevelBaseXp: number;
  nextLevelXp: number;
  xpInLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
  isMaxLevel: boolean;
  unlockedRanks: OrderRank[];
  unlockedTitles: string[];
  activeTitle: string;
  activeFrameRank: OrderRank;
  breakdown: ReaderXpBreakdown;
}

export interface BookXpDetail {
  baseXp: number;
  pagesXp: number;
  ratingXp: number;
  reviewXp: number;
  quotesXp: number;
  countryBonusXp: number;
  totalXp: number;
  isNewCountry: boolean;
  countryName?: string;
}

/**
 * Devuelve el escalafón correspondiente a un nivel (1..50).
 */
export function getDefaultReaderLevelInfo(): ReaderLevelInfo {
  const rank = ORDER_RANKS[0];
  return {
    level: 1,
    rank,
    totalXp: 0,
    currentLevelBaseXp: 0,
    nextLevelXp: LEVEL_THRESHOLDS[1] || 400,
    xpInLevel: 0,
    xpNeededForNext: LEVEL_THRESHOLDS[1] || 400,
    progressPercent: 0,
    isMaxLevel: false,
    unlockedRanks: [rank],
    unlockedTitles: [rank.name],
    activeTitle: rank.name,
    activeFrameRank: rank,
    breakdown: {
      booksBaseXp: 0,
      pagesXp: 0,
      ratingsXp: 0,
      reviewsXp: 0,
      quotesXp: 0,
      countriesXp: 0,
      sagasXp: 0,
      challengeXp: 0,
      totalXp: 0,
      booksReadCount: 0,
      totalPagesRead: 0,
      countriesCount: 0,
      completedSagasCount: 0,
      isChallengeCompleted: false
    }
  };
}

export function getRankForLevel(level: number): OrderRank {
  if (typeof level !== 'number' || isNaN(level)) return ORDER_RANKS[0];
  const safeLevel = Math.max(1, Math.min(50, Math.floor(level)));
  const found = ORDER_RANKS.find((r) => safeLevel >= r.minLevel && safeLevel <= r.maxLevel);
  return found || ORDER_RANKS[0];
}

export const HONORIFIC_STORAGE_KEY = 'nexus_selected_honorific_title';
export const ORDER_FRAME_STORAGE_KEY = 'nexus_selected_order_frame';
export const HIGHEST_RANK_STORAGE_KEY = 'nexus_highest_reached_rank';

/**
 * Lee el título honorífico activo guardado en localStorage o asigna el más alto desbloqueado.
 */
export function getSelectedHonorificTitle(currentRankTitle: string, unlockedTitles?: string[]): string {
  if (typeof window === 'undefined') return currentRankTitle;
  try {
    const saved = localStorage.getItem(HONORIFIC_STORAGE_KEY);
    if (saved && (!unlockedTitles || unlockedTitles.includes(saved))) {
      return saved;
    }
  } catch {
    // ignorar
  }
  return currentRankTitle;
}

/**
 * Guarda la preferencia de título honorífico activo del lector.
 */
export function setSelectedHonorificTitle(title: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HONORIFIC_STORAGE_KEY, title);
    window.dispatchEvent(new CustomEvent('nexus_honorific_changed', { detail: title }));
  } catch {
    // ignorar
  }
}

/**
 * Lee el marco de la Orden activo guardado en localStorage o asigna el del rango actual si no se ha elegido otro.
 * Si el lector asciende a un nuevo escalafón de rango superior, actualiza automáticamente el marco equipado al nuevo rango.
 */
export function getSelectedOrderFrame(defaultRankId: OrderRankId = 'I', unlockedRanks?: OrderRank[]): OrderRankId {
  if (typeof window === 'undefined') return defaultRankId;
  try {
    const saved = localStorage.getItem(ORDER_FRAME_STORAGE_KEY) as OrderRankId | null;
    const highestRecordedRank = localStorage.getItem(HIGHEST_RANK_STORAGE_KEY) as OrderRankId | null;

    const defaultIdx = ORDER_RANKS.findIndex((r) => r.id === defaultRankId);
    const highestIdx = highestRecordedRank ? ORDER_RANKS.findIndex((r) => r.id === highestRecordedRank) : -1;

    // Si el lector asciende de nivel conquistando un nuevo escalafón récord superior:
    if (defaultIdx > highestIdx) {
      localStorage.setItem(HIGHEST_RANK_STORAGE_KEY, defaultRankId);
      // Solo auto-equipar el nuevo marco superior si el usuario no tenía ya un marco explícito personalizado
      if (!saved) {
        localStorage.setItem(ORDER_FRAME_STORAGE_KEY, defaultRankId);
        window.dispatchEvent(new CustomEvent('nexus_order_frame_changed', { detail: defaultRankId }));
        return defaultRankId;
      }
    }

    // Si el usuario tiene un marco guardado y está desbloqueado para su nivel, respetarlo siempre
    if (saved && ORDER_RANKS.some((r) => r.id === saved)) {
      if (!unlockedRanks || unlockedRanks.some((r) => r.id === saved)) {
        return saved;
      }
    }
  } catch {
    // ignorar
  }
  return defaultRankId;
}

/**
 * Guarda la preferencia de marco de la Orden activo del lector y notifica el cambio a todos los avatares.
 */
export function setSelectedOrderFrame(rankId: OrderRankId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDER_FRAME_STORAGE_KEY, rankId);
    window.dispatchEvent(new CustomEvent('nexus_order_frame_changed', { detail: rankId }));
  } catch {
    // ignorar
  }
}

/**
 * Calcula el XP individual otorgado por un libro específico y si desbloqueó un nuevo país.
 */
export function calculateBookXp(book?: Book | null, otherBooks: Book[] = []): BookXpDetail {
  if (!book || typeof book !== 'object') {
    return {
      baseXp: 0,
      pagesXp: 0,
      ratingXp: 0,
      reviewXp: 0,
      quotesXp: 0,
      countryBonusXp: 0,
      totalXp: 0,
      isNewCountry: false
    };
  }
  const isRead = isBookRead(book);
  if (!isRead) {
    return {
      baseXp: 0,
      pagesXp: 0,
      ratingXp: 0,
      reviewXp: 0,
      quotesXp: 0,
      countryBonusXp: 0,
      totalXp: 0,
      isNewCountry: false
    };
  }

  const baseXp = 100;

  // Páginas leídas: 1 XP por página (defecto 200 si no consta, tope 2000)
  const numPages = typeof book.paginas === 'number' && !isNaN(book.paginas) ? book.paginas : 0;
  const rawPages = numPages > 0 ? numPages : 200;
  const pagesXp = Math.min(2000, rawPages);

  // Valoración con estrellas
  const hasRating = book.puntuacion !== null && book.puntuacion !== undefined && String(book.puntuacion).trim() !== '';
  const ratingXp = hasRating ? 25 : 0;

  // Notas personales / Reseña
  const hasReview = Boolean(typeof book.notasPersonales === 'string' && book.notasPersonales.trim().length > 0);
  const reviewXp = hasReview ? 50 : 0;

  // Citas (tope de 5 citas = 75 XP máx)
  const validQuotes = Array.isArray(book.citas)
    ? book.citas.filter((c) => Boolean(c && typeof c === 'string' && c.trim().length > 0))
    : [];
  const quotesXp = Math.min(5, validQuotes.length) * 15;

  // Comprobar si el libro aporta un nuevo país al atlas
  let isNewCountry = false;
  let countryBonusXp = 0;
  let countryName: string | undefined;

  try {
    const country = literaryGeographyService.resolveBookCountry(book);
    if (country) {
      countryName = country.name;
      const countryCode = country.code.toUpperCase();
      const safeOthers = Array.isArray(otherBooks)
        ? otherBooks.filter((b) => Boolean(b && typeof b === 'object' && b.id))
        : [];
      const otherHasCountry = safeOthers.some(
        (b) => b.id !== book.id && isBookRead(b) && literaryGeographyService.resolveBookCountry(b)?.code.toUpperCase() === countryCode
      );
      if (!otherHasCountry) {
        isNewCountry = true;
        countryBonusXp = 150;
      }
    }
  } catch (err) {
    // Si falla la geografía, no bloquear
  }

  const totalXp = baseXp + pagesXp + ratingXp + reviewXp + quotesXp + countryBonusXp;

  return {
    baseXp,
    pagesXp,
    ratingXp,
    reviewXp,
    quotesXp,
    countryBonusXp,
    totalXp,
    isNewCountry,
    countryName
  };
}

/**
 * Motor central de niveles de la Orden: determinista, retroactivo y 100% resiliente a datos corruptos.
 */
export function calculateReaderLevel(
  books: Book[] = [],
  sagas: Saga[] = [],
  currentYearGoalOverride?: number,
  customActiveTitle?: string
): ReaderLevelInfo {
  try {
    const safeBooks = Array.isArray(books)
      ? books.filter((b) => Boolean(b && typeof b === 'object' && b.id))
      : [];
    const safeSagas = Array.isArray(sagas)
      ? sagas.filter((s) => Boolean(s && typeof s === 'object' && s.id))
      : [];

    let booksBaseXp = 0;
    let pagesXp = 0;
    let ratingsXp = 0;
    let reviewsXp = 0;
    let quotesXp = 0;
    let booksReadCount = 0;
    let totalPagesRead = 0;

    // 1. Libros leídos y profundidad
    safeBooks.forEach((b) => {
      if (!isBookRead(b)) return;
      booksReadCount++;

      booksBaseXp += 100;

      const numPages = typeof b.paginas === 'number' && !isNaN(b.paginas) ? b.paginas : 0;
      const rawPages = numPages > 0 ? numPages : 200;
      const bookPagesXp = Math.min(2000, rawPages);
      pagesXp += bookPagesXp;
      totalPagesRead += numPages > 0 ? numPages : 0;

      if (b.puntuacion !== null && b.puntuacion !== undefined && String(b.puntuacion).trim() !== '') {
        ratingsXp += 25;
      }

      if (typeof b.notasPersonales === 'string' && b.notasPersonales.trim().length > 0) {
        reviewsXp += 50;
      }

      if (Array.isArray(b.citas)) {
        const valid = b.citas.filter((c) => Boolean(c && typeof c === 'string' && c.trim().length > 0));
        quotesXp += Math.min(5, valid.length) * 15;
      }
    });

    // 2. Atlas Literario (países conquistados: +150 XP cada uno)
    let countriesCount = 0;
    try {
      const passport = literaryGeographyService.calculatePassport(safeBooks);
      countriesCount = Number(passport?.totalCountriesStamped) || 0;
    } catch (err) {
      console.warn('[levelingService] Error en calculatePassport:', err);
    }
    const countriesXp = countriesCount * 150;

    // 3. Sagas completadas (+300 XP por saga con >= 2 libros y 100% leídos)
    let completedSagasCount = 0;
    try {
      // Agrupamos libros por saga normalizada para que funcione idéntico tanto si se pasa safeSagas
      // como si los libros tienen sagaNombre/sagaId directo (e.g. perfiles comunitarios o importaciones).
      const sagaGroups = new Map<string, Book[]>();
      const sagaIdToKey = new Map<string, string>();
      const sagaNameToKey = new Map<string, string>();

      // 1. Indexar sagas formales registradas en safeSagas
      if (Array.isArray(safeSagas)) {
        safeSagas.forEach((saga, idx) => {
          if (!saga || typeof saga !== 'object') return;
          const rawId = typeof saga.id === 'string' && saga.id.trim() ? saga.id.trim() : null;
          const rawName = typeof saga.nombre === 'string' && saga.nombre.trim() ? saga.nombre.trim().toLowerCase() : null;
          const canonicalKey = rawId || (rawName ? `named:${rawName}` : `saga_idx_${idx}`);

          if (!sagaGroups.has(canonicalKey)) {
            sagaGroups.set(canonicalKey, []);
          }
          if (rawId) sagaIdToKey.set(rawId, canonicalKey);
          if (rawName) sagaNameToKey.set(rawName, canonicalKey);
        });
      }

      // 2. Distribuir libros en sus respectivas sagas (por id, por nombre, o por agrupación dinámica)
      safeBooks.forEach((b) => {
        const rawId = typeof b.sagaId === 'string' && b.sagaId.trim() ? b.sagaId.trim() : null;
        const rawName = typeof b.sagaNombre === 'string' && b.sagaNombre.trim() ? b.sagaNombre.trim().toLowerCase() : null;

        if (!rawId && !rawName) return;

        let targetKey: string | undefined;

        if (rawId && sagaIdToKey.has(rawId)) {
          targetKey = sagaIdToKey.get(rawId);
        } else if (rawName && sagaNameToKey.has(rawName)) {
          targetKey = sagaNameToKey.get(rawName);
        } else if (rawName) {
          // Saga presente en los libros pero no en la tabla formal safeSagas
          targetKey = `named:${rawName}`;
          if (!sagaGroups.has(targetKey)) {
            sagaGroups.set(targetKey, []);
            sagaNameToKey.set(rawName, targetKey);
          }
        } else if (rawId) {
          targetKey = `id:${rawId}`;
          if (!sagaGroups.has(targetKey)) {
            sagaGroups.set(targetKey, []);
            sagaIdToKey.set(rawId, targetKey);
          }
        }

        if (targetKey && sagaGroups.has(targetKey)) {
          sagaGroups.get(targetKey)!.push(b);
        }
      });

      // 3. Evaluar qué sagas están 100% completadas (al menos 2 libros y todos leídos)
      sagaGroups.forEach((sagaBooks) => {
        if (sagaBooks.length >= 2 && sagaBooks.every((b) => isBookRead(b))) {
          completedSagasCount++;
        }
      });
    } catch (err) {
      console.warn('[levelingService] Error en sagas:', err);
    }
    const sagasXp = completedSagasCount * 300;

    // 4. Reto Anual de lectura
    let challengeXp = 0;
    let isChallengeCompleted = false;
    try {
      const currentYear = new Date().getFullYear();
      const targetGoal =
        typeof currentYearGoalOverride === 'number' && currentYearGoalOverride > 0
          ? currentYearGoalOverride
          : readingChallengeService.getGoal(currentYear);

      if (typeof targetGoal === 'number' && targetGoal > 0) {
        const stats = readingChallengeService.calculateStats(safeBooks, currentYear, undefined, targetGoal);
        if (stats && stats.completedCount >= targetGoal) {
          isChallengeCompleted = true;
          challengeXp = Math.min(1000, targetGoal * 50);
        }
      }

      // Si no se completó en el año actual (por ejemplo en perfiles comunitarios donde las fechas de fin
      // no son de este año o la meta local del observador es distinta), comprobar si el lector ha completado
      // un reto de lectura con >= 10 libros leídos
      if (!isChallengeCompleted && booksReadCount >= 10) {
        isChallengeCompleted = true;
        challengeXp = Math.min(1000, Math.max(500, Math.min(20, booksReadCount) * 50));
      }
    } catch (err) {
      console.warn('[levelingService] Error en reto anual:', err);
    }

    const totalXp = Math.max(
      0,
      booksBaseXp + pagesXp + ratingsXp + reviewsXp + quotesXp + countriesXp + sagasXp + challengeXp
    );

    // 5. Determinar el nivel según la tabla de umbrales (1 a 50)
    let level = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalXp >= LEVEL_THRESHOLDS[i]) {
        level = i + 1;
        break;
      }
    }
    level = Math.max(1, Math.min(50, Math.floor(level) || 1));

    const isMaxLevel = level === 50;
    const currentLevelBaseXp = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextLevelXp = isMaxLevel ? currentLevelBaseXp : LEVEL_THRESHOLDS[level] || currentLevelBaseXp + 400;
    const xpInLevel = Math.max(0, totalXp - currentLevelBaseXp);
    const xpNeededForNext = isMaxLevel ? 1 : Math.max(1, nextLevelXp - currentLevelBaseXp);
    const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeededForNext) * 100)));

    const rank = getRankForLevel(level);

    // Rangos y títulos desbloqueados hasta el nivel actual
    const unlockedRanks = ORDER_RANKS.filter((r) => level >= r.minLevel);
    const unlockedTitles = unlockedRanks.map((r) => r.name);

    // Título activo (preferencia de usuario o el del rango actual)
    const activeTitle = customActiveTitle || getSelectedHonorificTitle(rank.name, unlockedTitles) || rank.name;

    // Marco activo (preferencia de usuario o el del rango actual)
    const activeFrameId = getSelectedOrderFrame(rank.id, unlockedRanks);
    const activeFrameRank = ORDER_RANKS.find((r) => r.id === activeFrameId) || rank;

    const breakdown: ReaderXpBreakdown = {
      booksBaseXp,
      pagesXp,
      ratingsXp,
      reviewsXp,
      quotesXp,
      countriesXp,
      sagasXp,
      challengeXp,
      totalXp,
      booksReadCount,
      totalPagesRead,
      countriesCount,
      completedSagasCount,
      isChallengeCompleted
    };

    return {
      level,
      rank,
      totalXp,
      currentLevelBaseXp,
      nextLevelXp,
      xpInLevel,
      xpNeededForNext,
      progressPercent,
      isMaxLevel,
      unlockedRanks,
      unlockedTitles,
      activeTitle,
      activeFrameRank,
      breakdown
    };
  } catch (err) {
    console.error('[levelingService] Error fatal en calculateReaderLevel:', err);
    return getDefaultReaderLevelInfo();
  }
}

/**
 * Alias de progreso de guardián de la Orden para perfiles comunitarios
 */
export function calculateGuardianProgress(
  books: Book[] = [],
  sagas: Saga[] = []
): ReaderLevelInfo {
  return calculateReaderLevel(books, sagas);
}
