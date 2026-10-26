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
  recommendationReason?: string;
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

export type ProfileVisibility = 'public' | 'friends' | 'private';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isPublic: boolean;
  visibility?: ProfileVisibility;
  createdAt?: string;
  updatedAt?: string;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
  friendProfile?: UserProfile;
}

export type RecommendationStatus = 'unread' | 'read' | 'accepted' | 'dismissed';

export interface BookRecommendationPayload {
  nombre: string;
  autor: string;
  portadaUrl: string;
  portadaFallbackUrl?: string;
  isbn?: string;
  editorial?: string;
  fechaPublicacion?: number | null;
  paginas?: number | null;
  genero?: Genre | '';
  subgeneros?: Subgenre[];
  sinopsis?: string;
}

export interface BookRecommendation {
  id: string;
  senderId: string;
  receiverId: string;
  bookData: BookRecommendationPayload;
  note: string;
  status: RecommendationStatus;
  createdAt: string;
  updatedAt: string;
  senderProfile?: UserProfile;
}



