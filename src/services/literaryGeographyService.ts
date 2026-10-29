/**
 * Servicio de Geografía Literaria y Pasaporte de la República de las Letras.
 * Asocia autores y libros con países y culturas del mundo, calcula estadísticas consulares
 * y gestiona los sellos de visado del lector.
 */

import { Book } from '../types/models';

export type Continent =
  | 'Europa'
  | 'América del Norte'
  | 'América Latina'
  | 'Asia'
  | 'África'
  | 'Oceanía';

export interface CountryInfo {
  code: string; // ISO 2 (ES, GB, US, FR, JP, etc.)
  name: string; // "España", "Reino Unido", etc.
  flag: string; // 🇪🇸, 🇬🇧, etc.
  continent: Continent;
  sealLatinName: string; // e.g. "REGNUM HISPANIAE"
  color: string; // Color de tinta vintage para el sello
  shape: 'circle' | 'octagon' | 'rectangle' | 'oval';
}

export interface CountryPassportEntry {
  country: CountryInfo;
  books: Book[];
  readBooks: Book[];
  readCount: number;
  authors: string[];
  firstReadDate?: string;
  lastReadDate?: string;
  stamped: boolean;
}

export interface DiplomaticRank {
  title: string;
  latinTitle: string;
  description: string;
  badge: string;
  level: number;
}

export interface PassportBadge {
  id: string;
  title: string;
  latinTitle: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progressText: string;
}

export interface PassportSummary {
  totalCountriesStamped: number;
  totalContinentsStamped: number;
  totalBooksMapped: number;
  continentsCount: Record<Continent, number>;
  entries: CountryPassportEntry[];
  unmappedBooks: Book[];
  diplomaticRank: DiplomaticRank;
  badges: PassportBadge[];
}

