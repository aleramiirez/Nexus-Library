import React from 'react';
import { Images } from 'lucide-react';
import { inputCls, labelCls } from './styles';

interface CountryItem {
  code: string;
  name: string;
  flag: string;
}

interface BookFormEditionTabProps {
  fechaPublicacion: string;
  setFechaPublicacion: (val: string) => void;
  paginas: string;
  setPaginas: (val: string) => void;
  editorial: string;
  setEditorial: (val: string) => void;
  pais: string;
  setPais: (val: string) => void;
  sortedCountries: CountryItem[];
  autoDetectedCountry: CountryItem | null;
  idioma: string;
  setIdioma: (val: string) => void;
  isbn: string;
  setIsbn: (val: string) => void;
  portadaUrl: string;
  setPortadaUrl: (val: string) => void;
  onOpenCoverPicker: () => void;
  sinopsis: string;
  setSinopsis: (val: string) => void;
  notasPersonales: string;
  setNotasPersonales: (val: string) => void;
}

export const BookFormEditionTab: React.FC<BookFormEditionTabProps> = ({
  fechaPublicacion,
  setFechaPublicacion,
  paginas,
  setPaginas,
  editorial,
  setEditorial,
  pais,
  setPais,
  sortedCountries,
  autoDetectedCountry,
  idioma,
  setIdioma,
  isbn,
  setIsbn,
  portadaUrl,
  setPortadaUrl,
  onOpenCoverPicker,
  sinopsis,
  setSinopsis,
  notasPersonales,
  setNotasPersonales
}) => {
  return (
    <div className="space-y-5">
      {/* Año Publicación & Páginas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="add-book-year" className={labelCls}>
            Año Publicación
          </label>
          <input
            id="add-book-year"
            type="number"
            value={fechaPublicacion}
            onChange={(e) => setFechaPublicacion(e.target.value)}
            placeholder="Ej. 2007"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="add-book-pages" className={labelCls}>
            Páginas
          </label>
          <input
            id="add-book-pages"
            type="number"
            min="1"
            value={paginas}
            onChange={(e) => setPaginas(e.target.value)}
            placeholder="Ej. 880"
            className={inputCls}
          />
        </div>
      </div>

      {/* Editorial, País de origen / autor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="add-book-editorial" className={labelCls}>
            Editorial
          </label>
          <input
            id="add-book-editorial"
            type="text"
            value={editorial}
            onChange={(e) => setEditorial(e.target.value)}
            placeholder="Ej. Alfaguara, Cátedra..."
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="add-book-pais" className={labelCls}>
            País de origen / autor
          </label>
          <select
            id="add-book-pais"
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            className={inputCls}
          >
            <option value="">
              ✨ Detectar automáticamente por autor{autoDetectedCountry ? ` (${autoDetectedCountry.flag} ${autoDetectedCountry.name})` : ''}
            </option>
            {sortedCountries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Idioma & ISBN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="add-book-idioma" className={labelCls}>
            Idioma
          </label>
          <input
            id="add-book-idioma"
            type="text"
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
            placeholder="Ej. Español, Inglés..."
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="add-book-isbn" className={labelCls}>
            ISBN (opcional)
          </label>
          <input
            id="add-book-isbn"
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            placeholder="ISBN-13 o ISBN-10"
            className={inputCls}
          />
        </div>
      </div>

      {/* Cover URL */}
      <div>
        <label htmlFor="add-book-portada-url" className="block text-[11px] text-stone-600 dark:text-slate-400 mb-1">
          URL de portada (autocompletada o personalizada)
        </label>
        <div className="flex gap-2">
          <input
            id="add-book-portada-url"
            type="url"
            value={portadaUrl}
            onChange={(e) => setPortadaUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
          />
          <button
            type="button"
            onClick={onOpenCoverPicker}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border border-amber-600/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-950 dark:text-amber-200 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Images className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            <span>Explorar ediciones</span>
          </button>
        </div>
      </div>

      {/* Synopsis */}
      <div>
        <label htmlFor="add-book-sinopsis" className={labelCls}>
          Sinopsis
        </label>
        <textarea
          id="add-book-sinopsis"
          rows={4}
          value={sinopsis}
          onChange={(e) => setSinopsis(e.target.value)}
          className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-2.5 text-xs focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
        />
      </div>

      {/* Notas Personales y Reseña */}
      <div>
        <label htmlFor="add-book-notas" className={labelCls}>
          Notas personales, reflexiones o reseña
        </label>
        <textarea
          id="add-book-notas"
          rows={3}
          value={notasPersonales}
          onChange={(e) => setNotasPersonales(e.target.value)}
          placeholder="Añade tus impresiones personales, reflexiones o reseña sobre este libro..."
          className="w-full rounded-lg border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#0D1017] p-2.5 text-xs focus:border-amber-600 dark:focus:border-amber-400 focus:outline-none transition"
        />
      </div>
    </div>
  );
};
