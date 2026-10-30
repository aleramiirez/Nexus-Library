/**
 * Servicio de Geografía Literaria y Pasaporte de la República de las Letras.
 * Asocia autores y libros con países y culturas del mundo, calcula estadísticas consulares,
 * gestiona sellos de visado y provee el Canon Literario Nacional para descubrimiento geográfico.
 */

import { Book, BibliographicCandidate } from '../types/models';
import { Genre, Subgenre } from '../constants/catalogs';
import { bookMetadataService } from './bookMetadataService';

export type Continent =
  | 'europe'
  | 'latam'
  | 'north_america'
  | 'asia'
  | 'africa'
  | 'oceania';

export type ContinentId = Continent;

export const CONTINENT_NAMES: Record<Continent, string> = {
  europe: 'Europa',
  latam: 'América Latina',
  north_america: 'América del Norte',
  asia: 'Asia',
  africa: 'África',
  oceania: 'Oceanía'
};

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

/**
 * Determina con total precisión si un libro está concluido/leído.
 * Previene el fallo donde '❌ No Leído' contenía la subcadena 'Leído'.
 */
export function isBookRead(book: { progreso?: string | null }): boolean {
  if (!book?.progreso) return false;
  const p = book.progreso.trim().toLowerCase();
  if (p === 'read') return true;
  return (p.includes('leído') || p.includes('leido')) && !p.includes('no');
}