// ─── Catálogo de Países Literarios ───
export const COUNTRIES_CATALOG: Record<string, CountryInfo> = {
  ES: {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    continent: 'Europa',
    sealLatinName: 'REGNUM HISPANIAE',
    color: '#b91c1c', // Carmesí consular
    shape: 'circle'
  },
  GB: {
    code: 'GB',
    name: 'Reino Unido',
    flag: '🇬🇧',
    continent: 'Europa',
    sealLatinName: 'BRITANNIA LITTERARIA',
    color: '#1d4ed8', // Azul real
    shape: 'octagon'
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    continent: 'América del Norte',
    sealLatinName: 'CIVITATES FOEDERATAE',
    color: '#0f766e', // Verde azulado
    shape: 'rectangle'
  },
  FR: {
    code: 'FR',
    name: 'Francia',
    flag: '🇫🇷',
    continent: 'Europa',
    sealLatinName: 'REPUBLICA GALLICA',
    color: '#6d28d9', // Púrpura cardenalicio
    shape: 'circle'
  },
  JP: {
    code: 'JP',
    name: 'Japón',
    flag: '🇯🇵',
    continent: 'Asia',
    sealLatinName: 'IMPERIUM NIPPONICUM',
    color: '#be123c', // Rojo bermellón
    shape: 'octagon'
  },
  DE: {
    code: 'DE',
    name: 'Alemania',
    flag: '🇩🇪',
    continent: 'Europa',
    sealLatinName: 'TERRA TEUTONICA',
    color: '#854d0e', // Bronce / Ámbar oscuro
    shape: 'rectangle'
  },
  IT: {
    code: 'IT',
    name: 'Italia',
    flag: '🇮🇹',
    continent: 'Europa',
    sealLatinName: 'PENINSULA ITALICA',
    color: '#15803d', // Verde laurel
    shape: 'oval'
  },
  RU: {
    code: 'RU',
    name: 'Rusia',
    flag: '🇷🇺',
    continent: 'Europa',
    sealLatinName: 'ARCHIVUM BOREALE',
    color: '#475569', // Pizarra nórdica
    shape: 'octagon'
  },
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    continent: 'América Latina',
    sealLatinName: 'MEXICUM LITTERARUM',
    color: '#047857', // Esmeralda
    shape: 'circle'
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    continent: 'América Latina',
    sealLatinName: 'TERRA PLATAE',
    color: '#0369a1', // Celeste profundo
    shape: 'rectangle'
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    continent: 'América Latina',
    sealLatinName: 'COLOMBIA MAGICA',
    color: '#ca8a04', // Dorado cálido
    shape: 'oval'
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    continent: 'América Latina',
    sealLatinName: 'CHILIA AUSTRALIS',
    color: '#991b1b', // Rojo tierra
    shape: 'octagon'
  },
  IE: {
    code: 'IE',
    name: 'Irlanda',
    flag: '🇮🇪',
    continent: 'Europa',
    sealLatinName: 'HIBERNIA CELTICA',
    color: '#166534', // Verde celta
    shape: 'circle'
  },
  PL: {
    code: 'PL',
    name: 'Polonia',
    flag: '🇵🇱',
    continent: 'Europa',
    sealLatinName: 'POLONIA HISTORICA',
    color: '#9f1239', // Carmín
    shape: 'rectangle'
  },
  SE: {
    code: 'SE',
    name: 'Suecia',
    flag: '🇸🇪',
    continent: 'Europa',
    sealLatinName: 'SUECIA BOREALIS',
    color: '#1e40af', // Índigo nórdico
    shape: 'octagon'
  },
  GR: {
    code: 'GR',
    name: 'Grecia',
    flag: '🇬🇷',
    continent: 'Europa',
    sealLatinName: 'HELLAS CLASSICA',
    color: '#0284c7', // Azul egeo
    shape: 'oval'
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    continent: 'Europa',
    sealLatinName: 'LUSITANIA AUREA',
    color: '#15803d', // Verde lusitano
    shape: 'circle'
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    continent: 'América Latina',
    sealLatinName: 'BRASILIA TROPICALIS',
    color: '#16a34a', // Verde selva
    shape: 'rectangle'
  },
  CA: {
    code: 'CA',
    name: 'Canadá',
    flag: '🇨🇦',
    continent: 'América del Norte',
    sealLatinName: 'CANADA SEPTENTRIONALIS',
    color: '#b91c1c', // Rojo arce
    shape: 'octagon'
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    continent: 'Oceanía',
    sealLatinName: 'TERRA AUSTRALIS',
    color: '#b45309', // Ocre arenisco
    shape: 'oval'
  },
  EG: {
    code: 'EG',
    name: 'Egipto',
    flag: '🇪🇬',
    continent: 'África',
    sealLatinName: 'AEGYPTUS ANTIQUA',
    color: '#a16207', // Oro faraónico
    shape: 'octagon'
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    continent: 'África',
    sealLatinName: 'NIGERIA LITTERARIA',
    color: '#047857', // Verde yoruba
    shape: 'circle'
  },
  ZA: {
    code: 'ZA',
    name: 'Sudáfrica',
    flag: '🇿🇦',
    continent: 'África',
    sealLatinName: 'AFRICA AUSTRALIS',
    color: '#0e7490', // Océano cabo
    shape: 'rectangle'
  },
  KR: {
    code: 'KR',
    name: 'Corea del Sur',
    flag: '🇰🇷',
    continent: 'Asia',
    sealLatinName: 'COREA ORIENTALIS',
    color: '#1d4ed8', // Azul cobalto
    shape: 'circle'
  },
  CN: {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    continent: 'Asia',
    sealLatinName: 'SERICA IMPERIALIS',
    color: '#b91c1c', // Bermellón imperial
    shape: 'rectangle'
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    continent: 'Asia',
    sealLatinName: 'INDIA ANCIENT',
    color: '#c2410c', // Azafrán
    shape: 'oval'
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    flag: '🇦🇹',
    continent: 'Europa',
    sealLatinName: 'AUSTRIA IMPERIALIS',
    color: '#be123c', // Rojo vianés
    shape: 'rectangle'
  },
  CH: {
    code: 'CH',
    name: 'Suiza',
    flag: '🇨🇭',
    continent: 'Europa',
    sealLatinName: 'HELVETIA ALPINA',
    color: '#dc2626', // Rojo alpino
    shape: 'circle'
  },
  NL: {
    code: 'NL',
    name: 'Países Bajos',
    flag: '🇳🇱',
    continent: 'Europa',
    sealLatinName: 'BATAVIA LITTERARIA',
    color: '#ea580c', // Naranja neerlandés
    shape: 'octagon'
  },
  NO: {
    code: 'NO',
    name: 'Noruega',
    flag: '🇳🇴',
    continent: 'Europa',
    sealLatinName: 'NORVEGIA FJORDICA',
    color: '#1e3a8a', // Azul fiordo
    shape: 'oval'
  },
  DK: {
    code: 'DK',
    name: 'Dinamarca',
    flag: '🇩🇰',
    continent: 'Europa',
    sealLatinName: 'DANIA NORDICA',
    color: '#991b1b', // Rojo nórdico
    shape: 'rectangle'
  },
  CZ: {
    code: 'CZ',
    name: 'República Checa',
    flag: '🇨🇿',
    continent: 'Europa',
    sealLatinName: 'BOHEMIA LITTERATA',
    color: '#1d4ed8', // Azul bohemio
    shape: 'octagon'
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    continent: 'América Latina',
    sealLatinName: 'PERUVIA ANDINA',
    color: '#b91c1c', // Rojo inca
    shape: 'circle'
  },
  UY: {
    code: 'UY',
    name: 'Uruguay',
    flag: '🇺🇾',
    continent: 'América Latina',
    sealLatinName: 'URUGUAIA LITTERATA',
    color: '#0284c7', // Azul rioplatense
    shape: 'oval'
  }
};

