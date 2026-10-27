export const GENRES = [
  '✨ Fantasía',
  '🔭 Ciencia Ficción & Distopía',
  '🕵️ Misterio, Thriller & Novela Negra',
  '🔪 Terror & Suspense',
  '🏰 Novela Histórica',
  '❤️ Romance & Drama',
  '🏇 Aventuras',
  '🖋️ Ficción Contemporánea & Literaria',
  '🏛️ Clásicos',
  '📚 No Ficción',
  '🧠 Ensayo, Filosofía & Ciencia',
  '🌱 Desarrollo Personal & Negocios',
  '🎨 Cómic, Manga & Novela Gráfica',
  '🎭 Poesía, Teatro & Relatos'
] as const;

export type Genre = (typeof GENRES)[number];

export const SUBGENRES = [
  // Subgéneros preexistentes (máxima compatibilidad hacia atrás con registros existentes)
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
  '📜 Ensayo Filosófico',

  // Nuevos subgéneros de la taxonomía profesional de 14 géneros
  '🧙♂️ Fantasía Épica',
  '🐉 Alta Fantasía & Mundos Secundarios',
  '⚔️ Grimdark',
  '💘 Romantasy',
  '🗡️ Espada y Brujería',
  '☕ Cozy Fantasy',
  '🔮 Realismo Mágico',
  '🧚 Cuentos de Hadas & Folklore',
  '🚀 Space Opera',
  '🔬 Ciencia Ficción Dura (Hard Sci-Fi)',
  '👁️ Distopía & Utopía',
  '🌀 Multiversos & Realidades Alternativas',
  '🤖 Cyberpunk & IA',
  '👽 Primer Contacto & Aliens',
  '🪐 Colonización Espacial',
  '🧬 Biopunk & Genética',
  '⚙️ Steampunk & Retrofuturismo',
  '🕵️♂️ Misterio & Detective',
  '🚓 Novela Negra & Policíaca',
  '🧩 Whodunit (Habitación Cerrada)',
  '🕵️♀️ Espionaje & Conspiración',
  '⚖️ Thriller Legal & Forense',
  '🌐 Tecno-Thriller',
  '🏛️ Thriller Histórico & Religioso',
  '🫖 Cozy Mystery',
  '😱 Horror Cósmico',
  '🕯️ Terror Gótico',
  '🏚️ Casas Encantadas & Posesiones',
  '🧟 Supervivencia & Criaturas',
  '🌲 Folk Horror',
  '🦠 Body Horror',
  '🦅 Edad Antigua (Roma, Grecia, Egipto)',
  '⚔️ Edad Media & Cruzadas',
  '🎨 Renacimiento & Siglo de Oro',
  '🎩 Siglo XIX & Época Victoriana',
  '🪖 Guerras Mundiales & Siglo XX',
  '🇪🇸 Historia de España',
  '👑 Ficción Biográfica & Dinastías',
  '🥹 Drama Familiar & Generacional',
  '🔥 Dark Romance',
  '⚔️ Enemies to Lovers',
  '🌈 Romance LGBT+',
  '🎓 New Adult & Universitario',
  '🏴☠️ Piratas & Corsarios',
  '🧭 Exploración & Arqueología',
  '🏔️ Supervivencia & Naturaleza',
  '🗡️ Capa y Espada',
  '🏙️ Narrativa Urbana & Costumbrismo',
  '🌱 Coming-of-Age (Aprendizaje)',
  '🎭 Humor & Sátira',
  '🏡 Feel-Good & Slice of Life',
  '📚 Metaficción & Libros sobre Libros',
  '🌍 Clásicos Universales',
  '🏛️ Clásicos Grecolatinos',
  '✒️ Siglo de Oro & Clásicos Hispánicos',
  '🎩 Literatura del Siglo XIX (Realismo & Naturalismo)',
  '🕯️ Gótico Clásico & Romanticismo',
  '🌊 Generación del 98 & Siglo XX',
  '🕵️ True Crime & Investigación',
  '📰 Periodismo & Crónica',
  '🏛️ Política, Geopolítica & Sociedad',
  '✈️ Viajes & Naturaleza',
  '🎨 Arte, Música & Cultura Pop',
  '🏛️ Filosofía Clásica & Estoicismo',
  '🌌 Física, Astronomía & Cosmos',
  '🧬 Biología, Medicina & Neurociencia',
  '💻 Tecnología, IA & Futuro',
  '🗣️ Lingüística, Literatura & Humanidades',
  '⚡ Productividad & Hábitos',
  '💰 Finanzas Personales & Inversión',
  '🚀 Emprendimiento, Negocios & Liderazgo',
  '🧘 Mindfulness, Bienestar & Salud',
  '🗣️ Comunicación & Relaciones',
  '🇯🇵 Manga Shōnen',
  '🌑 Manga Seinen',
  '🌸 Manga Shōjo / Josei',
  '🦸 Cómic Americano & Superhéroes',
  '🇪🇺 Cómic Europeo & Franco-Belga',
  '🖼️ Novela Gráfica de Autor',
  '🇰🇷 Manhwa & Webtoon',
  '🪶 Poesía Clásica & Contemporánea',
  '🎭 Teatro & Dramaturgia',
  '📖 Antología de Relatos & Cuentos',
  '🎙️ Microficción & Aforismos',
  '🐉 Fábulas & Leyendas'
] as const;

