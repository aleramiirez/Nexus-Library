import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Calendar,
  BookOpen,
  Check,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Book, LentRecord } from '../types/models';
import { collectionService } from '../services/collectionService';
import { BookCover } from './BookCover';

interface LentBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book?: Book | null;
  allBooks?: Book[];
  currentUserId?: string;
  onShowToast?: (message: string) => void;
  onLentChanged?: () => void;
}

export const LentBookModal: React.FC<LentBookModalProps> = ({
  isOpen,
  onClose,
  book,
  allBooks = [],
  currentUserId,
  onShowToast,
  onLentChanged
}) => {
  const [selectedBookId, setSelectedBookId] = useState<string>(book?.id || '');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedBookId(book?.id || (allBooks[0]?.id || ''));
      setBorrowerName('');
      setBorrowDate(new Date().toISOString().slice(0, 10));
      setExpectedReturnDate('');
      setNotes('');
      setError('');
    }
  }, [isOpen, book, allBooks]);

  if (!isOpen) return null;

  const targetBook = book || allBooks.find((b) => b.id === selectedBookId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBook) {
      setError('Por favor, selecciona un libro.');
      return;
    }
    if (!borrowerName.trim()) {
      setError('Indica el nombre de la persona a quien prestas el libro.');
      return;
    }

    collectionService.lendBook(
      {
        bookId: targetBook.id,
        borrowerName: borrowerName.trim(),
        borrowDate,
        expectedReturnDate: expectedReturnDate || undefined,
        notes: notes.trim()
      },
      currentUserId
    );

    onLentChanged?.();
    onShowToast?.(`Préstamo de «${targetBook.nombre}» a ${borrowerName.trim()} registrado.`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-amber-900/30 dark:border-amber-500/20 bg-[#fdfbf7] dark:bg-[#121722] text-stone-900 dark:text-white p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-600/25">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-white">
                Registrar Préstamo de Libro
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                Lleva el control de tus ejemplares físicos prestados
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

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Libro a prestar */}
          {book ? (
            <div className="p-3 rounded-2xl border border-amber-900/15 dark:border-[#222B3D] bg-white/60 dark:bg-slate-900/40 flex items-center gap-3">
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
                <h4 className="font-serif font-bold text-sm truncate text-stone-900 dark:text-white">
                  {book.nombre}
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                  {book.autor}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-slate-300 block">
                Selecciona el libro a prestar *
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600"
              >
                {allBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} — {b.autor}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nombre de la persona */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-slate-300 block">
              ¿A quién se lo has prestado? *
            </label>
            <input
              type="text"
              placeholder="Ej. Carlos, Laura, Mi hermana..."
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600"
              autoFocus
            />
          </div>

          {/* Fechas de préstamo y devolución */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-slate-300 block">
                Fecha del préstamo *
              </label>
              <input
                type="date"
                value={borrowDate}
                onChange={(e) => setBorrowDate(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-stone-700 dark:text-slate-300 block">
                Devolución prevista
              </label>
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="font-semibold text-stone-700 dark:text-slate-300 block">
              Notas u observaciones (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Edición especial de tapa dura, devolvérmelo antes de Navidad..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-stone-900 dark:text-white focus:outline-none focus:border-amber-600 resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Registrar Préstamo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