// ─── Diccionario Base de Autores Famosos y su País ───
const AUTHOR_COUNTRY_MAP: Record<string, string> = {
  // España
  'miguel de cervantes': 'ES',
  'cervantes': 'ES',
  'pío baroja': 'ES',
  'pio baroja': 'ES',
  'miguel de unamuno': 'ES',
  'unamuno': 'ES',
  'federico garcía lorca': 'ES',
  'garcia lorca': 'ES',
  'carlos ruiz zafón': 'ES',
  'carlos ruiz zafon': 'ES',
  'javier marías': 'ES',
  'javier marias': 'ES',
  'arturo pérez-reverte': 'ES',
  'arturo perez-reverte': 'ES',
  'perez-reverte': 'ES',
  'laura gallego': 'ES',
  'juan gómez-jurado': 'ES',
  'juan gomez-jurado': 'ES',
  'fernando aramburu': 'ES',
  'carmen laforet': 'ES',
  'benito pérez galdós': 'ES',
  'perez galdos': 'ES',
  'rosalía de castro': 'ES',
  'eduardo mendoza': 'ES',
  'rosa montero': 'ES',
  'javier cercas': 'ES',
  'dolores redondo': 'ES',
  'eva garcía sáenz de urturi': 'ES',
  'albert espinosa': 'ES',
  'matilde asensi': 'ES',

  // Reino Unido
  'j.k. rowling': 'GB',
  'jk rowling': 'GB',
  'j. k. rowling': 'GB',
  'ken follett': 'GB',
  'george orwell': 'GB',
  'j.r.r. tolkien': 'GB',
  'jrr tolkien': 'GB',
  'tolkien': 'GB',
  'william shakespeare': 'GB',
  'shakespeare': 'GB',
  'jane austen': 'GB',
  'emily brontë': 'GB',
  'emily bronte': 'GB',
  'charlotte brontë': 'GB',
  'charlotte bronte': 'GB',
  'anne brontë': 'GB',
  'arthur conan doyle': 'GB',
  'conan doyle': 'GB',
  'agatha christie': 'GB',
  'neil gaiman': 'GB',
  'virginia woolf': 'GB',
  'roald dahl': 'GB',
  'terry pratchett': 'GB',
  'charles dickens': 'GB',
  'mary shelley': 'GB',
  'c.s. lewis': 'GB',
  'philip pullman': 'GB',
  'joe abercrombie': 'GB',
  'kazuo ishiguro': 'GB',
  'lewis carroll': 'GB',
  'h.g. wells': 'GB',
  'hg wells': 'GB',
  'aldous huxley': 'GB',
  'douglas adams': 'GB',
  'salman rushdie': 'GB',
  'zadie smith': 'GB',
  'ian mcewan': 'GB',

  // Estados Unidos
  'brandon sanderson': 'US',
  'stephen king': 'US',
  'ray bradbury': 'US',
  'edgar allan poe': 'US',
  'ernest hemingway': 'US',
  'isaac asimov': 'US',
  'george r.r. martin': 'US',
  'george rr martin': 'US',
  'h.p. lovecraft': 'US',
  'hp lovecraft': 'US',
  'philip k. dick': 'US',
  'f. scott fitzgerald': 'US',
  'scott fitzgerald': 'US',
  'john steinbeck': 'US',
  'mark twain': 'US',
  'cormac mccarthy': 'US',
  'patrick rothfuss': 'US',
  'suzanne collins': 'US',
  'rick riordan': 'US',
  'dan brown': 'US',
  'frank herbert': 'US',
  'ursula k. le guin': 'US',
  'ursula le guin': 'US',
  'harper lee': 'US',
  'j.d. salinger': 'US',
  'salinger': 'US',
  'jack london': 'US',
  'tony morrison': 'US',
  'toni morrison': 'US',
  'maya angelou': 'US',
  'chuck palahniuk': 'US',
  'kurt vonnegut': 'US',
  'harlan coben': 'US',
  'john green': 'US',
  'sarah j. maas': 'US',
  'rebecca yarros': 'US',
  'blake crouch': 'US',
  'ted chiang': 'US',
  'andy weir': 'US',

  // Francia
  'victor hugo': 'FR',
  'alexandre dumas': 'FR',
  'alejandro dumas': 'FR',
  'albert camus': 'FR',
  'marcel proust': 'FR',
  'jules verne': 'FR',
  'julio verne': 'FR',
  'antoine de saint-exupéry': 'FR',
  'saint-exupery': 'FR',
  'émile zola': 'FR',
  'emile zola': 'FR',
  'gustave flaubert': 'FR',
  'simone de beauvoir': 'FR',
  'jean-paul sartre': 'FR',
  'michel houellebecq': 'FR',
  'molière': 'FR',
  'charles baudelaire': 'FR',

  // Japón
  'haruki murakami': 'JP',
  'yukio mishima': 'JP',
  'yasunari kawabata': 'JP',
  'osamu dazai': 'JP',
  'keigo higashino': 'JP',
  'sayaka murata': 'JP',
  'banana yoshimoto': 'JP',
  'kenzaburo oe': 'JP',
  'natsume soseki': 'JP',
  'ryunosuke akutagawa': 'JP',
  'yoko ogawa': 'JP',
  'toshikazu kawaguchi': 'JP',

  // Rusia
  'fiódor dostoievski': 'RU',
  'fiodor dostoievski': 'RU',
  'dostoievski': 'RU',
  'dostoevsky': 'RU',
  'lev tolstói': 'RU',
  'leon tolstoi': 'RU',
  'tolstoi': 'RU',
  'tolstoy': 'RU',
  'antón chéjov': 'RU',
  'anton chejov': 'RU',
  'chejov': 'RU',
  'nikolái gógol': 'RU',
  'nikolai gogol': 'RU',
  'gogol': 'RU',
  'aleksandr pushkin': 'RU',
  'pushkin': 'RU',
  'mijaíl bulgákov': 'RU',
  'bulgakov': 'RU',
  'vladímir nabokov': 'RU',
  'nabokov': 'RU',
  'boris pasternak': 'RU',
  'maksim gorki': 'RU',

  // Alemania / Austria / Suiza
  'johann wolfgang von goethe': 'DE',
  'goethe': 'DE',
  'hermann hesse': 'DE',
  'thomas mann': 'DE',
  'patrick süskind': 'DE',
  'patrick suskind': 'DE',
  'michael ende': 'DE',
  'bernhard schlink': 'DE',
  'friedrich nietzsche': 'DE',
  'stefan zweig': 'AT',
  'franz kafka': 'CZ', // O Praga
  'kafka': 'CZ',
  'milan kundera': 'CZ',

  // Italia
  'dante alighieri': 'IT',
  'umberto eco': 'IT',
  'italo calvino': 'IT',
  'giovanni boccaccio': 'IT',
  'elena ferrante': 'IT',
  'alessandro baricco': 'IT',
  'primo levi': 'IT',

  // Latinoamérica
  'gabriel garcía márquez': 'CO',
  'garcia marquez': 'CO',
  'laura restrepo': 'CO',
  'jorge luis borges': 'AR',
  'borges': 'AR',
  'julio cortázar': 'AR',
  'cortazar': 'AR',
  'ernesto sabato': 'AR',
  'mariana enríquez': 'AR',
  'mariana enriquez': 'AR',
  'adolfo bioy casares': 'AR',
  'samanta schweblin': 'AR',
  'juan rulfo': 'MX',
  'octavio paz': 'MX',
  'carlos fuentes': 'MX',
  'laura esquivel': 'MX',
  'isabel allende': 'CL',
  'pablo neruda': 'CL',
  'roberto bolaño': 'CL',
  'roberto bolano': 'CL',
  'gabriela mistral': 'CL',
  'mario vargas llosa': 'PE',
  'vargas llosa': 'PE',
  'eduardo galeano': 'UY',
  'mario benedetti': 'UY',
  'paulo coelho': 'BR',
  'machado de assis': 'BR',
  'clarice lispector': 'BR',

  // Irlanda
  'oscar wilde': 'IE',
  'james joyce': 'IE',
  'bram stoker': 'IE',
  'samuel beckett': 'IE',
  'sally rooney': 'IE',
  'c.s. lewis (irlanda)': 'IE',

  // Nórdicos
  'stieg larsson': 'SE',
  'astrid lindgren': 'SE',
  'henning mankell': 'SE',
  'fredrik backman': 'SE',
  'jo nesbø': 'NO',
  'jo nesbo': 'NO',
  'knut hamsun': 'NO',
  'hans christian andersen': 'DK',

  // Polonia
  'andrzej sapkowski': 'PL',
  'sapkowski': 'PL',
  'stanisław lem': 'PL',
  'stanislaw lem': 'PL',
  'olga tokarczuk': 'PL',

  // Grecia clásica
  'homero': 'GR',
  'platón': 'GR',
  'platon': 'GR',
  'aristóteles': 'GR',
  'aristoteles': 'GR',
  'sófocles': 'GR',

  // Portugal
  'josé saramago': 'PT',
  'jose saramago': 'PT',
  'fernando pessoa': 'PT',

  // Otros continentes
  'naguib mahfouz': 'EG',
  'chimamanda ngozi adichie': 'NG',
  'chinua achebe': 'NG',
  'j.m. coetzee': 'ZA',
  'nelson mandela': 'ZA',
  'han kang': 'KR',
  'liu cixin': 'CN',
  'mo yan': 'CN',
  'arundhati roy': 'IN',
  'marcus zusak': 'AU'
};