export type Subgenre = (typeof SUBGENRES)[number];

export const GENRE_SUBGENRES_MAP: Record<Genre, Subgenre[]> = {
  '✨ Fantasía': [
    '🧙♂️ Fantasía Épica',
    '🐉 Alta Fantasía & Mundos Secundarios',
    '🏰 Fantasía Oscura',
    '⚔️ Grimdark',
    '🌿 Fantasía Urbana',
    '🪄 Fantasía Juvenil',
    '💘 Romantasy',
    '🗡️ Espada y Brujería',
    '☕ Cozy Fantasy',
    '🏺 Mitología & Epopeya',
    '🔮 Realismo Mágico',
    '🧚 Cuentos de Hadas & Folklore'
  ],
  '🔭 Ciencia Ficción & Distopía': [
    '🚀 Space Opera',
    '🔬 Ciencia Ficción Dura (Hard Sci-Fi)',
    '👁️ Distopía & Utopía',
    '🏚️ Post-Apocalíptico',
    '⏳ Viajes en el Tiempo',
    '🌀 Multiversos & Realidades Alternativas',
    '🤖 Cyberpunk & IA',
    '👽 Primer Contacto & Aliens',
    '🪐 Colonización Espacial',
    '🧬 Biopunk & Genética',
    '⚙️ Steampunk & Retrofuturismo'
  ],
  '🕵️ Misterio, Thriller & Novela Negra': [
    '🧠 Thriller Psicológico',
    '🕵️♂️ Misterio & Detective',
    '🚓 Novela Negra & Policíaca',
    '🧩 Whodunit (Habitación Cerrada)',
    '🕵️♀️ Espionaje & Conspiración',
    '⚖️ Thriller Legal & Forense',
    '🌐 Tecno-Thriller',
    '🏛️ Thriller Histórico & Religioso',
    '🫖 Cozy Mystery'
  ],
  '🔪 Terror & Suspense': [
    '👻 Terror Sobrenatural',
    '😱 Horror Cósmico',
    '🕯️ Terror Gótico',
    '🧠 Thriller Psicológico',
    '🏚️ Casas Encantadas & Posesiones',
    '🩸 Gore & Slasher',
    '🧟 Supervivencia & Criaturas',
    '🌲 Folk Horror',
    '🦠 Body Horror'
  ],
  '🏰 Novela Histórica': [
    '🦅 Edad Antigua (Roma, Grecia, Egipto)',
    '⚔️ Edad Media & Cruzadas',
    '🎨 Renacimiento & Siglo de Oro',
    '🎩 Siglo XIX & Época Victoriana',
    '🪖 Guerras Mundiales & Siglo XX',
    '🇪🇸 Historia de España',
    '👑 Ficción Biográfica & Dinastías',
    '🗺️ Aventura Histórica',
    '💌 Romance Histórico'
  ],
  '❤️ Romance & Drama': [
    '❤️ Romance Contemporáneo',
    '💌 Romance Histórico',
    '😂 Comedia Romántica',
    '💔 Drama',
    '🥹 Drama Familiar & Generacional',
    '💘 Romantasy',
    '🔥 Dark Romance',
    '⚔️ Enemies to Lovers',
    '🌈 Romance LGBT+',
    '🎓 New Adult & Universitario'
  ],
  '🏇 Aventuras': [
    '🗺️ Aventura Histórica',
    '⚔️ Acción & Combate',
    '🌊 Aventura Náutica',
    '🏴☠️ Piratas & Corsarios',
    '🧭 Exploración & Arqueología',
    '🏔️ Supervivencia & Naturaleza',
    '🗡️ Capa y Espada',
    '🤠 Western'
  ],
  '🖋️ Ficción Contemporánea & Literaria': [
    '🏙️ Narrativa Urbana & Costumbrismo',
    '💭 Novela Existencialista',
    '🌍 Crítica Social',
    '🌱 Coming-of-Age (Aprendizaje)',
    '🔮 Realismo Mágico',
    '🎭 Humor & Sátira',
    '🏡 Feel-Good & Slice of Life',
    '📚 Metaficción & Libros sobre Libros',
    '💔 Drama'
  ],
  '🏛️ Clásicos': [
    '🌍 Clásicos Universales',
    '🏛️ Clásicos Grecolatinos',
    '✒️ Siglo de Oro & Clásicos Hispánicos',
    '🎩 Literatura del Siglo XIX (Realismo & Naturalismo)',
    '🕯️ Gótico Clásico & Romanticismo',
    '🌊 Generación del 98 & Siglo XX',
    '💭 Novela Existencialista',
    '🏺 Mitología & Epopeya',
    '🌍 Crítica Social'
  ],
  '📚 No Ficción': [
    '🌍 Historia',
    '📜 Biografía',
    '📓 Memorias & Diarios',
    '🕵️ True Crime & Investigación',
    '📰 Periodismo & Crónica',
    '🏛️ Política, Geopolítica & Sociedad',
    '🌍 Crítica Social',
    '✈️ Viajes & Naturaleza',
    '🎨 Arte, Música & Cultura Pop'
  ],
  '🧠 Ensayo, Filosofía & Ciencia': [
    '📜 Ensayo Filosófico',
    '🏛️ Filosofía Clásica & Estoicismo',
    '🧪 Divulgación Científica',
    '🌌 Física, Astronomía & Cosmos',
    '🧬 Biología, Medicina & Neurociencia',
    '💻 Tecnología, IA & Futuro',
    '🧠 Psicología',
    '💡 Ensayo',
    '🗣️ Lingüística, Literatura & Humanidades'
  ],
  '🌱 Desarrollo Personal & Negocios': [
    '⚡ Productividad & Hábitos',
    '🧠 Psicología',
    '💰 Finanzas Personales & Inversión',
    '🚀 Emprendimiento, Negocios & Liderazgo',
    '🧘 Mindfulness, Bienestar & Salud',
    '🗣️ Comunicación & Relaciones',
    '💡 Ensayo'
  ],
  '🎨 Cómic, Manga & Novela Gráfica': [
    '🇯🇵 Manga Shōnen',
    '🌑 Manga Seinen',
    '🌸 Manga Shōjo / Josei',
    '🦸 Cómic Americano & Superhéroes',
    '🇪🇺 Cómic Europeo & Franco-Belga',
    '🖼️ Novela Gráfica de Autor',
    '🇰🇷 Manhwa & Webtoon'
  ],
  '🎭 Poesía, Teatro & Relatos': [
    '🪶 Poesía Clásica & Contemporánea',
    '🎭 Teatro & Dramaturgia',
    '📖 Antología de Relatos & Cuentos',
    '🎙️ Microficción & Aforismos',
    '🐉 Fábulas & Leyendas'
  ]
};

