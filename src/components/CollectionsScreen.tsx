import React, { useState, useMemo, useEffect } from 'react';
import {
  Bookmark,
  Rows3,
  Grid,
  List,
  Plus,
  Check,
  Edit2,
  Trash2,
  BookOpen,
  ArrowLeft,
  Search,
  LayoutGrid,
  List as ListIcon,
  Library as ShelfIcon,
  Sparkles,
  Heart,
  Star,
  Flame,
  Coffee,
  Compass,
  Gift,
  ChevronRight,
  X
} from 'lucide-react';
import { Book, CustomCollection } from '../types/models';
import { collectionService } from '../services/collectionService';
import { BookCover } from './BookCover';
import { BookShelf } from './BookShelf';
import { BookCard } from './BookCard';
import { formatStars, ReadingStatus } from '../constants/catalogs';

import '../book-shelf.css';

interface CollectionsScreenProps {
  books: Book[];
  currentUserId?: string;
  onOpenBookDetail?: (bookOrId: Book | string) => void;
  openedBookId?: string | null;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onEditBook?: (book: Book) => void;
  onDeleteBook?: (book: Book) => void;
  onQuickStatusChange?: (bookId: string, status: ReadingStatus) => void;
}

const AVAILABLE_ICONS: Record<string, React.ElementType> = {
  Bookmark,
  Heart,
  Sparkles,
  Star,
  Flame,
  Coffee,
  Compass,
  Gift
};

const SUGGESTED_TEMPLATES = [
  { nombre: '⭐ Joyas Imprescindibles', desc: 'Los mejores libros que jamás he leído y recomiendo a todos.', icono: 'Star' },
  { nombre: '🍂 Relecturas Pendientes', desc: 'Obras a las que deseo volver con calma y tiempo.', icono: 'Bookmark' },
  { nombre: '🏰 Grandes Sagas & Fantasía', desc: 'Mundos épicos, magia y libros de más de 800 páginas.', icono: 'Flame' },
  { nombre: '☕ Lecturas Confort & Otoño', desc: 'Historias acogedoras para leer con una taza de café o té.', icono: 'Coffee' }
];