const USER_OVERRIDE_KEY = 'nexus_author_countries_override';

class LiteraryGeographyService {
  private userOverrides: Record<string, string> = {};

  constructor() {
    this.loadOverrides();
  }

  private loadOverrides() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(USER_OVERRIDE_KEY);
      if (saved) {
        this.userOverrides = JSON.parse(saved);
      }
    } catch {
      this.userOverrides = {};
    }
  }

  public setAuthorCountry(authorName: string, countryCode: string) {
    const key = authorName.trim().toLowerCase();
    this.userOverrides[key] = countryCode.toUpperCase();
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_OVERRIDE_KEY, JSON.stringify(this.userOverrides));
      }
    } catch {}
  }

  public getAuthorCountryCode(authorName?: string | null): string | null {
    if (!authorName) return null;
    const clean = authorName.trim().toLowerCase();

    // 1. Revisar sobreescrituras del usuario
    if (this.userOverrides[clean]) {
      return this.userOverrides[clean];
    }

    // 2. Revisar coincidencia exacta en el diccionario
    if (AUTHOR_COUNTRY_MAP[clean]) {
      return AUTHOR_COUNTRY_MAP[clean];
    }

    // 3. Revisar si contiene algún autor conocido (ej. "J.K. Rowling (Traducción)")
    for (const [knownAuthor, code] of Object.entries(AUTHOR_COUNTRY_MAP)) {
      if (clean.includes(knownAuthor)) {
        return code;
      }
    }

    return null;
  }

  /**
   * Deducción inteligente de país:
   * Prioridad:
   * 1. Diccionario de autor
   * 2. Idioma específico (Japonés -> Japón, Ruso -> Rusia, Francés -> Francia, etc.)
   */
  public resolveBookCountry(book: Book): CountryInfo | null {
    const code = this.getAuthorCountryCode(book.autor);
    if (code && COUNTRIES_CATALOG[code]) {
      return COUNTRIES_CATALOG[code];
    }

    // Deducción por idioma si es inequívoco
    const lang = (book.idioma || '').trim().toLowerCase();
    if (lang.includes('japonés') || lang.includes('japones') || lang.includes('japanese')) {
      return COUNTRIES_CATALOG.JP;
    }
    if (lang.includes('ruso') || lang.includes('russian')) {
      return COUNTRIES_CATALOG.RU;
    }
    if (lang.includes('francés') || lang.includes('frances') || lang.includes('french')) {
      return COUNTRIES_CATALOG.FR;
    }
    if (lang.includes('alemán') || lang.includes('aleman') || lang.includes('german')) {
      return COUNTRIES_CATALOG.DE;
    }
    if (lang.includes('italiano') || lang.includes('italian')) {
      return COUNTRIES_CATALOG.IT;
    }
    if (lang.includes('portugués') || lang.includes('portugues') || lang.includes('portuguese')) {
      return COUNTRIES_CATALOG.PT;
    }

    return null;
  }

  public getDiplomaticRank(countriesCount: number, continentsCount: number): DiplomaticRank {
    if (continentsCount >= 4 && countriesCount >= 10) {
      return {
        title: 'Embajador Plenipotenciario de las Letras',
        latinTitle: 'Legatus Plenipotentiarius Litterarum',
        description: 'Máximo honor diplomático consular. Tu biblioteca no conoce fronteras ni husos horarios.',
        badge: 'Rango V · Plenipotenciario',
        level: 5
      };
    }
    if (continentsCount >= 3 || countriesCount >= 6) {
      return {
        title: 'Cónsul Mayor de Ultramar',
        latinTitle: 'Consul Magnus Transmarinus',
        description: 'Trotamundos literario consagrado. Has visitado múltiples continentes y culturas.',
        badge: 'Rango IV · Consular',
        level: 4
      };
    }
    if (countriesCount >= 4) {
      return {
        title: 'Ministro de Relaciones Literarias',
        latinTitle: 'Minister Relationum Litterarum',
        description: 'Lector cosmopolita con visados en diversos reinos y tradiciones lingüísticas.',
        badge: 'Rango III · Ministro',
        level: 3
      };
    }
    if (countriesCount >= 2) {
      return {
        title: 'Agregado Cultural de la República',
        latinTitle: 'Attache Culturalis Reipublicae',
        description: 'Has iniciado tu viaje transfronterizo descubriendo autores fuera de tu tierra natal.',
        badge: 'Rango II · Agregado',
        level: 2
      };
    }
    return {
      title: 'Emisario Inicial de Frontera',
      latinTitle: 'Emissarius Primus Limitaneus',
      description: 'Acabas de expedir tu Pasaporte Consular. Nuevos territorios y culturas te aguardan.',
      badge: 'Rango I · Iniciado',
      level: 1
    };
  }

  public calculatePassport(books: Book[]): PassportSummary {
    const countryMap = new Map<string, Book[]>();
    const unmapped: Book[] = [];

    books.forEach((b) => {
      const country = this.resolveBookCountry(b);
      if (country) {
        const list = countryMap.get(country.code) || [];
        list.push(b);
        countryMap.set(country.code, list);
      } else {
        unmapped.push(b);
      }
    });

    const entries: CountryPassportEntry[] = [];
    const continentsCount: Record<Continent, number> = {
      Europa: 0,
      'América del Norte': 0,
      'América Latina': 0,
      Asia: 0,
      África: 0,
      Oceanía: 0
    };

    const stampedContinents = new Set<Continent>();

    countryMap.forEach((bookList, code) => {
      const country = COUNTRIES_CATALOG[code];
      if (!country) return;

      const readBooks = bookList.filter((b) => b.progreso && b.progreso.includes('Leído'));
      const isStamped = readBooks.length > 0;

      const authorsSet = new Set<string>();
      bookList.forEach((b) => {
        if (b.autor?.trim()) authorsSet.add(b.autor.trim());
      });

      if (isStamped) {
        continentsCount[country.continent] = (continentsCount[country.continent] || 0) + 1;
        stampedContinents.add(country.continent);
      }

      entries.push({
        country,
        books: bookList,
        readBooks,
        readCount: readBooks.length,
        authors: Array.from(authorsSet),
        stamped: isStamped
      });
    });

    // Ordenar: primero los sellados con más obras leídas, luego alfabéticamente
    entries.sort((a, b) => {
      if (a.stamped !== b.stamped) return a.stamped ? -1 : 1;
      if (b.readCount !== a.readCount) return b.readCount - a.readCount;
      return a.country.name.localeCompare(b.country.name);
    });

    const totalCountriesStamped = entries.filter((e) => e.stamped).length;
    const totalContinentsStamped = stampedContinents.size;
    const totalBooksMapped = books.length - unmapped.length;

    const diplomaticRank = this.getDiplomaticRank(
      totalCountriesStamped,
      totalContinentsStamped
    );

    // Insignias consulares de exploración
    const badges: PassportBadge[] = [
      {
        id: 'iberian',
        title: 'Sello del Reino Ibérico',
        latinTitle: 'Sigillum Ibericum',
        description: 'Has leído obras de autores españoles o portugueses.',
        icon: '🏛️',
        unlocked: Boolean(
          (countryMap.get('ES')?.some((b) => b.progreso?.includes('Leído'))) ||
          (countryMap.get('PT')?.some((b) => b.progreso?.includes('Leído')))
        ),
        progressText: 'España / Portugal'
      },
      {
        id: 'anglosaxon',
        title: 'Visado Anglosajón',
        latinTitle: 'Visum Britannicum et Americanum',
        description: 'Has completado 3 o más obras de autores británicos o estadounidenses.',
        icon: '👑',
        unlocked:
          ((countryMap.get('GB')?.filter((b) => b.progreso?.includes('Leído')).length || 0) +
            (countryMap.get('US')?.filter((b) => b.progreso?.includes('Leído')).length || 0)) >= 3,
        progressText: '3+ obras de UK o EE.UU.'
      },
      {
        id: 'latam',
        title: 'Crónicas de las Américas',
        latinTitle: 'Chronica Neomundi',
        description: 'Has leído autores latinoamericanos (México, Argentina, Colombia, Chile, etc.).',
        icon: '🌿',
        unlocked: ['MX', 'AR', 'CO', 'CL', 'PE', 'UY'].some((code) =>
          countryMap.get(code)?.some((b) => b.progreso?.includes('Leído'))
        ),
        progressText: 'América Latina'
      },
      {
        id: 'orient',
        title: 'Caminante del Sol Naciente',
        latinTitle: 'Viator Solis Orientis',
        description: 'Has cruzado el Pacífico para leer autores asiáticos (Japón, Corea o China).',
        icon: '⛩️',
        unlocked: ['JP', 'KR', 'CN'].some((code) =>
          countryMap.get(code)?.some((b) => b.progreso?.includes('Leído'))
        ),
        progressText: 'Japón / Asia'
      },
      {
        id: 'cosmopolitan',
        title: 'Cosmopolita Consagrado',
        latinTitle: 'Civis Mundi Illustris',
        description: 'Has sellado tu pasaporte con autores de al menos 5 países distintos.',
        icon: '🌍',
        unlocked: totalCountriesStamped >= 5,
        progressText: `${Math.min(5, totalCountriesStamped)} / 5 países sellados`
      },
      {
        id: 'intercontinental',
        title: 'Pacto Intercontinental',
        latinTitle: 'Foedus Intercontinentale',
        description: 'Has explorado autores de 3 o más continentes del planeta.',
        icon: '🧭',
        unlocked: totalContinentsStamped >= 3,
        progressText: `${Math.min(3, totalContinentsStamped)} / 3 continentes`
      }
    ];

    return {
      totalCountriesStamped,
      totalContinentsStamped,
      totalBooksMapped,
      continentsCount,
      entries,
      unmappedBooks: unmapped,
      diplomaticRank,
      badges
    };
  }
}

export const literaryGeographyService = new LiteraryGeographyService();
