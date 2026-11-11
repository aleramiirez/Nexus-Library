import { BibliographicCandidate, Book } from '../types/models';
import {
  inferCatalogFromCategories,
  inferGenreAndSubgenres,
  normalizeText,
  Genre,
  Subgenre
} from '../constants/catalogs';

export { inferCatalogFromCategories, inferGenreAndSubgenres };
import {
  buildOpenLibraryIdCover,
  buildOpenLibraryIsbnCover,
  normalizeCoverUrl
} from './coverService';

const searchCache = new Map<string, BibliographicCandidate[]>();
const subjectCache = new Map<string, BibliographicCandidate[]>();


async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 4000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timer);
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        controller.abort();
      });
    }
  }

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export function extractCleanIsbn(query: string): string | null {
  const cleaned = query.replace(/[^0-9X]/gi, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(cleaned) || /^\d{13}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

function normalizeLanguageCode(lang?: string): string {
  if (!lang) return '';
  const code = lang.toLowerCase().trim();
  if (code === 'spa' || code === 'es' || code.startsWith('es-')) return 'Español';
  if (code === 'eng' || code === 'en' || code.startsWith('en-')) return 'Inglés';
  if (code === 'fre' || code === 'fra' || code === 'fr') return 'Francés';
  if (code === 'ita' || code === 'it') return 'Italiano';
  if (code === 'ger' || code === 'deu' || code === 'de') return 'Alemán';
  if (code === 'por' || code === 'pt') return 'Portugués';
  return lang.toUpperCase();
}

function parseYear(rawDate?: string | number | null): number | null {
  if (typeof rawDate === 'number' && rawDate > 1000 && rawDate < 2100) {
    return rawDate;
  }
  if (typeof rawDate === 'string') {
    const match = rawDate.match(/\b(1\d{3}|20\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  publish_year?: number[];
  number_of_pages_median?: number;
  isbn?: string[];
  publisher?: string[];
  language?: string[];
  subject?: string[];
  cover_i?: number;
  edition_count?: number;
}

const ROMAN_TO_INT: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
  xiii: 13,
  xiv: 14,
  xv: 15
};

function parseVolumeNumber(raw?: string | number | null): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 && raw < 200 ? Math.floor(raw) : null;
  }
  if (!raw) return null;
  const clean = String(raw).trim().toLowerCase();
  if (!clean) return null;
  if (ROMAN_TO_INT[clean]) return ROMAN_TO_INT[clean];
  const num = Math.floor(Number(clean.replace(',', '.')));
  if (Number.isFinite(num) && num > 0 && num < 200) return num;
  return null;
}

const EDITORIAL_IMPRINTS_SET = new Set(
  [
    'andanzas',
    'compactos',
    'panorama de narrativas',
    'biblioteca breve',
    'booket',
    'debolsillo',
    'best seller',
    'bestseller',
    'bestsellers',
    'exitos',
    'contemporanea',
    'alianza literaria',
    'el libro de bolsillo',
    'biblioteca de autor',
    'coleccion austral',
    'austral',
    'narrativa hispanica',
    'literatura random house',
    'alfaguara',
    'tusquets',
    'tusquets editores',
    'anagrama',
    'editorial anagrama',
    'minotauro',
    'nova',
    'salamandra',
    'ediciones b',
    'plaza & janes',
    'plaza y janes',
    'roca editorial',
    'siruela',
    'acantilado',
    'catedra',
    'letras hispanicas',
    'letras universales',
    'clasicos',
    'clasicos universales',
    'penguin clasicos',
    'alba clasica',
    'alba minus',
    'gredos',
    'el barco de vapor',
    'gran angular',
    'punto de lectura',
    'suma de letras',
    'suma',
    'umbriel',
    'oz editorial',
    'nocturna',
    'hidra',
    'crossbooks',
    'montena',
    'puck',
    'titania',
    'phoebe',
    'cisne',
    'jet',
    'byblos',
    'fabula',
    'tiempo de memoria',
    'nuevos tiempos',
    'ancora y delfin',
    'destino',
    'ediciones destino',
    'espasa',
    'planeta',
    'editorial planeta',
    'seix barral',
    'critica',
    'ariel',
    'paidos',
    'taurus',
    'debate',
    'lumen',
    'reservoir books',
    'blackie books',
    'impedimenta',
    'nordica',
    'sexto piso',
    'astiberri',
    'alianza',
    'alianza editorial',
    'vintage',
    'vintage espanol',
    'modern library',
    'tor books',
    'gollancz',
    'orbit',
    'del rey',
    'bantam',
    'harpercollins',
    'macmillan',
    'valdemar',
    'gotica',
    'el club diogenes',
    'insomnia',
    'avatares',
    'runas',
    'cronos',
    'nebulae',
    'super ficcion',
    'coleccion',
    'biblioteca',
    'narrativa',
    'ficcion',
    'no ficcion',
    'novela',
    'novela negra',
    'ensayo',
    'poesia',
    'teatro',
    'historia',
    'biografia',
    'divulgacion',
    'autoayuda',
    'bolsillo',
    'tapa dura',
    'tapa blanda',
    'epublibre',
    'lectulandia',
    'z-library',
    'z-lib',
    'annas-archive',
    'bajaebooks',
    'espapdf',
    'calibre',
    'ebook',
    'epub',
    'kindle',
    'edicion espanola',
    'edicion ilustrada',
    'edicion especial',
    'edicion conmemorativa',
    'edicion coleccionista',
    'spanish edition',
    'english edition',
    'obras completas',
    'obras selectas',
    'grandes obras',
    'premio planeta',
    'premio nadal',
    'premio alfaguara',
    'premio minotauro',
    'libro independiente',
    'autoconclusivo',
    'standalone'
  ].map((s) => normalizeText(s))
);

export interface KnownSagaDefinition {
  sagaName: string;
  aliases: RegExp[];
  authorPattern?: RegExp;
  volumes: Array<{ volume: number; patterns: RegExp[] }>;
}

export const KNOWN_LITERARY_SAGAS: KnownSagaDefinition[] = [
  {
    sagaName: 'El Archivo de las Tormentas',
    aliases: [/archivo de las tormentas|stormlight archive/i],
    authorPattern: /sanderson/i,
    volumes: [
      { volume: 1, patterns: [/\b(el )?camino de los reyes\b|\bway of kings\b/i] },
      { volume: 2, patterns: [/\bpalabras radiantes\b|\bwords of radiance\b/i] },
      { volume: 3, patterns: [/\bjuramentada\b|\boathbringer\b/i] },
      { volume: 4, patterns: [/\b(el )?ritmo de la guerra\b|\brhythm of war\b/i] },
      { volume: 5, patterns: [/\bviento y verdad\b|\bwind and truth\b/i] }
    ]
  },
  {
    sagaName: 'Nacidos de la Bruma',
    aliases: [/nacidos de la bruma|mistborn/i],
    authorPattern: /sanderson/i,
    volumes: [
      { volume: 1, patterns: [/\b(el )?imperio final\b|\bfinal empire\b/i] },
      { volume: 2, patterns: [/\b(el )?pozo de la ascensi[oó]n\b|\bwell of ascension\b/i] },
      { volume: 3, patterns: [/\b(el )?h[eé]roe de las eras\b|\bhero of ages\b/i] },
      { volume: 4, patterns: [/\baleaci[oó]n de ley\b|\balloy of law\b/i] },
      { volume: 5, patterns: [/\bsombras de identidad\b|\bshadows of self\b/i] },
      { volume: 6, patterns: [/\bbrazales de duelo\b|\bbands of mourning\b/i] },
      { volume: 7, patterns: [/\b(el )?metal perdido\b|\blost metal\b/i] }
    ]
  },
  {
    sagaName: 'Escuadrón (Citoverso)',
    aliases: [/\bcitoverso\b|\bcytoverse\b|\bserie escuadr[oó]n\b|\bskyward series\b/i],
    authorPattern: /sanderson/i,
    volumes: [
      { volume: 1, patterns: [/^(escuadr[oó]n|skyward)$/i] },
      { volume: 2, patterns: [/^(estelar|starsight)$/i] },
      { volume: 3, patterns: [/^(cit[oó]nica|cytonic)$/i] },
      { volume: 4, patterns: [/^(desafiante|defiant)$/i] }
    ]
  },
  {
    sagaName: 'Harry Potter',
    aliases: [/^harry potter$/i, /saga harry potter/i],
    authorPattern: /rowling/i,
    volumes: [
      { volume: 1, patterns: [/piedra filosofal|philosopher'?s stone|sorcerer'?s stone/i] },
      { volume: 2, patterns: [/c[aá]mara secreta|chamber of secrets/i] },
      { volume: 3, patterns: [/prisionero de azkaban|prisoner of azkaban/i] },
      { volume: 4, patterns: [/c[aá]liz de fuego|goblet of fire/i] },
      { volume: 5, patterns: [/orden del f[eé]nix|order of the phoenix/i] },
      { volume: 6, patterns: [/misterio del pr[ií]ncipe|half-blood prince|half blood prince/i] },
      { volume: 7, patterns: [/reliquias de la muerte|deathly hallows/i] }
    ]
  },
  {
    sagaName: 'El Señor de los Anillos',
    aliases: [/se[nñ]or de los anillos|lord of the rings/i],
    authorPattern: /tolkien/i,
    volumes: [
      { volume: 1, patterns: [/comunidad del anillo|fellowship of the ring/i] },
      { volume: 2, patterns: [/las dos torres|the two towers/i] },
      { volume: 3, patterns: [/retorno del rey|return of the king/i] }
    ]
  },
  {
    sagaName: 'Canción de hielo y fuego',
    aliases: [/canci[oó]n de hielo y fuego|song of ice and fire/i],
    authorPattern: /martin/i,
    volumes: [
      { volume: 1, patterns: [/\bjuego de tronos\b|\bgame of thrones\b/i] },
      { volume: 2, patterns: [/\bchoque de reyes\b|\bclash of kings\b/i] },
      { volume: 3, patterns: [/\btormenta de espadas\b|\bstorm of swords\b/i] },
      { volume: 4, patterns: [/\bfest[ií]n de cuervos\b|\bfeast for crows\b/i] },
      { volume: 5, patterns: [/\bdanza de dragones\b|\bdance with dragons\b/i] }
    ]
  },
  {
    sagaName: 'Crónica del Asesino de Reyes',
    aliases: [/asesino de reyes|kingkiller chronicle/i],
    authorPattern: /rothfuss/i,
    volumes: [
      { volume: 1, patterns: [/\b(el )?nombre del viento\b|\bname of the wind\b/i] },
      { volume: 2, patterns: [/\b(el )?temor de un hombre sabio\b|\bwise man'?s fear\b/i] },
      { volume: 3, patterns: [/\b(la )?m[uú]sica del silencio\b|\bslow regard of silent things\b/i] }
    ]
  },
  {
    sagaName: 'Crónicas de Dune',
    aliases: [/cr[oó]nicas de dune|dune chronicles|^saga dune$/i],
    authorPattern: /herbert/i,
    volumes: [
      { volume: 1, patterns: [/^(dune|duna)$/i] },
      { volume: 2, patterns: [/mes[ií]as de dune|dune messiah/i] },
      { volume: 3, patterns: [/hijos de dune|children of dune/i] },
      { volume: 4, patterns: [/dios emperador de dune|god emperor of dune/i] },
      { volume: 5, patterns: [/herejes de dune|heretics of dune/i] },
      { volume: 6, patterns: [/casa capitular|chapterhouse:? dune/i] }
    ]
  },
  {
    sagaName: 'Ciclo de la Fundación',
    aliases: [/ciclo de la fundaci[oó]n|saga de la fundaci[oó]n|trilog[ií]a de la fundaci[oó]n|foundation series/i],
    authorPattern: /asimov/i,
    volumes: [
      { volume: 1, patterns: [/^(fundaci[oó]n|foundation)$/i] },
      { volume: 2, patterns: [/fundaci[oó]n e imperio|foundation and empire/i] },
      { volume: 3, patterns: [/segunda fundaci[oó]n|second foundation/i] },
      { volume: 4, patterns: [/l[ií]mites de la fundaci[oó]n|foundation'?s edge/i] },
      { volume: 5, patterns: [/fundaci[oó]n y tierra|foundation and earth/i] },
      { volume: 6, patterns: [/preludio a la fundaci[oó]n|prelude to foundation/i] },
      { volume: 7, patterns: [/hacia la fundaci[oó]n|forward the foundation/i] }
    ]
  },
  {
    sagaName: 'La Primera Ley',
    aliases: [/primera ley|first law/i],
    authorPattern: /abercrombie/i,
    volumes: [
      { volume: 1, patterns: [/voz de las espadas|blade itself/i] },
      { volume: 2, patterns: [/antes de que los cuelguen|before they are hanged/i] },
      { volume: 3, patterns: [/[uú]ltimo argumento de los reyes|last argument of kings/i] }
    ]
  },
  {
    sagaName: 'La Era de la Locura',
    aliases: [/era de la locura|age of madness/i],
    authorPattern: /abercrombie/i,
    volumes: [
      { volume: 1, patterns: [/un poco de odio|a little hatred/i] },
      { volume: 2, patterns: [/el problema de la paz|the trouble with peace/i] },
      { volume: 3, patterns: [/sabidur[ií]a de las multitudes|wisdom of crowds/i] }
    ]
  },
  {
    sagaName: 'El Cementerio de los Libros Olvidados',
    aliases: [/cementerio de los libros olvidados|cemetery of forgotten books/i],
    authorPattern: /zaf[oó]n/i,
    volumes: [
      { volume: 1, patterns: [/\b(la )?sombra del viento\b|\bshadow of the wind\b/i] },
      { volume: 2, patterns: [/\b(el )?juego del [aá]ngel\b|\bangel'?s game\b/i] },
      { volume: 3, patterns: [/\b(el )?prisionero del cielo\b|\bprisoner of heaven\b/i] },
      { volume: 4, patterns: [/\b(el )?laberinto de los esp[ií]ritus\b|\blabyrinth of the spirits\b/i] }
    ]
  },
  {
    sagaName: 'Reina Roja',
    aliases: [/reina roja|antonia scott|universo reina roja/i],
    authorPattern: /g[oó]mez[- ]jurado/i,
    volumes: [
      { volume: 1, patterns: [/\breina roja\b|\bred queen\b/i] },
      { volume: 2, patterns: [/\bloba negra\b|\bblack wolf\b/i] },
      { volume: 3, patterns: [/\brey blanco\b|\bwhite king\b/i] }
    ]
  },
  {
    sagaName: 'Todo Arde',
    aliases: [/todo arde|serie todo arde/i],
    authorPattern: /g[oó]mez[- ]jurado/i,
    volumes: [
      { volume: 1, patterns: [/\btodo arde\b/i] },
      { volume: 2, patterns: [/\btodo vuelve\b/i] },
      { volume: 3, patterns: [/\btodo muere\b/i] }
    ]
  },
  {
    sagaName: 'Trilogía de la Ciudad Blanca',
    aliases: [/ciudad blanca|white city/i],
    authorPattern: /urturi/i,
    volumes: [
      { volume: 1, patterns: [/silencio de la ciudad blanca/i] },
      { volume: 2, patterns: [/ritos del agua/i] },
      { volume: 3, patterns: [/se[nñ]ores del tiempo/i] }
    ]
  },
  {
    sagaName: 'Trilogía de Escipión',
    aliases: [/escipi[oó]n|africanus/i],
    authorPattern: /posteguillo/i,
    volumes: [
      { volume: 1, patterns: [/africanus/i] },
      { volume: 2, patterns: [/legiones malditas/i] },
      { volume: 3, patterns: [/traici[oó]n de roma/i] }
    ]
  },
  {
    sagaName: 'Trilogía de Trajano',
    aliases: [/trilog[ií]a de trajano|serie trajano/i],
    authorPattern: /posteguillo/i,
    volumes: [
      { volume: 1, patterns: [/asesinos del emperador/i] },
      { volume: 2, patterns: [/circo m[aá]ximo/i] },
      { volume: 3, patterns: [/legi[oó]n perdida/i] }
    ]
  },
  {
    sagaName: 'Julio César',
    aliases: [/serie julio c[eé]sar|saga julio c[eé]sar/i],
    authorPattern: /posteguillo/i,
    volumes: [
      { volume: 1, patterns: [/\broma soy yo\b/i] },
      { volume: 2, patterns: [/\bmaldita roma\b/i] }
    ]
  },
  {
    sagaName: 'Los Pilares de la Tierra (Kingsbridge)',
    aliases: [/kingsbridge|pilares de la tierra/i],
    authorPattern: /follett/i,
    volumes: [
      { volume: 1, patterns: [/pilares de la tierra|pillars of the earth/i] },
      { volume: 2, patterns: [/un mundo sin fin|world without end/i] },
      { volume: 3, patterns: [/columna de fuego|column of fire/i] },
      { volume: 4, patterns: [/tinieblas y el alba|evening and the morning/i] },
      { volume: 5, patterns: [/armadura de la luz|armour of light/i] }
    ]
  },
  {
    sagaName: 'The Century',
    aliases: [/the century|trilog[ií]a del siglo/i],
    authorPattern: /follett/i,
    volumes: [
      { volume: 1, patterns: [/ca[ií]da de los gigantes|fall of giants/i] },
      { volume: 2, patterns: [/invierno del mundo|winter of the world/i] },
      { volume: 3, patterns: [/umbral de la eternidad|edge of eternity/i] }
    ]
  },
  {
    sagaName: 'Millennium',
    aliases: [/millennium|milenium/i],
    authorPattern: /larsson|lagercrantz|smirnoff/i,
    volumes: [
      { volume: 1, patterns: [/hombres que no amaban a las mujeres|girl with the dragon tattoo/i] },
      { volume: 2, patterns: [/chica que so[nñ]aba con una cerilla|girl who played with fire/i] },
      { volume: 3, patterns: [/reina en el palacio de las corrientes|girl who kicked the hornets/i] },
      { volume: 4, patterns: [/lo que no te mata te hace m[aá]s fuerte|girl in the spider'?s web/i] },
      { volume: 5, patterns: [/hombre que persegu[ií]a su sombra|girl who takes an eye/i] },
      { volume: 6, patterns: [/chica que vivi[oó] dos veces|girl who lived twice/i] }
    ]
  },
  {
    sagaName: 'Saga de Geralt de Rivia',
    aliases: [/geralt de rivia|the witcher|saga del brujo/i],
    authorPattern: /sapkowski/i,
    volumes: [
      { volume: 1, patterns: [/[uú]ltimo deseo|last wish/i] },
      { volume: 2, patterns: [/espada del destino|sword of destiny/i] },
      { volume: 3, patterns: [/sangre de los elfos|blood of elves/i] },
      { volume: 4, patterns: [/tiempo de odio|time of contempt/i] },
      { volume: 5, patterns: [/bautismo de fuego|baptism of fire/i] },
      { volume: 6, patterns: [/torre de la golondrina|tower of the swallow/i] },
      { volume: 7, patterns: [/dama del lago|lady of the lake/i] },
      { volume: 8, patterns: [/estaci[oó]n de tormentas|season of storms/i] }
    ]
  },
  {
    sagaName: 'La Rueda del Tiempo',
    aliases: [/rueda del tiempo|wheel of time/i],
    authorPattern: /jordan|sanderson/i,
    volumes: [
      { volume: 1, patterns: [/ojo del mundo|eye of the world/i] },
      { volume: 2, patterns: [/gran cacer[ií]a|great hunt/i] },
      { volume: 3, patterns: [/drag[oó]n renacido|dragon reborn/i] },
      { volume: 4, patterns: [/ascenso de la sombra|shadow rising/i] },
      { volume: 5, patterns: [/cielo en llamas|fires of heaven/i] },
      { volume: 6, patterns: [/se[nñ]or del caos|lord of chaos/i] }
    ]
  },
  {
    sagaName: 'Los Juegos del Hambre',
    aliases: [/juegos del hambre|hunger games/i],
    authorPattern: /collins/i,
    volumes: [
      { volume: 1, patterns: [/^(los )?juegos del hambre$|^(the )?hunger games$/i] },
      { volume: 2, patterns: [/\ben llamas\b|\bcatching fire\b/i] },
      { volume: 3, patterns: [/\bsinsajo\b|\bmockingjay\b/i] },
      { volume: 4, patterns: [/balada de p[aá]jaros cantores|ballad of songbirds/i] }
    ]
  },
  {
    sagaName: 'Percy Jackson y los dioses del Olimpo',
    aliases: [/percy jackson/i],
    authorPattern: /riordan/i,
    volumes: [
      { volume: 1, patterns: [/ladr[oó]n del rayo|lightning thief/i] },
      { volume: 2, patterns: [/mar de los monstruos|sea of monsters/i] },
      { volume: 3, patterns: [/maldici[oó]n del tit[aá]n|titan'?s curse/i] },
      { volume: 4, patterns: [/batalla del laberinto|battle of the labyrinth/i] },
      { volume: 5, patterns: [/[uú]ltimo h[eé]roe del olimpo|last olympian/i] }
    ]
  },
  {
    sagaName: 'Las Crónicas de Narnia',
    aliases: [/cr[oó]nicas de narnia|chronicles of narnia|^narnia$/i],
    authorPattern: /lewis/i,
    volumes: [
      { volume: 1, patterns: [/le[oó]n.*bruja.*armario|lion.*witch.*wardrobe/i] },
      { volume: 2, patterns: [/pr[ií]ncipe caspian|prince caspian/i] },
      { volume: 3, patterns: [/viajero del alba|dawn treader/i] },
      { volume: 4, patterns: [/silla de plata|silver chair/i] },
      { volume: 5, patterns: [/caballo y el muchacho|horse and his boy/i] },
      { volume: 6, patterns: [/sobrino del mago|magician'?s nephew/i] },
      { volume: 7, patterns: [/[uú]ltima batalla|last battle/i] }
    ]
  },
  {
    sagaName: 'La Materia Oscura',
    aliases: [/materia oscura|his dark materials/i],
    authorPattern: /pullman/i,
    volumes: [
      { volume: 1, patterns: [/luces del norte|br[uú]jula dorada|northern lights|golden compass/i] },
      { volume: 2, patterns: [/^(la )?daga$|\bsubtle knife\b/i] },
      { volume: 3, patterns: [/catalejo lacado|amber spyglass/i] }
    ]
  },
  {
    sagaName: 'Empíreo',
    aliases: [/emp[ií]reo|empyrean/i],
    authorPattern: /yarros/i,
    volumes: [
      { volume: 1, patterns: [/alas de sangre|fourth wing/i] },
      { volume: 2, patterns: [/alas de hierro|iron flame/i] },
      { volume: 3, patterns: [/alas de [oó]nix|onyx storm/i] }
    ]
  },
  {
    sagaName: 'Una corte de rosas y espinas',
    aliases: [/corte de rosas y espinas|court of thorns and roses|acotar/i],
    authorPattern: /maas/i,
    volumes: [
      { volume: 1, patterns: [/corte de rosas y espinas|court of thorns and roses/i] },
      { volume: 2, patterns: [/corte de niebla y furia|court of mist and fury/i] },
      { volume: 3, patterns: [/corte de alas y ruina|court of wings and ruin/i] },
      { volume: 4, patterns: [/corte de hielo y estrellas|court of frost and starlight/i] },
      { volume: 5, patterns: [/corte de llamas plateadas|court of silver flames/i] }
    ]
  },
  {
    sagaName: 'Trono de Cristal',
    aliases: [/trono de cristal|throne of glass/i],
    authorPattern: /maas/i,
    volumes: [
      { volume: 1, patterns: [/^(trono de cristal|throne of glass)$/i] },
      { volume: 2, patterns: [/corona de medianoche|crown of midnight/i] },
      { volume: 3, patterns: [/heredera de fuego|heir of fire/i] },
      { volume: 4, patterns: [/reina de sombras|queen of shadows/i] },
      { volume: 5, patterns: [/imperio de tormentas|empire of storms/i] },
      { volume: 6, patterns: [/torre del alba|tower of dawn/i] },
      { volume: 7, patterns: [/reino de cenizas|kingdom of ash/i] }
    ]
  },
  {
    sagaName: 'El recuerdo del pasado de la Tierra',
    aliases: [/recuerdo del pasado de la tierra|remembrance of earth'?s past|trilog[ií]a de los tres cuerpos|three-body/i],
    authorPattern: /liu|cixin/i,
    volumes: [
      { volume: 1, patterns: [/problema de los tres cuerpos|three-body problem/i] },
      { volume: 2, patterns: [/bosque oscuro|dark forest/i] },
      { volume: 3, patterns: [/fin de la muerte|death'?s end/i] }
    ]
  },
  {
    sagaName: 'Cantos de Hyperion',
    aliases: [/cantos de hyperion|hyperion cantos/i],
    authorPattern: /simmons/i,
    volumes: [
      { volume: 1, patterns: [/^hyperion$/i] },
      { volume: 2, patterns: [/ca[ií]da de hyperion|fall of hyperion/i] },
      { volume: 3, patterns: [/^endymion$/i] },
      { volume: 4, patterns: [/ascenso de endymion|rise of endymion/i] }
    ]
  },
  {
    sagaName: 'The Expanse',
    aliases: [/the expanse|expanse/i],
    authorPattern: /corey/i,
    volumes: [
      { volume: 1, patterns: [/despertar del leviat[aá]n|leviathan wakes/i] },
      { volume: 2, patterns: [/guerra de calib[aá]n|caliban'?s war/i] },
      { volume: 3, patterns: [/puerta de abad[oó]n|abaddon'?s gate/i] },
      { volume: 4, patterns: [/quema de c[ií]bola|cibola burn/i] },
      { volume: 5, patterns: [/juegos de n[eé]mesis|nemesis games/i] },
      { volume: 6, patterns: [/cenizas de babilonia|babylon'?s ashes/i] }
    ]
  },
  {
    sagaName: 'Inspectora Elena Blanco',
    aliases: [/elena blanco|la novia gitana/i],
    authorPattern: /carmen mola/i,
    volumes: [
      { volume: 1, patterns: [/\b(la )?novia gitana\b/i] },
      { volume: 2, patterns: [/\b(la )?red p[uú]rpura\b/i] },
      { volume: 3, patterns: [/\b(la )?nena\b/i] },
      { volume: 4, patterns: [/\blas madres\b/i] },
      { volume: 5, patterns: [/\bel clan\b/i] }
    ]
  },
  {
    sagaName: 'Trilogía del Baztán',
    aliases: [/trilog[ií]a del bazt[aá]n|bazt[aá]n/i],
    authorPattern: /redondo/i,
    volumes: [
      { volume: 1, patterns: [/guardi[aá]n invisible/i] },
      { volume: 2, patterns: [/legado en los huesos/i] },
      { volume: 3, patterns: [/ofrenda a la tormenta/i] }
    ]
  },
  {
    sagaName: 'Las aventuras del capitán Alatriste',
    aliases: [/capit[aá]n alatriste|alatriste/i],
    authorPattern: /p[eé]rez[- ]reverte/i,
    volumes: [
      { volume: 1, patterns: [/^(el )?capit[aá]n alatriste$/i] },
      { volume: 2, patterns: [/limpieza de sangre/i] },
      { volume: 3, patterns: [/el sol de breda/i] },
      { volume: 4, patterns: [/el oro del rey/i] },
      { volume: 5, patterns: [/caballero del jub[oó]n amarillo/i] },
      { volume: 6, patterns: [/corsarios de levante/i] },
      { volume: 7, patterns: [/puente de los asesinos/i] }
    ]
  },
  {
    sagaName: 'Falcó',
    aliases: [/serie falc[oó]|trilog[ií]a falc[oó]/i],
    authorPattern: /p[eé]rez[- ]reverte/i,
    volumes: [
      { volume: 1, patterns: [/^falc[oó]$/i] },
      { volume: 2, patterns: [/^eva$/i] },
      { volume: 3, patterns: [/^sabotaje$/i] }
    ]
  }
];

/**
 * Limpia y valida un candidato a nombre de saga, descartando colecciones editoriales
 * (Andanzas, Booket, Debolsillo, ePubLibre...), nombres de editoriales y títulos redundantes.
 */
export function sanitizeSagaCandidate(
  rawSaga?: string | null,
  options?: {
    bookTitle?: string;
    author?: string;
    publisher?: string;
    volume?: number | null;
  }
): string {
  if (!rawSaga) return '';
  let clean = rawSaga
    .replace(/^[«"“'[(]+|[»"”'\])]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return '';

  // Eliminar traducciones entre corchetes redundantes como "Nacidos de la Bruma [Mistborn]"
  clean = clean.replace(/\s*\[[^\]]+\]\s*$/g, '').trim();

  // Eliminar sufijos de volumen si quedaron pegados al nombre de la saga
  clean = clean
    .replace(/(?:,\s*|\s+-\s+|\s+)(?:vol(?:umen|\.)?|libro|book|parte|part|tomo|#)\s*\d+(?:\.\d+)?$/i, '')
    .replace(/\s+#?\d+(?:\.\d+)?$/, '')
    .replace(/[,:;-]+$/, '')
    .trim();

  // Limpiar prefijos genéricos redundantes ("Saga El Archivo..." -> "El Archivo...", "Serie ...")
  // pero conservar "Trilogía de...", "Crónicas de...", "Ciclo de...", "Saga de Geralt..."
  const prefixStrip = clean.match(/^(?:saga|serie|colecci[oó]n)\s+(?!de\s+geralt\b)(.+)$/i);
  if (prefixStrip && prefixStrip[1].trim().length >= 3) {
    clean = prefixStrip[1].trim();
  }

  if (clean.length < 2 || clean.length > 85) return '';
  if (/^\d+$/.test(clean) || /^[ivxlcdm]+$/i.test(clean)) return '';

  const norm = normalizeText(clean);
  if (!norm || EDITORIAL_IMPRINTS_SET.has(norm)) return '';

  // Descartar si empieza por palabras típicas de colección editorial no-saga
  if (
    /^(?:coleccion|biblioteca|narrativa|clasicos|autores|letras|ediciones|editorial|premio|obras completas|gran angular|barco de vapor)\b/.test(
      norm
    )
  ) {
    return '';
  }

  // Verificar si coincide con una saga literaria conocida para canonizar su nombre
  for (const known of KNOWN_LITERARY_SAGAS) {
    if (
      normalizeText(known.sagaName) === norm ||
      known.aliases.some((re) => re.test(clean))
    ) {
      return known.sagaName;
    }
  }

  // Descartar si coincide con la editorial o autor del libro
  if (options?.publisher) {
    const normPub = normalizeText(options.publisher);
    if (normPub && (norm === normPub || (norm.length >= 4 && normPub.includes(norm)))) {
      return '';
    }
  }
  if (options?.author) {
    const normAuth = normalizeText(options.author);
    if (normAuth && (norm === normAuth || norm.includes(normAuth))) {
      return '';
    }
  }

  // Descartar si el nombre de la saga es idéntico al título del libro (o contenido en él sin volumen > 1)
  if (options?.bookTitle) {
    const baseBookTitle = options.bookTitle.split(/[:(]/)[0].trim();
    const normFullTitle = normalizeText(options.bookTitle);
    const normBaseTitle = normalizeText(baseBookTitle);
    const vol = options.volume ?? null;

    if (norm === normFullTitle || norm === normBaseTitle) {
      return '';
    }
    if (
      (normFullTitle.startsWith(norm) || norm.startsWith(normBaseTitle)) &&
      (vol === null || vol <= 1)
    ) {
      return '';
    }
  }

  return clean;
}

/**
 * Resuelve saga y número de volumen usando el diccionario curado de sagas literarias conocidas.
 */
export function resolveKnownSagaAndVolume(input: {
  title: string;
  author?: string;
  rawSaga?: string;
  rawVolume?: number | null;
  synopsis?: string;
}): { sagaNombre: string; volumen: number | null } | null {
  const title = (input.title || '').trim();
  const author = (input.author || '').trim();
  const rawSaga = (input.rawSaga || '').trim();

  for (const saga of KNOWN_LITERARY_SAGAS) {
    const authorMatches = !saga.authorPattern || !author || saga.authorPattern.test(author);

    // 1. Coincidencia directa por título de volumen conocido
    if (authorMatches) {
      for (const volDef of saga.volumes) {
        if (volDef.patterns.some((re) => re.test(title))) {
          return {
            sagaNombre: saga.sagaName,
            volumen: input.rawVolume ?? volDef.volume
          };
        }
      }
    }

    // 2. Coincidencia por alias de saga en rawSaga o en el título completo
    const sagaAliasMatch =
      (rawSaga &&
        (normalizeText(rawSaga) === normalizeText(saga.sagaName) ||
          saga.aliases.some((re) => re.test(rawSaga)))) ||
      (authorMatches && saga.aliases.some((re) => re.test(title)));

    if (sagaAliasMatch) {
      for (const volDef of saga.volumes) {
        if (volDef.patterns.some((re) => re.test(title))) {
          return {
            sagaNombre: saga.sagaName,
            volumen: input.rawVolume ?? volDef.volume
          };
        }
      }
      return {
        sagaNombre: saga.sagaName,
        volumen: input.rawVolume ?? null
      };
    }
  }

  return null;
}

const ORDINAL_SPANISH_TO_VOL: Record<string, number> = {
  primer: 1,
  primera: 1,
  primero: 1,
  inicia: 1,
  abre: 1,
  segunda: 2,
  segundo: 2,
  tercer: 3,
  tercera: 3,
  tercero: 3,
  cuarta: 4,
  cuarto: 4,
  quinta: 5,
  quinto: 5,
  sexta: 6,
  sexto: 6,
  septima: 7,
  septimo: 7,
  'séptima': 7,
  'séptimo': 7
};

/**
 * Extrae título limpio, saga y volumen desde un título, subtítulo o sinopsis editorial.
 * Soporta títulos con múltiples paréntesis como:
 * "Alas de sangre (Empíreo 1) (Edición española)" -> { cleanTitle: "Alas de sangre", sagaNombre: "Empíreo", volumen: 1 }
 */
export function extractSeriesAndVolumeFromText(
  rawTitle: string,
  options?: {
    subtitle?: string;
    synopsis?: string;
    author?: string;
    publisher?: string;
  }
): {
  cleanTitle: string;
  sagaNombre: string;
  volumen: number | null;
} {
  let workingTitle = (rawTitle || '').trim();
  if (!workingTitle) {
    return { cleanTitle: '', sagaNombre: '', volumen: null };
  }

  // 1. Limpiar etiquetas de edición/formato entre paréntesis o corchetes que no son sagas
  workingTitle = workingTitle
    .replace(
      /\s*[\[(](?:edici[oó]n[^)\]]*|spanish edition|english edition|ebook|epub|formato digital|ilustrad[oa]|bolsillo|tapa dura|tapa blanda|coleccionista|conmemorativ[oa]|z-lib[^)\]]*|z-library|annas-archive[^)\]]*)[\])]/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  let detectedSaga = '';
  let detectedVolume: number | null = null;

  // 2. Buscar patrones entre corchetes o paréntesis con número de volumen explícito:
  // Ej: "(El Archivo de las Tormentas 1)", "(Nacidos de la Bruma, #1)", "[Saga - Libro 2]", "(Saga Vol. III)"
  const groupRegex = /([\[(])([^\])]+?)([\])])/;
  const allGroups = Array.from(workingTitle.matchAll(/([\[(])([^\])]+?)([\])])/g));

  for (let i = allGroups.length - 1; i >= 0; i--) {
    const fullGroup = allGroups[i][0];
    const inside = allGroups[i][2].trim();

    const numberedSeriesMatch = inside.match(
      /^(.+?)(?:,\s*|\s+-\s+|\s+)(?:#|n\.?º?\s*|vol(?:umen|\.)?\s*|libro\s*|book\s*|parte\s*|part\s*|tomo\s*)?(\d+(?:\.\d+)?|[ivxlcdm]+)$/i
    );

    if (numberedSeriesMatch) {
      const candidateName = numberedSeriesMatch[1].trim().replace(/[,:;-]+$/, '').trim();
      const candidateVol = parseVolumeNumber(numberedSeriesMatch[2]);
      const validSaga = sanitizeSagaCandidate(candidateName, {
        author: options?.author,
        publisher: options?.publisher,
        volume: candidateVol
      });

      if (validSaga && candidateVol !== null) {
        detectedSaga = validSaga;
        detectedVolume = candidateVol;
        workingTitle = workingTitle.replace(fullGroup, '').replace(/\s+/g, ' ').trim();
        break;
      }
    }
  }

  // 3. Si el título empieza o termina con "Saga N: Título" o "Título - Saga N"
  if (!detectedSaga) {
    const colonPrefixMatch = workingTitle.match(
      /^([^:]+?)\s+(?:#|vol(?:umen|\.)?\s*|libro\s*|tomo\s*)?(\d+)\s*[:\-–]\s*(.+)$/i
    );
    if (colonPrefixMatch) {
      const candSaga = sanitizeSagaCandidate(colonPrefixMatch[1], {
        bookTitle: colonPrefixMatch[3],
        author: options?.author,
        publisher: options?.publisher,
        volume: parseVolumeNumber(colonPrefixMatch[2])
      });
      const candVol = parseVolumeNumber(colonPrefixMatch[2]);
      if (candSaga && candVol !== null) {
        detectedSaga = candSaga;
        detectedVolume = candVol;
        workingTitle = colonPrefixMatch[3].trim();
      }
    }
  }

  // Limpiar números de orden sueltos al inicio del título si ya hay saga (ej. "01. El camino de los reyes")
  const leadingNumMatch = workingTitle.match(/^0*(\d{1,2})(?:\s*[.\-–]\s+)(.{3,})$/);
  if (leadingNumMatch && !/^(19\d\d|20\d\d|1984|2001)$/.test(leadingNumMatch[1])) {
    const leadVol = parseVolumeNumber(leadingNumMatch[1]);
    if (leadVol !== null) {
      if (detectedVolume === null) detectedVolume = leadVol;
      workingTitle = leadingNumMatch[2].trim();
    }
  }

  // 4. Analizar el subtítulo / edición si aún no tenemos saga (ej. "El Archivo de las Tormentas 1" o "Crónica del Asesino de Reyes I")
  if (!detectedSaga && options?.subtitle) {
    const sub = options.subtitle.trim();
    const subMatch = sub.match(
      /^(.+?)(?:,\s*|\s+-\s+|\s+)(?:#|vol(?:umen|\.)?\s*|libro\s*|book\s*|parte\s*|tomo\s*)?(\d+|[ivxlcdm]+)$/i
    );
    if (subMatch) {
      const candVol = parseVolumeNumber(subMatch[2]);
      const candSaga = sanitizeSagaCandidate(subMatch[1], {
        bookTitle: workingTitle,
        author: options?.author,
        publisher: options?.publisher,
        volume: candVol
      });
      if (candSaga && candVol !== null) {
        detectedSaga = candSaga;
        detectedVolume = detectedVolume ?? candVol;
      }
    }
  }

  // 5. Analizar las primeras frases de la sinopsis si aún falta la saga
  if (!detectedSaga && options?.synopsis) {
    const intro = options.synopsis.slice(0, 400);
    const synMatch = intro.match(
      /\b(primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa]|s[eé]ptim[oa]|inicia|abre)\s+(?:el\s+|la\s+)?(?:volumen|libro|entrega|parte|novela)?\s*(?:de\s+)?(?:la\s+|el\s+)?(?:saga|trilog[ií]a|serie|tetralog[ií]a|ciclo)\s+[«"“]([^»"”]{3,60})[»"”]/i
    );
    if (synMatch) {
      const ordWord = synMatch[1].toLowerCase();
      const synVol = ORDINAL_SPANISH_TO_VOL[ordWord] ?? null;
      const synSaga = sanitizeSagaCandidate(synMatch[2], {
        bookTitle: workingTitle,
        author: options?.author,
        publisher: options?.publisher,
        volume: synVol
      });
      if (synSaga) {
        detectedSaga = synSaga;
        detectedVolume = detectedVolume ?? synVol;
      }
    }
  }

  // 6. Consultar el diccionario de sagas literarias conocidas
  const known = resolveKnownSagaAndVolume({
    title: workingTitle,
    author: options?.author,
    rawSaga: detectedSaga,
    rawVolume: detectedVolume,
    synopsis: options?.synopsis
  });

  if (known) {
    detectedSaga = known.sagaNombre;
    detectedVolume = known.volumen ?? detectedVolume;
  } else if (detectedSaga) {
    detectedSaga = sanitizeSagaCandidate(detectedSaga, {
      bookTitle: workingTitle,
      author: options?.author,
      publisher: options?.publisher,
      volume: detectedVolume
    });
    if (!detectedSaga) {
      detectedVolume = null;
    }
  }

  return {
    cleanTitle: workingTitle || rawTitle.trim(),
    sagaNombre: detectedSaga,
    volumen: detectedSaga ? detectedVolume : null
  };
}

async function searchOpenLibrary(
  query: string,
  isbnQuery: string | null,
  signal?: AbortSignal
): Promise<BibliographicCandidate[]> {
  const params = new URLSearchParams();
  if (isbnQuery) {
    params.set('isbn', isbnQuery);
  } else {
    params.set('q', query);
  }
  params.set(
    'fields',
    'key,title,author_name,first_publish_year,publish_year,number_of_pages_median,isbn,publisher,language,subject,cover_i,edition_count'
  );
  params.set('limit', '10');

  const url = 'https://openlibrary.org/search.json?' + params.toString();
  const response = await fetchWithTimeout(url, { signal }, 4000);
  if (!response.ok) return [];

  const data = (await response.json()) as { docs?: OpenLibraryDoc[] };
  if (!Array.isArray(data.docs)) return [];

  return data.docs
    .filter((doc) => Boolean(doc.title))
    .map((doc, idx): BibliographicCandidate => {
      const isbns = Array.isArray(doc.isbn) ? doc.isbn : [];
      const matchedIsbn =
        (isbnQuery && isbns.find((i) => i.replace(/[^0-9X]/gi, '') === isbnQuery)) ||
        isbns.find((i) => i.startsWith('97884')) ||
        isbns.find((i) => i.length === 13) ||
        isbns[0] ||
        '';

      const idCover = buildOpenLibraryIdCover(doc.cover_i);
      const isbnCover = matchedIsbn && isbnQuery ? buildOpenLibraryIsbnCover(matchedIsbn) : '';
      // Priorizar siempre cover_i (imagen verificada en Open Library) frente a un ISBN aleatorio que suele dar 404 o escaneo de archivo
      const primaryCover = idCover || isbnCover;
      const fallbackCover = idCover && isbnCover ? isbnCover : '';

      const rawTitle = (doc.title || '').trim();
      const authorStr = Array.isArray(doc.author_name) ? doc.author_name.join(', ') : '';
      const publisherStr = Array.isArray(doc.publisher) && doc.publisher[0] ? doc.publisher[0] : '';

      const languages = Array.isArray(doc.language) ? doc.language : [];
      const primaryLang = languages[0] || '';
      const isTitleSpanish =
        primaryLang === 'spa' ||
        (languages.includes('spa') &&
          !/\b(the|of|and|with|for|from|edition|volume|book|chronicles|tales)\b/i.test(rawTitle));

      const rawCategories = Array.isArray(doc.subject) ? doc.subject.slice(0, 15) : [];
      const inferred = inferCatalogFromCategories(rawCategories);

      // Detectar serie desde subjects de Open Library (ej. "series:The_Stormlight_Archive")
      let olSeries = '';
      for (const subj of rawCategories) {
        const m = subj.match(/^series:\s*(.+)$/i);
        if (m) {
          olSeries = m[1].replace(/_/g, ' ').trim();
          break;
        }
      }

      const seriesExtracted = extractSeriesAndVolumeFromText(rawTitle, {
        subtitle: olSeries,
        author: authorStr,
        publisher: publisherStr
      });

      return {
        id: 'ol-' + String(doc.key || idx) + '-' + matchedIsbn,
        source: 'openlibrary',
        nombre: seriesExtracted.cleanTitle || rawTitle,
        autor: authorStr,
        fechaPublicacion:
          parseYear(doc.first_publish_year) ||
          (Array.isArray(doc.publish_year) ? parseYear(doc.publish_year[0]) : null),
        paginas:
          typeof doc.number_of_pages_median === 'number' && doc.number_of_pages_median > 0
            ? doc.number_of_pages_median
            : null,
        isbn: matchedIsbn,
        editorial: publisherStr,
        idioma: isTitleSpanish ? 'Español' : normalizeLanguageCode(primaryLang),
        edicion: '',
        sinopsis: '',
        portadaUrl: primaryCover,
        portadaFallbackUrl: fallbackCover,
        rawCategories,
        suggestedGenre: inferred.genre,
        suggestedSubgenres: inferred.subgenres,
        suggestedSaga: seriesExtracted.sagaNombre || undefined,
        suggestedVolume: seriesExtracted.volumen
      };
    });
}

interface AppleBooksSearchItem {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  description?: string;
  releaseDate?: string;
  genres?: string[];
  artworkUrl100?: string;
}

async function searchAppleBooks(
  query: string,
  isbnQuery: string | null,
  signal?: AbortSignal
): Promise<BibliographicCandidate[]> {
  const term = isbnQuery || query;
  if (!term.trim()) return [];

  const params = new URLSearchParams({
    term,
    media: 'ebook',
    entity: 'ebook',
    country: 'es',
    limit: '10'
  });

  const url = 'https://itunes.apple.com/search?' + params.toString();
  const response = await fetchWithTimeout(url, { signal }, 3800);
  if (!response.ok) return [];

  const data = (await response.json()) as { results?: AppleBooksSearchItem[] };
  if (!Array.isArray(data.results)) return [];

  return data.results
    .filter((item) => Boolean(item.trackName))
    .map((item, idx): BibliographicCandidate => {
      const rawTitle = (item.trackName || '').trim();
      const authorStr = (item.artistName || '').trim();
      const rawDesc = (item.description || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&#xa0;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const coverUrl = normalizeCoverUrl(item.artworkUrl100 || '');
      const isbnFromArt = (item.artworkUrl100 || '').match(/\b(97[89]\d{10})\b/);
      const isbn = isbnQuery || (isbnFromArt ? isbnFromArt[1] : '');

      const seriesExtracted = extractSeriesAndVolumeFromText(rawTitle, {
        synopsis: rawDesc,
        author: authorStr
      });

      const rawCategories = Array.isArray(item.genres)
        ? item.genres.filter((g) => g.toLowerCase() !== 'libros' && g.toLowerCase() !== 'books')
        : [];
      const inferred = inferCatalogFromCategories([
        ...rawCategories,
        seriesExtracted.cleanTitle,
        rawDesc
      ]);

      return {
        id: 'ab-' + String(item.trackId || idx) + '-' + isbn,
        source: 'applebooks',
        nombre: seriesExtracted.cleanTitle || rawTitle,
        autor: authorStr,
        fechaPublicacion: parseYear(item.releaseDate),
        paginas: null,
        isbn,
        editorial: '',
        idioma: 'Español',
        edicion: '',
        sinopsis: rawDesc,
        portadaUrl: coverUrl,
        portadaFallbackUrl: '',
        rawCategories,
        suggestedGenre: inferred.genre,
        suggestedSubgenres: inferred.subgenres,
        suggestedSaga: seriesExtracted.sagaNombre || undefined,
        suggestedVolume: seriesExtracted.volumen
      };
    });
}

interface GoogleBooksItem {
  id?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
    imageLinks?: {
      extraLarge?: string;
      large?: string;
      medium?: string;
      small?: string;
      thumbnail?: string;
      smallThumbnail?: string;
    };
  };
}

async function searchGoogleBooks(
  query: string,
  isbnQuery: string | null,
  signal?: AbortSignal
): Promise<BibliographicCandidate[]> {
  const qParam = isbnQuery ? 'isbn:' + isbnQuery : query;
  const params = new URLSearchParams({
    q: qParam,
    maxResults: '12',
    printType: 'books'
  });

  const url = 'https://www.googleapis.com/books/v1/volumes?' + params.toString();
  const response = await fetchWithTimeout(url, { signal }, 3500);
  if (!response.ok) return [];

  const data = (await response.json()) as { items?: GoogleBooksItem[] };
  if (!Array.isArray(data.items)) return [];

  return data.items
    .filter((item) => Boolean(item.volumeInfo?.title))
    .map((item, idx): BibliographicCandidate => {
      const info = item.volumeInfo!;
      const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
      const isbn13 = identifiers.find((id) => id.type === 'ISBN_13')?.identifier;
      const isbn10 = identifiers.find((id) => id.type === 'ISBN_10')?.identifier;
      const isbn = isbn13 || isbn10 || '';

      const links = info.imageLinks || {};
      const googleCover = normalizeCoverUrl(
        links.extraLarge ||
          links.large ||
          links.medium ||
          links.thumbnail ||
          links.smallThumbnail ||
          ''
      );

      const rawTitle = (info.title || '').trim();
      const authorStr = Array.isArray(info.authors) ? info.authors.join(', ') : '';
      const publisherStr = info.publisher ? info.publisher.trim() : '';
      const cleanDesc = info.description ? info.description.replace(/<[^>]+>/g, '').trim() : '';

      const seriesExtracted = extractSeriesAndVolumeFromText(rawTitle, {
        subtitle: info.subtitle,
        synopsis: cleanDesc,
        author: authorStr,
        publisher: publisherStr
      });

      const rawCategories = Array.isArray(info.categories) ? info.categories : [];
      const inferred = inferCatalogFromCategories([
        ...rawCategories,
        seriesExtracted.cleanTitle,
        cleanDesc
      ]);

      return {
        id: 'gb-' + String(item.id || idx) + '-' + isbn,
        source: 'googlebooks',
        nombre: seriesExtracted.cleanTitle || rawTitle,
        autor: authorStr,
        fechaPublicacion: parseYear(info.publishedDate),
        paginas: typeof info.pageCount === 'number' && info.pageCount > 0 ? info.pageCount : null,
        isbn,
        editorial: publisherStr,
        idioma: normalizeLanguageCode(info.language),
        edicion: info.subtitle ? info.subtitle.trim() : '',
        sinopsis: cleanDesc,
        portadaUrl: googleCover,
        portadaFallbackUrl: '',
        rawCategories,
        suggestedGenre: inferred.genre,
        suggestedSubgenres: inferred.subgenres,
        suggestedSaga: seriesExtracted.sagaNombre || undefined,
        suggestedVolume: seriesExtracted.volumen
      };
    });
}

function mergeAndRankCandidates(
  olResults: BibliographicCandidate[],
  gbResults: BibliographicCandidate[],
  rawQuery: string,
  isbnQuery: string | null,
  abResults: BibliographicCandidate[] = []
): BibliographicCandidate[] {
  const combined: BibliographicCandidate[] = [];
  const byKey = new Map<string, BibliographicCandidate>();

  const makeDedupeKey = (c: BibliographicCandidate) => {
    const cleanIsbn = c.isbn.replace(/[^0-9X]/gi, '');
    if (cleanIsbn && isbnQuery && cleanIsbn === isbnQuery) return 'isbn:' + cleanIsbn;
    return 'ta:' + normalizeText(c.nombre) + '::' + normalizeText(c.autor);
  };

  // Procesar primero Apple Books y Google Books para que sus portadas comerciales limpias
  // y títulos en español tengan prioridad sobre los registros de archivo de Open Library
  for (const candidate of [...abResults, ...gbResults, ...olResults]) {
    const key = makeDedupeKey(candidate);
    const existing = byKey.get(key);

    if (!existing) {
      byKey.set(key, { ...candidate });
      combined.push(byKey.get(key)!);
    } else {
      if (!existing.portadaUrl && candidate.portadaUrl) {
        existing.portadaUrl = candidate.portadaUrl;
      } else if (
        existing.portadaUrl &&
        candidate.portadaUrl &&
        existing.source === 'openlibrary' &&
        (candidate.source === 'applebooks' || candidate.source === 'googlebooks')
      ) {
        existing.portadaFallbackUrl = existing.portadaUrl;
        existing.portadaUrl = candidate.portadaUrl;
        existing.source = candidate.source;
      } else if (
        existing.portadaUrl &&
        candidate.portadaUrl &&
        candidate.portadaUrl !== existing.portadaUrl &&
        !existing.portadaFallbackUrl
      ) {
        existing.portadaFallbackUrl = candidate.portadaUrl;
      }

      if (!existing.paginas && candidate.paginas) existing.paginas = candidate.paginas;
      if (!existing.fechaPublicacion && candidate.fechaPublicacion) {
        existing.fechaPublicacion = candidate.fechaPublicacion;
      }
      if (!existing.editorial && candidate.editorial) existing.editorial = candidate.editorial;
      if (!existing.sinopsis && candidate.sinopsis) existing.sinopsis = candidate.sinopsis;
      if (!existing.isbn && candidate.isbn) existing.isbn = candidate.isbn;
      if (existing.idioma !== 'Español' && candidate.idioma === 'Español') {
        existing.idioma = 'Español';
        existing.nombre = candidate.nombre || existing.nombre;
      }
      if (!existing.suggestedGenre && candidate.suggestedGenre) {
        existing.suggestedGenre = candidate.suggestedGenre;
      }
      if (existing.suggestedSubgenres.length === 0 && candidate.suggestedSubgenres.length > 0) {
        existing.suggestedSubgenres = candidate.suggestedSubgenres;
      }
      if (!existing.suggestedSaga && candidate.suggestedSaga) {
        existing.suggestedSaga = candidate.suggestedSaga;
      }
      if (existing.suggestedVolume == null && candidate.suggestedVolume != null) {
        existing.suggestedVolume = candidate.suggestedVolume;
      }
    }
  }

  const queryNorm = normalizeText(rawQuery);

  return combined.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (isbnQuery) {
      if (a.isbn.replace(/[^0-9X]/gi, '') === isbnQuery) scoreA += 100;
      if (b.isbn.replace(/[^0-9X]/gi, '') === isbnQuery) scoreB += 100;
    }

    if (a.idioma === 'Español') scoreA += 25;
    if (b.idioma === 'Español') scoreB += 25;

    if (a.portadaUrl) {
      scoreA += 20;
      if (a.source === 'applebooks') scoreA += 18;
      else if (a.source === 'googlebooks') scoreA += 14;
    }
    if (b.portadaUrl) {
      scoreB += 20;
      if (b.source === 'applebooks') scoreB += 18;
      else if (b.source === 'googlebooks') scoreB += 14;
    }

    if (a.sinopsis) scoreA += 10;
    if (b.sinopsis) scoreB += 10;

    if (a.autor) scoreA += 10;
    if (b.autor) scoreB += 10;

    if (a.paginas) scoreA += 6;
    if (b.paginas) scoreB += 6;

    const normTitleA = normalizeText(a.nombre);
    const normTitleB = normalizeText(b.nombre);

    if (queryNorm.startsWith(normTitleA) || normTitleA.startsWith(queryNorm)) scoreA += 14;
    if (queryNorm.startsWith(normTitleB) || normTitleB.startsWith(queryNorm)) scoreB += 14;

    // Penalizar guías de estudio, resúmenes o cajas recopilatorias cuando se busca un libro individual
    if (/\b(summary|study guide|sparknotes|pack|estuche|boxed set)\b/i.test(a.nombre)) scoreA -= 35;
    if (/\b(summary|study guide|sparknotes|pack|estuche|boxed set)\b/i.test(b.nombre)) scoreB -= 35;

    return scoreB - scoreA;
  });
}

export const KNOWN_SAGA_PATTERNS: Array<{
  key: string;
  patterns: RegExp[];
}> = [
  {
    key: 'harry_potter_1',
    patterns: [
      /harry potter.*(piedra filosofal|sorcerer|philosopher)/i,
      /^(harry potter y la piedra filosofal|harry potter and the sorcerer's stone|harry potter and the philosopher's stone)/i
    ]
  },
  {
    key: 'harry_potter_2',
    patterns: [
      /harry potter.*(camara secreta|c[aá]mara secreta|chamber of secrets)/i
    ]
  },
  {
    key: 'harry_potter_3',
    patterns: [
      /harry potter.*(prisionero de azkaban|prisoner of azkaban)/i
    ]
  },
  {
    key: 'harry_potter_4',
    patterns: [
      /harry potter.*(caliz de fuego|c[aá]liz de fuego|goblet of fire)/i
    ]
  },
  {
    key: 'harry_potter_5',
    patterns: [
      /harry potter.*(orden del fenix|orden del f[eé]nix|order of the phoenix)/i
    ]
  },
  {
    key: 'harry_potter_6',
    patterns: [
      /harry potter.*(misterio del principe|misterio del pr[ií]ncipe|half blood prince|half-blood prince)/i
    ]
  },
  {
    key: 'harry_potter_7',
    patterns: [
      /harry potter.*(reliquias de la muerte|deathly hallows)/i
    ]
  },
  {
    key: 'harry_potter_general',
    patterns: [
      /harry potter/i
    ]
  },
  {
    key: 'lotr_1',
    patterns: [
      /(senor de los anillos|se[nñ]or de los anillos|lord of the rings).*(comunidad del anillo|fellowship of the ring)/i,
      /comunidad del anillo/i,
      /fellowship of the ring/i
    ]
  },
  {
    key: 'lotr_2',
    patterns: [
      /(senor de los anillos|se[nñ]or de los anillos|lord of the rings).*(dos torres|two towers)/i,
      /las dos torres/i,
      /the two towers/i
    ]
  },
  {
    key: 'lotr_3',
    patterns: [
      /(senor de los anillos|se[nñ]or de los anillos|lord of the rings).*(retorno del rey|return of the king)/i,
      /el retorno del rey/i,
      /the return of the king/i
    ]
  },
  {
    key: 'hobbit',
    patterns: [/^(el )?hobbit/i, /^the hobbit/i]
  },
  {
    key: 'dune',
    patterns: [/^(duna|dune)(\b|:|\()/i]
  },
  {
    key: 'game_of_thrones_1',
    patterns: [
      /(cancion de hielo y fuego|song of ice and fire).*(juego de tronos|game of thrones)/i,
      /^(a )?game of thrones$/i,
      /^(un )?juego de tronos$/i
    ]
  },
  {
    key: 'percy_jackson_1',
    patterns: [
      /percy jackson.*(ladron del rayo|ladr[oó]n del rayo|lightning thief)/i
    ]
  },
  {
    key: 'hunger_games_1',
    patterns: [
      /(los )?juegos del hambre/i,
      /(the )?hunger games/i
    ]
  },
  {
    key: 'narnia_1',
    patterns: [
      /narnia.*(leon.*bruja.*armario|le[oó]n.*bruja.*armario|lion.*witch.*wardrobe)/i
    ]
  }
];

export function isBookAlreadyInLibrary(
  candidate: { nombre: string; autor?: string; isbn?: string; id?: string },
  userBooks: Book[]
): boolean {
  if (!userBooks || userBooks.length === 0) return false;

  const candCleanIsbn = candidate.isbn ? candidate.isbn.replace(/[^0-9X]/gi, '').toUpperCase() : '';
  const candNormTitle = normalizeText(candidate.nombre || '');
  const candNormAuthor = normalizeText(candidate.autor || '');

  // 1. Coincidencia por ISBN
  if (candCleanIsbn) {
    for (const b of userBooks) {
      if (b.isbn) {
        const bookCleanIsbn = b.isbn.replace(/[^0-9X]/gi, '').toUpperCase();
        if (bookCleanIsbn && bookCleanIsbn === candCleanIsbn) return true;
      }
    }
  }

  // 2. Coincidencia por título normalizado exacto
  for (const b of userBooks) {
    const bookNormTitle = normalizeText(b.nombre || '');
    if (bookNormTitle && bookNormTitle === candNormTitle) return true;
  }

  // 3. Patrones de libros y sagas bilingües conocidas
  for (const saga of KNOWN_SAGA_PATTERNS) {
    const candMatches = saga.patterns.some((re) => re.test(candidate.nombre));
    if (candMatches) {
      const userHasMatch = userBooks.some((b) => saga.patterns.some((re) => re.test(b.nombre)));
      if (userHasMatch) {
        if (saga.key !== 'harry_potter_general') return true;
        // Si el usuario ya tiene 2 o más libros de la saga, descartar tomos de la misma
        const hpCount = userBooks.filter((b) => /harry potter/i.test(b.nombre)).length;
        if (hpCount >= 2) return true;
      }
    }
  }

  // 4. Mismo autor + coincidencia de palabras clave distintivas
  const stopWords = new Set([
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'y', 'a',
    'the', 'an', 'of', 'in', 'and', 'to', 'with', 'by', 'for', 'on', 'edition', 'edicion',
    'libro', 'book', 'vol', 'volumen', 'volume', 'tomo', 'part', 'parte', 'serie', 'series'
  ]);

  const candTokens = candNormTitle
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  for (const b of userBooks) {
    const bookNormAuthor = normalizeText(b.autor || '');
    const isSameAuthor =
      candNormAuthor &&
      bookNormAuthor &&
      (candNormAuthor.includes(bookNormAuthor) || bookNormAuthor.includes(candNormAuthor));

    if (isSameAuthor) {
      const bookNormTitle = normalizeText(b.nombre || '');
      if (
        candNormTitle.includes(bookNormTitle) ||
        bookNormTitle.includes(candNormTitle)
      ) {
        return true;
      }

      const bookTokens = new Set(
        bookNormTitle
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w))
      );

      const commonTokens = candTokens.filter((t) => bookTokens.has(t));
      if (commonTokens.length >= 2) return true;
      if (candTokens.length === 1 && bookTokens.has(candTokens[0])) return true;
    }
  }

  return false;
}

const DISMISSED_STORAGE_KEY = 'nexus_dismissed_recommendations';

export const dismissedRecommendationsService = {
  getDismissedIds(): Set<string> {
    try {
      if (typeof window === 'undefined') return new Set();
      const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (!stored) return new Set();
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
      return new Set();
    }
  },

  dismiss(id: string): void {
    try {
      if (typeof window === 'undefined') return;
      const current = this.getDismissedIds();
      current.add(id);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...current]));
    } catch {
      // Ignored
    }
  },

  undismiss(id: string): void {
    try {
      if (typeof window === 'undefined') return;
      const current = this.getDismissedIds();
      current.delete(id);
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify([...current]));
    } catch {
      // Ignored
    }
  }
};

export const AUTHOR_AFFINITY_MAP: Record<
  string,
  {
    similarAuthors: string[];
    suggestedQueries: string[];
    genre: Genre;
  }
> = {
  'j k rowling': {
    similarAuthors: ['Philip Pullman', 'Neil Gaiman', 'Rick Riordan', 'Jonathan Stroud', 'C.S. Lewis', 'Patrick Rothfuss'],
    suggestedQueries: ['La materia oscura', 'El libro del cementerio', 'El ladrón del rayo', 'El amuleto de Samarcanda', 'El león la bruja y el armario'],
    genre: '✨ Fantasía'
  },
  'jk rowling': {
    similarAuthors: ['Philip Pullman', 'Neil Gaiman', 'Rick Riordan', 'Jonathan Stroud', 'C.S. Lewis', 'Patrick Rothfuss'],
    suggestedQueries: ['La materia oscura', 'El libro del cementerio', 'El ladrón del rayo', 'El amuleto de Samarcanda', 'El león la bruja y el armario'],
    genre: '✨ Fantasía'
  },
  'brandon sanderson': {
    similarAuthors: ['Patrick Rothfuss', 'Robert Jordan', 'Joe Abercrombie', 'Steven Erikson', 'Brian McClellan', 'Robin Hobb'],
    suggestedQueries: ['El nombre del viento', 'El ojo del mundo', 'La voz de las espadas', 'Los jardines de la luna', 'Aprendiz de asesino'],
    genre: '✨ Fantasía'
  },
  'patrick rothfuss': {
    similarAuthors: ['Brandon Sanderson', 'Scott Lynch', 'Robin Hobb', 'Joe Abercrombie', 'Ursula K. Le Guin'],
    suggestedQueries: ['El camino de los reyes', 'Las mentiras de Locke Lamora', 'El temor de un hombre sabio', 'Un mago de Terramar'],
    genre: '✨ Fantasía'
  },
  'stephen king': {
    similarAuthors: ['Joe Hill', 'Shirley Jackson', 'Dan Simmons', 'Clive Barker', 'Mariana Enriquez', 'H.P. Lovecraft'],
    suggestedQueries: ['Fantasmas del pasado', 'La maldición de Hill House', 'El terror', 'Nuestra parte de noche', 'Libros de sangre'],
    genre: '🔪 Terror & Suspense'
  },
  'isaac asimov': {
    similarAuthors: ['Arthur C. Clarke', 'Philip K. Dick', 'Frank Herbert', 'Ray Bradbury', 'Stanislaw Lem', 'Liu Cixin'],
    suggestedQueries: ['2001 una odisea espacial', 'Sueñan los androides con ovejas electricas', 'Dune', 'Crónicas marcianas', 'Solaris', 'El problema de los tres cuerpos'],
    genre: '🔭 Ciencia Ficción & Distopía'
  },
  'frank herbert': {
    similarAuthors: ['Isaac Asimov', 'Dan Simmons', 'Arthur C. Clarke', 'Ursula K. Le Guin', 'Alastair Reynolds'],
    suggestedQueries: ['Fundación', 'Hyperion', 'La mano izquierda de la oscuridad', 'Cántico por Leibowitz'],
    genre: '🔭 Ciencia Ficción & Distopía'
  },
  'gabriel garcia marquez': {
    similarAuthors: ['Isabel Allende', 'Jorge Luis Borges', 'Julio Cortázar', 'Juan Rulfo', 'Laura Esquivel', 'Mario Vargas Llosa'],
    suggestedQueries: ['La casa de los espíritus', 'Ficciones', 'Rayuela', 'Pedro Páramo', 'Como agua para chocolate', 'La ciudad y los perros'],
    genre: '🏛️ Clásicos'
  },
  'j r r tolkien': {
    similarAuthors: ['George R.R. Martin', 'Ursula K. Le Guin', 'Tad Williams', 'Guy Gavriel Kay', 'C.S. Lewis'],
    suggestedQueries: ['Juego de tronos', 'Un mago de Terramar', 'Añoranzas y pesares', 'Tigana'],
    genre: '✨ Fantasía'
  },
  'jrr tolkien': {
    similarAuthors: ['George R.R. Martin', 'Ursula K. Le Guin', 'Tad Williams', 'Guy Gavriel Kay', 'C.S. Lewis'],
    suggestedQueries: ['Juego de tronos', 'Un mago de Terramar', 'Añoranzas y pesares', 'Tigana'],
    genre: '✨ Fantasía'
  },
  'george r r martin': {
    similarAuthors: ['Joe Abercrombie', 'Bernard Cornwell', 'Robin Hobb', 'Scott Lynch', 'Patrick Rothfuss'],
    suggestedQueries: ['La voz de las espadas', 'El último reino', 'El asesino real', 'Las mentiras de Locke Lamora'],
    genre: '✨ Fantasía'
  },
  'agatha christie': {
    similarAuthors: ['Arthur Conan Doyle', 'John Dickson Carr', 'Georges Simenon', 'Dorothy L. Sayers', 'Gillian Flynn'],
    suggestedQueries: ['Estudio en escarlata', 'El sabueso de los Baskerville', 'El hombre del revés', 'Perdida'],
    genre: '🔪 Terror & Suspense'
  },
  'arthur conan doyle': {
    similarAuthors: ['Agatha Christie', 'Edgar Allan Poe', 'G.K. Chesterton', 'Wilkie Collins'],
    suggestedQueries: ['Diez negritos', 'Asesinato en el Orient Express', 'Los crímenes de la calle Morgue', 'La piedra lunar'],
    genre: '🔪 Terror & Suspense'
  },
  'jane austen': {
    similarAuthors: ['Charlotte Brontë', 'Emily Brontë', 'Louisa May Alcott', 'Virginia Woolf', 'Elizabeth Gaskell'],
    suggestedQueries: ['Jane Eyre', 'Cumbres borrascosas', 'Mujercitas', 'Norte y sur', 'Al faro'],
    genre: '❤️ Romance & Drama'
  }
};

export interface RecommendOptions {
  subFilter?: 'mix' | 'authors' | 'classics';
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

export const CURATED_FALLBACK_RECOMMENDATIONS: BibliographicCandidate[] = [
  {
    id: 'curated-pullman',
    source: 'openlibrary',
    nombre: 'La brújula dorada',
    autor: 'Philip Pullman',
    fechaPublicacion: 1995,
    paginas: 399,
    isbn: '9788466662451',
    editorial: 'Ediciones B',
    idioma: 'Español',
    edicion: 'La materia oscura I',
    sinopsis: 'Lyra Belacqua emprende un viaje épico al gélido Norte para salvar a su mejor amigo y desentrañar el misterio del Polvo.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8314115-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🧙 Fantasía Épica'],
    recommendationReason: 'Afín a tu lectura de J.K. Rowling'
  },
  {
    id: 'curated-gaiman',
    source: 'openlibrary',
    nombre: 'El libro del cementerio',
    autor: 'Neil Gaiman',
    fechaPublicacion: 2008,
    paginas: 320,
    isbn: '9788416035045',
    editorial: 'Roca Editorial',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Nadie Owens es un niño normal criado por los fantasmas y habitantes de un antiguo cementerio.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8231856-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🪄 Fantasía Juvenil'],
    recommendationReason: 'Afín a tu lectura de J.K. Rowling'
  },
  {
    id: 'curated-riordan',
    source: 'openlibrary',
    nombre: 'El ladrón del rayo',
    autor: 'Rick Riordan',
    fechaPublicacion: 2005,
    paginas: 288,
    isbn: '9788498386264',
    editorial: 'Salamandra',
    idioma: 'Español',
    edicion: 'Percy Jackson I',
    sinopsis: 'Un joven descubre que su verdadero padre es Poseidón y se ve envuelto en una guerra de dioses en el mundo actual.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/11181163-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🏺 Mitología & Epopeya'],
    recommendationReason: 'Afín a tu lectura de J.K. Rowling'
  },
  {
    id: 'curated-rothfuss',
    source: 'openlibrary',
    nombre: 'El nombre del viento',
    autor: 'Patrick Rothfuss',
    fechaPublicacion: 2007,
    paginas: 872,
    isbn: '9788401352836',
    editorial: 'Plaza & Janés',
    idioma: 'Español',
    edicion: 'Crónica del Asesino de Reyes I',
    sinopsis: 'Kvothe relata su extraordinaria historia: desde sus días en una troupe de artistas hasta convertirse en leyenda viviente.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8235123-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['fantasy'],
    suggestedGenre: '✨ Fantasía',
    suggestedSubgenres: ['🧙 Fantasía Épica'],
    recommendationReason: 'Imprescindible de Fantasía'
  },
  {
    id: 'curated-dune',
    source: 'openlibrary',
    nombre: 'Dune',
    autor: 'Frank Herbert',
    fechaPublicacion: 1965,
    paginas: 704,
    isbn: '9788466353779',
    editorial: 'Debolsillo',
    idioma: 'Español',
    edicion: 'Crónicas de Dune I',
    sinopsis: 'En el inhóspito planeta desértico Arrakis, el joven Paul Atreides debe vengar a su familia y cumplir un destino místico.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/10524458-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['science_fiction'],
    suggestedGenre: '🔭 Ciencia Ficción & Distopía',
    suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
    recommendationReason: 'Obra cumbre de Ciencia Ficción'
  },
  {
    id: 'curated-asimov-fundacion',
    source: 'openlibrary',
    nombre: 'Fundación',
    autor: 'Isaac Asimov',
    fechaPublicacion: 1951,
    paginas: 256,
    isbn: '9788499899534',
    editorial: 'Debolsillo',
    idioma: 'Español',
    edicion: 'Ciclo de la Fundación I',
    sinopsis: 'Hari Seldon prevé la caída del Imperio Galáctico y crea la Fundación para preservar el saber de la humanidad.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['science_fiction'],
    suggestedGenre: '🔭 Ciencia Ficción & Distopía',
    suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
    recommendationReason: 'Obra cumbre de Ciencia Ficción'
  },
  {
    id: 'curated-1984',
    source: 'openlibrary',
    nombre: '1984',
    autor: 'George Orwell',
    fechaPublicacion: 1949,
    paginas: 326,
    isbn: '9788499890944',
    editorial: 'Debolsillo',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Winston Smith vive en una sociedad totalitaria gobernada por el Gran Hermano donde el pensamiento disidente es castigado.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/7222246-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['classic_literature'],
    suggestedGenre: '🏛️ Clásicos',
    suggestedSubgenres: ['🏚️ Post-Apocalíptico'],
    recommendationReason: 'Clásico universal imprescindible'
  },
  {
    id: 'curated-borges',
    source: 'openlibrary',
    nombre: 'Ficciones',
    autor: 'Jorge Luis Borges',
    fechaPublicacion: 1944,
    paginas: 224,
    isbn: '9788420633114',
    editorial: 'Alianza',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Colección de relatos laberínticos sobre espejos, bibliotecas infinitas, enigmas y la naturaleza del tiempo.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8315123-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['classic_literature'],
    suggestedGenre: '🏛️ Clásicos',
    suggestedSubgenres: ['🧙 Fantasía Épica'],
    recommendationReason: 'Joya literaria aclamada'
  },
  {
    id: 'curated-garcia-marquez',
    source: 'openlibrary',
    nombre: 'Cien años de soledad',
    autor: 'Gabriel García Márquez',
    fechaPublicacion: 1967,
    paginas: 471,
    isbn: '9788439720775',
    editorial: 'Random House',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'La saga de la familia Buendía a lo largo de siete generaciones en el mítico pueblo de Macondo.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/11142512-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['classic_literature'],
    suggestedGenre: '🏛️ Clásicos',
    suggestedSubgenres: ['💔 Drama'],
    recommendationReason: 'Obra cumbre de la literatura'
  },
  {
    id: 'curated-hill-house',
    source: 'openlibrary',
    nombre: 'La maldición de Hill House',
    autor: 'Shirley Jackson',
    fechaPublicacion: 1959,
    paginas: 240,
    isbn: '9788494029868',
    editorial: 'Valdemar',
    idioma: 'Español',
    edicion: '',
    sinopsis: 'Cuatro investigadores se alojan en Hill House, una mansión siniestra con un historial de sucesos inexplicables.',
    portadaUrl: 'https://covers.openlibrary.org/b/id/8228190-M.jpg',
    portadaFallbackUrl: '',
    rawCategories: ['horror'],
    suggestedGenre: '🔪 Terror & Suspense',
    suggestedSubgenres: ['👻 Terror Sobrenatural'],
    recommendationReason: 'Joya del terror gótico'
  }
];

export const SUBJECT_KEY_TO_CATEGORY_ID: Record<string, string> = {
  fantasy: 'fantasy',
  science_fiction: 'scifi',
  horror: 'horror',
  adventure: 'action',
  classic_literature: 'classics',
  mystery_and_detective_stories: 'mystery',
  romance: 'romance',
  history: 'history'
};

export const CURATED_CATEGORY_BOOKS: Record<string, BibliographicCandidate[]> = {
  fantasy: [
    {
      id: 'curated-rothfuss',
      source: 'openlibrary',
      nombre: 'El nombre del viento',
      autor: 'Patrick Rothfuss',
      fechaPublicacion: 2007,
      paginas: 872,
      isbn: '9788401352836',
      editorial: 'Plaza & Janés',
      idioma: 'Español',
      edicion: 'Crónica del Asesino de Reyes I',
      sinopsis: 'Kvothe relata su extraordinaria historia: desde sus días en una troupe de artistas hasta convertirse en leyenda viviente.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235123-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Imprescindible de la fantasía moderna'
    },
    {
      id: 'curated-sanderson-kings',
      source: 'openlibrary',
      nombre: 'El camino de los reyes',
      autor: 'Brandon Sanderson',
      fechaPublicacion: 2010,
      paginas: 1200,
      isbn: '9788466657662',
      editorial: 'Nova',
      idioma: 'Español',
      edicion: 'El Archivo de las Tormentas I',
      sinopsis: 'En Roshar, un mundo asolado por tempestades, cuatro personajes enfrentan su destino en una guerra legendaria.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8301726-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Obra maestra de la fantasía épica contemporánea'
    },
    {
      id: 'curated-elantris',
      source: 'openlibrary',
      nombre: 'Elantris',
      autor: 'Brandon Sanderson',
      fechaPublicacion: 2005,
      paginas: 650,
      isbn: '9788466658843',
      editorial: 'Nova',
      idioma: 'Español',
      edicion: 'Edición X Aniversario',
      sinopsis: 'La ciudad de los dioses ha caído en desgracia y sus habitantes son convertidos en leprosos vivientes.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/11130386-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'La aclamada primera novela del Cosmere'
    },
    {
      id: 'curated-pullman',
      source: 'openlibrary',
      nombre: 'Luces del norte',
      autor: 'Philip Pullman',
      fechaPublicacion: 1995,
      paginas: 448,
      isbn: '9788466665049',
      editorial: 'Roca Editorial',
      idioma: 'Español',
      edicion: 'La Materia Oscura I',
      sinopsis: 'Lyra Belacqua emprende un viaje al polo norte para rescatar a niños desaparecidos y descubrir los secretos del Polvo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231991-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🏺 Mitología & Epopeya'],
      recommendationReason: 'Clásico de la fantasía moderna'
    },
    {
      id: 'curated-lewis-narnia',
      source: 'openlibrary',
      nombre: 'El león, la bruja y el armario',
      autor: 'C.S. Lewis',
      fechaPublicacion: 1950,
      paginas: 240,
      isbn: '9788408062783',
      editorial: 'Destino',
      idioma: 'Español',
      edicion: 'Las Crónicas de Narnia II',
      sinopsis: 'Cuatro hermanos descubren un armario mágico que conduce al reino encantado de Narnia bajo el yugo de la Bruja Blanca.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/10526978-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Fantasía universal atemporal'
    },
    {
      id: 'curated-sapkowski-witcher',
      source: 'openlibrary',
      nombre: 'El último deseo',
      autor: 'Andrzej Sapkowski',
      fechaPublicacion: 1993,
      paginas: 288,
      isbn: '9788498890457',
      editorial: 'Alamut',
      idioma: 'Español',
      edicion: 'Saga de Geralt de Rivia I',
      sinopsis: 'Geralt de Rivia es un brujo mutado genéticamente que caza monstruos en un mundo lleno de intrigas y magia.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8367746-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['fantasy'],
      suggestedGenre: '✨ Fantasía',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Comienzo de la célebre saga del Brujo'
    }
  ],
  scifi: [
    {
      id: 'curated-dune',
      source: 'openlibrary',
      nombre: 'Dune',
      autor: 'Frank Herbert',
      fechaPublicacion: 1965,
      paginas: 704,
      isbn: '9788466353779',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: 'Crónicas de Dune I',
      sinopsis: 'En el inhóspito planeta desértico Arrakis, el joven Paul Atreides debe vengar a su familia y cumplir un destino místico.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/10524458-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Obra cumbre de Ciencia Ficción'
    },
    {
      id: 'curated-asimov-fundacion',
      source: 'openlibrary',
      nombre: 'Fundación',
      autor: 'Isaac Asimov',
      fechaPublicacion: 1951,
      paginas: 256,
      isbn: '9788499899534',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: 'Ciclo de la Fundación I',
      sinopsis: 'Hari Seldon prevé la caída del Imperio Galáctico y crea la Fundación para preservar el saber de la humanidad.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8226191-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Obra cumbre de Ciencia Ficción'
    },
    {
      id: 'curated-neuromancer',
      source: 'openlibrary',
      nombre: 'Neuromante',
      autor: 'William Gibson',
      fechaPublicacion: 1984,
      paginas: 320,
      isbn: '9788445076620',
      editorial: 'Minotauro',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Case es un hacker de capa caída en el ciberespacio de Chiba contratado para una última incursión legendaria.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235284-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Piedra angular del movimiento cyberpunk'
    },
    {
      id: 'curated-philip-dick',
      source: 'openlibrary',
      nombre: '¿Sueñan los androides con ovejas eléctricas?',
      autor: 'Philip K. Dick',
      fechaPublicacion: 1968,
      paginas: 288,
      isbn: '9788445002964',
      editorial: 'Minotauro',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Rick Deckard persigue androides rebeldes en una Tierra posnuclear donde la empatía es el único bien preciado.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228741-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'La novela de culto que inspiró Blade Runner'
    },
    {
      id: 'curated-fahrenheit-451',
      source: 'openlibrary',
      nombre: 'Fahrenheit 451',
      autor: 'Ray Bradbury',
      fechaPublicacion: 1953,
      paginas: 192,
      isbn: '9788497593793',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Guy Montag es un bombero cuya misión es quemar libros prohibidos, hasta que una joven le abre los ojos al poder del pensamiento libre.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225261-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['🏚️ Post-Apocalíptico'],
      recommendationReason: 'Distopía fundamental sobre el amor a los libros'
    },
    {
      id: 'curated-bradbury-cronicas',
      source: 'openlibrary',
      nombre: 'Crónicas marcianas',
      autor: 'Ray Bradbury',
      fechaPublicacion: 1950,
      paginas: 272,
      isbn: '9788445076538',
      editorial: 'Minotauro',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Relatos poéticos y melancólicos sobre la colonización humana de Marte y el encuentro con sus civilizaciones nativas.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231855-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['science_fiction'],
      suggestedGenre: '🔭 Ciencia Ficción & Distopía',
      suggestedSubgenres: ['⏳ Viajes en el Tiempo'],
      recommendationReason: 'Lirismo y ciencia ficción inolvidable'
    }
  ],
  horror: [
    {
      id: 'curated-hill-house',
      source: 'openlibrary',
      nombre: 'La maldición de Hill House',
      autor: 'Shirley Jackson',
      fechaPublicacion: 1959,
      paginas: 240,
      isbn: '9788494029868',
      editorial: 'Valdemar',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Cuatro investigadores se alojan en Hill House, una mansión siniestra con un historial de sucesos inexplicables.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228190-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Joya del terror gótico psicológico'
    },
    {
      id: 'curated-dracula',
      source: 'openlibrary',
      nombre: 'Drácula',
      autor: 'Bram Stoker',
      fechaPublicacion: 1897,
      paginas: 576,
      isbn: '9788491050070',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El conde Drácula viaja desde los Cárpatos a Inglaterra, desatando una pesadilla gótica en cartas y diarios.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231853-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'El clásico indiscutible del terror gótico'
    },
    {
      id: 'curated-frankenstein',
      source: 'openlibrary',
      nombre: 'Frankenstein',
      autor: 'Mary Shelley',
      fechaPublicacion: 1818,
      paginas: 288,
      isbn: '9788491050100',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Victor Frankenstein desafía a la naturaleza creando vida a partir de materia inerte, con trágicas consecuencias.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228691-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Cuna de la ciencia ficción y el horror'
    },
    {
      id: 'curated-shining',
      source: 'openlibrary',
      nombre: 'El resplandor',
      autor: 'Stephen King',
      fechaPublicacion: 1977,
      paginas: 656,
      isbn: '9788497593724',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Jack Torrance acepta cuidar el aislado Hotel Overlook durante el crudo invierno junto a su familia.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235212-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Obra cumbre del terror psicológico moderno'
    },
    {
      id: 'curated-enriquez-noche',
      source: 'openlibrary',
      nombre: 'Nuestra parte de noche',
      autor: 'Mariana Enriquez',
      fechaPublicacion: 2019,
      paginas: 672,
      isbn: '9788433998859',
      editorial: 'Anagrama',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Un padre y un hijo atraviesan Argentina en los años de la dictadura, perseguidos por una sociedad secreta que adora la Oscuridad.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/12470198-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Gran revelación del terror en español'
    },
    {
      id: 'curated-lovecraft-montanas',
      source: 'openlibrary',
      nombre: 'En las montañas de la locura',
      autor: 'H.P. Lovecraft',
      fechaPublicacion: 1936,
      paginas: 176,
      isbn: '9788420651231',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Una expedición científica en la Antártida descubre vestigios de una civilización primordial y terrorífica.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231840-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['horror'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['👻 Terror Sobrenatural'],
      recommendationReason: 'Clásico absoluto del terror cósmico'
    }
  ],
  action: [
    {
      id: 'curated-mosqueteros',
      source: 'openlibrary',
      nombre: 'Los tres mosqueteros',
      autor: 'Alexandre Dumas',
      fechaPublicacion: 1844,
      paginas: 736,
      isbn: '9788491050209',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El joven D Artagnan viaja a París para unirse al cuerpo de mosqueteros del rey y vive innumerables duelos y aventuras.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225432-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🗺️ Aventura Histórica'],
      recommendationReason: 'La gran novela clásica de capas y espadas'
    },
    {
      id: 'curated-isla-tesoro',
      source: 'openlibrary',
      nombre: 'La isla del tesoro',
      autor: 'Robert Louis Stevenson',
      fechaPublicacion: 1883,
      paginas: 288,
      isbn: '9788491050186',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Jim Hawkins halla el mapa de un tesoro pirata y zarpa en la Hispaniola junto al intrigante Long John Silver.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228414-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🌊 Aventura Náutica'],
      recommendationReason: 'El canon eterno de las aventuras de piratas'
    },
    {
      id: 'curated-montecristo',
      source: 'openlibrary',
      nombre: 'El conde de Montecristo',
      autor: 'Alexandre Dumas',
      fechaPublicacion: 1844,
      paginas: 1200,
      isbn: '9788491050193',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Edmond Dantès es traicionado y encarcelado injustamente en el Castillo de If, de donde escapará para tramar su venganza.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231920-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🗺️ Aventura Histórica'],
      recommendationReason: 'Una de las mayores historias de intriga y justicia'
    },
    {
      id: 'curated-verne-20000',
      source: 'openlibrary',
      nombre: 'Veinte mil leguas de viaje submarino',
      autor: 'Jules Verne',
      fechaPublicacion: 1870,
      paginas: 512,
      isbn: '9788420651200',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El profesor Aronnax explora las profundidades abisales a bordo del submarino Nautilus al mando del Capitán Nemo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231971-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🌊 Aventura Náutica'],
      recommendationReason: 'Aventura oceánica visionaria'
    },
    {
      id: 'curated-verne-80dias',
      source: 'openlibrary',
      nombre: 'La vuelta al mundo en ochenta días',
      autor: 'Jules Verne',
      fechaPublicacion: 1872,
      paginas: 288,
      isbn: '9788420651217',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Phileas Fogg y su mayordomo Picaporte aceptan una apuesta para circunnavegar el planeta en tiempo récord.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228512-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['🗺️ Aventura Histórica'],
      recommendationReason: 'Clásico inolvidable de viajes y aventuras'
    },
    {
      id: 'curated-tom-sawyer',
      source: 'openlibrary',
      nombre: 'Las aventuras de Tom Sawyer',
      autor: 'Mark Twain',
      fechaPublicacion: 1876,
      paginas: 272,
      isbn: '9788491050216',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Las travesuras del joven Tom y su amigo Huckleberry Finn a orillas del majestuoso río Misisipi.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8226019-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['adventure'],
      suggestedGenre: '🏇 Aventuras',
      suggestedSubgenres: ['⚔️ Acción & Combate'],
      recommendationReason: 'Homenaje universal a la libertad juvenil'
    }
  ],
  classics: [
    {
      id: 'curated-garcia-marquez',
      source: 'openlibrary',
      nombre: 'Cien años de soledad',
      autor: 'Gabriel García Márquez',
      fechaPublicacion: 1967,
      paginas: 471,
      isbn: '9788439720775',
      editorial: 'Random House',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La saga de la familia Buendía a lo largo de siete generaciones en el mítico pueblo de Macondo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/11142512-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Obra cumbre de la literatura hispanoamericana'
    },
    {
      id: 'curated-1984',
      source: 'openlibrary',
      nombre: '1984',
      autor: 'George Orwell',
      fechaPublicacion: 1949,
      paginas: 326,
      isbn: '9788499890944',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Winston Smith vive en una sociedad totalitaria gobernada por el Gran Hermano donde el pensamiento disidente es castigado.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/7222246-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['🏚️ Post-Apocalíptico'],
      recommendationReason: 'Clásico universal imprescindible'
    },
    {
      id: 'curated-borges',
      source: 'openlibrary',
      nombre: 'Ficciones',
      autor: 'Jorge Luis Borges',
      fechaPublicacion: 1944,
      paginas: 224,
      isbn: '9788420633114',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Colección de relatos laberínticos sobre espejos, bibliotecas infinitas, enigmas y la naturaleza del tiempo.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8315123-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['🧙 Fantasía Épica'],
      recommendationReason: 'Joya literaria aclamada'
    },
    {
      id: 'curated-dorian-gray',
      source: 'openlibrary',
      nombre: 'El retrato de Dorian Gray',
      autor: 'Oscar Wilde',
      fechaPublicacion: 1890,
      paginas: 288,
      isbn: '9788491050223',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Dorian Gray conserva su juventud eterna mientras su retrato al óleo envejece y muestra la degradación de su alma.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225320-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Brillante fábula sobre la belleza y la moral'
    },
    {
      id: 'curated-crimen-castigo',
      source: 'openlibrary',
      nombre: 'Crimen y castigo',
      autor: 'Fiódor Dostoyevski',
      fechaPublicacion: 1866,
      paginas: 672,
      isbn: '9788491050230',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El estudiante Raskólnikov comete un asesinato justificándolo con ideales de grandeza, cayendo en un torbellino de culpa.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228694-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Cumbre de la novela psicológica universal'
    },
    {
      id: 'curated-quijote',
      source: 'openlibrary',
      nombre: 'Don Quijote de la Mancha',
      autor: 'Miguel de Cervantes',
      fechaPublicacion: 1605,
      paginas: 1100,
      isbn: '9788420412146',
      editorial: 'Alfaguara',
      idioma: 'Español',
      edicion: 'Edición RAE',
      sinopsis: 'Alonso Quijano pierde el juicio leyendo libros de caballerías y sale por los campos de La Mancha con su fiel Sancho Panza.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231852-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['classic_literature'],
      suggestedGenre: '🏛️ Clásicos',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'La obra más célebre de las letras en español'
    }
  ],
  mystery: [
    {
      id: 'curated-estudio-escarlata',
      source: 'openlibrary',
      nombre: 'Estudio en escarlata',
      autor: 'Arthur Conan Doyle',
      fechaPublicacion: 1887,
      paginas: 224,
      isbn: '9788420651187',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El doctor John Watson conoce al excéntrico detective consultor Sherlock Holmes y resuelven su primer misterio juntos.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8231851-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'El nacimiento de la leyenda de Sherlock Holmes'
    },
    {
      id: 'curated-diez-negritos',
      source: 'openlibrary',
      nombre: 'Diez negritos',
      autor: 'Agatha Christie',
      fechaPublicacion: 1939,
      paginas: 256,
      isbn: '9788467045437',
      editorial: 'Espasa',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Diez personas desconocidas son invitadas a una mansión en una isla solitaria y van muriendo una a una según una canción infantil.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235290-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'La novela de misterio más vendida de todos los tiempos'
    },
    {
      id: 'curated-sabueso-baskerville',
      source: 'openlibrary',
      nombre: 'El sabueso de los Baskerville',
      autor: 'Arthur Conan Doyle',
      fechaPublicacion: 1902,
      paginas: 256,
      isbn: '9788420651194',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Sherlock Holmes y Watson viajan a los páramos de Dartmoor para investigar la maldición de una bestia espectral.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225330-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'La más célebre aventura de Sherlock Holmes'
    },
    {
      id: 'curated-halcon-maltes',
      source: 'openlibrary',
      nombre: 'El halcón maltés',
      autor: 'Dashiell Hammett',
      fechaPublicacion: 1930,
      paginas: 288,
      isbn: '9788420651248',
      editorial: 'Alianza',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El detective privado Sam Spade es contratado para seguir a un hombre y se ve envuelto en la búsqueda de una codiciada estatuilla de oro.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228740-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'Fundamento absoluto de la novela negra clásica'
    },
    {
      id: 'curated-orient-express',
      source: 'openlibrary',
      nombre: 'Asesinato en el Orient Express',
      autor: 'Agatha Christie',
      fechaPublicacion: 1934,
      paginas: 256,
      isbn: '9788467045444',
      editorial: 'Espasa',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El detective Hércules Poirot viaja a bordo del legendario tren cuando queda atrapado por la nieve y ocurre un crimen desconcertante.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235288-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🕵️ Misterio & Detective'],
      recommendationReason: 'Uno de los giros de resolución más aclamados'
    },
    {
      id: 'curated-sombra-viento',
      source: 'openlibrary',
      nombre: 'La sombra del viento',
      autor: 'Carlos Ruiz Zafón',
      fechaPublicacion: 2001,
      paginas: 576,
      isbn: '9788408043645',
      editorial: 'Planeta',
      idioma: 'Español',
      edicion: 'El Cementerio de los Libros Olvidados I',
      sinopsis: 'Daniel Sempere es conducido al Cementerio de los Libros Olvidados y elige una novela que cambiará su vida para siempre.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235310-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['mystery_and_detective_stories'],
      suggestedGenre: '🔪 Terror & Suspense',
      suggestedSubgenres: ['🧠 Thriller Psicológico'],
      recommendationReason: 'Un homenaje inolvidable a la literatura y el misterio'
    }
  ],
  romance: [
    {
      id: 'curated-orgullo-prejuicio',
      source: 'openlibrary',
      nombre: 'Orgullo y prejuicio',
      autor: 'Jane Austen',
      fechaPublicacion: 1813,
      paginas: 448,
      isbn: '9788491050247',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Elizabeth Bennet y el altivo señor Darcy deben superar sus prejuicios y malentendidos en la Inglaterra georgiana.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225318-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'La cumbre indiscutible de la novela romántica'
    },
    {
      id: 'curated-cumbres-borrascosas',
      source: 'openlibrary',
      nombre: 'Cumbres borrascosas',
      autor: 'Emily Brontë',
      fechaPublicacion: 1847,
      paginas: 416,
      isbn: '9788491050254',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La tormentosa e indomable pasión entre Heathcliff y Catherine Earnshaw en los desolados páramos de Yorkshire.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228710-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Intensidad romántica y tragedia gótica'
    },
    {
      id: 'curated-jane-eyre',
      source: 'openlibrary',
      nombre: 'Jane Eyre',
      autor: 'Charlotte Brontë',
      fechaPublicacion: 1847,
      paginas: 560,
      isbn: '9788491050261',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La institutriz Jane Eyre entra al servicio del señor Rochester en Thornfield Hall, descubriendo un secreto demoledor.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228712-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'Poderosa historia de amor, dignidad y valentía'
    },
    {
      id: 'curated-sentido-sensibilidad',
      source: 'openlibrary',
      nombre: 'Sentido y sensibilidad',
      autor: 'Jane Austen',
      fechaPublicacion: 1811,
      paginas: 384,
      isbn: '9788491050278',
      editorial: 'Penguin Clásicos',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Las hermanas Elinor y Marianne Dashwood experimentan el amor y el desengaño desde caracteres opuestos.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8225325-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'Agudeza psicológica y ternura intemporal'
    },
    {
      id: 'curated-amor-colera',
      source: 'openlibrary',
      nombre: 'El amor en los tiempos del cólera',
      autor: 'Gabriel García Márquez',
      fechaPublicacion: 1985,
      paginas: 496,
      isbn: '9788439720782',
      editorial: 'Random House',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Florentino Ariza espera más de medio siglo el momento de reiterar su juramento de amor eterno a Fermina Daza.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235305-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💌 Romance Histórico'],
      recommendationReason: 'Una oda inolvidable al amor maduro y perseverante'
    },
    {
      id: 'curated-agua-chocolate',
      source: 'openlibrary',
      nombre: 'Como agua para chocolate',
      autor: 'Laura Esquivel',
      fechaPublicacion: 1989,
      paginas: 272,
      isbn: '9788497593687',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Tita transmite sus pasiones y desdichas a través de los exquisitos platillos que cocina en su rancho mexicano.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235295-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['romance'],
      suggestedGenre: '❤️ Romance & Drama',
      suggestedSubgenres: ['💔 Drama'],
      recommendationReason: 'Fusión deliciosa de amor, cocina y magia'
    }
  ],
  history: [
    {
      id: 'curated-sapiens',
      source: 'openlibrary',
      nombre: 'Sapiens: De animales a dioses',
      autor: 'Yuval Noah Harari',
      fechaPublicacion: 2014,
      paginas: 496,
      isbn: '9788499926223',
      editorial: 'Debate',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Breve historia de la humanidad: desde los primeros homínidos hasta las revoluciones cognitiva, agrícola y científica.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235320-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Fenómeno mundial de divulgación histórica'
    },
    {
      id: 'curated-pilares-tierra',
      source: 'openlibrary',
      nombre: 'Los pilares de la tierra',
      autor: 'Ken Follett',
      fechaPublicacion: 1989,
      paginas: 1072,
      isbn: '9788497592475',
      editorial: 'Debolsillo',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'La construcción de una catedral gótica en Kingsbridge enmarca las pasiones, intrigas y luchas de poder del medievo inglés.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235325-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'El gran clásico de la novela histórica medieval'
    },
    {
      id: 'curated-diamond-armas',
      source: 'openlibrary',
      nombre: 'Armas, gérmenes y acero',
      autor: 'Jared Diamond',
      fechaPublicacion: 1997,
      paginas: 592,
      isbn: '9788499926483',
      editorial: 'Debate',
      idioma: 'Español',
      edicion: 'Premio Pulitzer',
      sinopsis: 'Explicación geográfica y ecológica de los destinos dispares de las distintas sociedades humanas.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235330-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Ensayo fundamental de antropología e historia'
    },
    {
      id: 'curated-infinito-junco',
      source: 'openlibrary',
      nombre: 'El infinito en un junco',
      autor: 'Irene Vallejo',
      fechaPublicacion: 2019,
      paginas: 452,
      isbn: '9788417902407',
      editorial: 'Siruela',
      idioma: 'Español',
      edicion: 'Premio Nacional de Ensayo',
      sinopsis: 'La invención de los libros en el mundo antiguo: un viaje fascinante por papiros, pergaminos y bibliotecas legendarias.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/11142512-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Una hermosa carta de amor a los libros y su historia'
    },
    {
      id: 'curated-memorias-adriano',
      source: 'openlibrary',
      nombre: 'Memorias de Adriano',
      autor: 'Marguerite Yourcenar',
      fechaPublicacion: 1951,
      paginas: 336,
      isbn: '9788435015608',
      editorial: 'Edhasa',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'El emperador Adriano medita sobre el poder, el amor, el arte y la muerte en una extensa carta a Marco Aurelio.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8228720-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🌍 Historia'],
      recommendationReason: 'Prosa magistral y recreación histórica sublime'
    },
    {
      id: 'curated-breve-historia',
      source: 'openlibrary',
      nombre: 'Una breve historia de casi todo',
      autor: 'Bill Bryson',
      fechaPublicacion: 2003,
      paginas: 640,
      isbn: '9788427202351',
      editorial: 'RBA',
      idioma: 'Español',
      edicion: '',
      sinopsis: 'Un ameno recorrido por los grandes enigmas de la ciencia: desde el Big Bang hasta el surgimiento de la civilización.',
      portadaUrl: 'https://covers.openlibrary.org/b/id/8235335-M.jpg',
      portadaFallbackUrl: '',
      rawCategories: ['history'],
      suggestedGenre: '📚 No Ficción',
      suggestedSubgenres: ['🧪 Divulgación Científica'],
      recommendationReason: 'Divulgación científica brillante y accesible'
    }
  ]
};

export function isLikelyEnglish(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const sample = ' ' + text.toLowerCase().slice(0, 600) + ' ';
  const englishWords = [
    ' the ', ' and ', ' of ', ' to ', ' in ', ' is ', ' that ', ' for ',
    ' with ', ' as ', ' this ', ' after ', ' from ', ' by ', ' at ',
    ' his ', ' her ', ' has ', ' have ', ' book ', ' story ', ' novel ',
    ' about ', ' when ', ' who ', ' were ', ' was ', ' their ', ' he ',
    ' she ', ' which ', ' but ', ' they '
  ];
  let matches = 0;
  for (const w of englishWords) {
    if (sample.includes(w)) {
      matches++;
    }
  }
  return matches >= 3;
}

export function cleanSynopsisText(text: string): string {
  if (!text) return '';
  return text
    // Eliminar notas de pie de página y fuentes de markdown (ej. [1]: https://... o [Source][1])
    .replace(/\[\d+\]:\s*https?:\/\/\S+/gi, '')
    .replace(/\[source\]:\s*https?:\/\/\S+/gi, '')
    .replace(/\[(?:source|\d+)\]\[\d+\]/gi, '')
    .replace(/\[(?:source|\d+)\]/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    // Eliminar enlaces markdown [Texto](url) -> Texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#`]/g, '')
    .replace(/---+/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function translateToSpanish(text: string, signal?: AbortSignal): Promise<string> {
  const cleaned = cleanSynopsisText(text);
  if (!cleaned) return '';
  try {
    const toTranslate = cleaned.slice(0, 3000);
    const url =
      'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=' +
      encodeURIComponent(toTranslate);
    const res = await fetchWithTimeout(url, { signal }, 4500);
    if (!res.ok) return cleaned;
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map((chunk: any) => chunk[0] || '').join('');
      if (translated && translated.trim().length > 20) {
        return cleanSynopsisText(translated);
      }
    }
  } catch (err) {
    console.warn('Auto-traducción al español no disponible:', err);
  }
  return cleaned;
}

/**
 * Búsqueda exacta y exhaustiva de libro por código ISBN (10 o 13 dígitos).
 * Combina Google Books, Open Library Search y Open Library Direct Edition API.
 */
export async function searchBookByIsbn(
  rawIsbn: string,
  signal?: AbortSignal
): Promise<BibliographicCandidate | null> {
  const cleanIsbn = extractCleanIsbn(rawIsbn) || rawIsbn.replace(/[-\s]/g, '').trim();
  if (!cleanIsbn || (!/^\d{9}[\dX]$/i.test(cleanIsbn) && !/^\d{13}$/.test(cleanIsbn))) {
    return null;
  }

  const cacheKey = `isbn:${cleanIsbn.toUpperCase()}`;
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (cached && cached.length > 0) return cached[0];
  }

  // Ejecución paralela en Apple Books, Google Books, Open Library Search y Open Library Direct Edition
  const [abSettled, gbSettled, olSettled, olDirectSettled] = await Promise.allSettled([
    searchAppleBooks(cleanIsbn, cleanIsbn, signal),
    searchGoogleBooks(cleanIsbn, cleanIsbn, signal),
    searchOpenLibrary(cleanIsbn, cleanIsbn, signal),
    fetchWithTimeout(`https://openlibrary.org/isbn/${cleanIsbn}.json`, { signal }, 3500)
  ]);

  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const abResults = abSettled.status === 'fulfilled' ? abSettled.value : [];
  const gbResults = gbSettled.status === 'fulfilled' ? gbSettled.value : [];
  const olResults = olSettled.status === 'fulfilled' ? olSettled.value : [];

  let directOlEdition: any = null;
  if (olDirectSettled.status === 'fulfilled' && olDirectSettled.value.ok) {
    try {
      directOlEdition = await olDirectSettled.value.json();
    } catch {
      // ignorar error de parseo JSON
    }
  }

  // Mezclar y clasificar candidatos
  const candidates = mergeAndRankCandidates(olResults, gbResults, cleanIsbn, cleanIsbn, abResults);
  let best: BibliographicCandidate | null = candidates.length > 0 ? { ...candidates[0] } : null;

  // Enriquecer con Open Library Direct Edition si hay datos útiles
  if (directOlEdition) {
    if (!best) {
      const covers = Array.isArray(directOlEdition.covers) ? directOlEdition.covers : [];
      const primaryCover = buildOpenLibraryIsbnCover(cleanIsbn) || (covers[0] ? buildOpenLibraryIdCover(covers[0]) : '');
      const rawCategories = Array.isArray(directOlEdition.subjects) ? directOlEdition.subjects.slice(0, 10) : [];
      const inferred = inferCatalogFromCategories(rawCategories);

      best = {
        id: `ol-direct-${cleanIsbn}`,
        source: 'openlibrary',
        nombre: (directOlEdition.title || '').trim(),
        autor: '',
        fechaPublicacion: parseYear(directOlEdition.publish_date),
        paginas: directOlEdition.number_of_pages || (directOlEdition.pagination ? parseInt(directOlEdition.pagination, 10) || null : null),
        isbn: cleanIsbn,
        editorial: Array.isArray(directOlEdition.publishers) ? directOlEdition.publishers[0] || '' : '',
        idioma: 'Español',
        edicion: directOlEdition.edition_name || '',
        sinopsis: typeof directOlEdition.description === 'string'
          ? directOlEdition.description
          : directOlEdition.description?.value || '',
        portadaUrl: primaryCover,
        portadaFallbackUrl: covers[0] ? buildOpenLibraryIdCover(covers[0]) : '',
        rawCategories,
        suggestedGenre: inferred.genre,
        suggestedSubgenres: inferred.subgenres
      };
    } else {
      if (!best.paginas && directOlEdition.number_of_pages) {
        best.paginas = directOlEdition.number_of_pages;
      }
      if (!best.editorial && Array.isArray(directOlEdition.publishers) && directOlEdition.publishers[0]) {
        best.editorial = directOlEdition.publishers[0];
      }
      if (!best.sinopsis && (directOlEdition.description?.value || typeof directOlEdition.description === 'string')) {
        best.sinopsis = typeof directOlEdition.description === 'string'
          ? directOlEdition.description
          : directOlEdition.description.value;
      }
      if (!best.edicion && directOlEdition.edition_name) {
        best.edicion = directOlEdition.edition_name;
      }
    }
  }

  // Asegurar que el ISBN esté presente y tenga portada
  if (best) {
    best.isbn = cleanIsbn;
    if (!best.portadaUrl) {
      best.portadaUrl = buildOpenLibraryIsbnCover(cleanIsbn);
    }
    searchCache.set(cacheKey, [best]);
  }

  return best;
}

export const bookMetadataService = {
  searchBookByIsbn,
  async searchBooks(query: string, signal?: AbortSignal): Promise<BibliographicCandidate[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const cacheKey = trimmed.toLowerCase();
    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey)!;
    }

    const isbnQuery = extractCleanIsbn(trimmed);

    const [abSettled, olSettled, gbSettled] = await Promise.allSettled([
      searchAppleBooks(trimmed, isbnQuery, signal),
      searchOpenLibrary(trimmed, isbnQuery, signal),
      searchGoogleBooks(trimmed, isbnQuery, signal)
    ]);

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const abResults = abSettled.status === 'fulfilled' ? abSettled.value : [];
    const olResults = olSettled.status === 'fulfilled' ? olSettled.value : [];
    const gbResults = gbSettled.status === 'fulfilled' ? gbSettled.value : [];

    const ranked = mergeAndRankCandidates(olResults, gbResults, trimmed, isbnQuery, abResults);
    searchCache.set(cacheKey, ranked);
    return ranked;
  },

  async findBestMatchForBook(input: {
    nombre: string;
    autor?: string;
    isbn?: string;
  }): Promise<BibliographicCandidate | null> {
    const cleanIsbn = input.isbn ? extractCleanIsbn(input.isbn) : null;
    let isbnMatch: BibliographicCandidate | null = null;

    if (cleanIsbn) {
      const byIsbn = await this.searchBooks(cleanIsbn);
      if (byIsbn.length > 0) {
        isbnMatch = { ...byIsbn[0] };
        const hasReliableCover =
          Boolean(isbnMatch.portadaUrl) &&
          !isbnMatch.portadaUrl.includes('covers.openlibrary.org/b/isbn/');
        if (hasReliableCover && isbnMatch.sinopsis && isbnMatch.suggestedSaga) {
          return isbnMatch;
        }
      }
    }

    const cleanTitleInput = extractSeriesAndVolumeFromText(input.nombre, {
      author: input.autor
    }).cleanTitle;
    const combinedQuery = [cleanTitleInput || input.nombre, input.autor].filter(Boolean).join(' ').trim();
    if (!combinedQuery) return isbnMatch;

    const candidates = await this.searchBooks(combinedQuery);
    if (candidates.length === 0) return isbnMatch;

    const targetTitle = normalizeText(cleanTitleInput || input.nombre);
    const targetAuthor = input.autor ? normalizeText(input.autor) : '';

    const isTitleMatch = (candName: string) => {
      const candTitle = normalizeText(candName);
      if (!candTitle || !targetTitle) return false;
      return (
        candTitle === targetTitle ||
        candTitle.includes(targetTitle) ||
        targetTitle.includes(candTitle)
      );
    };

    const isAuthorMatch = (candAutor: string) => {
      if (!targetAuthor || !candAutor) return true;
      const candAuthor = normalizeText(candAutor);
      if (candAuthor.includes(targetAuthor) || targetAuthor.includes(candAuthor)) return true;
      const targetLast = targetAuthor.split(/\s+/).pop() || '';
      return targetLast.length >= 3 && candAuthor.includes(targetLast);
    };

    const verified =
      candidates.find(
        (c) =>
          isTitleMatch(c.nombre) &&
          isAuthorMatch(c.autor) &&
          Boolean(c.portadaUrl) &&
          (c.source === 'applebooks' || c.source === 'googlebooks')
      ) ||
      candidates.find((c) => isTitleMatch(c.nombre) && isAuthorMatch(c.autor)) ||
      candidates.find((c) => isTitleMatch(c.nombre));

    let best: BibliographicCandidate | null = verified
      ? { ...verified }
      : isbnMatch
      ? { ...isbnMatch }
      : candidates[0]
      ? { ...candidates[0] }
      : null;

    if (best && isbnMatch && best.id !== isbnMatch.id) {
      if (!best.isbn && isbnMatch.isbn) best.isbn = isbnMatch.isbn;
      if (!best.paginas && isbnMatch.paginas) best.paginas = isbnMatch.paginas;
      if (!best.editorial && isbnMatch.editorial) best.editorial = isbnMatch.editorial;
      if (!best.fechaPublicacion && isbnMatch.fechaPublicacion) {
        best.fechaPublicacion = isbnMatch.fechaPublicacion;
      }
      if (!best.portadaUrl && isbnMatch.portadaUrl) {
        best.portadaUrl = isbnMatch.portadaUrl;
      }
    }

    if (best && (!best.sinopsis || best.sinopsis.trim().length === 0)) {
      try {
        const syn = await this.fetchSynopsisForBook({
          nombre: cleanTitleInput || input.nombre,
          autor: input.autor || best.autor,
          isbn: input.isbn || best.isbn
        });
        if (syn) {
          best.sinopsis = syn;
        }
      } catch {
        // Fallback without synopsis
      }
    }

    if (best && !best.suggestedSaga) {
      const seriesFromSyn = extractSeriesAndVolumeFromText(best.nombre || input.nombre, {
        subtitle: best.edicion,
        synopsis: best.sinopsis,
        author: best.autor || input.autor,
        publisher: best.editorial
      });
      if (seriesFromSyn.sagaNombre) {
        best.suggestedSaga = seriesFromSyn.sagaNombre;
        best.suggestedVolume = seriesFromSyn.volumen;
      }
    }

    return best;
  },

  async fetchSynopsisForBook(
    input: {
      nombre: string;
      autor?: string;
      isbn?: string;
    },
    signal?: AbortSignal
  ): Promise<string> {
    const title = input.nombre.trim();
    if (!title) return '';
    const author = (input.autor || '').trim();
    const cleanIsbn = input.isbn ? extractCleanIsbn(input.isbn) : null;

    // 1. Curated list check
    const normalizedInputTitle = normalizeText(title);
    for (const categoryBooks of Object.values(CURATED_CATEGORY_BOOKS)) {
      const match = categoryBooks.find(
        (b) =>
          normalizeText(b.nombre) === normalizedInputTitle &&
          Boolean(b.sinopsis && b.sinopsis.trim().length > 0)
      );
      if (match?.sinopsis) {
        return cleanSynopsisText(match.sinopsis);
      }
    }

    // 2. Try Spanish Wikipedia (high quality, natural synopsis in Spanish)
    try {
      const wikiQueries = [
        `${title} libro`,
        title,
        author ? `${title} ${author}` : '',
        `${title} novela`
      ].filter(Boolean);

      for (const q of wikiQueries) {
        if (signal?.aborted) break;
        const searchUrl =
          'https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
          encodeURIComponent(q) +
          '&utf8=&format=json&origin=*&srlimit=4';

        const searchRes = await fetchWithTimeout(
          searchUrl,
          {
            signal,
            headers: {
              'User-Agent': 'NexusLibrary/1.0 (biblioteca@nexus.local)'
            }
          },
          3500
        );

        if (!searchRes.ok) continue;
        const searchData = (await searchRes.json()) as {
          query?: { search?: Array<{ title?: string }> };
        };

        const hits = searchData.query?.search || [];
        for (const hit of hits) {
          if (!hit.title || hit.title.toLowerCase().includes('desambiguación')) continue;

          const sumUrl =
            'https://es.wikipedia.org/api/rest_v1/page/summary/' +
            encodeURIComponent(hit.title);

          const sumRes = await fetchWithTimeout(
            sumUrl,
            {
              signal,
              headers: {
                'User-Agent': 'NexusLibrary/1.0 (biblioteca@nexus.local)'
              }
            },
            3500
          );

          if (!sumRes.ok) continue;
          const sum = (await sumRes.json()) as {
            type?: string;
            description?: string;
            extract?: string;
          };

          if (sum.type === 'disambiguation' || !sum.extract) continue;

          const desc = (sum.description || '').toLowerCase();
          const ext = sum.extract.toLowerCase();

          const isPerson =
            desc.includes('escritor') ||
            desc.includes('autor') ||
            desc.includes('periodista') ||
            desc.includes('político') ||
            ext.startsWith('fue un') ||
            ext.startsWith('es un escritor');

          const isBook =
            desc.includes('novela') ||
            desc.includes('libro') ||
            desc.includes('obra') ||
            desc.includes('trilogía') ||
            desc.includes('saga') ||
            ext.includes('novela') ||
            ext.includes('libro') ||
            ext.includes('obra literaria') ||
            ext.includes('publicad');

          const extClean = cleanSynopsisText(sum.extract);
          if (!isPerson && isBook && extClean.length > 50) {
            if (isLikelyEnglish(extClean)) {
              return await translateToSpanish(extClean, signal);
            }
            return extClean;
          }
        }
      }
    } catch {
      // Continue to next provider
    }

    // 3. Try Open Library works
    try {
      const olQuery = cleanIsbn ? `isbn=${cleanIsbn}` : [title, author].filter(Boolean).join(' ');
      const olSearchUrl =
        'https://openlibrary.org/search.json?q=' +
        encodeURIComponent(olQuery) +
        '&fields=key,title,author_name&limit=4';

      const olSearchRes = await fetchWithTimeout(olSearchUrl, { signal }, 4000);
      if (olSearchRes.ok) {
        const olData = (await olSearchRes.json()) as {
          docs?: Array<{ key?: string; title?: string }>;
        };

        for (const doc of olData.docs || []) {
          if (!doc.key) continue;
          const workUrl = 'https://openlibrary.org' + doc.key + '.json';
          const workRes = await fetchWithTimeout(workUrl, { signal }, 4000);
          if (workRes.ok) {
            const workData = (await workRes.json()) as {
              description?: string | { type?: string; value?: string };
            };

            const rawDesc =
              typeof workData.description === 'string'
                ? workData.description
                : workData.description?.value;

            if (rawDesc && typeof rawDesc === 'string') {
              let cleanDesc = cleanSynopsisText(rawDesc);
              if (cleanDesc.length > 35) {
                if (isLikelyEnglish(cleanDesc)) {
                  cleanDesc = await translateToSpanish(cleanDesc, signal);
                }
                return cleanDesc;
              }
            }
          }
        }
      }
    } catch {
      // Continue to next provider
    }

    return '';
  },

  async fetchSubjectBooks(
    subjectKey: string,
    limit = 14,
    signal?: AbortSignal
  ): Promise<BibliographicCandidate[]> {
    const cacheKey = `${subjectKey}:${limit}`;
    if (subjectCache.has(cacheKey)) {
      return subjectCache.get(cacheKey)!;
    }

    const categoryId = SUBJECT_KEY_TO_CATEGORY_ID[subjectKey] || subjectKey;
    const curated = CURATED_CATEGORY_BOOKS[categoryId] || [];

    const url = `https://openlibrary.org/subjects/${encodeURIComponent(subjectKey)}.json?limit=${limit}`;
    try {
      const res = await fetchWithTimeout(url, { signal }, 7500);
      if (!res.ok) return curated;
      const data = (await res.json()) as OpenLibrarySubjectResponse;
      if (!Array.isArray(data.works) || data.works.length === 0) return curated;

      const candidates = data.works
        .filter((w) => Boolean(w.title))
        .map((w, idx): BibliographicCandidate => {
          const primaryCover = buildOpenLibraryIdCover(w.cover_id);
          const rawCategories = Array.isArray(w.subject) ? w.subject.slice(0, 8) : [];
          const inferred = inferCatalogFromCategories(rawCategories);

          return {
            id: 'ol-subj-' + String(w.key || idx),
            source: 'openlibrary',
            nombre: (w.title || '').trim(),
            autor: Array.isArray(w.authors) && w.authors[0]?.name ? w.authors[0].name.trim() : '',
            fechaPublicacion: parseYear(w.first_publish_year),
            paginas: null,
            isbn: '',
            editorial: '',
            idioma: 'Español',
            edicion: w.edition_count ? `${w.edition_count} ediciones` : '',
            sinopsis: '',
            portadaUrl: primaryCover,
            portadaFallbackUrl: '',
            rawCategories,
            suggestedGenre: inferred.genre,
            suggestedSubgenres: inferred.subgenres
          };
        });

      // Combinar obras de Open Library con la selección curada asegurando calidad y variedad
      const existingTitles = new Set(candidates.map((c) => normalizeText(c.nombre)));
      const combined = [...candidates];
      for (const cur of curated) {
        if (!existingTitles.has(normalizeText(cur.nombre))) {
          combined.push(cur);
        }
      }

      if (combined.length > 0) {
        subjectCache.set(cacheKey, combined);
      }
      return combined.length > 0 ? combined : curated;
    } catch (err) {
      if (signal?.aborted) throw err;
      return curated;
    }
  },

  async fetchRecommendations(
    userBooks: Book[],
    options?: RecommendOptions
  ): Promise<{ reason: string; books: BibliographicCandidate[] }> {
    const subFilter = options?.subFilter || 'mix';
    const signal = options?.signal;
    const forceRefresh = Boolean(options?.forceRefresh);
    const dismissedIds = dismissedRecommendationsService.getDismissedIds();

    const isAvailable = (cand: BibliographicCandidate): boolean => {
      if (!cand || !cand.nombre) return false;
      if (dismissedIds.has(cand.id)) return false;
      return !isBookAlreadyInLibrary(cand, userBooks);
    };

    if (!userBooks || userBooks.length === 0) {
      let classics: BibliographicCandidate[] = [];
      try {
        classics = await this.fetchSubjectBooks('classic_literature', 16, signal);
      } catch {
        classics = [];
      }
      const available = classics.filter(isAvailable);
      const pool = available.length >= 4 ? available : CURATED_FALLBACK_RECOMMENDATIONS.filter(isAvailable);
      const booksWithReason = pool.slice(0, 8).map((b) => ({
        ...b,
        recommendationReason: b.recommendationReason || 'Clásico imprescindible'
      }));
      return {
        reason: 'Obras maestras universales para inaugurar tu biblioteca personal',
        books: booksWithReason
      };
    }

    // 1. Perfil del lector
    const authorWeights = new Map<string, number>();
    const genreCounts = new Map<string, number>();

    for (const b of userBooks) {
      const author = (b.autor || '').trim();
      if (author && author !== 'Desconocido' && author !== 'Autor' && author !== '—') {
        const weight = (b.puntuacion && b.puntuacion >= 4) ? 3 : (b.progreso === '✅ Leído' ? 2 : 1);
        authorWeights.set(author, (authorWeights.get(author) || 0) + weight);
      }
      if (b.genero) {
        genreCounts.set(b.genero, (genreCounts.get(b.genero) || 0) + 1);
      }
    }

    const sortedAuthors = [...authorWeights.entries()].sort((a, b) => b[1] - a[1]);
    const sortedGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]);

    const topAuthor = sortedAuthors[0]?.[0] || '';
    const topGenre = sortedGenres[0]?.[0] || '';

    const genreToSubjectMap: Record<string, string> = {
      '✨ Fantasía': 'fantasy',
      '🔭 Ciencia Ficción & Distopía': 'science_fiction',
      '🕵️ Misterio, Thriller & Novela Negra': 'mystery_and_detective_stories',
      '🔪 Terror & Suspense': 'horror',
      '🏰 Novela Histórica': 'historical_fiction',
      '❤️ Romance & Drama': 'romance',
      '🏇 Aventuras': 'adventure',
      '🖋️ Ficción Contemporánea & Literaria': 'contemporary_fiction',
      '🏛️ Clásicos': 'classic_literature',
      '📚 No Ficción': 'nonfiction',
      '🧠 Ensayo, Filosofía & Ciencia': 'philosophy',
      '🌱 Desarrollo Personal & Negocios': 'self_help',
      '🎨 Cómic, Manga & Novela Gráfica': 'graphic_novels',
      '🎭 Poesía, Teatro & Relatos': 'poetry'
    };

    const affinityCandidates: BibliographicCandidate[] = [];
    const genreCandidates: BibliographicCandidate[] = [];
    const classicCandidates: BibliographicCandidate[] = [];

    // 2. Ejecutar tareas de red en PARALELO para garantizar respuesta en < 2 segundos
    const tasks: Promise<BibliographicCandidate[]>[] = [];

    // Tarea A: Afinidad de autor (1 autor afín por búsqueda)
    if (topAuthor) {
      const topAuthorNorm = normalizeText(topAuthor);
      const affinity = AUTHOR_AFFINITY_MAP[topAuthorNorm];
      const authorToQuery = affinity
        ? (forceRefresh ? affinity.similarAuthors[1] || affinity.similarAuthors[0] : affinity.similarAuthors[0])
        : topAuthor;

      if (authorToQuery) {
        tasks.push(
          this.searchBooks(authorToQuery, signal)
            .then((results) => {
              return results.filter(isAvailable).map((c) => ({
                ...c,
                recommendationReason: affinity
                  ? `Afín a tu lectura de ${topAuthor}`
                  : `Por tu interés en ${topAuthor}`
              }));
            })
            .catch(() => [])
        );
      }
    }

    // Tarea B: Género predilecto
    const subject = (topGenre && genreToSubjectMap[topGenre]) || 'fantasy';
    const genreLimit = forceRefresh ? 20 : 14;
    tasks.push(
      this.fetchSubjectBooks(subject, genreLimit, signal)
        .then((results) => {
          return results.filter(isAvailable).map((c) => ({
            ...c,
            recommendationReason: topGenre
              ? `Imprescindible en ${topGenre.replace(/^[^\s]+\s/, '')}`
              : 'Destacado del catálogo'
          }));
        })
        .catch(() => [])
    );

    // Tarea C: Clásicos universales
    tasks.push(
      this.fetchSubjectBooks('classic_literature', 14, signal)
        .then((results) => {
          return results.filter(isAvailable).map((c) => ({
            ...c,
            recommendationReason: 'Joya literaria aclamada'
          }));
        })
        .catch(() => [])
    );

    // Esperar a que terminen en paralelo (máximo ~2-3s con timeout)
    const settled = await Promise.allSettled(tasks);
    for (const item of settled) {
      if (item.status === 'fulfilled' && Array.isArray(item.value)) {
        for (const cand of item.value) {
          if (cand.recommendationReason?.startsWith('Afín') || cand.recommendationReason?.startsWith('Por tu')) {
            affinityCandidates.push(cand);
          } else if (cand.recommendationReason?.startsWith('Imprescindible') || cand.recommendationReason?.startsWith('Destacado')) {
            genreCandidates.push(cand);
          } else {
            classicCandidates.push(cand);
          }
        }
      }
    }

    // Si la red devolvió pocos resultados por lentitud o error, completar de inmediato con la colección curada
    for (const fallback of CURATED_FALLBACK_RECOMMENDATIONS) {
      if (isAvailable(fallback)) {
        if (fallback.suggestedGenre === topGenre) {
          genreCandidates.push({ ...fallback });
        } else {
          classicCandidates.push({ ...fallback });
        }
      }
    }

    // Deduplicar colecciones por clave única
    const dedupeCandidates = (list: BibliographicCandidate[]): BibliographicCandidate[] => {
      const seen = new Set<string>();
      const out: BibliographicCandidate[] = [];
      for (const item of list) {
        const key = `${normalizeText(item.nombre)}::${normalizeText(item.autor)}`;
        if (!seen.has(key) && isAvailable(item)) {
          seen.add(key);
          out.push(item);
        }
      }
      return out;
    };

    const cleanAffinity = dedupeCandidates(affinityCandidates);
    const cleanGenre = dedupeCandidates(genreCandidates);
    const cleanClassics = dedupeCandidates(classicCandidates);

    const shuffleArray = <T>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    let selected: BibliographicCandidate[] = [];
    let mainReason = 'Recomendaciones personalizadas para tus gustos';

    if (subFilter === 'authors') {
      selected = dedupeCandidates([...(forceRefresh ? shuffleArray(cleanAffinity) : cleanAffinity), ...cleanGenre, ...cleanClassics]);
      mainReason = topAuthor
        ? `Nuevos autores afines al estilo de ${topAuthor}`
        : 'Autores seleccionados para tu perfil';
    } else if (subFilter === 'classics') {
      selected = dedupeCandidates([...(forceRefresh ? shuffleArray(cleanClassics) : cleanClassics), ...cleanGenre, ...cleanAffinity]);
      mainReason = 'Obras maestras y joyas universales que deberías leer';
    } else {
      // 'mix': 3 afines, 3 género, 2 clásicos
      const poolAffinity = forceRefresh ? shuffleArray(cleanAffinity) : cleanAffinity;
      const poolGenre = forceRefresh ? shuffleArray(cleanGenre) : cleanGenre;
      const poolClassics = forceRefresh ? shuffleArray(cleanClassics) : cleanClassics;

      const mix = [
        ...poolAffinity.slice(0, 3),
        ...poolGenre.slice(0, 3),
        ...poolClassics.slice(0, 2),
        ...poolAffinity.slice(3),
        ...poolGenre.slice(3),
        ...poolClassics.slice(2)
      ];
      selected = dedupeCandidates(mix);
      mainReason = topAuthor && topGenre
        ? `Sugerencias basadas en tu afinidad por ${topAuthor} y la ${topGenre.replace(/^[^\s]+\s/, '')}`
        : topGenre
        ? `Selección especial para tu pasión por la ${topGenre.replace(/^[^\s]+\s/, '')}`
        : 'Selección personalizada basada en tus lecturas';
    }

    // Fallback de seguridad si quedan pocos libros
    if (selected.length < 4) {
      try {
        const fallbackBooks = await this.fetchSubjectBooks('adventure', 16, signal);
        for (const fb of fallbackBooks) {
          if (isAvailable(fb)) {
            fb.recommendationReason = 'Aventura épica recomendada';
            selected.push(fb);
          }
        }
      } catch {
        // Ignorado
      }
    }

    return {
      reason: mainReason,
      books: dedupeCandidates(selected).slice(0, 8)
    };
  }
};

interface OpenLibrarySubjectResponse {
  name?: string;
  work_count?: number;
  works?: Array<{
    key?: string;
    title?: string;
    authors?: Array<{ key?: string; name?: string }>;
    cover_id?: number;
    first_publish_year?: number;
    edition_count?: number;
    subject?: string[];
  }>;
}



export interface DiscoverCategory {
  id: string;
  name: string;
  icon: string;
  subjectKey: string;
  description: string;
}

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  {
    id: 'fantasy',
    name: 'Fantasía & Épica',
    icon: '✨',
    subjectKey: 'fantasy',
    description: 'Mundos imaginarios, magia ancestral, reinos caídos y grandes gestas heroicas.'
  },
  {
    id: 'scifi',
    name: 'Ciencia Ficción & Distopía',
    icon: '🔭',
    subjectKey: 'science_fiction',
    description: 'Exploración espacial, futuros distópicos, tecnología y el destino de la humanidad.'
  },
  {
    id: 'horror',
    name: 'Terror & Suspense',
    icon: '🔪',
    subjectKey: 'horror',
    description: 'Misterios oscuros, horror gótico, casas encantadas y suspense psicológico.'
  },
  {
    id: 'action',
    name: 'Acción & Aventuras',
    icon: '⚔️',
    subjectKey: 'adventure',
    description: 'Expediciones lejanas, duelos de honor, supervivencia y travesías épicas.'
  },
  {
    id: 'classics',
    name: 'Clásicos Universales',
    icon: '🏛️',
    subjectKey: 'classic_literature',
    description: 'Las obras maestras fundamentales que han definido la historia de la literatura.'
  },
  {
    id: 'mystery',
    name: 'Misterio & Detectives',
    icon: '🕵️',
    subjectKey: 'mystery_and_detective_stories',
    description: 'Casos sin resolver, detectives sagaces, acertijos y crímenes intrigantes.'
  },
  {
    id: 'romance',
    name: 'Romance & Drama',
    icon: '❤️',
    subjectKey: 'romance',
    description: 'Historias de amor apasionadas, lazos profundos y destinos entrelazados.'
  },
  {
    id: 'history',
    name: 'Historia & No Ficción',
    icon: '📚',
    subjectKey: 'history',
    description: 'Crónicas de civilizaciones, biografías de grandes personajes y divulgación.'
  }
];

export function candidateToBookInput(
  cand: BibliographicCandidate
): Omit<Book, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    nombre: cand.nombre.trim(),
    autor: cand.autor.trim(),
    genero: cand.suggestedGenre || '',
    subgeneros: cand.suggestedSubgenres || [],
    fechaPublicacion: cand.fechaPublicacion,
    paginas: cand.paginas,
    puntuacion: null,
    progreso: '❌ No Leído',
    formato: 'digital',
    propiedad: 'propio',
    sagaId: null,
    sagaNombre: '',
    volumen: null,
    fechaInicio: '',
    fechaFin: '',
    lecturaVirtual: 'Digital (.epub / eBook)',
    tiempoLectura: '',
    isbn: cand.isbn || '',
    editorial: cand.editorial || '',
    idioma: cand.idioma || 'Español',
    edicion: cand.edicion || '',
    sinopsis: cand.sinopsis || '',
    portadaUrl: cand.portadaUrl || '',
    portadaFallbackUrl: cand.portadaFallbackUrl || ''
  };
}
