import { Genre, Subgenre, ReadingStatus } from '../constants/catalogs';

export type StarRating = 1 | 2 | 3 | 4 | 5 | null;

export interface Book {
  id: string;
  nombre: string;
  autor: string;
  genero: Genre | '';
  subgeneros: Subgenre[];
  fechaPublicacion: number | null;
  paginas: number | null;
  puntuacion: StarRating;
  progreso: ReadingStatus;
  sagaId: string | null;
  sagaNombre: string;
  volumen: number | null;
  fechaInicio: string;
  fechaFin: string;
  lecturaVirtual: string;
  tiempoLectura: string;
  isbn: string;
  editorial: string;
  idioma: string;
  edicion: string;
  sinopsis: string;
  portadaUrl: string;
  portadaFallbackUrl: string;
  portadaDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Saga {
  id: string;
  nombre: string;
  descripcion: string;
  createdAt: string;
  updatedAt: string;
}

export interface BibliographicCandidate {
  id: string;
  source: 'openlibrary' | 'googlebooks';
  nombre: string;
  autor: string;
  fechaPublicacion: number | null;
  paginas: number | null;
  isbn: string;
  editorial: string;
  idioma: string;
  edicion: string;
  sinopsis: string;
  portadaUrl: string;
  portadaFallbackUrl: string;
  rawCategories: string[];
  suggestedGenre: Genre | '';
  suggestedSubgenres: Subgenre[];
}

export type SortField =
  | 'nombre'
  | 'autor'
  | 'fechaPublicacion'
  | 'puntuacion'
  | 'paginas'
  | 'createdAt';

export type SortOrder = 'asc' | 'desc';

export type LibraryViewMode = 'grid' | 'list' | 'shelf';

export interface LibraryFilters {
  search: string;
  genero: Genre | '';
  subgenero: Subgenre | '';
  progreso: ReadingStatus | '';
  sagaId: string;
  puntuacion: StarRating | 'unrated' | '';
  sortBy: SortField;
  sortOrder: SortOrder;
}

export interface BackupPayload {
  app: 'NEXUS_LIBRARY';
  version: number;
  exportedAt: string;
  books: Book[];
  sagas: Saga[];
}

