import React, { useState, useMemo } from 'react';
import {
  Bookmark,
  Plus,
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
  UserCheck,
  Calendar,
  AlertCircle,
  Check,
  Clock,
  ChevronRight,
  FolderPlus,
  X
} from 'lucide-react';
import { Book, CustomCollection, LentRecord } from '../types/models';
import { collectionService } from '../services/collectionService';
import { BookCover } from './BookCover';
import { LentBookModal } from './LentBookModal';
import '../book-shelf.css';

interface CollectionsScreenProps {
  books: Book[];
  currentUserId?: string;
  onOpenBookDetail?: (book: Book) => void;
  onShowToast?: (message: string) => void;
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
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'shelves' | 'lent'>('shelves');
  const [collections, setCollections] = useState<CustomCollection[]>(() =>
    collectionService.getCollections(currentUserId)
  );
  const [lentRecords, setLentRecords] = useState<LentRecord[]>(() =>
    collectionService.getLentRecords(currentUserId)
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

  const [isLendModalOpen, setIsLendModalOpen] = useState(false);
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const refreshData = () => {
    setCollections(collectionService.getCollections(currentUserId));
    setLentRecords(collectionService.getLentRecords(currentUserId));
  };

  const activeCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return collections.find((c) => c.id === selectedCollectionId) || null;
  }, [collections, selectedCollectionId]);

  const activeCollectionBooks = useMemo(() => {
    if (!activeCollection) return [];
    const bookMap = new Map(books.map((b) => [b.id, b]));
    const matched = activeCollection.bookIds
      .map((id) => bookMap.get(id))
      .filter((b): b is Book => Boolean(b));

    if (!searchQuery.trim()) return matched;
    const q = searchQuery.toLowerCase().trim();
    return matched.filter(
      (b) =>
        b.nombre.toLowerCase().includes(q) ||
        b.autor.toLowerCase().includes(q) ||
        (b.genero && b.genero.toLowerCase().includes(q))
    );
  }, [activeCollection, books, searchQuery]);

  // Libros prestados activos e históricos
  const activeLentRecords = useMemo(() => {
    return lentRecords.filter((r) => !r.returned);
  }, [lentRecords]);

  const returnedLentRecords = useMemo(() => {
    return lentRecords.filter((r) => r.returned);
  }, [lentRecords]);

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
            Organiza tus obras en baldas temáticas personalizadas y lleva el registro de libros prestados
          </p>
        </div>

        {/* Acciones superiores */}
        <div className="flex items-center gap-2">
          {/* Selector de pestañas */}
          <div className="inline-flex items-center rounded-xl border border-amber-900/20 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#141A26] p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('shelves');
                setSelectedCollectionId(null);
              }}
              className={
                'rounded-lg px-3 py-1 font-semibold transition ' +
                (activeTab === 'shelves'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-stone-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300')
              }
            >
              Estanterías ({collections.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('lent');
                setSelectedCollectionId(null);
              }}
              className={
                'rounded-lg px-3 py-1 font-semibold transition relative ' +
                (activeTab === 'lent'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-stone-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300')
              }
            >
              Libros Prestados ({activeLentRecords.length})
              {activeLentRecords.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block ml-1.5 align-middle" />
              )}
            </button>
          </div>

          {activeTab === 'shelves' ? (
            <button
              type="button"
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Estantería</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLendModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              <span>Prestar Libro</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ─── PESTAÑA 1: ESTANTERÍAS PERSONALIZADAS ─── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'shelves' && (
        <>
          {/* Caso A: Vista detalle de una estantería seleccionada */}
          {activeCollection ? (
            <div className="space-y-6">
              {/* Barra superior de navegación de la estantería */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/90 dark:bg-[#141A26]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCollectionId(null)}
                    className="p-2 rounded-xl border border-amber-900/20 dark:border-slate-700 hover:border-amber-600 text-stone-700 dark:text-slate-300 hover:text-amber-700 transition"
                    title="Volver a todas las estanterías"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
                        {activeCollection.nombre}
                      </h2>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(activeCollection, e)}
                        className="p-1 text-stone-400 hover:text-amber-600 transition"
                        title="Editar nombre y descripción"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {activeCollection.descripcion && (
                      <p className="text-xs text-stone-600 dark:text-slate-400 mt-0.5">
                        {activeCollection.descripcion}
                      </p>
                    )}
                  </div>
                </div>

                {/* Controles de la estantería: Búsqueda, Modos de vista y Añadir libros */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Buscar en esta estantería..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-amber-900/15 dark:border-slate-700 bg-white/70 dark:bg-slate-900 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-amber-500 w-48 sm:w-56"
                    />
                  </div>

                  {/* Selector de modo de vista: Shelf / Grid / List */}
                  <div className="inline-flex rounded-xl border border-amber-900/20 dark:border-slate-700 bg-white/70 dark:bg-slate-900 p-0.5">
                    <button
                      type="button"
                      onClick={() => setShelfViewMode('shelf')}
                      className={
                        'p-1.5 rounded-lg transition ' +
                        (shelfViewMode === 'shelf'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-white')
                      }
                      title="Vista Balda de madera"
                    >
                      <ShelfIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShelfViewMode('grid')}
                      className={
                        'p-1.5 rounded-lg transition ' +
                        (shelfViewMode === 'grid'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-white')
                      }
                      title="Vista Cuadrícula"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShelfViewMode('list')}
                      className={
                        'p-1.5 rounded-lg transition ' +
                        (shelfViewMode === 'list'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                          : 'text-stone-500 hover:text-stone-800 dark:hover:text-white')
                      }
                      title="Vista Lista"
                    >
                      <ListIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch('');
                      setIsBookPickerOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir libros</span>
                  </button>
                </div>
              </div>

              {/* Contenido de libros de la estantería */}
              {activeCollectionBooks.length === 0 ? (
                <div className="py-16 text-center rounded-3xl border border-dashed border-amber-900/20 dark:border-slate-800 bg-[#fbf6ea]/40 dark:bg-[#141A26]/40 p-8 space-y-3">
                  <Bookmark className="w-10 h-10 text-amber-600/50 mx-auto" />
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
              ) : shelfViewMode === 'shelf' ? (
                /* ─── Modo Balda de Madera ─── */
                <div className="bookcase rounded-3xl border border-amber-900/20 dark:border-amber-500/15 bg-amber-950/5 dark:bg-black/30 p-4 sm:p-6 shadow-inner space-y-8">
                  {/* Partir libros en baldas de hasta 6 obras */}
                  {Array.from({ length: Math.ceil(activeCollectionBooks.length / 6) }).map((_, rowIdx) => {
                    const rowBooks = activeCollectionBooks.slice(rowIdx * 6, (rowIdx + 1) * 6);
                    return (
                      <div key={rowIdx} className="space-y-0">
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-6 items-end pb-1 px-2">
                          {rowBooks.map((b) => (
                            <div
                              key={b.id}
                              onClick={() => onOpenBookDetail?.(b)}
                              className="group relative cursor-pointer text-left space-y-1.5 transition-transform duration-300 hover:-translate-y-2 active:scale-95"
                              title={`${b.nombre} (por ${b.autor})`}
                            >
                              {/* Sombra de contacto sobre la balda */}
                              <div className="absolute -bottom-1.5 left-1 right-1 h-3 bg-black/45 blur-[2px] rounded-full pointer-events-none" />
                              <BookCover
                                nombre={b.nombre}
                                autor={b.autor}
                                portadaUrl={b.portadaUrl}
                                portadaFallbackUrl={b.portadaFallbackUrl}
                                portadaDataUrl={b.portadaDataUrl}
                                size="sm"
                                variant="book"
                              />

                              {/* Botón rápido para retirar de la colección al pasar el ratón */}
                              <button
                                type="button"
                                onClick={(e) => handleRemoveBook(b.id, b.nombre, e)}
                                className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow hover:scale-110 z-10"
                                title="Quitar de esta estantería"
                              >
                                <X className="w-3 h-3" />
                              </button>

                              <p className="font-serif text-[11px] font-semibold text-stone-900 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                {b.nombre}
                              </p>
                              <p className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                                {b.autor}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Balda de madera auténtica */}
                        <div className="shelf-plank -mx-2 mt-1" aria-hidden="true">
                          <div className="shelf-plank-top" />
                          <div className="shelf-plank-front flex items-center justify-center">
                            <span className="text-[9px] font-serif tracking-widest text-amber-900/60 dark:text-amber-200/50 uppercase font-bold py-0.5">
                              {activeCollection.nombre} · Balda {rowIdx + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : shelfViewMode === 'grid' ? (
                /* ─── Modo Cuadrícula ─── */
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {activeCollectionBooks.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onOpenBookDetail?.(b)}
                      className="group relative cursor-pointer text-left space-y-1.5 transition-transform duration-300 hover:-translate-y-1.5 active:scale-95"
                    >
                      <div className="relative">
                        <div className="absolute -bottom-1.5 left-1 right-1 h-2.5 bg-black/40 blur-[2px] rounded-full pointer-events-none" />
                        <BookCover
                          nombre={b.nombre}
                          autor={b.autor}
                          portadaUrl={b.portadaUrl}
                          portadaFallbackUrl={b.portadaFallbackUrl}
                          portadaDataUrl={b.portadaDataUrl}
                          size="sm"
                          variant="book"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleRemoveBook(b.id, b.nombre, e)}
                          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow hover:scale-110 z-10"
                          title="Quitar de esta estantería"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <h4 className="font-serif text-xs font-semibold truncate text-stone-900 dark:text-white group-hover:text-amber-600">
                        {b.nombre}
                      </h4>
                      <p className="text-[10px] text-stone-500 dark:text-slate-400 truncate">
                        {b.autor}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                /* ─── Modo Lista ─── */
                <div className="rounded-2xl border border-amber-900/15 dark:border-[#222B3D] divide-y divide-amber-900/10 dark:divide-slate-800 overflow-hidden bg-white/60 dark:bg-[#141A26]/80">
                  {activeCollectionBooks.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => onOpenBookDetail?.(b)}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-amber-500/5 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 shrink-0">
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
                          <h4 className="font-serif font-bold text-xs sm:text-sm truncate text-stone-900 dark:text-white">
                            {b.nombre}
                          </h4>
                          <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                            {b.autor} {b.genero ? `· ${b.genero}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-stone-600 dark:text-slate-400">
                          {b.progreso}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveBook(b.id, b.nombre, e)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 transition"
                          title="Quitar de esta estantería"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                        className="group relative rounded-3xl border border-amber-900/20 dark:border-[#222B3D] bg-[#fbf6ea]/90 dark:bg-[#141A26] p-5 shadow-sm hover:shadow-xl hover:border-amber-600/50 transition cursor-pointer flex flex-col justify-between space-y-4"
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
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ─── PESTAÑA 2: LIBRO DE PRÉSTAMOS (LENDING LEDGER) ─── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'lent' && (
        <div className="space-y-8">
          {/* Préstamos Activos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-amber-900/15 dark:border-[#222B3D] pb-2">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span>Libros Actualmente Prestados</span>
                </h2>
                <p className="text-xs text-stone-600 dark:text-slate-400">
                  Ejemplares físicos que están en manos de amigos, familiares o conocidos
                </p>
              </div>
              <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2.5 py-1 rounded-xl">
                {activeLentRecords.length} en préstamo
              </span>
            </div>

            {activeLentRecords.length === 0 ? (
              <div className="py-12 text-center rounded-3xl border border-dashed border-amber-900/20 dark:border-slate-800 p-6 space-y-2.5">
                <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                <h3 className="font-serif text-base font-bold text-stone-800 dark:text-slate-200">
                  No tienes ningún libro prestado ahora mismo
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 max-w-sm mx-auto">
                  Todos tus libros físicos están a salvo en tus estanterías. Si le dejas uno a alguien, puedes anotarlo aquí.
                </p>
                <button
                  type="button"
                  onClick={() => setIsLendModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Anotar un préstamo</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLentRecords.map((r) => {
                  const lentBook = booksMap.get(r.bookId);
                  const daysElapsed = Math.floor(
                    (new Date().getTime() - new Date(r.borrowDate).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const isLongLoan = daysElapsed > 30;

                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-3xl border border-amber-900/20 dark:border-[#253044] bg-[#fbf6ea]/95 dark:bg-[#141A26] space-y-3 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-14 shrink-0 cursor-pointer"
                          onClick={() => lentBook && onOpenBookDetail?.(lentBook)}
                        >
                          <BookCover
                            nombre={lentBook ? lentBook.nombre : 'Obra'}
                            autor={lentBook ? lentBook.autor : ''}
                            portadaUrl={lentBook?.portadaUrl}
                            portadaFallbackUrl={lentBook?.portadaFallbackUrl}
                            portadaDataUrl={lentBook?.portadaDataUrl}
                            size="sm"
                            variant="book"
                          />
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider">
                            Prestado a:
                          </span>
                          <h3 className="font-serif font-bold text-base text-stone-900 dark:text-white truncate">
                            {r.borrowerName}
                          </h3>
                          <p className="text-xs font-semibold text-stone-800 dark:text-slate-200 truncate">
                            «{lentBook ? lentBook.nombre : 'Libro desconocido'}»
                          </p>
                          <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                            {lentBook?.autor}
                          </p>
                        </div>
                      </div>

                      {/* Detalles del préstamo */}
                      <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-slate-800/50 border border-amber-900/10 dark:border-slate-700/50 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-slate-400">Fecha del préstamo:</span>
                          <span className="font-mono font-bold text-stone-800 dark:text-slate-200">
                            {r.borrowDate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 dark:text-slate-400">Tiempo prestado:</span>
                          <span
                            className={
                              'font-bold ' +
                              (isLongLoan ? 'text-rose-600 dark:text-rose-400' : 'text-amber-800 dark:text-amber-400')
                            }
                          >
                            {daysElapsed} {daysElapsed === 1 ? 'día' : 'días'}
                            {isLongLoan && ' (¡recuérdale pedirlo!)'}
                          </span>
                        </div>
                        {r.expectedReturnDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-stone-600 dark:text-slate-400">Devolución esperada:</span>
                            <span className="font-mono text-stone-700 dark:text-slate-300">
                              {r.expectedReturnDate}
                            </span>
                          </div>
                        )}
                        {r.notes && (
                          <p className="text-[11px] italic text-stone-600 dark:text-slate-400 border-t border-amber-900/10 dark:border-slate-700 pt-1">
                            «{r.notes}»
                          </p>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteLentRecord(r.id)}
                          className="px-2.5 py-1.5 rounded-xl text-stone-400 hover:text-rose-600 text-xs transition"
                          title="Eliminar este apunte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkReturned(r.id, lentBook?.nombre || 'Libro')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Marcar como devuelto</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historial de Devoluciones */}
          {returnedLentRecords.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-amber-900/15 dark:border-[#222B3D]">
              <h3 className="font-serif text-base font-bold text-stone-800 dark:text-slate-200">
                Historial de Libros Devueltos ({returnedLentRecords.length})
              </h3>
              <div className="rounded-2xl border border-amber-900/15 dark:border-[#222B3D] divide-y divide-amber-900/10 dark:divide-slate-800 bg-white/50 dark:bg-[#141A26]/60 overflow-hidden text-xs">
                {returnedLentRecords.map((r) => {
                  const b = booksMap.get(r.bookId);
                  return (
                    <div key={r.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <span className="font-serif font-bold text-stone-900 dark:text-white">
                          «{b ? b.nombre : 'Libro'}»
                        </span>
                        <span className="text-stone-500 dark:text-slate-400 block text-[11px]">
                          Prestado a {r.borrowerName} del {r.borrowDate} al {r.returnedDate || 'Recuperado'}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" /> Devuelto
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL: CREAR / EDITAR ESTANTERÍA ─── */}
      {/* ══════════════════════════════════════════════════════════════ */}
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
      {isLendModalOpen && (
        <LentBookModal
          isOpen={isLendModalOpen}
          onClose={() => setIsLendModalOpen(false)}
          allBooks={books}
          currentUserId={currentUserId}
          onShowToast={onShowToast}
          onLentChanged={refreshData}
        />
      )}
    </div>
  );
};
