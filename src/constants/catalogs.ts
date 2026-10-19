export const GENRES = [
  '✨ Fantasía',
  '🔭 Ciencia Ficción & Distopía',
  '🔪 Terror & Suspense',
  '❤️ Romance & Drama',
  '🏇 Aventuras',
  '📚 No Ficción',
  '🏛️ Clásicos'
] as const;

export type Genre = (typeof GENRES)[number];

export const SUBGENRES = [
  '🧙 Fantasía Épica',
  '🪄 Fantasía Juvenil',
  '🏰 Fantasía Oscura',
  '🌿 Fantasía Urbana',
  '🏺 Mitología & Epopeya',
  '⏳ Viajes en el Tiempo',
  '🏚️ Post-Apocalíptico',
  '👻 Terror Sobrenatural',
  '🩸 Gore & Slasher',
  '🧠 Thriller Psicológico',
  '🕵️ Misterio & Detective',
  '😰 Horror Cósmico',
  '❤️ Romance Contemporáneo',
  '💔 Drama',
  '💌 Romance Histórico',
  '😂 Comedia Romántica',
  '🗺️ Aventura Histórica',
  '⚔️ Acción & Combate',
  '🌊 Aventura Náutica',
  '🤠 Western',
  '📜 Biografía',
  '📓 Memorias & Diarios',
  '🌍 Historia',
  '🧪 Divulgación Científica',
  '🧠 Psicología',
  '💡 Ensayo',
  '🌍 Crítica Social',
  '💭 Novela Existencialista',
  '📜 Ensayo Filosófico'
] as const;

export type Subgenre = (typeof SUBGENRES)[number];

export const READING_STATUSES = [
  '❌ No Leído',
  '⏳ Leyendo',
  '⏸️ Pausado',
  '✅ Leído'
] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export const STAR_OPTIONS: Array<{ value: 1 | 2 | 3 | 4 | 5; label: string }> = [
  { value: 1, label: '⭐' },
  { value: 2, label: '⭐⭐' },
  { value: 3, label: '⭐⭐⭐' },
  { value: 4, label: '⭐⭐⭐⭐' },
  { value: 5, label: '⭐⭐⭐⭐⭐' }
];