export function getRecommendedSubgenres(genre: Genre | ''): Subgenre[] {
  if (!genre) return [];
  return GENRE_SUBGENRES_MAP[genre] || [];
}

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

/**
 * Infiere el género y los subgéneros a partir de las categorías / materias temáticas (API subjects)
 * cubriendo los 14 géneros principales y sus respectivos subgéneros recomendados.
 */
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

  // 1. Cómic, Manga & Novela Gráfica
  if (
    joined.includes('manga') ||
    joined.includes('comic') ||
    joined.includes('graphic novel') ||
    joined.includes('novela grafica') ||
    joined.includes('manhwa') ||
    joined.includes('webtoon') ||
    joined.includes('superhero') ||
    joined.includes('bande dessinee')
  ) {
    genre = '🎨 Cómic, Manga & Novela Gráfica';
    if (joined.includes('shonen')) subgenres.add('🇯🇵 Manga Shōnen');
    if (joined.includes('seinen')) subgenres.add('🌑 Manga Seinen');
    if (joined.includes('shojo') || joined.includes('josei')) subgenres.add('🌸 Manga Shōjo / Josei');
    if (joined.includes('superhero') || joined.includes('superheroes') || joined.includes('marvel') || joined.includes('dc')) {
      subgenres.add('🦸 Cómic Americano & Superhéroes');
    }
    if (joined.includes('bande dessinee') || joined.includes('franco belge') || joined.includes('europeo')) {
      subgenres.add('🇪🇺 Cómic Europeo & Franco-Belga');
    }
    if (joined.includes('manhwa') || joined.includes('webtoon')) subgenres.add('🇰🇷 Manhwa & Webtoon');
    if (subgenres.size === 0) subgenres.add('🖼️ Novela Gráfica de Autor');
  }

  // 2. Poesía, Teatro & Relatos
  if (
    joined.includes('poetry') ||
    joined.includes('poesia') ||
    joined.includes('poem') ||
    joined.includes('teatro') ||
    joined.includes('theatre') ||
    joined.includes('theater') ||
    joined.includes('play') ||
    joined.includes('short stories') ||
    joined.includes('relatos') ||
    joined.includes('cuentos')
  ) {
    if (!genre) genre = '🎭 Poesía, Teatro & Relatos';
    if (joined.includes('poetry') || joined.includes('poesia') || joined.includes('poem')) {
      subgenres.add('🪶 Poesía Clásica & Contemporánea');
    }
    if (joined.includes('theatre') || joined.includes('theater') || joined.includes('teatro') || joined.includes('dramaturgia')) {
      subgenres.add('🎭 Teatro & Dramaturgia');
    }
    if (joined.includes('short stories') || joined.includes('antologia') || joined.includes('anthology') || joined.includes('relatos') || joined.includes('cuentos')) {
      subgenres.add('📖 Antología de Relatos & Cuentos');
    }
    if (joined.includes('aforismo') || joined.includes('microficcion')) subgenres.add('🎙️ Microficción & Aforismos');
    if (joined.includes('fable') || joined.includes('fabula') || joined.includes('leyenda') || joined.includes('legend')) {
      subgenres.add('🐉 Fábulas & Leyendas');
    }
  }

  // 3. Desarrollo Personal & Negocios
  if (
    joined.includes('self help') ||
    joined.includes('autoayuda') ||
    joined.includes('personal development') ||
    joined.includes('desarrollo personal') ||
    joined.includes('productividad') ||
    joined.includes('productivity') ||
    joined.includes('negocios') ||
    joined.includes('business') ||
    joined.includes('finanzas') ||
    joined.includes('finance') ||
    joined.includes('investing') ||
    joined.includes('inversion') ||
    joined.includes('liderazgo') ||
    joined.includes('leadership') ||
    joined.includes('mindfulness') ||
    joined.includes('habits') ||
    joined.includes('habitos')
  ) {
    if (!genre) genre = '🌱 Desarrollo Personal & Negocios';
    if (joined.includes('productiv') || joined.includes('habit')) subgenres.add('⚡ Productividad & Hábitos');
    if (joined.includes('finanz') || joined.includes('finance') || joined.includes('money') || joined.includes('invers')) {
      subgenres.add('💰 Finanzas Personales & Inversión');
    }
    if (joined.includes('business') || joined.includes('negocio') || joined.includes('emprend') || joined.includes('lider')) {
      subgenres.add('🚀 Emprendimiento, Negocios & Liderazgo');
    }
    if (joined.includes('mindful') || joined.includes('bienestar') || joined.includes('wellness') || joined.includes('salud')) {
      subgenres.add('🧘 Mindfulness, Bienestar & Salud');
    }
    if (joined.includes('comunicac') || joined.includes('relacion') || joined.includes('networking')) {
      subgenres.add('🗣️ Comunicación & Relaciones');
    }
  }

  // 4. Ensayo, Filosofía & Ciencia
  if (
    joined.includes('philosophy') ||
    joined.includes('filosofia') ||
    (joined.includes('essay') && !joined.includes('fantasy')) ||
    (joined.includes('ciencia') && !joined.includes('ficcion')) ||
    (joined.includes('science') && !joined.includes('fiction')) ||
    joined.includes('physics') ||
    joined.includes('astronomy') ||
    joined.includes('biology') ||
    joined.includes('neuroscience') ||
    joined.includes('estoicismo') ||
    joined.includes('stoicism')
  ) {
    if (!genre) genre = '🧠 Ensayo, Filosofía & Ciencia';
    if (joined.includes('filosof') || joined.includes('philosophy')) subgenres.add('📜 Ensayo Filosófico');
    if (joined.includes('estoic') || joined.includes('stoic') || joined.includes('clasica')) {
      subgenres.add('🏛️ Filosofía Clásica & Estoicismo');
    }
    if (joined.includes('divulgac') || joined.includes('popular science')) subgenres.add('🧪 Divulgación Científica');
    if (joined.includes('fisica') || joined.includes('physics') || joined.includes('astron') || joined.includes('cosmos')) {
      subgenres.add('🌌 Física, Astronomía & Cosmos');
    }
    if (joined.includes('biolog') || joined.includes('medicin') || joined.includes('neuro')) {
      subgenres.add('🧬 Biología, Medicina & Neurociencia');
    }
    if (joined.includes('tecnolog') || joined.includes('intelligence') || joined.includes('computer')) {
      subgenres.add('💻 Tecnología, IA & Futuro');
    }
    if (joined.includes('humanidad') || joined.includes('linguist') || joined.includes('literatura')) {
      subgenres.add('🗣️ Lingüística, Literatura & Humanidades');
    }
  }

  // 5. Novela Histórica
  if (
    joined.includes('historical fiction') ||
    joined.includes('novela historica') ||
    joined.includes('edad media') ||
    joined.includes('medieval') ||
    joined.includes('siglo de oro') ||
    joined.includes('victoriana') ||
    joined.includes('victorian') ||
    joined.includes('roma antigua') ||
    joined.includes('ancient rome') ||
    joined.includes('cruzadas') ||
    joined.includes('crusades')
  ) {
    if (!genre) genre = '🏰 Novela Histórica';
    if (joined.includes('roma') || joined.includes('grecia') || joined.includes('egipt') || joined.includes('ancient')) {
      subgenres.add('🦅 Edad Antigua (Roma, Grecia, Egipto)');
    }
    if (joined.includes('medieval') || joined.includes('edad media') || joined.includes('cruzad')) {
      subgenres.add('⚔️ Edad Media & Cruzadas');
    }
    if (joined.includes('renacimient') || joined.includes('siglo de oro')) subgenres.add('🎨 Renacimiento & Siglo de Oro');
    if (joined.includes('victorian') || joined.includes('siglo xix')) subgenres.add('🎩 Siglo XIX & Época Victoriana');
    if (joined.includes('guerra mundial') || joined.includes('world war') || joined.includes('siglo xx')) {
      subgenres.add('🪖 Guerras Mundiales & Siglo XX');
    }
    if (joined.includes('espana') || joined.includes('spain')) subgenres.add('🇪🇸 Historia de España');
    if (joined.includes('dinastia') || joined.includes('biografic')) subgenres.add('👑 Ficción Biográfica & Dinastías');
    if (joined.includes('aventura')) subgenres.add('🗺️ Aventura Histórica');
    if (joined.includes('romance')) subgenres.add('💌 Romance Histórico');
  }

  // 6. Misterio, Thriller & Novela Negra
  if (
    joined.includes('mystery') ||
    joined.includes('misterio') ||
    joined.includes('detective') ||
    joined.includes('novela negra') ||
    joined.includes('policiaca') ||
    joined.includes('thriller') ||
    joined.includes('crimen') ||
    joined.includes('crime') ||
    joined.includes('whodunit') ||
    joined.includes('espionage') ||
    joined.includes('espionaje')
  ) {
    if (!genre) genre = '🕵️ Misterio, Thriller & Novela Negra';
    if (joined.includes('psicolog') || joined.includes('psychological')) subgenres.add('🧠 Thriller Psicológico');
    if (joined.includes('detective') || joined.includes('misterio') || joined.includes('mystery')) {
      subgenres.add('🕵️♂️ Misterio & Detective');
    }
    if (joined.includes('negra') || joined.includes('noir') || joined.includes('policiac') || joined.includes('police')) {
      subgenres.add('🚓 Novela Negra & Policíaca');
    }
    if (joined.includes('whodunit') || joined.includes('habitacion cerrada') || joined.includes('locked room')) {
      subgenres.add('🧩 Whodunit (Habitación Cerrada)');
    }
    if (joined.includes('espion') || joined.includes('conspirac')) subgenres.add('🕵️♀️ Espionaje & Conspiración');
    if (joined.includes('legal') || joined.includes('forense') || joined.includes('court')) {
      subgenres.add('⚖️ Thriller Legal & Forense');
    }
    if (joined.includes('tecno') || joined.includes('techno thriller')) subgenres.add('🌐 Tecno-Thriller');
    if (joined.includes('religios') || joined.includes('historico')) subgenres.add('🏛️ Thriller Histórico & Religioso');
    if (joined.includes('cozy')) subgenres.add('🫖 Cozy Mystery');
  }

  // 7. Terror & Suspense
  if (
    joined.includes('horror') ||
    joined.includes('terror') ||
    joined.includes('lovecraft') ||
    joined.includes('paranormal') ||
    joined.includes('gore') ||
    joined.includes('slasher') ||
    joined.includes('gothic') ||
    joined.includes('gotico')
  ) {
    if (!genre) genre = '🔪 Terror & Suspense';
    if (joined.includes('sobrenatural') || joined.includes('supernatural') || joined.includes('paranormal')) {
      subgenres.add('👻 Terror Sobrenatural');
    }
    if (joined.includes('cosmic') || joined.includes('lovecraft') || joined.includes('cosmico')) {
      subgenres.add('😱 Horror Cósmico');
    }
    if (joined.includes('gotico') || joined.includes('gothic')) subgenres.add('🕯️ Terror Gótico');
    if (joined.includes('encantada') || joined.includes('haunted') || joined.includes('posesion')) {
      subgenres.add('🏚️ Casas Encantadas & Posesiones');
    }
    if (joined.includes('gore') || joined.includes('slasher') || joined.includes('splatter')) {
      subgenres.add('🩸 Gore & Slasher');
    }
    if (joined.includes('criaturas') || joined.includes('monstruo') || joined.includes('zombie')) {
      subgenres.add('🧟 Supervivencia & Criaturas');
    }
    if (joined.includes('folk')) subgenres.add('🌲 Folk Horror');
    if (joined.includes('body')) subgenres.add('🦠 Body Horror');
  }

  // 8. Fantasía
  if (joined.includes('fantasy') || joined.includes('fantasia') || joined.includes('grimdark')) {
    if (!genre) genre = '✨ Fantasía';
    if (joined.includes('epic fantasy') || joined.includes('fantasia epica')) subgenres.add('🧙♂️ Fantasía Épica');
    if (joined.includes('high fantasy') || joined.includes('alta fantasia')) subgenres.add('🐉 Alta Fantasía & Mundos Secundarios');
    if (joined.includes('dark fantasy') || joined.includes('fantasia oscura')) subgenres.add('🏰 Fantasía Oscura');
    if (joined.includes('grimdark')) subgenres.add('⚔️ Grimdark');
    if (joined.includes('urban fantasy') || joined.includes('fantasia urbana')) subgenres.add('🌿 Fantasía Urbana');
    if (joined.includes('young adult') || joined.includes('juvenil')) subgenres.add('🪄 Fantasía Juvenil');
    if (joined.includes('romantasy')) subgenres.add('💘 Romantasy');
    if (joined.includes('sword') || joined.includes('espada')) subgenres.add('🗡️ Espada y Brujería');
    if (joined.includes('cozy')) subgenres.add('☕ Cozy Fantasy');
    if (joined.includes('mythology') || joined.includes('mitologia')) subgenres.add('🏺 Mitología & Epopeya');
    if (joined.includes('realismo magico') || joined.includes('magical realism')) subgenres.add('🔮 Realismo Mágico');
    if (joined.includes('fairy') || joined.includes('folklore') || joined.includes('hadas')) {
      subgenres.add('🧚 Cuentos de Hadas & Folklore');
    }
  }

  // 9. Ciencia Ficción & Distopía
  if (
    joined.includes('science fiction') ||
    joined.includes('ciencia ficcion') ||
    joined.includes('scifi') ||
    joined.includes('sci fi') ||
    joined.includes('distopia') ||
    joined.includes('dystopian') ||
    joined.includes('cyberpunk')
  ) {
    if (!genre) genre = '🔭 Ciencia Ficción & Distopía';
    if (joined.includes('space opera')) subgenres.add('🚀 Space Opera');
    if (joined.includes('hard') || joined.includes('dura')) subgenres.add('🔬 Ciencia Ficción Dura (Hard Sci-Fi)');
    if (joined.includes('distop') || joined.includes('dystop') || joined.includes('utop')) subgenres.add('👁️ Distopía & Utopía');
    if (joined.includes('post apocalyptic') || joined.includes('apocaliptico')) subgenres.add('🏚️ Post-Apocalíptico');
    if (joined.includes('time travel') || joined.includes('viajes en el tiempo')) subgenres.add('⏳ Viajes en el Tiempo');
    if (joined.includes('multiverse') || joined.includes('multiverso')) subgenres.add('🌀 Multiversos & Realidades Alternativas');
    if (joined.includes('cyberpunk') || joined.includes('ia') || joined.includes('robot')) subgenres.add('🤖 Cyberpunk & IA');
    if (joined.includes('alien') || joined.includes('contacto')) subgenres.add('👽 Primer Contacto & Aliens');
    if (joined.includes('coloniz') || joined.includes('planet')) subgenres.add('🪐 Colonización Espacial');
    if (joined.includes('biopunk') || joined.includes('genetic')) subgenres.add('🧬 Biopunk & Genética');
    if (joined.includes('steampunk')) subgenres.add('⚙️ Steampunk & Retrofuturismo');
  }

  // 10. Romance & Drama
  if (joined.includes('romance') || joined.includes('amor') || joined.includes('drama')) {
    if (!genre) genre = '❤️ Romance & Drama';
    if (joined.includes('comedia') || joined.includes('comedy')) subgenres.add('😂 Comedia Romántica');
    if (joined.includes('historico') || joined.includes('regency') || joined.includes('period')) subgenres.add('💌 Romance Histórico');
    if (joined.includes('dark romance')) subgenres.add('🔥 Dark Romance');
    if (joined.includes('enemies to lovers')) subgenres.add('⚔️ Enemies to Lovers');
    if (joined.includes('lgbt') || joined.includes('queer')) subgenres.add('🌈 Romance LGBT+');
    if (joined.includes('new adult')) subgenres.add('🎓 New Adult & Universitario');
    if (joined.includes('familiar') || joined.includes('family')) subgenres.add('🥹 Drama Familiar & Generacional');
    if (joined.includes('romantasy')) subgenres.add('💘 Romantasy');
    if (subgenres.size === 0) subgenres.add('❤️ Romance Contemporáneo');
  }

  // 11. Aventuras
  if (
    joined.includes('adventure') ||
    joined.includes('aventura') ||
    joined.includes('western') ||
    joined.includes('pirat') ||
    joined.includes('nautical')
  ) {
    if (!genre) genre = '🏇 Aventuras';
    if (joined.includes('histor')) subgenres.add('🗺️ Aventura Histórica');
    if (joined.includes('accion') || joined.includes('action') || joined.includes('combate')) subgenres.add('⚔️ Acción & Combate');
    if (joined.includes('nautic') || joined.includes('mar') || joined.includes('naval')) subgenres.add('🌊 Aventura Náutica');
    if (joined.includes('pirat')) subgenres.add('🏴☠️ Piratas & Corsarios');
    if (joined.includes('explor') || joined.includes('arqueol')) subgenres.add('🧭 Exploración & Arqueología');
    if (joined.includes('superviv') || joined.includes('survival')) subgenres.add('🏔️ Supervivencia & Naturaleza');
    if (joined.includes('capa y espada') || joined.includes('swashbuckler')) subgenres.add('🗡️ Capa y Espada');
    if (joined.includes('western') || joined.includes('vaquero')) subgenres.add('🤠 Western');
  }

  // 12. Ficción Contemporánea & Literaria
  if (
    joined.includes('contemporary fiction') ||
    joined.includes('literary fiction') ||
    joined.includes('ficcion contemporanea') ||
    joined.includes('costumbrismo') ||
    joined.includes('coming of age') ||
    joined.includes('existencial')
  ) {
    if (!genre) genre = '🖋️ Ficción Contemporánea & Literaria';
    if (joined.includes('urban') || joined.includes('costumbrismo')) subgenres.add('🏙️ Narrativa Urbana & Costumbrismo');
    if (joined.includes('existencial')) subgenres.add('💭 Novela Existencialista');
    if (joined.includes('critica social')) subgenres.add('🌍 Crítica Social');
    if (joined.includes('coming of age') || joined.includes('aprendizaje')) subgenres.add('🌱 Coming-of-Age (Aprendizaje)');
    if (joined.includes('humor') || joined.includes('satira')) subgenres.add('🎭 Humor & Sátira');
    if (joined.includes('feel good') || joined.includes('slice of life')) subgenres.add('🏡 Feel-Good & Slice of Life');
    if (joined.includes('metaficcion') || joined.includes('metafiction')) subgenres.add('📚 Metaficción & Libros sobre Libros');
  }

  // 13. Clásicos
  if (joined.includes('classic') || joined.includes('clasico') || joined.includes('grecolatino')) {
    if (!genre) genre = '🏛️ Clásicos';
    if (joined.includes('greco') || joined.includes('latin') || joined.includes('roma') || joined.includes('grecia')) {
      subgenres.add('🏛️ Clásicos Grecolatinos');
    }
    if (joined.includes('siglo de oro') || joined.includes('hispanic')) subgenres.add('✒️ Siglo de Oro & Clásicos Hispánicos');
    if (joined.includes('xix') || joined.includes('realismo') || joined.includes('naturalismo')) {
      subgenres.add('🎩 Literatura del Siglo XIX (Realismo & Naturalismo)');
    }
    if (joined.includes('gotico') || joined.includes('romanticismo')) subgenres.add('🕯️ Gótico Clásico & Romanticismo');
    if (joined.includes('generacion del 98') || joined.includes('siglo xx')) subgenres.add('🌊 Generación del 98 & Siglo XX');
    if (subgenres.size === 0) subgenres.add('🌍 Clásicos Universales');
  }

  // 14. No Ficción
  if (
    joined.includes('nonfiction') ||
    joined.includes('non fiction') ||
    joined.includes('no ficcion') ||
    joined.includes('biography') ||
    joined.includes('biografia') ||
    joined.includes('history') ||
    joined.includes('historia') ||
    joined.includes('true crime')
  ) {
    if (!genre) genre = '📚 No Ficción';
    if (joined.includes('historia') || joined.includes('history')) subgenres.add('🌍 Historia');
    if (joined.includes('biografia') || joined.includes('biography')) subgenres.add('📜 Biografía');
    if (joined.includes('memoir') || joined.includes('memorias') || joined.includes('diario')) subgenres.add('📓 Memorias & Diarios');
    if (joined.includes('true crime') || joined.includes('investigacion')) subgenres.add('🕵️ True Crime & Investigación');
    if (joined.includes('periodismo') || joined.includes('cronica') || joined.includes('journalism')) subgenres.add('📰 Periodismo & Crónica');
    if (joined.includes('politica') || joined.includes('sociedad') || joined.includes('politics')) {
      subgenres.add('🏛️ Política, Geopolítica & Sociedad');
    }
    if (joined.includes('viaje') || joined.includes('travel')) subgenres.add('✈️ Viajes & Naturaleza');
    if (joined.includes('arte') || joined.includes('musica') || joined.includes('cultura pop')) subgenres.add('🎨 Arte, Música & Cultura Pop');
  }

  return {
    genre,
    subgenres: Array.from(subgenres)
  };
}

export const inferGenreAndSubgenres = inferCatalogFromCategories;
