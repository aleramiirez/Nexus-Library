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
    avatarRingClass: 'ring-2 ring-stone-400 dark:ring-stone-500 ring-offset-1 dark:ring-offset-stone-900 border-2 border-stone-400/80',
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
    avatarRingClass: 'ring-2 ring-amber-800 dark:ring-amber-700 ring-offset-2 dark:ring-offset-stone-900 border-2 border-amber-900/60 shadow-md',
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
    avatarRingClass: 'ring-2 ring-amber-600 dark:ring-amber-500 ring-offset-2 dark:ring-offset-stone-900 border-2 border-[#d97706] shadow-md',
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
    avatarRingClass: 'ring-2 ring-yellow-600 dark:ring-yellow-500 ring-offset-2 dark:ring-offset-stone-900 border-2 border-amber-500 shadow-lg',
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
    avatarRingClass: 'ring-2 ring-slate-300 dark:ring-slate-300 ring-offset-2 dark:ring-offset-stone-900 border-2 border-slate-200 shadow-xl shadow-slate-400/20',
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
    avatarRingClass: 'ring-2 ring-amber-400 dark:ring-amber-300 ring-offset-2 dark:ring-offset-stone-900 border-2 border-amber-300 shadow-xl shadow-amber-500/30',
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
    avatarRingClass: 'ring-3 ring-red-700 dark:ring-red-600 ring-offset-2 dark:ring-offset-stone-900 border-2 border-red-500 shadow-xl shadow-red-600/30',
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
    avatarRingClass: 'ring-3 ring-sky-500 dark:ring-sky-400 ring-offset-2 dark:ring-offset-stone-900 border-2 border-amber-300 shadow-2xl shadow-sky-500/30',
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
    avatarRingClass: 'ring-3 ring-indigo-500 dark:ring-indigo-400 ring-offset-2 dark:ring-offset-stone-900 border-2 border-amber-400 shadow-2xl shadow-indigo-600/40',
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
    avatarRingClass: 'ring-4 ring-amber-400 dark:ring-amber-300 ring-offset-2 dark:ring-offset-stone-900 border-2 border-rose-500 shadow-2xl shadow-amber-500/50',
    description: 'Custodio legendario del Nexus. Su nombre queda cincelado con letras de oro en el Gran Códice.',
    frameGradient: 'from-amber-400 via-rose-500 to-amber-300',
    iconName: 'Sparkles'
  }
];

export const HONORIFIC_STORAGE_KEY = 'nexus_selected_honorific_title';

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
export function getRankForLevel(level: number): OrderRank {
  const safeLevel = Math.max(1, Math.min(50, Math.floor(level)));
  const found = ORDER_RANKS.find((r) => safeLevel >= r.minLevel && safeLevel <= r.maxLevel);
  return found || ORDER_RANKS[0];
}

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
 * Calcula el XP individual otorgado por un libro específico y si desbloqueó un nuevo país.
 */
