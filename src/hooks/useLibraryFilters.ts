import { useState, useMemo, useDeferredValue, useCallback } from 'react';
import { Book, LibraryFilters } from '../types/models';
import {
  Subgenre,
  SUBGENRES,
  getRecommendedSubgenres,
  normalizeText
} from '../constants/catalogs';

export const initialFilters: LibraryFilters = {
  search: '',
  genero: '',
  subgenero: '',
  progreso: '',
  sagaId: '',
  puntuacion: '',
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

export function useLibraryFilters(books: Book[]) {
  const [filters, setFilters] = useState<LibraryFilters>(initialFilters);
  const deferredSearch = useDeferredValue(filters.search);
  const [showFilters, setShowFilters] = useState(false);

  const subgenreSelectGroups = useMemo(() => {
    if (!filters.genero) return undefined;
    const recommended = getRecommendedSubgenres(filters.genero);
    const recNormSet = new Set(recommended.map((s) => normalizeText(s)));
    const otherSubgenres = SUBGENRES.filter(
      (s, idx, arr) =>
        !recNormSet.has(normalizeText(s)) &&
        arr.findIndex((x) => normalizeText(x) === normalizeText(s)) === idx
    );
    return [
      {
        groupLabel: 'Recomendados para este género',
        options: [
          { value: '' as Subgenre | '', label: 'Todos los subgéneros' },
          ...recommended.map((sub) => ({ value: sub, label: sub }))
        ]
      },
      ...(otherSubgenres.length > 0
        ? [
            {
              groupLabel: 'Otros subgéneros',
              options: otherSubgenres.map((sub) => ({ value: sub, label: sub }))
            }
          ]
        : [])
    ];
  }, [filters.genero]);

  const allSubgenresOptions = useMemo(() => {
    return [
      { value: '' as Subgenre | '', label: 'Todos los subgéneros' },
      ...SUBGENRES.filter(
        (s, idx, arr) => arr.findIndex((x) => normalizeText(x) === normalizeText(s)) === idx
      ).map((sub) => ({ value: sub, label: sub }))
    ];
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const filteredBooks = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    const matches = books.filter((book) => {
      if (q) {
        const normQ = normalizeText(q);
        const inTitle = book.nombre.toLowerCase().includes(q) || (normQ && normalizeText(book.nombre).includes(normQ));
        const inAuthor = book.autor.toLowerCase().includes(q) || (normQ && normalizeText(book.autor).includes(normQ));
        const inIsbn = book.isbn.toLowerCase().includes(q);
        const inGenre = book.genero
          ? book.genero.toLowerCase().includes(q) || (normQ && normalizeText(book.genero).includes(normQ))
          : false;
        const inSubgenres =
          Array.isArray(book.subgeneros) &&
          book.subgeneros.some(
            (s) => s.toLowerCase().includes(q) || (normQ && normalizeText(s).includes(normQ))
          );
        if (!inTitle && !inAuthor && !inIsbn && !inGenre && !inSubgenres) return false;
      }
      if (filters.genero && book.genero !== filters.genero) return false;
      if (filters.subgenero) {
        const normFilter = normalizeText(filters.subgenero);
        const hasSub = book.subgeneros.some(
          (s) => s === filters.subgenero || normalizeText(s) === normFilter
        );
        if (!hasSub) return false;
      }
      if (filters.progreso && book.progreso !== filters.progreso) return false;
      if (filters.sagaId) {
        if (filters.sagaId === '__none__' && book.sagaId !== null) return false;
        if (filters.sagaId !== '__none__' && book.sagaId !== filters.sagaId) return false;
      }
      if (filters.puntuacion !== '') {
        if (filters.puntuacion === 'unrated' && book.puntuacion !== null) return false;
        if (typeof filters.puntuacion === 'number' && book.puntuacion !== filters.puntuacion) {
          return false;
        }
      }
      return true;
    });

    return matches.sort((a, b) => {
      const dir = filters.sortOrder === 'asc' ? 1 : -1;
      switch (filters.sortBy) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre, 'es') * dir;
        case 'autor':
          return (a.autor || '').localeCompare(b.autor || '', 'es') * dir;
        case 'fechaPublicacion':
          return ((a.fechaPublicacion ?? 0) - (b.fechaPublicacion ?? 0)) * dir;
        case 'puntuacion':
          return ((a.puntuacion ?? 0) - (b.puntuacion ?? 0)) * dir;
        case 'paginas':
          return ((a.paginas ?? 0) - (b.paginas ?? 0)) * dir;
        case 'createdAt':
        default:
          return a.createdAt.localeCompare(b.createdAt) * dir;
      }
    });
  }, [books, deferredSearch, filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    showFilters,
    setShowFilters,
    subgenreSelectGroups,
    allSubgenresOptions,
    filteredBooks
  };
}