export const CollectionsScreen: React.FC<CollectionsScreenProps> = ({
  books,
  currentUserId,
  onOpenBookDetail,
  openedBookId,
  onShowToast,
  onEditBook,
  onDeleteBook,
  onQuickStatusChange
}) => {
    const [collections, setCollections] = useState<CustomCollection[]>(() =>
    collectionService.getCollections(currentUserId)
  );
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [shelfViewMode, setShelfViewMode] = useState<'shelf' | 'grid' | 'list'>('shelf');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CustomCollection | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalIcon, setModalIcon] = useState('Bookmark');

    const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const refreshData = () => {
    setCollections(collectionService.getCollections(currentUserId));
  };

  useEffect(() => {
    return collectionService.subscribe(refreshData);
  }, [currentUserId]);

  const activeCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [collections, selectedCollectionId]);

  const colBooks = useMemo(() => {
    if (!activeCollection) return [];
    const bookMap = new Map(books.map((b) => [b.id, b]));
    return activeCollection.bookIds
      .map((id) => bookMap.get(id))
      .filter((b): b is Book => Boolean(b));
  }, [activeCollection, books]);

  const activeCollectionBooks = useMemo(() => {
    if (!searchQuery.trim()) return colBooks;
    const q = searchQuery.toLowerCase().trim();
    return colBooks.filter(
      (b) =>
        b.nombre.toLowerCase().includes(q) ||
        b.autor.toLowerCase().includes(q) ||
        (b.genero && b.genero.toLowerCase().includes(q))
    );
  }, [colBooks, searchQuery]);

  const handleBookOpen = (target: Book | string) => {
    onOpenBookDetail?.(target);
  };

    const booksMap = useMemo(() => {
    return new Map(books.map((b) => [b.id, b]));
  }, [books]);

  // Manejo de creación / edición de colección
  const handleOpenCreate = (template?: typeof SUGGESTED_TEMPLATES[0]) => {
    setEditingCollection(null);
    setModalName(template ? template.nombre : '');
    setModalDesc(template ? template.desc : '');
    setModalIcon(template ? template.icono : 'Bookmark');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (col: CustomCollection, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingCollection(col);
    setModalName(col.nombre);
    setModalDesc(col.descripcion || '');
    setModalIcon(col.icono || 'Bookmark');
    setIsCreateModalOpen(true);
  };

  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) return;

    if (editingCollection) {
      collectionService.updateCollection(
        editingCollection.id,
        {
          nombre: modalName.trim(),
          descripcion: modalDesc.trim(),
          icono: modalIcon
        },
        currentUserId
      );
      onShowToast?.(`Estantería «${modalName.trim()}» actualizada.`);
    } else {
      const created = collectionService.createCollection(
        {
          nombre: modalName.trim(),
          descripcion: modalDesc.trim(),
          icono: modalIcon
        },
        currentUserId
      );
      onShowToast?.(`Estantería «${created.nombre}» creada con éxito.`);
      setSelectedCollectionId(created.id);
    }

    refreshData();
    setIsCreateModalOpen(false);
  };

  const handleDeleteCollection = (colId: string, colName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm(`¿Seguro que deseas eliminar la estantería «${colName}»? Los libros seguirán en tu biblioteca.`)) {
      collectionService.deleteCollection(colId, currentUserId);
      if (selectedCollectionId === colId) {
        setSelectedCollectionId(null);
      }
      refreshData();
      onShowToast?.(`Estantería «${colName}» eliminada.`);
    }
  };

  const handleRemoveBook = (bookId: string, bookTitle: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedCollectionId) return;
    collectionService.removeBookFromCollection(selectedCollectionId, bookId, currentUserId);
    refreshData();
    onShowToast?.(`«${bookTitle}» retirado de esta estantería.`);
  };

  const handleTogglePickerBook = (bookId: string) => {
    if (!selectedCollectionId) return;
    collectionService.toggleBookInCollection(selectedCollectionId, bookId, currentUserId);
    refreshData();
  };

  const handleMarkReturned = (recordId: string, bookName: string) => {
    collectionService.returnBook(recordId, undefined, currentUserId);
    refreshData();
    onShowToast?.(`«${bookName}» devuelto a tu biblioteca.`);
  };

  const handleDeleteLentRecord = (recordId: string) => {
    if (window.confirm('¿Deseas eliminar este registro de préstamo?')) {
      collectionService.deleteLentRecord(recordId, currentUserId);
      refreshData();
      onShowToast?.('Registro de préstamo eliminado.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ─── Cabecera Principal ─── */}
      {!activeCollection && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-900/15 dark:border-[#242E42] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-600/30">
                <Bookmark className="w-5 h-5" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
                Colecciones & Estanterías
              </h1>
            </div>
            <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
              Organiza tus obras en baldas y estanterías temáticas personalizadas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Estantería</span>
            </button>
          </div>
        </div>
      )}
          {/* Caso A: Vista detalle de una estantería seleccionada */}
          {activeCollection ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Barra superior de pestañas de estanterías (scroll horizontal) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCollectionId(null);
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:text-stone-950 dark:hover:text-white text-xs font-semibold whitespace-nowrap transition shadow-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Todas las estanterías</span>
                </button>
                {collections.map((col) => {
                  const isCurrent = col.id === activeCollection.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        setSelectedCollectionId(col.id);
                        setSearchQuery('');
                      }}
                      className={
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ' +
                        (isCurrent
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'border border-amber-900/20 dark:border-slate-800 bg-[#fbf6ea]/80 dark:bg-[#141A26] text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: col.color || '#d97706' }}
                      />
                      <span>{col.nombre}</span>
                      <span className="opacity-70 text-[10px]">({col.bookIds.length})</span>
                    </button>
                  );
                })}
              </div>

              {/* Cabecera idéntica a Mi Biblioteca */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-amber-900/20 dark:border-[#242E42] pb-3.5 sm:pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCollectionId(null);
                      setSearchQuery('');
                    }}
                    className="p-2 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] text-stone-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition shadow-sm"
                    title="Volver a todas las estanterías"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
                        {activeCollection.nombre}
                      </h1>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(activeCollection, e)}
                        className="p-1.5 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                        title="Editar nombre y descripción"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                      Mostrando <strong>{activeCollectionBooks.length}</strong> de{' '}
                      <strong>{colBooks.length}</strong> {colBooks.length === 1 ? 'libro' : 'libros'} en esta estantería
                      {activeCollection.descripcion ? ` · ${activeCollection.descripcion}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-2">
                  <div className="relative w-full sm:w-44 md:w-52 lg:w-60">
                    <Search className="w-3.5 h-3.5 text-stone-500 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar en esta estantería..."
                      className="w-full rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] pl-9 pr-8 py-2.5 sm:py-2 text-xs text-stone-900 dark:text-slate-100 placeholder-stone-400 dark:placeholder-slate-500 focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition shadow-sm"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Limpiar búsqueda"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch('');
                      setIsBookPickerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 text-xs shadow-md transition shrink-0"
                  >
                    <Plus className="w-4 h-4" /> <span>Añadir libros</span>
                  </button>

                  <div className="inline-flex rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShelfViewMode('shelf')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition ' +
                        (shelfViewMode === 'shelf'
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de estantería visual"
                    >
                      <Rows3 className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Estantería</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShelfViewMode('grid')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition ' +
                        (shelfViewMode === 'grid'
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de cuadrícula de portadas"
                    >
                      <Grid className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Cuadrícula</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShelfViewMode('list')}
                      className={
                        'px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1 transition ' +
                        (shelfViewMode === 'list'
                          ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                          : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white')
                      }
                      title="Vista de lista compacta"
                    >
                      <List className="w-3.5 h-3.5" /> <span className="hidden xl:inline">Lista</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenido de libros de la estantería */}
              {colBooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-12 text-center space-y-3">
                  <Bookmark className="w-10 h-10 text-amber-600/50 dark:text-amber-400/50 mx-auto" />
                  <h3 className="font-serif text-lg font-bold text-stone-800 dark:text-slate-200">
                    Esta estantería aún no tiene libros
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm mx-auto">
                    Selecciona libros de tu biblioteca para agruparlos en «{activeCollection.nombre}».
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch('');
                      setIsBookPickerOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Seleccionar libros de la biblioteca</span>
                  </button>
                </div>
              ) : activeCollectionBooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-900/25 dark:border-[#283246] bg-[#fbf6ea]/60 dark:bg-transparent p-10 text-center space-y-2">
                  <p className="font-serif text-base text-stone-700 dark:text-slate-300">
                    No se encontraron libros que coincidan con «{searchQuery}»
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              ) : shelfViewMode === 'shelf' ? (
                /* ─── Modo Balda de Madera (BookShelf auténtico idéntico a Mi Biblioteca) ─── */
                <BookShelf
                  books={activeCollectionBooks}
                  onOpenDetail={handleBookOpen}
                  openedBookId={openedBookId}
                />
              ) : shelfViewMode === 'grid' ? (
                /* ─── Modo Cuadrícula (BookCard idéntico a Mi Biblioteca) ─── */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
                  {activeCollectionBooks.map((book) => (
                    <div key={book.id} className="relative group/card">
                      <BookCard
                        book={book}
                        onOpenDetail={() => handleBookOpen(book.id)}
                        onEdit={onEditBook}
                        onDelete={onDeleteBook}
                        onQuickStatusChange={onQuickStatusChange}
                      />
                      <button
                        type="button"
                        onClick={(e) => handleRemoveBook(book.id, book.nombre, e)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white opacity-0 group-hover/card:opacity-100 transition shadow hover:scale-110 z-10"
                        title={`Quitar «${book.nombre}» de esta estantería`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                /* ─── Modo Lista (Tabla idéntica a Mi Biblioteca) ─── */
                <div className="rounded-2xl editorial-card-surface overflow-hidden">
                  <ul className="sm:hidden divide-y divide-amber-900/10 dark:divide-[#20293A]">
                    {activeCollectionBooks.map((book) => (
                      <li
                        key={book.id}
                        data-book-id={book.id}
                        onClick={() => handleBookOpen(book.id)}
                        className="flex items-center gap-3 p-3 active:bg-[#f4ead4] dark:active:bg-[#192131] cursor-pointer"
                      >
                        <div className="w-11 shrink-0">
                          <BookCover
                            nombre={book.nombre}
                            autor={book.autor}
                            portadaUrl={book.portadaUrl}
                            portadaFallbackUrl={book.portadaFallbackUrl}
                            portadaDataUrl={book.portadaDataUrl}
                            size="sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-serif font-bold text-sm leading-snug line-clamp-2">{book.nombre}</p>
                          <p className="text-[11px] text-stone-600 dark:text-slate-400 truncate">
                            {book.autor || '—'}
                            {book.sagaNombre ? ' · ' + book.sagaNombre + (book.volumen ? ' #' + String(book.volumen) : '') : ''}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-900/25 dark:border-slate-700 bg-[#efe3c8] dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-stone-800 dark:text-slate-200">
                              {book.progreso}
                            </span>
                            {book.puntuacion && (
                              <span className="text-[10px] tracking-tighter whitespace-nowrap">{formatStars(book.puntuacion)}</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveBook(book.id, book.nombre, e)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                          title="Quitar de esta estantería"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f0e5cc] dark:bg-[#101520] text-stone-700 dark:text-slate-400 border-b border-amber-900/20 dark:border-[#242E42]">
                        <tr>
                          <th className="p-3">Portada</th>
                          <th className="p-3">Título y Autor</th>
                          <th className="p-3">Género</th>
                          <th className="p-3">Saga</th>
                          <th className="p-3">Año / Págs.</th>
                          <th className="p-3">Puntuación</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-900/10 dark:divide-[#20293A]">
                        {activeCollectionBooks.map((book) => (
                          <tr
                            key={book.id}
                            data-book-id={book.id}
                            onClick={() => handleBookOpen(book.id)}
                            className="group hover:bg-[#f4ead4] dark:hover:bg-[#192131] cursor-pointer transition"
                          >
                            <td className="p-3 w-14">
                              <div className="w-11">
                                <BookCover
                                  nombre={book.nombre}
                                  autor={book.autor}
                                  portadaUrl={book.portadaUrl}
                                  portadaFallbackUrl={book.portadaFallbackUrl}
                                  portadaDataUrl={book.portadaDataUrl}
                                  size="sm"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-serif font-bold text-base text-left group-hover:text-amber-700 dark:group-hover:text-amber-400 block transition">
                                {book.nombre}
                              </span>
                              <span className="text-stone-600 dark:text-slate-400">{book.autor || '—'}</span>
                            </td>
                            <td className="p-3">{book.genero || '—'}</td>
                            <td className="p-3">
                              {book.sagaNombre ? (
                                <span className="rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 font-medium">
                                  {book.sagaNombre}{' '}
                                  {book.volumen ? '#' + String(book.volumen) : ''}
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3 text-stone-600 dark:text-slate-400">
                              {[
                                book.fechaPublicacion,
                                book.paginas ? String(book.paginas) + ' p.' : null
                              ]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                            </td>
                            <td className="p-3 whitespace-nowrap">{formatStars(book.puntuacion) || '—'}</td>
                            <td className="p-3 whitespace-nowrap">
                              <span className="inline-flex items-center whitespace-nowrap rounded-full border border-amber-900/25 dark:border-slate-700 bg-[#efe3c8] dark:bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-medium text-stone-800 dark:text-slate-200">
                                {book.progreso}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => handleRemoveBook(book.id, book.nombre, e)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                                title="Quitar de esta estantería"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Caso B: Galería de todas las estanterías */
            <div className="space-y-6">
              {collections.length === 0 ? (
                /* Estado vacío con plantillas sugeridas */
                <div className="rounded-3xl border border-amber-900/20 dark:border-amber-500/20 bg-gradient-to-br from-[#fbf6ea] via-[#f7efdc] to-[#edd9b7] dark:from-[#111724] dark:via-[#161D2B] dark:to-[#0D121B] p-6 sm:p-10 shadow-lg text-center space-y-6">
                  <div className="w-14 h-14 rounded-3xl bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-600/30 flex items-center justify-center mx-auto shadow-sm">
                    <Bookmark className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-white">
                      Crea tus propias estanterías
                    </h2>
                    <p className="text-xs text-stone-600 dark:text-slate-400">
                      Más allá de los estados de lectura, agrupa tus libros en colecciones especiales como favoritos, relecturas o listas temáticas.
                    </p>
                  </div>

                  {/* Plantillas sugeridas en 1 clic */}
                  <div className="space-y-2 max-w-xl mx-auto pt-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-stone-500 dark:text-slate-400 block">
                      ¿Por dónde empezar? Elige una plantilla sugerida:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                      {SUGGESTED_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.nombre}
                          type="button"
                          onClick={() => handleOpenCreate(tmpl)}
                          className="p-3.5 rounded-2xl border border-amber-900/20 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-amber-600 hover:scale-[1.01] transition space-y-1 shadow-xs"
                        >
                          <span className="font-serif font-bold text-xs text-stone-900 dark:text-white block">
                            {tmpl.nombre}
                          </span>
                          <span className="text-[10px] text-stone-500 dark:text-slate-400 block line-clamp-2">
                            {tmpl.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Cuadrícula de tarjetas de estanterías */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {collections.map((col) => {
                    const colBooks = col.bookIds
                      .map((id) => booksMap.get(id))
                      .filter((b): b is Book => Boolean(b));
                    const previewBooks = colBooks.slice(0, 3);

                    return (
                      <div
                        key={col.id}
                        onClick={() => setSelectedCollectionId(col.id)}
                        className="group relative rounded-3xl editorial-card-surface editorial-card-interactive p-5 cursor-pointer flex flex-col justify-between space-y-4"
                      >
                        <div>
                          {/* Cabecera de la tarjeta */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-600/20">
                                <Bookmark className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="font-serif font-bold text-base text-stone-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition truncate">
                                  {col.nombre}
                                </h3>
                                <span className="text-[11px] font-semibold text-stone-500 dark:text-slate-400">
                                  {col.bookIds.length} {col.bookIds.length === 1 ? 'obra' : 'obras'}
                                </span>
                              </div>
                            </div>

                            {/* Opciones */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEdit(col, e)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 transition"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCollection(col.id, col.nombre, e)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {col.descripcion && (
                            <p className="text-xs text-stone-600 dark:text-slate-400 mt-2 line-clamp-2">
                              {col.descripcion}
                            </p>
                          )}
                        </div>

                        {/* Previsualización en abanico de libros */}
                        <div className="relative pt-4 pb-2 border-t border-amber-900/10 dark:border-slate-800/80">
                          {previewBooks.length > 0 ? (
                            <div className="flex items-end gap-2.5 h-24 overflow-hidden">
                              {previewBooks.map((b, i) => (
                                <div
                                  key={b.id}
                                  className="w-14 shrink-0 relative transition-transform duration-300 group-hover:-translate-y-1"
                                  style={{ transform: `rotate(${(i - 1) * 3}deg)` }}
                                >
                                  <div className="absolute -bottom-1 left-0.5 right-0.5 h-2 bg-black/40 blur-[1px] rounded-full pointer-events-none" />
                                  <BookCover
                                    nombre={b.nombre}
                                    autor={b.autor}
                                    portadaUrl={b.portadaUrl}
                                    portadaFallbackUrl={b.portadaFallbackUrl}
                                    portadaDataUrl={b.portadaDataUrl}
                                    size="sm"
                                    variant="book"
                                  />
                                </div>
                              ))}
                              {colBooks.length > 3 && (
                                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-400 self-center pl-2">
                                  +{colBooks.length - 3} más
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="h-24 flex items-center justify-center text-xs italic text-stone-400 dark:text-slate-500">
                              Estantería vacía
                            </div>
                          )}
                        </div>

                        {/* Pie de tarjeta */}
                        <div className="flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-400 pt-1">
                          <span>Ver estantería</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border border-amber-900/30 dark:border-amber-500/20 bg-[#fdfbf7] dark:bg-[#121722] text-stone-900 dark:text-white p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-600/20">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                    {editingCollection ? 'Editar Estantería' : 'Nueva Estantería Personalizada'}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-slate-400">
                    Define el nombre y temática de tu colección
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCollection} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-stone-700 dark:text-slate-300 block">
                  Nombre de la estantería *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Favoritos de Fantasía, Relecturas..."
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-stone-700 dark:text-slate-300 block">
                  Descripción (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe qué tipo de obras componen esta colección..."
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600 resize-none"
                />
              </div>

              {/* Selector de Icono */}
              <div className="space-y-1.5">
                <label className="font-semibold text-stone-700 dark:text-slate-300 block">
                  Icono identificador
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {Object.entries(AVAILABLE_ICONS).map(([id, IconComponent]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setModalIcon(id)}
                      className={
                        'p-2 rounded-xl border transition ' +
                        (modalIcon === id
                          ? 'border-amber-600 bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'border-stone-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800 text-stone-600 dark:text-slate-400 hover:border-amber-500')
                      }
                    >
                      <IconComponent className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!modalName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  {editingCollection ? 'Guardar Cambios' : 'Crear Estantería'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL: SELECTOR DE LIBROS PARA LA COLECCIÓN ACTIVA ─── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isBookPickerOpen && activeCollection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsBookPickerOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border border-amber-900/30 dark:border-amber-500/20 bg-[#fdfbf7] dark:bg-[#121722] text-stone-900 dark:text-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-amber-900/15 dark:border-[#222B3D] pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                  Añadir Obras a «{activeCollection.nombre}»
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Haz clic para incluir o retirar libros de esta estantería
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBookPickerOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por título, autor o género..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-amber-600"
                autoFocus
              />
            </div>

            {/* Listado de libros para seleccionar */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-80 [scrollbar-width:thin]">
              {books
                .filter((b) => {
                  if (!pickerSearch.trim()) return true;
                  const q = pickerSearch.toLowerCase().trim();
                  return (
                    b.nombre.toLowerCase().includes(q) ||
                    b.autor.toLowerCase().includes(q) ||
                    (b.genero && b.genero.toLowerCase().includes(q))
                  );
                })
                .map((b) => {
                  const isIncluded = activeCollection.bookIds.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleTogglePickerBook(b.id)}
                      className={
                        'p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ' +
                        (isIncluded
                          ? 'border-amber-600 bg-amber-500/15'
                          : 'border-amber-900/10 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 hover:border-amber-500/40')
                      }
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 shrink-0">
                          <BookCover
                            nombre={b.nombre}
                            autor={b.autor}
                            portadaUrl={b.portadaUrl}
                            portadaFallbackUrl={b.portadaFallbackUrl}
                            portadaDataUrl={b.portadaDataUrl}
                            size="sm"
                            variant="book"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-serif font-bold text-xs truncate text-stone-900 dark:text-white">
                            {b.nombre}
                          </h4>
                          <p className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                            {b.autor}
                          </p>
                        </div>
                      </div>

                      <div
                        className={
                          'w-5 h-5 rounded-lg border flex items-center justify-center transition shrink-0 ' +
                          (isIncluded
                            ? 'border-amber-600 bg-amber-500 text-slate-950 font-bold'
                            : 'border-stone-400/50 dark:border-slate-700 bg-transparent')
                        }
                      >
                        {isIncluded && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-amber-900/15 dark:border-[#222B3D]">
              <span className="text-xs font-semibold text-stone-600 dark:text-slate-400">
                {activeCollection.bookIds.length} libros seleccionados
              </span>
              <button
                type="button"
                onClick={() => setIsBookPickerOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Registro de Préstamo ─── */}
      
    </div>
  );
};
