import { test, expect } from '@playwright/test';
import { importFromCSV, cleanIsbn } from '../src/services/importExportService';

test.describe('CSV Import: Goodreads, StoryGraph y Nexus Library', () => {
  test('limpia formatos especiales de ISBN de Goodreads como ="978..."', () => {
    expect(cleanIsbn('="9780765311788"')).toBe('9780765311788');
    expect(cleanIsbn('="076531178X"')).toBe('076531178X');
    expect(cleanIsbn('978-0-7653-1178-8')).toBe('9780765311788');
    expect(cleanIsbn('')).toBe('');
  });

  test('parsea CSV de exportación de Goodreads extrayendo sagas del título, rating 0 a null, reseñas y read count', () => {
    const csv = `"Book Id","Title","Author","Author l-f","Additional Authors","ISBN","ISBN13","My Rating","Average Rating","Publisher","Binding","Number of Pages","Year Published","Original Publication Year","Date Read","Date Added","Bookshelves","Bookshelves with positions","Exclusive Shelf","My Review","Spoilers","Private Notes","Read Count","Recommended For","Recommended By","Owned Copies","Original Purchase Date","Original Purchase Location","Condition","Condition Description","BCID"
"123456","El Imperio Final (Nacidos de la Bruma, #1)","Brandon Sanderson","Sanderson, Brandon","","=""076531178X""","=""9780765311788""","5","4.45","Tor Books","Hardcover","541","2006","2006","2023/05/10","2023/01/01","","","read","Obra cumbre de la fantasía moderna","","","2","","","0","","","","",""
"789012","El Pozo de la Ascensión (Nacidos de la Bruma, #2)","Brandon Sanderson","Sanderson, Brandon","","=""0765316889""","=""9780765316882""","0","4.37","Tor Books","Hardcover","590","2007","2007","","2023/01/02","","","currently-reading","","","","0","","","0","","","","",""
"345678","El Héroe de las Eras (Nacidos de la Bruma, #3)","Brandon Sanderson","Sanderson, Brandon","","=""0765316897""","=""9780765316899""","0","4.50","Tor Books","Hardcover","572","2008","2008","","2023/01/03","","","to-read","","","","0","","","0","","","","",""`;

    const result = importFromCSV(csv);
    expect(result.source).toBe('goodreads');
    expect(result.sagas).toContain('Nacidos de la Bruma');
    expect(result.books).toHaveLength(3);

    // Libro 1: leído, rating 5, vecesLeido 2, saga extraída
    const b1 = result.books[0];
    expect(b1.nombre).toBe('El Imperio Final');
    expect(b1.sagaNombre).toBe('Nacidos de la Bruma');
    expect(b1.volumen).toBe(1);
    expect(b1.isbn).toBe('9780765311788');
    expect(b1.puntuacion).toBe(5);
    expect(b1.progreso).toBe('✅ Leído');
    expect(b1.resena).toBe('Obra cumbre de la fantasía moderna');
    expect(b1.vecesLeido).toBe(2);
    expect(b1.paginas).toBe(541);
    expect(b1.fechaPublicacion).toBe(2006);

    // Libro 2: actualmente leyendo, rating 0 convertido a null
    const b2 = result.books[1];
    expect(b2.nombre).toBe('El Pozo de la Ascensión');
    expect(b2.sagaNombre).toBe('Nacidos de la Bruma');
    expect(b2.volumen).toBe(2);
    expect(b2.puntuacion).toBeNull();
    expect(b2.progreso).toBe('⏳ Leyendo');
    expect(b2.vecesLeido).toBe(0);

    // Libro 3: to-read -> '❌ No Leído'
    const b3 = result.books[2];
    expect(b3.nombre).toBe('El Héroe de las Eras');
    expect(b3.sagaNombre).toBe('Nacidos de la Bruma');
    expect(b3.volumen).toBe(3);
    expect(b3.puntuacion).toBeNull();
    expect(b3.progreso).toBe('❌ No Leído');
  });

  test('parsea CSV de exportación de The StoryGraph con decimales de rating y paused', () => {
    const csv = `"Title","Authors","Contributors","ISBN/UID","Format","Read Status","Star Rating","Review","Tags","Date Added","Last Date Read","Read Dates"
"Dune","Frank Herbert","","9780441172719","Paperback","read","4.5","Fascinante universo de ciencia ficción","","2022-01-01","2022-02-15",""
"Dune Messiah","Frank Herbert","","9780441172696","Paperback","paused","3.5","Me costó avanzar","","2022-03-01","",""`;

    const result = importFromCSV(csv);
    expect(result.source).toBe('storygraph');
    expect(result.books).toHaveLength(2);

    const b1 = result.books[0];
    expect(b1.nombre).toBe('Dune');
    expect(b1.autor).toBe('Frank Herbert');
    expect(b1.puntuacion).toBe(4.5);
    expect(b1.progreso).toBe('✅ Leído');
    expect(b1.resena).toBe('Fascinante universo de ciencia ficción');

    const b2 = result.books[1];
    expect(b2.nombre).toBe('Dune Messiah');
    expect(b2.puntuacion).toBe(3.5);
    expect(b2.progreso).toBe('⏸️ Pausado');
    expect(b2.resena).toBe('Me costó avanzar');
  });
});