export function calculateBookXp(book: Book, otherBooks: Book[] = []): BookXpDetail {
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
  const rawPages = book.paginas && book.paginas > 0 ? book.paginas : 200;
  const pagesXp = Math.min(2000, rawPages);

  // Valoración con estrellas
  const hasRating = book.puntuacion !== null && book.puntuacion !== undefined && String(book.puntuacion).trim() !== '';
  const ratingXp = hasRating ? 25 : 0;

  // Notas personales / Reseña
  const hasReview = Boolean(book.notasPersonales && book.notasPersonales.trim().length > 0);
  const reviewXp = hasReview ? 50 : 0;

  // Citas (tope de 5 citas = 75 XP máx)
  const validQuotes = Array.isArray(book.citas)
    ? book.citas.filter((c) => Boolean(c && typeof c === 'string' && c.trim().length > 0))
    : [];
  const quotesXp = Math.min(5, validQuotes.length) * 15;

  // Comprobar si el libro aporta un nuevo país al atlas
  const country = literaryGeographyService.resolveBookCountry(book);
  let isNewCountry = false;
  let countryBonusXp = 0;
  let countryName: string | undefined;

  if (country) {
    countryName = country.name;
    const countryCode = country.code.toUpperCase();
    const otherHasCountry = otherBooks.some(
      (b) => b.id !== book.id && isBookRead(b) && literaryGeographyService.resolveBookCountry(b)?.code.toUpperCase() === countryCode
    );
    if (!otherHasCountry) {
      isNewCountry = true;
      countryBonusXp = 150;
    }
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
 * Motor central de niveles de la Orden: determinista y retroactivo.
 */
export function calculateReaderLevel(
  books: Book[] = [],
  sagas: Saga[] = [],
  currentYearGoalOverride?: number,
  customActiveTitle?: string
): ReaderLevelInfo {
  let booksBaseXp = 0;
  let pagesXp = 0;
  let ratingsXp = 0;
  let reviewsXp = 0;
  let quotesXp = 0;
  let booksReadCount = 0;
  let totalPagesRead = 0;

  // 1. Libros leídos y profundidad
  books.forEach((b) => {
    if (!isBookRead(b)) return;
    booksReadCount++;

    booksBaseXp += 100;

    const rawPages = b.paginas && b.paginas > 0 ? b.paginas : 200;
    const bookPagesXp = Math.min(2000, rawPages);
    pagesXp += bookPagesXp;
    totalPagesRead += b.paginas && b.paginas > 0 ? b.paginas : 0;

    if (b.puntuacion !== null && b.puntuacion !== undefined && String(b.puntuacion).trim() !== '') {
      ratingsXp += 25;
    }

    if (b.notasPersonales && b.notasPersonales.trim().length > 0) {
      reviewsXp += 50;
    }

    if (Array.isArray(b.citas)) {
      const valid = b.citas.filter((c) => Boolean(c && typeof c === 'string' && c.trim().length > 0));
      quotesXp += Math.min(5, valid.length) * 15;
    }
  });

  // 2. Atlas Literario (países conquistados: +150 XP cada uno)
  const passport = literaryGeographyService.calculatePassport(books);
  const countriesCount = passport.totalCountriesStamped;
  const countriesXp = countriesCount * 150;

  // 3. Sagas completadas (+300 XP por saga con >= 2 libros y 100% leídos)
  let completedSagasCount = 0;
  if (Array.isArray(sagas) && sagas.length > 0) {
    sagas.forEach((saga) => {
      const sagaBooks = books.filter((b) => b.sagaId === saga.id);
      if (sagaBooks.length >= 2 && sagaBooks.every((b) => isBookRead(b))) {
        completedSagasCount++;
      }
    });
  }
  const sagasXp = completedSagasCount * 300;

  // 4. Reto Anual de lectura
  let challengeXp = 0;
  let isChallengeCompleted = false;
  const currentYear = new Date().getFullYear();
  const targetGoal = currentYearGoalOverride !== undefined ? currentYearGoalOverride : readingChallengeService.getGoal(currentYear);
  if (targetGoal > 0) {
    const stats = readingChallengeService.calculateStats(books, currentYear, undefined, targetGoal);
    if (stats.completedCount >= targetGoal) {
      isChallengeCompleted = true;
      challengeXp = Math.min(1000, targetGoal * 50);
    }
  }

  const totalXp = booksBaseXp + pagesXp + ratingsXp + reviewsXp + quotesXp + countriesXp + sagasXp + challengeXp;

  // 5. Determinar el nivel según la tabla de umbrales (1 a 50)
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  level = Math.max(1, Math.min(50, level));

  const isMaxLevel = level === 50;
  const currentLevelBaseXp = LEVEL_THRESHOLDS[level - 1];
  const nextLevelXp = isMaxLevel ? currentLevelBaseXp : LEVEL_THRESHOLDS[level];
  const xpInLevel = totalXp - currentLevelBaseXp;
  const xpNeededForNext = isMaxLevel ? 1 : nextLevelXp - currentLevelBaseXp;
  const progressPercent = isMaxLevel ? 100 : Math.min(100, Math.max(0, Math.round((xpInLevel / xpNeededForNext) * 100)));

  const rank = getRankForLevel(level);

  // Rangos y títulos desbloqueados hasta el nivel actual
  const unlockedRanks = ORDER_RANKS.filter((r) => level >= r.minLevel);
  const unlockedTitles = unlockedRanks.map((r) => r.name);

  // Título activo (preferencia de usuario o el del rango actual)
  const activeTitle = customActiveTitle || getSelectedHonorificTitle(rank.name, unlockedTitles);

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
    breakdown
  };
}