// ─── Catálogo de Países Literarios (40 países clave) ───
export const COUNTRIES_CATALOG: Record<string, CountryInfo> = {
  ES: {
    code: 'ES',
    name: 'España',
    flag: '🇪🇸',
    continent: 'europe',
    sealLatinName: 'REGNUM HISPANIAE',
    color: '#b91c1c',
    shape: 'circle'
  },
  GB: {
    code: 'GB',
    name: 'Reino Unido',
    flag: '🇬🇧',
    continent: 'europe',
    sealLatinName: 'BRITANNIA LITTERARIA',
    color: '#1d4ed8',
    shape: 'octagon'
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    continent: 'north_america',
    sealLatinName: 'CIVITATES FOEDERATAE',
    color: '#0f766e',
    shape: 'rectangle'
  },
  FR: {
    code: 'FR',
    name: 'Francia',
    flag: '🇫🇷',
    continent: 'europe',
    sealLatinName: 'REPUBLICA GALLICA',
    color: '#6d28d9',
    shape: 'circle'
  },
  JP: {
    code: 'JP',
    name: 'Japón',
    flag: '🇯🇵',
    continent: 'asia',
    sealLatinName: 'IMPERIUM NIPPONICUM',
    color: '#be123c',
    shape: 'octagon'
  },
  DE: {
    code: 'DE',
    name: 'Alemania',
    flag: '🇩🇪',
    continent: 'europe',
    sealLatinName: 'TERRA TEUTONICA',
    color: '#854d0e',
    shape: 'rectangle'
  },
  IT: {
    code: 'IT',
    name: 'Italia',
    flag: '🇮🇹',
    continent: 'europe',
    sealLatinName: 'PENINSULA ITALICA',
    color: '#15803d',
    shape: 'oval'
  },
  RU: {
    code: 'RU',
    name: 'Rusia',
    flag: '🇷🇺',
    continent: 'europe',
    sealLatinName: 'ARCHIVUM BOREALE',
    color: '#475569',
    shape: 'octagon'
  },
  MX: {
    code: 'MX',
    name: 'México',
    flag: '🇲🇽',
    continent: 'latam',
    sealLatinName: 'MEXICUM LITTERARUM',
    color: '#047857',
    shape: 'circle'
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    continent: 'latam',
    sealLatinName: 'TERRA PLATAE',
    color: '#0369a1',
    shape: 'rectangle'
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    flag: '🇨🇴',
    continent: 'latam',
    sealLatinName: 'COLOMBIA MAGICA',
    color: '#ca8a04',
    shape: 'oval'
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    flag: '🇨🇱',
    continent: 'latam',
    sealLatinName: 'CHILIA AUSTRALIS',
    color: '#991b1b',
    shape: 'octagon'
  },
  IE: {
    code: 'IE',
    name: 'Irlanda',
    flag: '🇮🇪',
    continent: 'europe',
    sealLatinName: 'HIBERNIA CELTICA',
    color: '#166534',
    shape: 'circle'
  },
  PL: {
    code: 'PL',
    name: 'Polonia',
    flag: '🇵🇱',
    continent: 'europe',
    sealLatinName: 'POLONIA HISTORICA',
    color: '#9f1239',
    shape: 'rectangle'
  },
  SE: {
    code: 'SE',
    name: 'Suecia',
    flag: '🇸🇪',
    continent: 'europe',
    sealLatinName: 'SUECIA BOREALIS',
    color: '#1e40af',
    shape: 'octagon'
  },
  GR: {
    code: 'GR',
    name: 'Grecia',
    flag: '🇬🇷',
    continent: 'europe',
    sealLatinName: 'HELLAS CLASSICA',
    color: '#0284c7',
    shape: 'oval'
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    continent: 'europe',
    sealLatinName: 'LUSITANIA AUREA',
    color: '#15803d',
    shape: 'circle'
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    continent: 'latam',
    sealLatinName: 'BRASILIA TROPICALIS',
    color: '#16a34a',
    shape: 'rectangle'
  },
  CA: {
    code: 'CA',
    name: 'Canadá',
    flag: '🇨🇦',
    continent: 'north_america',
    sealLatinName: 'CANADA SEPTENTRIONALIS',
    color: '#b91c1c',
    shape: 'octagon'
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    continent: 'oceania',
    sealLatinName: 'TERRA AUSTRALIS',
    color: '#b45309',
    shape: 'oval'
  },
  EG: {
    code: 'EG',
    name: 'Egipto',
    flag: '🇪🇬',
    continent: 'africa',
    sealLatinName: 'AEGYPTUS ANTIQUA',
    color: '#a16207',
    shape: 'octagon'
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    continent: 'africa',
    sealLatinName: 'NIGERIA LITTERARIA',
    color: '#047857',
    shape: 'circle'
  },
  ZA: {
    code: 'ZA',
    name: 'Sudáfrica',
    flag: '🇿🇦',
    continent: 'africa',
    sealLatinName: 'AFRICA AUSTRALIS',
    color: '#0e7490',
    shape: 'rectangle'
  },
  KR: {
    code: 'KR',
    name: 'Corea del Sur',
    flag: '🇰🇷',
    continent: 'asia',
    sealLatinName: 'COREA ORIENTALIS',
    color: '#1d4ed8',
    shape: 'circle'
  },
  CN: {
    code: 'CN',
    name: 'China',
    flag: '🇨🇳',
    continent: 'asia',
    sealLatinName: 'SERICA IMPERIALIS',
    color: '#b91c1c',
    shape: 'rectangle'
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    continent: 'asia',
    sealLatinName: 'INDIA ANCIENT',
    color: '#c2410c',
    shape: 'oval'
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    flag: '🇦🇹',
    continent: 'europe',
    sealLatinName: 'AUSTRIA IMPERIALIS',
    color: '#be123c',
    shape: 'rectangle'
  },
  CH: {
    code: 'CH',
    name: 'Suiza',
    flag: '🇨🇭',
    continent: 'europe',
    sealLatinName: 'HELVETIA ALPINA',
    color: '#dc2626',
    shape: 'circle'
  },
  NL: {
    code: 'NL',
    name: 'Países Bajos',
    flag: '🇳🇱',
    continent: 'europe',
    sealLatinName: 'BATAVIA LITTERARIA',
    color: '#ea580c',
    shape: 'octagon'
  },
  NO: {
    code: 'NO',
    name: 'Noruega',
    flag: '🇳🇴',
    continent: 'europe',
    sealLatinName: 'NORVEGIA FJORDICA',
    color: '#1e3a8a',
    shape: 'oval'
  },
  DK: {
    code: 'DK',
    name: 'Dinamarca',
    flag: '🇩🇰',
    continent: 'europe',
    sealLatinName: 'DANIA NORDICA',
    color: '#991b1b',
    shape: 'rectangle'
  },
  CZ: {
    code: 'CZ',
    name: 'República Checa',
    flag: '🇨🇿',
    continent: 'europe',
    sealLatinName: 'BOHEMIA LITTERATA',
    color: '#1d4ed8',
    shape: 'octagon'
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    flag: '🇵🇪',
    continent: 'latam',
    sealLatinName: 'PERUVIA ANDINA',
    color: '#b91c1c',
    shape: 'circle'
  },
  UY: {
    code: 'UY',
    name: 'Uruguay',
    flag: '🇺🇾',
    continent: 'latam',
    sealLatinName: 'URUGUAIA LITTERATA',
    color: '#0284c7',
    shape: 'oval'
  },
  BE: {
    code: 'BE',
    name: 'Bélgica',
    flag: '🇧🇪',
    continent: 'europe',
    sealLatinName: 'BELGICA LITTERARIA',
    color: '#b45309',
    shape: 'circle'
  },
  TR: {
    code: 'TR',
    name: 'Turquía',
    flag: '🇹🇷',
    continent: 'asia',
    sealLatinName: 'OTTOMANIA LITTERATA',
    color: '#be123c',
    shape: 'rectangle'
  },
  CU: {
    code: 'CU',
    name: 'Cuba',
    flag: '🇨🇺',
    continent: 'latam',
    sealLatinName: 'INSULA CUBA',
    color: '#0284c7',
    shape: 'oval'
  },
  IS: {
    code: 'IS',
    name: 'Islandia',
    flag: '🇮🇸',
    continent: 'europe',
    sealLatinName: 'ISLANDIA SAGA',
    color: '#1e40af',
    shape: 'octagon'
  },
  FI: {
    code: 'FI',
    name: 'Finlandia',
    flag: '🇫🇮',
    continent: 'europe',
    sealLatinName: 'FINLANDIA BOREALIS',
    color: '#0369a1',
    shape: 'circle'
  },
  NZ: {
    code: 'NZ',
    name: 'Nueva Zelanda',
    flag: '🇳🇿',
    continent: 'oceania',
    sealLatinName: 'ZEALANDIA AUSTRALIS',
    color: '#047857',
    shape: 'rectangle'
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

  // Estados Unidos
  'brandon sanderson': 'US',
  'sanderson': 'US',
  'stephen king': 'US',
  'george r.r. martin': 'US',
  'george rr martin': 'US',
  'ernest hemingway': 'US',
  'hemingway': 'US',
  'f. scott fitzgerald': 'US',
  'fitzgerald': 'US',
  'edgar allan poe': 'US',
  'poe': 'US',
  'mark twain': 'US',
  'isaac asimov': 'US',
  'philip k. dick': 'US',
  'ray bradbury': 'US',
  'h.p. lovecraft': 'US',
  'lovecraft': 'US',
  'cormac mccarthy': 'US',
  'toni morrison': 'US',
  'john steinbeck': 'US',
  'harper lee': 'US',
  'dan brown': 'US',
  'suzanne collins': 'US',
  'rick riordan': 'US',
  'sarah j. maas': 'US',
  'rebecca yarros': 'US',
  'patrick rothfuss': 'US',

  // Francia
  'victor hugo': 'FR',
  'albert camus': 'FR',
  'camus': 'FR',
  'jules verne': 'FR',
  'julio verne': 'FR',
  'marcel proust': 'FR',
  'antoine de saint-exupéry': 'FR',
  'saint-exupery': 'FR',
  'alexandre dumas': 'FR',
  'alejandro dumas': 'FR',
  'gustave flaubert': 'FR',
  'émile zola': 'FR',
  'emile zola': 'FR',
  'charles baudelaire': 'FR',
  'jean-paul sartre': 'FR',
  'michel houellebecq': 'FR',

  // Japón
  'haruki murakami': 'JP',
  'murakami': 'JP',
  'yukio mishima': 'JP',
  'mishima': 'JP',
  'osamu dazai': 'JP',
  'dazai': 'JP',
  'natsume soseki': 'JP',
  'natsume sōseki': 'JP',
  'ryunosuke akutagawa': 'JP',
  'kenzaburo oe': 'JP',
  'banana yoshimoto': 'JP',
  'keigo higashino': 'JP',
  'sayaka murata': 'JP',

  // Alemania
  'johann wolfgang von goethe': 'DE',
  'goethe': 'DE',
  'hermann hesse': 'DE',
  'hesse': 'DE',
  'thomas mann': 'DE',
  'friedrich nietzsche': 'DE',
  'nietzsche': 'DE',
  'michael ende': 'DE',
  'erich maria remarque': 'DE',
  'cornelia funke': 'DE',
  'patrick süskind': 'DE',
  'suskind': 'DE',

  // Italia
  'dante alighieri': 'IT',
  'dante': 'IT',
  'umberto eco': 'IT',
  'italo calvino': 'IT',
  'giovanni boccaccio': 'IT',
  'elena ferrante': 'IT',
  'luigi pirandello': 'IT',
  'niccolò machiavelli': 'IT',
  'maquiavelo': 'IT',

  // Rusia
  'fiódor dostoyevski': 'RU',
  'fiodor dostoievski': 'RU',
  'dostoyevski': 'RU',
  'león tolstói': 'RU',
  'leon tolstoi': 'RU',
  'tolstoi': 'RU',
  'antón chéjov': 'RU',
  'chejov': 'RU',
  'mijaíl bulgákov': 'RU',
  'bulgakov': 'RU',
  'aleksandr pushkin': 'RU',
  'vladimir nabokov': 'RU',
  'nabokov': 'RU',

  // Argentina
  'jorge luis borges': 'AR',
  'borges': 'AR',
  'julio cortázar': 'AR',
  'cortazar': 'AR',
  'ernesto sabato': 'AR',
  'sabato': 'AR',
  'adolfo bioy casares': 'AR',
  'mariana enríquez': 'AR',
  'samanta schweblin': 'AR',
  'claudia piñeiro': 'AR',

  // Colombia
  'gabriel garcía márquez': 'CO',
  'garcia marquez': 'CO',
  'gabo': 'CO',
  'héctor abad faciolince': 'CO',
  'álvaro mutis': 'CO',
  'laura restrepo': 'CO',
  'juan gabriel vásquez': 'CO',

  // México
  'juan rulfo': 'MX',
  'rulfo': 'MX',
  'octavio paz': 'MX',
  'carlos fuentes': 'MX',
  'laura esquivel': 'MX',
  'valeria luiselli': 'MX',
  'elena poniatowska': 'MX',

  // Chile
  'isabel allende': 'CL',
  'pablo neruda': 'CL',
  'neruda': 'CL',
  'roberto bolaño': 'CL',
  'bolano': 'CL',
  'gabriela mistral': 'CL',

  // Irlanda
  'james joyce': 'IE',
  'oscar wilde': 'IE',
  'wilde': 'IE',
  'bram stoker': 'IE',
  'samuel beckett': 'IE',
  'sally rooney': 'IE',

  // Portugal
  'josé saramago': 'PT',
  'saramago': 'PT',
  'fernando pessoa': 'PT',
  'pessoa': 'PT',
  'eça de queirós': 'PT',

  // Brasil
  'clarice lispector': 'BR',
  'machado de assis': 'BR',
  'jorge amado': 'BR',
  'paulo coelho': 'BR',

  // República Checa
  'franz kafka': 'CZ',
  'kafka': 'CZ',
  'milan kundera': 'CZ',
  'kundera': 'CZ',
  'karel čapek': 'CZ',

  // Noruega
  'knut hamsun': 'NO',
  'henrik ibsen': 'NO',
  'karl ove knausgård': 'NO',
  'jon fosse': 'NO',
  'jo nesbø': 'NO',
  'jostein gaarder': 'NO',

  // Suecia
  'astrid lindgren': 'SE',
  'stieg larsson': 'SE',
  'august strindberg': 'SE',
  'henning mankell': 'SE',

  // Polonia
  'stanisław lem': 'PL',
  'stanislaw lem': 'PL',
  'olga tokarczuk': 'PL',
  'andrzej sapkowski': 'PL',
  'sapkowski': 'PL',

  // Grecia
  'homero': 'GR',
  'nikos kazantzakis': 'GR',
  'sófocles': 'GR',
  'platón': 'GR',
  'aristóteles': 'GR',

  // China
  'cixin liu': 'CN',
  'liu cixin': 'CN',
  'mo yan': 'CN',
  'yu hua': 'CN',
  'sun tzu': 'CN',

  // Corea del Sur
  'han kang': 'KR',
  'won-pyung sohn': 'KR',
  'kyung-sook shin': 'KR',
  'cho nam-joo': 'KR',

  // India
  'arundhati roy': 'IN',
  'salman rushdie': 'IN',
  'rabindranath tagore': 'IN',
  'jhumpa lahiri': 'IN',

  // Nigeria
  'chinua achebe': 'NG',
  'chimamanda ngozi adichie': 'NG',
  'adichie': 'NG',
  'wole soyinka': 'NG',
  'ben okri': 'NG',

  // Egipto
  'naguib mahfouz': 'EG',
  'mahfouz': 'EG',
  'alaa al aswany': 'EG',

  // Australia
  'markus zusak': 'AU',
  'zusak': 'AU',
  'patrick white': 'AU',
  'thomas keneally': 'AU',
  'liane moriarty': 'AU',

  // Perú
  'mario vargas llosa': 'PE',
  'vargas llosa': 'PE',
  'josé maría arguedas': 'PE',
  'alfredo bryce echenique': 'PE',
  'césar vallejo': 'PE',

  // Uruguay
  'mario benedetti': 'UY',
  'benedetti': 'UY',
  'eduardo galeano': 'UY',
  'juan carlos onetti': 'UY'
};

const USER_OVERRIDE_KEY = 'nexus_author_country_overrides';

// Helper tipado para construir candidatos del canon sin repetición
function makeCanon(
  id: string,
  pais: string,
  nombre: string,
  autor: string,
  fechaPublicacion: number,
  paginas: number,
  isbn: string,
  editorial: string,
  suggestedGenre: Genre,
  suggestedSubgenres: Subgenre[],
  sinopsis: string,
  recommendationReason: string
): BibliographicCandidate {
  return {
    id,
    source: 'openlibrary',
    nombre,
    autor,
    fechaPublicacion,
    paginas,
    isbn,
    editorial,
    idioma: 'Español',
    edicion: 'Edición recomendada',
    sinopsis,
    portadaUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
    portadaFallbackUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    rawCategories: [suggestedGenre, ...suggestedSubgenres],
    suggestedGenre,
    suggestedSubgenres,
    recommendationReason,
    pais
  };
}

// ─── Catálogo Curado del Canon Literario Nacional (25 países clave) ───
export const NATIONAL_LITERARY_CANON: Record<string, BibliographicCandidate[]> = {
  ES: [
    makeCanon('canon-es-1', 'ES', 'Don Quijote de la Mancha', 'Miguel de Cervantes', 1605, 1024, '9788424116286', 'Cátedra', '🏛️ Clásicos', ['🌍 Clásicos Universales', '✒️ Siglo de Oro & Clásicos Hispánicos'], 'La cumbre de la literatura universal: las andanzas del ingenioso hidalgo manchego y su fiel escudero Sancho Panza.', 'Obra fundacional del idioma y de la novela moderna.'),
    makeCanon('canon-es-2', 'ES', 'La sombra del viento', 'Carlos Ruiz Zafón', 2001, 576, '9788408043645', 'Planeta', '🕵️ Misterio, Thriller & Novela Negra', ['📚 Metaficción & Libros sobre Libros', '🕵️ Misterio & Detective'], 'En la Barcelona gótica de posguerra, un joven descubre el Cementerio de los Libros Olvidados y una intriga fascinante.', 'Un homenaje universal al amor por los libros.'),
    makeCanon('canon-es-3', 'ES', 'Nada', 'Carmen Laforet', 1945, 304, '9788423342792', 'Destino', '🏛️ Clásicos', ['🌊 Generación del 98 & Siglo XX', '🌱 Coming-of-Age (Aprendizaje)'], 'La llegada de Andrea a Barcelona para estudiar en la universidad desvela un asfixiante e inolvidable microcosmos familiar.', 'Premio Nadal inaugural y retrato magistral de una época.'),
    makeCanon('canon-es-4', 'ES', 'Romancero gitano', 'Federico García Lorca', 1928, 160, '9788437601144', 'Cátedra', '🎭 Poesía, Teatro & Relatos', ['🌊 Generación del 98 & Siglo XX'], 'Obra maestra poética que entrelaza el mito andaluz, la pasión trágica y una arrebatadora belleza verbal.', 'La voz poética española más universal del siglo XX.')
  ],
  JP: [
    makeCanon('canon-jp-1', 'JP', 'Tokio blues (Norwegian Wood)', 'Haruki Murakami', 1987, 384, '9788483835203', 'Tusquets', '🖋️ Ficción Contemporánea & Literaria', ['🌱 Coming-of-Age (Aprendizaje)', '🥹 Drama Familiar & Generacional'], 'Toru Watanabe rememora sus años universitarios en el Tokio de los sesenta y sus amores con la frágil Naoko.', 'La novela que consagró mundialmente a Haruki Murakami.'),
    makeCanon('canon-jp-2', 'JP', 'Indigno de ser humano', 'Osamu Dazai', 1948, 128, '9788496867628', 'Sajalín', '🏛️ Clásicos', ['🌍 Clásicos Universales', '🌱 Coming-of-Age (Aprendizaje)'], 'Testamento existencial y confesión desgarradora de un joven incapaz de encajar en las normas de la sociedad.', 'El segundo libro más leído en la historia de Japón.'),
    makeCanon('canon-jp-3', 'JP', 'El pabellón de oro', 'Yukio Mishima', 1956, 336, '9788420651347', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Basada en hechos reales, narra la obsesión de un joven monje acólito por la belleza absoluta del templo Kinkaku-ji.', 'Cúspide de la prosa estética y psicológica de Mishima.'),
    makeCanon('canon-jp-4', 'JP', 'Kokoro', 'Natsume Sōseki', 1914, 296, '9788415713005', 'Impedimenta', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Una profunda meditación sobre la soledad, la culpa y la transición del Japón feudal hacia la modernidad.', 'El corazón espiritual de la literatura japonesa moderna.')
  ],
  GB: [
    makeCanon('canon-gb-1', 'GB', '1984', 'George Orwell', 1949, 328, '9788499890944', 'Debolsillo', '🔭 Ciencia Ficción & Distopía', ['👁️ Distopía & Utopía', '🌍 Clásicos Universales'], 'La aterradora distopía totalitaria donde el Gran Hermano vigila cada pensamiento y la verdad se reescribe a diario.', 'La distopía política más influyente del siglo XX.'),
    makeCanon('canon-gb-2', 'GB', 'Orgullo y prejuicio', 'Jane Austen', 1813, 448, '9788491051329', 'Penguin Clásicos', '🏛️ Clásicos', ['🌍 Clásicos Universales', '🎩 Literatura del Siglo XIX (Realismo & Naturalismo)'], 'El choque de ingenio, clases y sentimientos entre la lúcida Elizabeth Bennet y el orgulloso señor Darcy.', 'Prodigio de ironía, elegancia y psicología humana.'),
    makeCanon('canon-gb-3', 'GB', 'El Señor de los Anillos: La Comunidad del Anillo', 'J.R.R. Tolkien', 1954, 576, '9788445073728', 'Minotauro', '✨ Fantasía', ['🐉 Alta Fantasía & Mundos Secundarios', '🌍 Clásicos Universales'], 'El hobbit Frodo Bolsón emprende el viaje más peligroso de la Tierra Media para destruir el Anillo Único.', 'El pilar supremo de la alta fantasía épica contemporánea.'),
    makeCanon('canon-gb-4', 'GB', 'Cumbres borrascosas', 'Emily Brontë', 1847, 416, '9788420665504', 'Alianza', '🏛️ Clásicos', ['🕯️ Gótico Clásico & Romanticismo', '🌍 Clásicos Universales'], 'La tormentosa e indómita historia de amor y venganza entre Heathcliff y Catherine en los páramos de Yorkshire.', 'Una de las pasiones más oscuras e inolvidables de las letras inglesas.')
  ],
  US: [
    makeCanon('canon-us-1', 'US', 'El gran Gatsby', 'F. Scott Fitzgerald', 1925, 224, '9788497930390', 'Debolsillo', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'El espejismo del sueño americano, el lujo y la desilusión en los dorados años veinte en Long Island.', 'Retrato lírico y demoledor de las ilusiones perdidas.'),
    makeCanon('canon-us-2', 'US', 'Matar a un ruiseñor', 'Harper Lee', 1960, 384, '9788490628928', 'HarperCollins', '🏛️ Clásicos', ['🌍 Clásicos Universales', '🌱 Coming-of-Age (Aprendizaje)'], 'El abogado Atticus Finch defiende a un hombre negro inocente en el sur profundo a través de los ojos de su hija Scout.', 'Canto inmortal a la justicia, la empatía y la dignidad humana.'),
    makeCanon('canon-us-3', 'US', 'Fahrenheit 451', 'Ray Bradbury', 1953, 192, '9788497592604', 'Debolsillo', '🔭 Ciencia Ficción & Distopía', ['👁️ Distopía & Utopía', '📚 Metaficción & Libros sobre Libros'], 'Guy Montag es un bombero cuyo oficio no es apagar incendios, sino quemar los libros prohibidos por el Estado.', 'El alegato supremo en defensa de la lectura y la memoria.'),
    makeCanon('canon-us-4', 'US', 'El viejo y el mar', 'Ernest Hemingway', 1952, 128, '9788497594585', 'Debolsillo', '🏛️ Clásicos', ['🌍 Clásicos Universales', '🏔️ Supervivencia & Naturaleza'], 'La épica solitaria del viejo pescador Santiago frente a un descomunal pez espada en las aguas del golfo.', 'Premio Nobel y lección suprema de coraje y sobriedad estilística.')
  ],
  AR: [
    makeCanon('canon-ar-1', 'AR', 'Ficciones', 'Jorge Luis Borges', 1944, 224, '9788420633121', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales', '📚 Metaficción & Libros sobre Libros'], 'Laberintos, bibliotecas infinitas, espejos y paradojas en los relatos más deslumbrantes de la lengua hispana.', 'Monumento a la inteligencia, la filosofía y el juego literario.'),
    makeCanon('canon-ar-2', 'AR', 'Rayuela', 'Julio Cortázar', 1963, 600, '9788420437484', 'Alfaguara', '🏛️ Clásicos', ['🌍 Clásicos Universales', '📚 Metaficción & Libros sobre Libros'], 'La contranovela que puede leerse de múltiples formas: el periplo de Horacio Oliveira entre París y Buenos Aires.', 'La revolución vanguardista del Boom latinoamericano.'),
    makeCanon('canon-ar-3', 'AR', 'El túnel', 'Ernesto Sabato', 1948, 160, '9788432248238', 'Seix Barral', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'El pintor Juan Pablo Castel relata desde prisión los oscuros motivos que le llevaron a asesinar a María Iribarne.', 'Una de las novelas existencialistas más intensas de América Latina.'),
    makeCanon('canon-ar-4', 'AR', 'La invención de Morel', 'Adolfo Bioy Casares', 1940, 168, '9788420651149', 'Alianza', '🔭 Ciencia Ficción & Distopía', ['🌍 Clásicos Universales'], 'Un fugitivo se refugia en una isla desierta donde extrañas apariciones proyectan un misterio tecnológico eterno.', 'Admirada por Borges como una trama de perfección matemática.')
  ],
  CO: [
    makeCanon('canon-co-1', 'CO', 'Cien años de soledad', 'Gabriel García Márquez', 1967, 496, '9788439732488', 'Literatura Random House', '🏛️ Clásicos', ['🔮 Realismo Mágico', '🌍 Clásicos Universales'], 'La epopeya de la familia Buendía y el mítico pueblo de Macondo a lo largo de siete generaciones de prodigios.', 'La cima indiscutible del realismo mágico y la literatura en español.'),
    makeCanon('canon-co-2', 'CO', 'El amor en los tiempos del cólera', 'Gabriel García Márquez', 1985, 504, '9788439732501', 'Literatura Random House', '🏛️ Clásicos', ['🔮 Realismo Mágico'], 'Florentino Ariza espera con devoción inquebrantable más de medio siglo para reunirse con Fermina Daza.', 'El gran himno novelesco al amor maduro y persistente.'),
    makeCanon('canon-co-3', 'CO', 'El olvido que seremos', 'Héctor Abad Faciolince', 2006, 272, '9788420471242', 'Alfaguara', '🖋️ Ficción Contemporánea & Literaria', ['🥹 Drama Familiar & Generacional'], 'Emocionante homenaje de un hijo a la memoria luminosa y trágica de su padre, médico y defensor de derechos humanos.', 'Una de las obras testimoniales más leídas y queridas de Colombia.'),
    makeCanon('canon-co-4', 'CO', 'La vorágine', 'José Eustasio Rivera', 1924, 336, '9788437604657', 'Cátedra', '🏛️ Clásicos', ['🏔️ Supervivencia & Naturaleza'], 'La salvaje selva amazónica devora las pasiones y destinos de quienes se internan en sus confines.', 'Clásico pionero de la novela de la selva y la denuncia social.')
  ],
  MX: [
    makeCanon('canon-mx-1', 'MX', 'Pedro Páramo', 'Juan Rulfo', 1955, 136, '9788437604183', 'Cátedra', '🏛️ Clásicos', ['🔮 Realismo Mágico', '🌍 Clásicos Universales'], 'Juan Preciado llega a Comala en busca de su padre, encontrando un pueblo fantasmal habitado por ecos y murmullos.', 'Obra maestra absoluta de concisión poética y misterio.'),
    makeCanon('canon-mx-2', 'MX', 'El laberinto de la soledad', 'Octavio Paz', 1950, 352, '9788437505671', 'Fondo de Cultura Económica', '🧠 Ensayo, Filosofía & Ciencia', ['🏛️ Política, Geopolítica & Sociedad'], 'Radiografía poética, histórica y psicológica del ser mexicano y su encrucijada existencial en el mundo.', 'El ensayo fundacional del Premio Nobel de Literatura.'),
    makeCanon('canon-mx-3', 'MX', 'Como agua para chocolate', 'Laura Esquivel', 1989, 256, '9788497598569', 'Debolsillo', '🖋️ Ficción Contemporánea & Literaria', ['🔮 Realismo Mágico'], 'Las recetas culinarias tradicionales canalizan los amores prohibidos, lágrimas y pasiones de la joven Tita.', 'Éxito mundial que fusionó gastronomía, folclore y realismo mágico.'),
    makeCanon('canon-mx-4', 'MX', 'Aura', 'Carlos Fuentes', 1962, 80, '9788426418654', 'Era', '🏛️ Clásicos', ['🕯️ Gótico Clásico & Romanticismo'], 'Un joven historiador acude a una casona sombría donde la anciana Consuelo y su sobrina Aura ocultan un lazo sobrenatural.', 'Joya de la literatura fantástica y gótica mexicana.')
  ],
  FR: [
    makeCanon('canon-fr-1', 'FR', 'El principito', 'Antoine de Saint-Exupéry', 1943, 120, '9788498381498', 'Salamandra', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Un aviador perdido en el desierto conoce a un pequeño príncipe procedente del asteroide B-612.', 'Fábula poética inmortal sobre el amor, la amistad y lo esencial invisible.'),
    makeCanon('canon-fr-2', 'FR', 'El extranjero', 'Albert Camus', 1942, 160, '9788420634128', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Meursault recibe la noticia de la muerte de su madre y comete un asesinato absurdo bajo el abrasador sol de Argel.', 'El manifiesto literario del absurdo y la honestidad existencial.'),
    makeCanon('canon-fr-3', 'FR', 'Los miserables', 'Victor Hugo', 1862, 1200, '9788491050087', 'Penguin Clásicos', '🏛️ Clásicos', ['🎩 Literatura del Siglo XIX (Realismo & Naturalismo)'], 'La odisea de redención de Jean Valjean frente a la implacable persecución de la justicia y la miseria humana.', 'La catedral novelesca del romanticismo humanista francés.'),
    makeCanon('canon-fr-4', 'FR', 'Por el camino de Swann', 'Marcel Proust', 1913, 520, '9788420685793', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'La magdalena mojada en té abre las compuertas de la memoria involuntaria en busca del tiempo perdido.', 'El pináculo del modernismo psicológico y la memoria estética.')
  ],
  RU: [
    makeCanon('canon-ru-1', 'RU', 'Crimen y castigo', 'Fiódor Dostoyevski', 1866, 672, '9788420666662', 'Alianza', '🏛️ Clásicos', ['🎩 Literatura del Siglo XIX (Realismo & Naturalismo)', '🌍 Clásicos Universales'], 'El estudiante Raskólnikov planea y comete el crimen de una usurera creyéndose un hombre extraordinario.', 'Exploración insuperable de la culpa, la fe y la psicología criminal.'),
    makeCanon('canon-ru-2', 'RU', 'Guerra y paz', 'León Tolstói', 1869, 1344, '9788491052142', 'Penguin Clásicos', '🏛️ Clásicos', ['🎩 Literatura del Siglo XIX (Realismo & Naturalismo)', '🪖 Guerras Mundiales & Siglo XX'], 'El fresco monumental de las guerras napoleónicas entrelazado con el destino íntimo de las familias rusas.', 'La cumbre de la narrativa realista universal.'),
    makeCanon('canon-ru-3', 'RU', 'El maestro y Margarita', 'Mijaíl Bulgákov', 1967, 512, '9788420688329', 'Alianza', '🏛️ Clásicos', ['🔮 Realismo Mágico', '🌍 Clásicos Universales'], 'El diablo llega al Moscú soviético de los años treinta desatando el caos satírico y un romance trascendental.', 'Obra maestra de la sátira, la magia y la resistencia artística.'),
    makeCanon('canon-ru-4', 'RU', 'Los hermanos Karamázov', 'Fiódor Dostoyevski', 1880, 1120, '9788420667089', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'El parricidio de Fiódor Pávlovich y el drama espiritual, moral y filosófico entre sus tres dispares hijos.', 'La última y más colosal novela de Dostoyevski.')
  ],
  DE: [
    makeCanon('canon-de-1', 'DE', 'Fausto', 'Johann Wolfgang von Goethe', 1808, 384, '9788437606361', 'Cátedra', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'El sabio Fausto pacta con Mefistófeles a cambio de la juventud, el conocimiento supremo y el goce vital.', 'El mito germánico y universal de la ambición humana.'),
    makeCanon('canon-de-2', 'DE', 'El lobo estepario', 'Hermann Hesse', 1927, 280, '9788497598682', 'Debolsillo', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Harry Haller se siente desgarrado entre su naturaleza burguesa domesticada y el lobo salvaje interior.', 'Viaje místico y psicológico hacia la integración del ser.'),
    makeCanon('canon-de-3', 'DE', 'La montaña mágica', 'Thomas Mann', 1924, 1056, '9788466332156', 'Debolsillo', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Hans Castorp visita un sanatorio en los Alpes suizos, donde el tiempo se detiene y las ideas de Europa debaten.', 'Catedral intelectual de la Europa previa a la Gran Guerra.'),
    makeCanon('canon-de-4', 'DE', 'Sin novedad en el frente', 'Erich Maria Remarque', 1929, 288, '9788435018616', 'Edhasa', '🏰 Novela Histórica', ['🪖 Guerras Mundiales & Siglo XX'], 'El desgarrador testimonio de una generación de jóvenes soldados mutilados por el horror de las trincheras.', 'El mayor alegato antibélico de la historia de la literatura.')
  ],
  IT: [
    makeCanon('canon-it-1', 'IT', 'La divina comedia', 'Dante Alighieri', 1320, 720, '9788437601618', 'Cátedra', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Guiado por Virgilio y Beatriz, Dante desciende a los nueve círculos del Infierno y asciende al Paraíso.', 'La obra cumbre de la poesía alegórica medieval.'),
    makeCanon('canon-it-2', 'IT', 'El nombre de la rosa', 'Umberto Eco', 1980, 608, '9788426418197', 'Lumen', '🕵️ Misterio, Thriller & Novela Negra', ['🏛️ Thriller Histórico & Religioso', '📚 Metaficción & Libros sobre Libros'], 'El fraile Guillermo de Baskerville investiga una serie de muertes enigmáticas en una abadía benedictina.', 'Inolvidable matrimonio entre novela policíaca, erudición y filosofía.'),
    makeCanon('canon-it-3', 'IT', 'Las ciudades invisibles', 'Italo Calvino', 1972, 176, '9788498418040', 'Siruela', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Marco Polo describe al emperador Kublai Kan una fabulosa cartografía de ciudades soñadas y poéticas.', 'Una de las exploraciones poéticas más bellas sobre el espacio y la memoria.'),
    makeCanon('canon-it-4', 'IT', 'El gatopardo', 'Giuseppe Tomasi di Lampedusa', 1958, 304, '9788433973160', 'Anagrama', '🏛️ Clásicos', ['🎩 Literatura del Siglo XIX (Realismo & Naturalismo)'], '«Si queremos que todo siga como está, es necesario que todo cambie»: el ocaso de la aristocracia siciliana.', 'Elegía melancólica sobre el paso del tiempo y las transformaciones históricas.')
  ],
  IE: [
    makeCanon('canon-ie-1', 'IE', 'El retrato de Dorian Gray', 'Oscar Wilde', 1890, 288, '9788491050117', 'Penguin Clásicos', '🏛️ Clásicos', ['🕯️ Gótico Clásico & Romanticismo', '🌍 Clásicos Universales'], 'El cuadro del joven Dorian envejece y se corrompe mientras él conserva su deslumbrante belleza externa.', 'La cumbre del esteticismo y la reflexión moral victoriana.'),
    makeCanon('canon-ie-2', 'IE', 'Drácula', 'Bram Stoker', 1897, 576, '9788491050070', 'Penguin Clásicos', '🏛️ Clásicos', ['🕯️ Gótico Clásico & Romanticismo', '🕯️ Terror Gótico'], 'La novela epistolar que dio forma imperecedera al conde de los Cárpatos y al mito del vampiro moderno.', 'Obra maestra del terror gótico e intriga psicológica.'),
    makeCanon('canon-ie-3', 'IE', 'Ulises', 'James Joyce', 1922, 912, '9788491052159', 'Penguin Clásicos', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'El flujo de conciencia y las peripecias de Leopold Bloom recorriendo Dublín durante un único día memorable.', 'La proeza técnica más revolucionaria del modernismo literario.'),
    makeCanon('canon-ie-4', 'IE', 'Los viajes de Gulliver', 'Jonathan Swift', 1726, 384, '9788420674254', 'Alianza', '🏇 Aventuras', ['🎭 Humor & Sátira', '🌍 Clásicos Universales'], 'Gulliver naufraga en tierras de liliputienses, gigantes y caballos sabios con afilada sátira hacia la condición humana.', 'Aventura imperecedera y sátira filosófica mordaz.')
  ],
  CL: [
    makeCanon('canon-cl-1', 'CL', 'La casa de los espíritus', 'Isabel Allende', 1982, 496, '9788401343049', 'Plaza & Janés', '🏛️ Clásicos', ['🔮 Realismo Mágico', '🥹 Drama Familiar & Generacional'], 'La saga de la familia Trueba a lo largo de cuatro generaciones marcadas por clarividencias, pasiones y revoluciones.', 'La novela que encumbró internacionalmente a Isabel Allende.'),
    makeCanon('canon-cl-2', 'CL', 'Los detectives salvajes', 'Roberto Bolaño', 1998, 624, '9788420471563', 'Alfaguara', '🖋️ Ficción Contemporánea & Literaria', ['📚 Metaficción & Libros sobre Libros'], 'Los poetas Arturo Belano y Ulises Lima recorren el mundo tras la pista de la misteriosa escritora Cesárea Tinajero.', 'Hito de la literatura hispanoamericana contemporánea.'),
    makeCanon('canon-cl-3', 'CL', 'Veinte poemas de amor y una canción desesperada', 'Pablo Neruda', 1924, 128, '9788437601243', 'Cátedra', '🎭 Poesía, Teatro & Relatos', ['🌍 Clásicos Universales'], '«Puedo escribir los versos más tristes esta noche»: el cancionero amoroso más célebre de la lengua española.', 'El poemario de amor más leído del siglo XX.'),
    makeCanon('canon-cl-4', 'CL', '2666', 'Roberto Bolaño', 2004, 1128, '9788420471549', 'Alfaguara', '🖋️ Ficción Contemporánea & Literaria', ['🕵️ Misterio & Detective'], 'Cinco partes concéntricas confluyen en la ciudad fronteriza de Santa Teresa y una ola de crímenes silenciados.', 'Monumento novelesco póstumo de alcance torrencial.')
  ],
  PE: [
    makeCanon('canon-pe-1', 'PE', 'La ciudad y los perros', 'Mario Vargas Llosa', 1963, 448, '9788466333795', 'Debolsillo', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'La violencia, el honor y la rebeldía entre los cadetes internos del colegio militar Leoncio Prado de Lima.', 'Premio Biblioteca Breve y arranque arrollador del Boom literario.'),
    makeCanon('canon-pe-2', 'PE', 'Conversación en La Catedral', 'Mario Vargas Llosa', 1969, 736, '9788466333832', 'Debolsillo', '🏛️ Clásicos', ['🌍 Clásicos Universales'], '«¿En qué momento se había jodido el Perú?»: una charla de bar revela la corrupción de la dictadura de Odría.', 'Considerada por la crítica como la obra cumbre de Vargas Llosa.'),
    makeCanon('canon-pe-3', 'PE', 'Los ríos profundos', 'José María Arguedas', 1958, 304, '9788437600857', 'Cátedra', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'El conflicto desgarrador entre el cosmos indígena quechua y la imposición occidental vivido por el joven Ernesto.', 'Cúspide de la literatura indigenista y poética andina.'),
    makeCanon('canon-pe-4', 'PE', 'Un mundo para Julius', 'Alfredo Bryce Echenique', 1970, 608, '9788420468303', 'Alfaguara', '🏛️ Clásicos', ['🌱 Coming-of-Age (Aprendizaje)'], 'La mirada tierna, melancólica y divertida de un niño aristócrata limeño rodeado de sirvientes y comodidades.', 'Una de las novelas más entrañables y celebradas del continente.')
  ],
  BR: [
    makeCanon('canon-br-1', 'BR', 'Memorias póstumas de Brás Cubas', 'Machado de Assis', 1881, 256, '9788420651477', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales', '🎭 Humor & Sátira'], 'Un aristócrata difunto decide relatar su vida con una ironía deslumbrante, rompiendo la cuarta pared del tiempo.', 'Una de las obras más modernas e innovadoras del siglo XIX.'),
    makeCanon('canon-br-2', 'BR', 'La hora de la estrella', 'Clarice Lispector', 1977, 96, '9788417553555', 'Siruela', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'La historia de Macabéa, muchacha ingenua y desvalida en Río de Janeiro, narrada con un lirismo desgarrador.', 'La última y más luminosa novela de la gran dama de las letras brasileñas.'),
    makeCanon('canon-br-3', 'BR', 'Capitanes de la arena', 'Jorge Amado', 1937, 320, '9788420651132', 'Alianza', '🏛️ Clásicos', ['🌱 Coming-of-Age (Aprendizaje)'], 'Una banda de niños huérfanos y desamparados sobrevive con audacia, fraternidad y picardía en las calles de Salvador de Bahía.', 'Retrato inmortal de la niñez marginada y el calor bahiano.'),
    makeCanon('canon-br-4', 'BR', 'El alquimista', 'Paulo Coelho', 1988, 192, '9788408047599', 'Planeta', '🖋️ Ficción Contemporánea & Literaria', ['🧭 Exploración & Arqueología'], 'El joven pastor andaluz Santiago viaja hacia las pirámides de Egipto persiguiendo su Leyenda Personal.', 'El libro brasileño más traducido y vendido de todos los tiempos.')
  ],
  PT: [
    makeCanon('canon-pt-1', 'PT', 'Ensayo sobre la ceguera', 'José Saramago', 1995, 440, '9788420442600', 'Alfaguara', '🏛️ Clásicos', ['👁️ Distopía & Utopía', '🌍 Clásicos Universales'], 'Una repentina epidemia de ceguera blanca sume a la sociedad en el pánico, revelando lo mejor y peor del ser humano.', 'Fábula lúcida e implacable del Premio Nobel portugués.'),
    makeCanon('canon-pt-2', 'PT', 'Libro del desasosiego', 'Fernando Pessoa', 1982, 576, '9788499201580', 'Acantilado', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Diario íntimo y fragmentario del heterónimo Bernardo Soares, tesoro de introspección lírica en las calles de Lisboa.', 'Uno de los monumentos filosóficos y poéticos del siglo XX.'),
    makeCanon('canon-pt-3', 'PT', 'Memorial del convento', 'José Saramago', 1982, 416, '9788420482613', 'Alfaguara', '🏰 Novela Histórica', ['🔮 Realismo Mágico'], 'La construcción del convento de Mafra unida a la mágica máquina voladora del padre Bartolomeu y el amor de Baltasar y Blimunda.', 'La novela que consagró a Saramago en las letras europeas.'),
    makeCanon('canon-pt-4', 'PT', 'Los maias', 'Eça de Queirós', 1888, 864, '9788437617510', 'Cátedra', '🏛️ Clásicos', ['🎩 Literatura del Siglo XIX (Realismo & Naturalismo)'], 'Retrato magistral de la decadencia de una ilustre familia lisboeta y la alta sociedad portuguesa de fin de siglo.', 'La gran obra maestra del realismo decimonónico portugués.')
  ],
  NO: [
    makeCanon('canon-no-1', 'NO', 'Hambre', 'Knut Hamsun', 1890, 208, '9788437606347', 'Cátedra', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Un joven escritor sin recursos vaga por las calles de Cristianía sumido en la miseria física y el delirio creador.', 'Obra precursora del monólogo interior y la modernidad europea.'),
    makeCanon('canon-no-2', 'NO', 'Casa de muñecas', 'Henrik Ibsen', 1879, 144, '9788420666495', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Nora Helmer decide rebelarse ante su papel sumiso de esposa florero en un portazo que conmovió los cimientos sociales.', 'Piedra angular del drama moderno y la emancipación femenina.'),
    makeCanon('canon-no-3', 'NO', 'El mundo de Sofía', 'Jostein Gaarder', 1991, 640, '9788466339070', 'Siruela', '🧠 Ensayo, Filosofía & Ciencia', ['🏛️ Filosofía Clásica & Estoicismo', '📚 Metaficción & Libros sobre Libros'], 'Una joven de catorce años recibe cartas misteriosas que la guían en un fascinante viaje por la historia del pensamiento.', 'El fenómeno editorial que popularizó la filosofía en todo el planeta.'),
    makeCanon('canon-no-4', 'NO', 'Mi lucha 1: La muerte del padre', 'Karl Ove Knausgård', 2009, 520, '9788433978554', 'Anagrama', '🖋️ Ficción Contemporánea & Literaria', ['🥹 Drama Familiar & Generacional'], 'Retrato desprovisto de filtros sobre la infancia, la adolescencia y el impacto fulminante de la muerte paterna.', 'La cumbre de la autoficción nórdica contemporánea.')
  ],
  GR: [
    makeCanon('canon-gr-1', 'GR', 'La Odisea', 'Homero', -725, 480, '9788424935641', 'Gredos', '🏛️ Clásicos', ['🏛️ Clásicos Grecolatinos', '🧭 Exploración & Arqueología'], 'El accidentado regreso de Odiseo a Ítaca tras diez años de guerra, desafiando a monstruos, dioses y tentaciones.', 'El relato fundacional del viaje y la aventura en Occidente.'),
    makeCanon('canon-gr-2', 'GR', 'La Ilíada', 'Homero', -750, 544, '9788424935634', 'Gredos', '🏛️ Clásicos', ['🏛️ Clásicos Grecolatinos', '🦅 Edad Antigua (Roma, Grecia, Egipto)'], 'La cólera de Aquiles durante las semanas finales del asedio a Troya y el heroísmo trágico de aqueos y troyanos.', 'El más antiguo y venerado poema épico de la civilización occidental.'),
    makeCanon('canon-gr-3', 'GR', 'Zorba el griego', 'Nikos Kazantzakis', 1946, 384, '9788492412891', 'Acantilado', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'La amistad entre un tímido intelectual y el vitalista e impetuoso Alexis Zorba en una Creta agreste y luminosa.', 'Un canto apasionado a la libertad interior y el júbilo de vivir.'),
    makeCanon('canon-gr-4', 'GR', 'Antígona', 'Sófocles', -441, 128, '9788424935658', 'Gredos', '🏛️ Clásicos', ['🏛️ Clásicos Grecolatinos'], 'Antígona desafía el decreto real del rey Creonte para dar piadosa sepultura al cadáver de su hermano.', 'El conflicto arquetípico entre la ley moral y la razón de Estado.')
  ],
  CZ: [
    makeCanon('canon-cz-1', 'CZ', 'La metamorfosis', 'Franz Kafka', 1915, 128, '9788420666655', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Gregor Samsa despierta una mañana transformado en un monstruoso insecto ante el rechazo de su propia familia.', 'La parábola kafkiana más universal sobre la alienación.'),
    makeCanon('canon-cz-2', 'CZ', 'El proceso', 'Franz Kafka', 1925, 304, '9788420666679', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Josef K. es arrestado una mañana sin haber hecho nada malo, atrapado en los engranajes de una justicia opaca e inaccesible.', 'Pesadilla burocrática y profética del siglo XX.'),
    makeCanon('canon-cz-3', 'CZ', 'La insoportable levedad del ser', 'Milan Kundera', 1984, 336, '9788483835104', 'Tusquets', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Los amores cruzados de Tomás, Teresa, Sabina y Franz durante la Primavera de Praga entre la levedad y el peso.', 'Extraordinaria meditación sobre el compromiso y la libertad humana.'),
    makeCanon('canon-cz-4', 'CZ', 'R.U.R. (Robots Universales Rossum)', 'Karel Čapek', 1920, 160, '9788494874987', 'Akal', '🔭 Ciencia Ficción & Distopía', ['🤖 Cyberpunk & IA'], 'La célebre obra teatral de ciencia ficción donde se acuñó por primera vez en la historia universal la palabra «robot».', 'Obra pionera sobre la inteligencia artificial y el progreso tecnológico.')
  ],
  CN: [
    makeCanon('canon-cn-1', 'CN', 'El problema de los tres cuerpos', 'Cixin Liu', 2008, 416, '9788466659734', 'Nova', '🔭 Ciencia Ficción & Distopía', ['🔬 Ciencia Ficción Dura (Hard Sci-Fi)', '👽 Primer Contacto & Aliens'], 'Durante la Revolución Cultural, un proyecto militar secreto envía señales al cosmos captadas por una civilización al borde del colapso.', 'Primer libro asiático galardonado con el prestigioso Premio Hugo.'),
    makeCanon('canon-cn-2', 'CN', 'Sorgo rojo', 'Mo Yan', 1986, 512, '9788497931335', 'El Aleph', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Crónica épica y brutal de tres generaciones en la provincia rural de Shandong durante la invasión japonesa.', 'La gran obra del Premio Nobel Mo Yan llevada al cine por Zhang Yimou.'),
    makeCanon('canon-cn-3', 'CN', 'El arte de la guerra', 'Sun Tzu', -500, 160, '9788441416413', 'Edaf', '🧠 Ensayo, Filosofía & Ciencia', ['🏛️ Filosofía Clásica & Estoicismo'], 'El tratado militar y estratégico más antiguo y célebre del mundo sobre la resolución de conflictos sin violencia.', 'Manual universal de estrategia aplicado a la vida y el liderazgo.'),
    makeCanon('canon-cn-4', 'CN', 'Crónica de un vendedor de sangre', 'Yu Hua', 1995, 304, '9788432248252', 'Seix Barral', '🖋️ Ficción Contemporánea & Literaria', ['🥹 Drama Familiar & Generacional'], 'Xu Sanguan recurre a vender su propia sangre en los momentos más difíciles para salvar a su familia.', 'Una conmovedora y tragicómica historia del corazón popular chino.')
  ],
  KR: [
    makeCanon('canon-kr-1', 'KR', 'La vegetariana', 'Han Kang', 2007, 176, '9788416720194', 'Rata', '🖋️ Ficción Contemporánea & Literaria', ['🌍 Clásicos Universales'], 'Yeonghye decide dejar de comer carne tras una pesadilla, desencadenando una resistencia radical contra la violencia social.', 'Novela ganadora del Man Booker International de la Nobel Han Kang.'),
    makeCanon('canon-kr-2', 'KR', 'Actos humanos', 'Han Kang', 2014, 272, '9788417553012', 'Rata', '🖋️ Ficción Contemporánea & Literaria', ['🪖 Guerras Mundiales & Siglo XX'], 'Polifonía conmovedora sobre el levantamiento democrático de Gwangju en 1980 y el trauma de los supervivientes.', 'Elegía magistral a la compasión y la dignidad frente a la opresión.'),
    makeCanon('canon-kr-3', 'KR', 'Almendra', 'Won-pyung Sohn', 2017, 256, '9788417961237', 'Temas de Hoy', '🖋️ Ficción Contemporánea & Literaria', ['🌱 Coming-of-Age (Aprendizaje)'], 'Yunjae nació con una anomalía cerebral que le impide sentir miedo o ira, hasta que conoce al rebelde Gon.', 'Fenómeno literario coreano sobre la amistad y el descubrimiento emocional.'),
    makeCanon('canon-kr-4', 'KR', 'Por favor, cuida de mamá', 'Kyung-sook Shin', 2008, 256, '9788425346897', 'Grijalbo', '🖋️ Ficción Contemporánea & Literaria', ['🥹 Drama Familiar & Generacional'], 'Una madre anciana desaparece en una abarrotada estación de metro de Seúl, obligando a sus hijos a reconstruir su vida.', 'Éxito mundial que visibilizó el sacrificio materno en la sociedad moderna.')
  ],
  IN: [
    makeCanon('canon-in-1', 'IN', 'El dios de las pequeñas cosas', 'Arundhati Roy', 1997, 384, '9788433972989', 'Anagrama', '🖋️ Ficción Contemporánea & Literaria', ['🥹 Drama Familiar & Generacional'], 'Los gemelos Estha y Rahel crecen en Kerala entre las leyes del sistema de castas y un amor que desafía lo prohibido.', 'Ganadora del Premio Booker y un prodigio sensorial inolvidable.'),
    makeCanon('canon-in-2', 'IN', 'Hijos de la medianoche', 'Salman Rushdie', 1981, 752, '9788497598583', 'Debolsillo', '🏛️ Clásicos', ['🔮 Realismo Mágico', '🌍 Clásicos Universales'], 'Saleem Sinai nace en el instante exacto en que la India alcanza su independencia, dotado de facultades telepáticas prodigiosas.', 'Elegida en dos ocasiones como el mejor Premio Booker de la historia.'),
    makeCanon('canon-in-3', 'IN', 'Gitanjali (Ofrenda lírica)', 'Rabindranath Tagore', 1910, 144, '9788420660998', 'Alianza', '🎭 Poesía, Teatro & Relatos', ['🌍 Clásicos Universales'], 'Místicos y serenos poemas devocionales que celebran la armonía entre el alma humana, la naturaleza y lo divino.', 'La obra que valió a Tagore el primer Premio Nobel literario concedido a un autor asiático.'),
    makeCanon('canon-in-4', 'IN', 'El tigre blanco', 'Aravind Adiga', 2008, 304, '9788496580435', 'Miscelánea', '🖋️ Ficción Contemporánea & Literaria', ['🎭 Humor & Sátira'], 'La fulgurante y cínica confesión epistolar de Balram Halwai sobre cómo un chófer rural logra triunfar en la nueva India.', 'Galardonada con el Premio Booker por su ácida radiografía social.')
  ],
  EG: [
    makeCanon('canon-eg-1', 'EG', 'El callejón de los milagros', 'Naguib Mahfouz', 1947, 352, '9788420658742', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales', '🏙️ Narrativa Urbana & Costumbrismo'], 'El bullicioso latido de un pequeño callejón de El Cairo durante la Segunda Guerra Mundial y sus inolvidables vecinos.', 'La obra más popular y entrañable del único Nobel árabe de literatura.'),
    makeCanon('canon-eg-2', 'EG', 'Hijos de nuestro barrio', 'Naguib Mahfouz', 1959, 576, '9788420658759', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Alegoría grandiosa que recrea las vidas de los profetas de las religiones abrahámicas a través de un barrio cairota.', 'Cúspide narrativa y filosófica de la literatura árabe moderna.'),
    makeCanon('canon-eg-3', 'EG', 'El edificio Yacobián', 'Alaa Al Aswany', 2002, 320, '9788426416186', 'Maeva', '🖋️ Ficción Contemporánea & Literaria', ['🏙️ Narrativa Urbana & Costumbrismo'], 'Microcosmos de la sociedad egipcia contemporánea retratado a través de los diversos habitantes de un majestuoso edificio.', 'El mayor fenómeno literario egipcio del siglo XXI.'),
    makeCanon('canon-eg-4', 'EG', 'Miramar', 'Naguib Mahfouz', 1967, 240, '9788420658766', 'Alianza', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Varios huéspedes de una pensión en Alejandría ofrecen sus visiones contrapuestas en torno a una joven criada campesina.', 'Estructura polifónica y lúcido análisis del Egipto de Nasser.')
  ],
  NG: [
    makeCanon('canon-ng-1', 'NG', 'Todo se desmorona', 'Chinua Achebe', 1958, 208, '9788426417725', 'Debolsillo', '🏛️ Clásicos', ['🌍 Clásicos Universales'], 'Okonkwo es un respetado líder y guerrero igbo cuyo mundo tradicional se ve sacudido por la llegada del colonizador británico.', 'El pilar fundacional de la literatura africana moderna.'),
    makeCanon('canon-ng-2', 'NG', 'Medio sol amarillo', 'Chimamanda Ngozi Adichie', 2006, 544, '9788499896113', 'Literatura Random House', '🖋️ Ficción Contemporánea & Literaria', ['🪖 Guerras Mundiales & Siglo XX'], 'Las vidas entrelazadas de dos hermanas acomodadas, un profesor y un criado durante la desgarradora guerra civil de Biafra.', 'Una de las novelas históricas y humanas más poderosas de África.'),
    makeCanon('canon-ng-3', 'NG', 'Americanah', 'Chimamanda Ngozi Adichie', 2013, 608, '9788499896120', 'Literatura Random House', '🖋️ Ficción Contemporánea & Literaria', ['🏙️ Narrativa Urbana & Costumbrismo'], 'Ifemelu y Obinze se enamoran en Lagos, pero sus caminos se bifurcan hacia la inmigración en Estados Unidos y el Reino Unido.', 'Incómodo y brillante análisis de la raza, la identidad y la pertenencia.'),
    makeCanon('canon-ng-4', 'NG', 'El camino hambriento', 'Ben Okri', 1991, 576, '9788497598705', 'El Cobre', '🏛️ Clásicos', ['🔮 Realismo Mágico'], 'Azaro es un niño espíritu que rehúsa morir para compartir las penas y esperanzas de su sufrida familia en Nigeria.', 'Premio Booker y deslumbrante realismo mágico africano.')
  ],
  AU: [
    makeCanon('canon-au-1', 'AU', 'La ladrona de libros', 'Markus Zusak', 2005, 544, '9788426416216', 'Lumen', '🖋️ Ficción Contemporánea & Literaria', ['🪖 Guerras Mundiales & Siglo XX', '📚 Metaficción & Libros sobre Libros'], 'Narrada por la mismísima Muerte, sigue a Liesel Meminger en la Alemania nazi y su afán por robar libros prohibidos.', 'Fenómeno universal sobre el poder sanador de las palabras.'),
    makeCanon('canon-au-2', 'AU', 'El arca de Schindler', 'Thomas Keneally', 1982, 480, '9788425325854', 'Grijalbo', '🏰 Novela Histórica', ['🪖 Guerras Mundiales & Siglo XX'], 'La sobrecogedora historia verídica de Oskar Schindler y su rescate de más de mil doscientos judíos del Holocausto.', 'Premio Booker y base de la obra maestra cinematográfica de Spielberg.'),
    makeCanon('canon-au-3', 'AU', 'Voss', 'Patrick White', 1957, 496, '9788435017244', 'Edhasa', '🏛️ Clásicos', ['🧭 Exploración & Arqueología'], 'El explorador alemán Johann Voss emprende una expedición mística y fatal por el hostil desierto australiano.', 'La cumbre literaria del único Premio Nobel australiano.'),
    makeCanon('canon-au-4', 'AU', 'Carreteras secundarias', 'Tim Winton', 1991, 464, '9788439702207', 'Destino', '🖋️ Ficción Contemporánea & Literaria', ['🌱 Coming-of-Age (Aprendizaje)'], 'Dos familias humildes comparten una destartalada casa en Perth a lo largo de veinte años de dicha y desventura.', 'Un clásico imperecedero de la literatura australiana.')
  ]
};

// ─── Funciones públicas de descubrimiento y canon nacional ───

/**
 * Obtiene las obras maestras del canon literario de un país
 */
export function getCountryCanonBooks(countryCode: string): BibliographicCandidate[] {
  if (!countryCode) return [];
  const code = countryCode.trim().toUpperCase();
  return NATIONAL_LITERARY_CANON[code] || [];
}

/**
 * Busca más obras literarias representativas del país mediante el servicio bibliográfico
 */
export async function fetchMoreCountryBooks(
  countryCode: string,
  signal?: AbortSignal
): Promise<BibliographicCandidate[]> {
  if (!countryCode) return [];
  const code = countryCode.trim().toUpperCase();
  const country = COUNTRIES_CATALOG[code];
  if (!country) return [];

  const countryAuthorsMap: Record<string, string[]> = {
    ES: ['Federico García Lorca', 'Miguel de Unamuno', 'Pío Baroja', 'Arturo Pérez-Reverte', 'Javier Marías'],
    JP: ['Haruki Murakami', 'Yukio Mishima', 'Kenzaburō Ōe', 'Banana Yoshimoto', 'Ryūnosuke Akutagawa'],
    GB: ['Virginia Woolf', 'Charles Dickens', 'George Orwell', 'Arthur Conan Doyle', 'Agatha Christie'],
    US: ['Ernest Hemingway', 'F. Scott Fitzgerald', 'Toni Morrison', 'John Steinbeck', 'Edgar Allan Poe'],
    AR: ['Jorge Luis Borges', 'Julio Cortázar', 'Ernesto Sabato', 'Adolfo Bioy Casares', 'Mariana Enríquez'],
    CO: ['Gabriel García Márquez', 'Héctor Abad Faciolince', 'Álvaro Mutis', 'Laura Restrepo'],
    MX: ['Juan Rulfo', 'Octavio Paz', 'Carlos Fuentes', 'Elena Poniatowska', 'Valeria Luiselli'],
    FR: ['Albert Camus', 'Victor Hugo', 'Marcel Proust', 'Gustave Flaubert', 'Émile Zola'],
    RU: ['Fiódor Dostoyevski', 'León Tolstói', 'Antón Chéjov', 'Mijaíl Bulgákov', 'Aleksandr Pushkin'],
    DE: ['Hermann Hesse', 'Thomas Mann', 'Franz Kafka', 'Johann Wolfgang von Goethe', 'Heinrich Böll'],
    IT: ['Italo Calvino', 'Umberto Eco', 'Dante Alighieri', 'Elena Ferrante', 'Luigi Pirandello'],
    IE: ['James Joyce', 'Oscar Wilde', 'Samuel Beckett', 'Bram Stoker', 'Sally Rooney'],
    CL: ['Roberto Bolaño', 'Isabel Allende', 'Pablo Neruda', 'Gabriela Mistral'],
    PE: ['Mario Vargas Llosa', 'José María Arguedas', 'César Vallejo', 'Alfredo Bryce Echenique'],
    BR: ['Clarice Lispector', 'Machado de Assis', 'Jorge Amado', 'Guimarães Rosa'],
    PT: ['José Saramago', 'Fernando Pessoa', 'Eça de Queirós', 'Sophia de Mello Breyner'],
    NO: ['Knut Hamsun', 'Henrik Ibsen', 'Karl Ove Knausgård', 'Jon Fosse'],
    GR: ['Homero', 'Nikos Kazantzakis', 'Kavafis', 'Sófocles'],
    CZ: ['Franz Kafka', 'Milan Kundera', 'Bohumil Hrabal', 'Karel Čapek'],
    CN: ['Cixin Liu', 'Mo Yan', 'Yu Hua', 'Lao She'],
    KR: ['Han Kang', 'Kyung-sook Shin', 'Won-pyung Sohn', 'Cho Nam-joo'],
    IN: ['Arundhati Roy', 'Salman Rushdie', 'Rabindranath Tagore', 'Jhumpa Lahiri'],
    EG: ['Naguib Mahfouz', 'Alaa Al Aswany', 'Taha Hussein', 'Nawal El Saadawi'],
    NG: ['Chinua Achebe', 'Chimamanda Ngozi Adichie', 'Wole Soyinka', 'Ben Okri'],
    AU: ['Markus Zusak', 'Patrick White', 'Thomas Keneally', 'Peter Carey'],
    SE: ['Astrid Lindgren', 'Stieg Larsson', 'August Strindberg', 'Selma Lagerlöf'],
    PL: ['Stanisław Lem', 'Olga Tokarczuk', 'Wisława Szymborska', 'Henryk Sienkiewicz'],
    NL: ['Cees Nooteboom', 'Harry Mulisch', 'Anne Frank'],
    AT: ['Stefan Zweig', 'Arthur Schnitzler', 'Robert Musil'],
    DK: ['Hans Christian Andersen', 'Karen Blixen', 'Søren Kierkegaard'],
    UY: ['Mario Benedetti', 'Eduardo Galeano', 'Juan Carlos Onetti']
  };

  const authors = countryAuthorsMap[code] || [country.name];
  const queryAuthor = authors[Math.floor(Math.random() * authors.length)];

  try {
    const rawResults = await bookMetadataService.searchBooks(queryAuthor, signal);
    const existingTitles = new Set(
      (NATIONAL_LITERARY_CANON[code] || []).map((b) => b.nombre.trim().toLowerCase())
    );

    return rawResults
      .filter((b) => !existingTitles.has(b.nombre.trim().toLowerCase()))
      .slice(0, 6)
      .map((c) => ({
        ...c,
        pais: code,
        recommendationReason: `Literatura destacada de ${country.name}`
      }));
  } catch {
    return [];
  }
}

/**
 * Devuelve los libros de la biblioteca a los que no se les ha podido detectar país
 * ni tienen asignado book.pais manual.
 */
export function getUnassignedCountryBooks(books: Book[]): Book[] {
  if (!Array.isArray(books)) return [];
  return books.filter((b) => {
    if (b.pais && COUNTRIES_CATALOG[b.pais.trim().toUpperCase()]) {
      return false;
    }
    return !literaryGeographyService.resolveBookCountry(b);
  });
}

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
   * 1. Respetar book.pais manual si es un código válido en el catálogo
   * 2. Diccionario de autor (con overrides)
   * 3. Idioma específico
   */
  public resolveBookCountry(
    book: Book | { autor?: string; nombre?: string; pais?: string; idioma?: string }
  ): CountryInfo | null {
    // 1. Respetar book.pais manual
    if (book.pais) {
      const manualCode = book.pais.trim().toUpperCase();
      if (COUNTRIES_CATALOG[manualCode]) {
        return COUNTRIES_CATALOG[manualCode];
      }
    }

    // 2. Deducción por autor
    const code = this.getAuthorCountryCode(book.autor);
    if (code && COUNTRIES_CATALOG[code]) {
      return COUNTRIES_CATALOG[code];
    }

    // 3. Deducción por idioma si es inequívoco
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
    if (lang.includes('sueco') || lang.includes('swedish')) {
      return COUNTRIES_CATALOG.SE;
    }
    if (lang.includes('polaco') || lang.includes('polish')) {
      return COUNTRIES_CATALOG.PL;
    }
    if (lang.includes('griego') || lang.includes('greek')) {
      return COUNTRIES_CATALOG.GR;
    }
    if (lang.includes('noruego') || lang.includes('norwegian')) {
      return COUNTRIES_CATALOG.NO;
    }
    if (lang.includes('danés') || lang.includes('danes') || lang.includes('danish')) {
      return COUNTRIES_CATALOG.DK;
    }
    if (lang.includes('checo') || lang.includes('czech')) {
      return COUNTRIES_CATALOG.CZ;
    }
    if (lang.includes('chino') || lang.includes('chinese')) {
      return COUNTRIES_CATALOG.CN;
    }
    if (lang.includes('coreano') || lang.includes('korean')) {
      return COUNTRIES_CATALOG.KR;
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
      europe: 0,
      latam: 0,
      north_america: 0,
      asia: 0,
      africa: 0,
      oceania: 0
    };

    const stampedContinents = new Set<Continent>();

    countryMap.forEach((bookList, code) => {
      const country = COUNTRIES_CATALOG[code];
      if (!country) return;

      const readBooks = bookList.filter((b) => isBookRead(b));
      const isStamped = readBooks.length > 0;

      const authorsSet = new Set<string>();
      bookList.forEach((b) => {
        if (b.autor?.trim()) authorsSet.add(b.autor.trim());
      });

      if (isStamped) {
        continentsCount[country.continent] = (continentsCount[country.continent] || 0) + 1;
        stampedContinents.add(country.continent);
      }

      // Ordenar obras con prioridad absoluta a las leídas, luego en lectura, luego pendientes
      const sortedBooks = [...bookList].sort((a, b) => {
        const aRead = isBookRead(a);
        const bRead = isBookRead(b);
        if (aRead !== bRead) return aRead ? -1 : 1;

        const aReading =
          !aRead &&
          (a.progreso?.toLowerCase().includes('leyendo') ||
            a.progreso?.toLowerCase() === 'reading');
        const bReading =
          !bRead &&
          (b.progreso?.toLowerCase().includes('leyendo') ||
            b.progreso?.toLowerCase() === 'reading');
        if (aReading !== bReading) return aReading ? -1 : 1;

        return (a.nombre || '').localeCompare(b.nombre || '', 'es');
      });

      entries.push({
        country,
        books: sortedBooks,
        readBooks,
        readCount: readBooks.length,
        authors: Array.from(authorsSet),
        stamped: isStamped
      });
    });

    // Añadir el resto de países del catálogo mundial para exploración visual ("Por descubrir")
    Object.values(COUNTRIES_CATALOG).forEach((country) => {
      if (!countryMap.has(country.code)) {
        entries.push({
          country,
          books: [],
          readBooks: [],
          readCount: 0,
          authors: [],
          stamped: false
        });
      }
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
          (countryMap.get('ES')?.some((b) => isBookRead(b))) ||
          (countryMap.get('PT')?.some((b) => isBookRead(b)))
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
          ((countryMap.get('GB')?.filter((b) => isBookRead(b)).length || 0) +
            (countryMap.get('US')?.filter((b) => isBookRead(b)).length || 0)) >= 3,
        progressText: '3+ obras de UK o EE.UU.'
      },
      {
        id: 'latam',
        title: 'Crónicas de las Américas',
        latinTitle: 'Chronica Neomundi',
        description: 'Has leído autores latinoamericanos (México, Argentina, Colombia, Chile, etc.).',
        icon: '🌿',
        unlocked: ['MX', 'AR', 'CO', 'CL', 'PE', 'UY', 'BR', 'CU'].some((code) =>
          countryMap.get(code)?.some((b) => isBookRead(b))
        ),
        progressText: 'América Latina'
      },
      {
        id: 'orient',
        title: 'Caminante del Sol Naciente',
        latinTitle: 'Viator Solis Orientis',
        description: 'Has cruzado el Pacífico para leer autores asiáticos (Japón, Corea, China o India).',
        icon: '⛩️',
        unlocked: ['JP', 'KR', 'CN', 'IN'].some((code) =>
          countryMap.get(code)?.some((b) => isBookRead(b))
        ),
        progressText: 'Asia'
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
