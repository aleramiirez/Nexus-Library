import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  Plus,
  Check,
  FolderPlus,
  Heart,
  Sparkles,
  Star,
  Flame,
  Coffee,
  Compass,
  Gift,
  BookMarked
} from 'lucide-react';
import { Book, CustomCollection } from '../types/models';
import { collectionService } from '../services/collectionService';
import { BookCover } from './BookCover';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  currentUserId?: string;
  onShowToast?: (message: string) => void;
  onCollectionsChanged?: () => void;
}

const AVAILABLE_ICONS = [
  { id: 'Bookmark', Icon: Bookmark, label: 'Marcador' },
  { id: 'Heart', Icon: Heart, label: 'Favorito' },
  { id: 'Sparkles', Icon: Sparkles, label: 'Especial' },
  { id: 'Star', Icon: Star, label: 'Destacado' },
  { id: 'Flame', Icon: Flame, label: 'Intenso' },
  { id: 'Coffee', Icon: Coffee, label: 'Relax' },
  { id: 'Compass', Icon: Compass, label: 'Aventura' },
  { id: 'Gift', Icon: Gift, label: 'Regalo' }
];

export const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  isOpen,
  onClose,
  book,
  currentUserId,
  onShowToast,
  onCollectionsChanged
}) => {
  const [collections, setCollections] = useState<CustomCollection[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newShelfName, setNewShelfName] = useState('');
  const [newShelfIcon, setNewShelfIcon] = useState('Bookmark');

  useEffect(() => {
    if (!isOpen) return;
    const all = collectionService.getCollections(currentUserId);
    setCollections(all);

  }, [isOpen, book.id, currentUserId]);

  if (!isOpen) return null;

  const handleToggle = (collectionId: string) => {
    const isNowIn = collectionService.toggleBookInCollection(collectionId, book.id, currentUserId);
    setCollections(collectionService.getCollections(currentUserId));
    onCollectionsChanged?.();

    const target = collections.find((c) => c.id === collectionId);
    if (target) {
      onShowToast?.(
        isNowIn
          ? `Añadido a «${target.nombre}»`
          : `Eliminado de «${target.nombre}»`
      );
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfName.trim()) return;

    const created = collectionService.createCollection(
      {
        nombre: newShelfName.trim(),
        icono: newShelfIcon,
        initialBookIds: [book.id]
      },
      currentUserId
    );

    setCollections(collectionService.getCollections(currentUserId));
    setNewShelfName('');
    setIsCreatingNew(false);
    onCollectionsChanged?.();
    onShowToast?.(`Colección «${created.nombre}» creada y libro añadido.`);
  };

    return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-amber-900/30 dark:border-amber-500/20 bg-[#fdfbf7] dark:bg-[#121722] text-stone-900 dark:text-white p-5 sm:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con datos del libro */}
        <div className="flex items-start justify-between gap-3 border-b border-amber-900/15 dark:border-[#222B3D] pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 shrink-0">
              <BookCover
                nombre={book.nombre}
                autor={book.autor}
                portadaUrl={book.portadaUrl}
                portadaFallbackUrl={book.portadaFallbackUrl}
                portadaDataUrl={book.portadaDataUrl}
                size="sm"
                variant="book"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400 block">
                Organizar en Estanterías
              </span>
              <h3 className="font-serif font-bold text-sm sm:text-base truncate text-stone-900 dark:text-white">
                {book.nombre}
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 truncate">
                {book.autor}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de colecciones disponibles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-serif font-bold text-stone-700 dark:text-slate-300">
              Tus Estanterías Personalizadas
            </label>
            {!isCreatingNew && (
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva estantería</span>
              </button>
            )}
          </div>

          {/* Formulario rápido para crear una estantería */}
          {isCreatingNew && (
            <form
              onSubmit={handleCreateNew}
              className="p-3.5 rounded-2xl border border-amber-600/30 bg-amber-500/10 dark:bg-amber-500/5 space-y-3 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold text-stone-800 dark:text-slate-200">
                  Crear Estantería & Añadir Libro
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-white text-xs"
                >
                  Cancelar
                </button>
              </div>

              <input
                type="text"
                placeholder="Ej. Favoritos de Fantasía, Relecturas..."
                value={newShelfName}
                onChange={(e) => setNewShelfName(e.target.value)}
                className="w-full rounded-xl border border-amber-900/20 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600"
                autoFocus
              />

              {/* Selector de icono */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {AVAILABLE_ICONS.map(({ id, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNewShelfIcon(id)}
                    className={
                      'p-2 rounded-xl border transition ' +
                      (newShelfIcon === id
                        ? 'border-amber-600 bg-amber-500 text-slate-950 font-bold'
                        : 'border-amber-900/15 dark:border-slate-700 bg-white/70 dark:bg-slate-800 text-stone-600 dark:text-slate-400 hover:border-amber-500')
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newShelfName.trim()}
                className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-sm transition"
              >
                Crear y Añadir a esta Estantería
              </button>
            </form>
          )}

          {/* Listado de colecciones existentes */}
          {collections.length === 0 && !isCreatingNew ? (
            <div className="py-6 text-center space-y-2 rounded-2xl border border-dashed border-amber-900/20 dark:border-slate-800 p-4">
              <FolderPlus className="w-7 h-7 text-amber-600/70 mx-auto" />
              <p className="text-xs text-stone-600 dark:text-slate-400">
                Aún no tienes estanterías personalizadas. Crea una para agrupar tus libros temáticamente.
              </p>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear primera estantería</span>
              </button>
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 [scrollbar-width:thin]">
              {collections.map((col) => {
                const isSelected = col.bookIds.includes(book.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleToggle(col.id)}
                    className={
                      'w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ' +
                      (isSelected
                        ? 'border-amber-600 bg-amber-500/15 text-stone-900 dark:text-white font-semibold'
                        : 'border-amber-900/15 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-stone-700 dark:text-slate-300 hover:border-amber-500/40')
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={
                          'w-7 h-7 rounded-lg flex items-center justify-center ' +
                          (isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400')
                        }
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-serif font-bold block truncate">
                          {col.nombre}
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-slate-400 block">
                          {col.bookIds.length} {col.bookIds.length === 1 ? 'libro' : 'libros'}
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        'w-5 h-5 rounded-lg border flex items-center justify-center transition ' +
                        (isSelected
                          ? 'border-amber-600 bg-amber-500 text-slate-950'
                          : 'border-stone-400/50 dark:border-slate-700 bg-transparent')
                      }
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