export function formatStars(rating: number | null): string {
  if (!rating || rating < 1 || rating > 5) return '';
  return '⭐'.repeat(Math.round(rating));
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchExactOrNormalizedGenre(input: string): Genre | '' {
  if (!input) return '';
  const trimmed = input.trim();
  const exact = GENRES.find((g) => g === trimmed);
  if (exact) return exact;

  const norm = normalizeText(trimmed);
  for (const genre of GENRES) {
    if (normalizeText(genre) === norm || norm.includes(normalizeText(genre))) {
      return genre;
    }
  }
  return '';
}

export function matchExactOrNormalizedSubgenres(inputs: string[]): Subgenre[] {
  const matched = new Set<Subgenre>();
  for (const raw of inputs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const exact = SUBGENRES.find((s) => s === trimmed);
    if (exact) {
      matched.add(exact);
      continue;
    }
    const norm = normalizeText(trimmed);
    for (const sub of SUBGENRES) {
      if (normalizeText(sub) === norm) {
        matched.add(sub);
      }
    }
  }
  return Array.from(matched);
}

export function matchReadingStatus(input: string): ReadingStatus {
  if (!input) return '❌ No Leído';
  const trimmed = input.trim();
  const exact = READING_STATUSES.find((s) => s === trimmed);
  if (exact) return exact;

  const norm = normalizeText(trimmed);
  if (norm.includes('leyendo') || norm.includes('reading') || norm.includes('curso')) {
    return '⏳ Leyendo';
  }
  if (norm.includes('pausado') || norm.includes('paused') || norm.includes('abandonado')) {
    return '⏸️ Pausado';
  }
  if (
    (norm.includes('leido') && !norm.includes('no leido')) ||
    norm.includes('read') ||
    norm.includes('completado') ||
    norm.includes('terminado')
  ) {
    return '✅ Leído';
  }
  return '❌ No Leído';
}

export function inferCatalogFromCategories(categories: string[]): {
  genre: Genre | '';
  subgenres: Subgenre[];
} {
  if (!categories || categories.length === 0) {
    return { genre: '', subgenres: [] };
  }

  const joined = normalizeText(categories.join(' | '));
  let genre: Genre | '' = '';
  const subgenres = new Set<Subgenre>();

  if (joined.includes('epic fantasy') || joined.includes('fantasia epica')) {
    subgenres.add('🧙 Fantasía Épica');
    genre = '✨ Fantasía';
  }
  if (joined.includes('young adult') && (joined.includes('fantasy') || joined.includes('fantasia'))) {
    subgenres.add('🪄 Fantasía Juvenil');
    genre = '✨ Fantasía';
  }
  if (joined.includes('dark fantasy') || joined.includes('fantasia oscura')) {
    subgenres.add('🏰 Fantasía Oscura');
    genre = '✨ Fantasía';
  }
  if (joined.includes('urban fantasy') || joined.includes('fantasia urbana')) {
    subgenres.add('🌿 Fantasía Urbana');
    genre = '✨ Fantasía';
  }
  if (joined.includes('mythology') || joined.includes('mitologia')) {
    subgenres.add('🏺 Mitología & Epopeya');
    if (!genre) genre = '✨ Fantasía';
  }
  if (joined.includes('time travel') || joined.includes('viajes en el tiempo')) {
    subgenres.add('⏳ Viajes en el Tiempo');
    genre = '🔭 Ciencia Ficción & Distopía';
  }
  if (
    joined.includes('post apocalyptic') ||
    joined.includes('apocalyptic') ||
    joined.includes('distopia') ||
    joined.includes('dystopian')
  ) {
    subgenres.add('🏚️ Post-Apocalíptico');
    genre = '🔭 Ciencia Ficción & Distopía';
  }
  if (joined.includes('psychological thriller') || joined.includes('suspense psicologico')) {
    subgenres.add('🧠 Thriller Psicológico');
    genre = '🔪 Terror & Suspense';
  }
  if (
    joined.includes('mystery') ||
    joined.includes('detective') ||
    joined.includes('crime') ||
    joined.includes('policiaca')
  ) {
    subgenres.add('🕵️ Misterio & Detective');
    if (!genre) genre = '🔪 Terror & Suspense';
  }
  if (
    joined.includes('biography') ||
    joined.includes('biografia') ||
    joined.includes('autobiography')
  ) {
    subgenres.add('📜 Biografía');
    genre = '📚 No Ficción';
  }
  if (joined.includes('memoir') || joined.includes('memorias')) {
    subgenres.add('📓 Memorias & Diarios');
    genre = '📚 No Ficción';
  }
  if (joined.includes('psychology') || joined.includes('psicologia')) {
    subgenres.add('🧠 Psicología');
    genre = '📚 No Ficción';
  }
  if (joined.includes('philosophy') || joined.includes('filosofia')) {
    subgenres.add('📜 Ensayo Filosófico');
    if (!genre) genre = '📚 No Ficción';
  }
  if (joined.includes('science') && !joined.includes('science fiction')) {
    subgenres.add('🧪 Divulgación Científica');
    if (!genre) genre = '📚 No Ficción';
  }

  if (!genre) {
    if (joined.includes('fantasy') || joined.includes('fantasia')) {
      genre = '✨ Fantasía';
    } else if (
      joined.includes('science fiction') ||
      joined.includes('ciencia ficcion') ||
      joined.includes('scifi') ||
      joined.includes('dystopia')
    ) {
      genre = '🔭 Ciencia Ficción & Distopía';
    } else if (
      joined.includes('horror') ||
      joined.includes('thriller') ||
      joined.includes('terror') ||
      joined.includes('suspense')
    ) {
      genre = '🔪 Terror & Suspense';
    } else if (joined.includes('romance') || joined.includes('love stories')) {
      genre = '❤️ Romance & Drama';
    } else if (joined.includes('adventure') || joined.includes('aventuras') || joined.includes('western')) {
      genre = '🏇 Aventuras';
    } else if (joined.includes('classic') || joined.includes('clasicos')) {
      genre = '🏛️ Clásicos';
    } else if (
      joined.includes('nonfiction') ||
      joined.includes('non fiction') ||
      joined.includes('history') ||
      joined.includes('essays')
    ) {
      genre = '📚 No Ficción';
    }
  }

  return {
    genre,
    subgenres: Array.from(subgenres)
  };
}
