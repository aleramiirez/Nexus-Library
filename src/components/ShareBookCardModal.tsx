import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Share2,
  Copy,
  Sparkles,
  Check,
  Smartphone,
  Square,
  Sun,
  Moon,
  Quote,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { Book } from '../types/models';
import { formatStars } from '../constants/catalogs';
import { getAuthorInitials } from '../services/coverService';

export interface ShareBookCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  initialQuote?: string;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export type CardFormat = 'story' | 'square';
export type CardTheme = 'parchment' | 'midnight';

// Telas de encuadernación artesanal de Nexus para libros sin portada (idénticas a BookCover)
const CLOTH_PALETTES: Array<[string, string]> = [
  ['#7a2231', '#4a1320'], // burdeos
  ['#24523b', '#12301f'], // verde bosque
  ['#23406e', '#122241'], // azul marino
  ['#8a5a22', '#553413'], // ocre
  ['#3b4252', '#1e222c'], // pizarra
  ['#5b2f5e', '#321a35']  // ciruela
];

const hashString = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
};

// Generador de micro-grano de papel / lienzo para texturizar el canvas
function drawPaperGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity: number = 0.035
) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
  const step = 4;
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      if ((px * 13 + py * 29) % 7 === 0) {
        ctx.fillRect(px, py, 1.2, 1.2);
      }
    }
  }
  ctx.restore();
}

// Carga segura de imagen para Canvas evitando problemas de CORS / canvas tainted
async function loadSafeCoverImage(book: Book): Promise<HTMLImageElement | null> {
  const sources = [book.portadaDataUrl, book.portadaUrl, book.portadaFallbackUrl].filter(
    (u): u is string => Boolean(u && u.trim())
  );
  if (sources.length === 0) return null;

  for (const src of sources) {
    // 1. Data URLs locales (base64) - nunca contaminan el canvas
    if (src.startsWith('data:image/')) {
      try {
        const img = await new Promise<HTMLImageElement | null>((resolve) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => resolve(null);
          i.src = src;
        });
        if (img && (img.naturalWidth || img.width) > 2) return img;
      } catch {}
    }

    // 2. Fetch directo como blob con CORS y conversión a DataURL local
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(src, { mode: 'cors', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.type.startsWith('image/') || blob.size > 100) {
          const dataUrl = await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
          if (dataUrl) {
            const img = await new Promise<HTMLImageElement | null>((resolve) => {
              const i = new Image();
              i.onload = () => resolve(i);
              i.onerror = () => resolve(null);
              i.src = dataUrl;
            });
            if (img && (img.naturalWidth || img.width) > 2) return img;
          }
        }
      }
    } catch {}

    // 3. Image directa con crossOrigin anonymous y comprobación en micro-canvas
    try {
      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        const timer = setTimeout(() => resolve(null), 3500);
        i.onload = () => {
          clearTimeout(timer);
          resolve(i);
        };
        i.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        i.src = src;
      });

      if (img && (img.naturalWidth || img.width) > 2) {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1;
        testCanvas.height = 1;
        const testCtx = testCanvas.getContext('2d');
        if (testCtx) {
          testCtx.drawImage(img, 0, 0, 1, 1);
          try {
            testCanvas.toDataURL(); // Verifica que el canvas no quede 'tainted'
            return img;
          } catch {
            // Tainted
          }
        }
      }
    } catch {}

    // 4. Proxy CORS para fuentes remotas como Google Books u OpenLibrary
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const cleaned = src.replace(/^https?:\/\//, '');
      const proxyUrls = [
        `https://images.weserv.nl/?url=${encodeURIComponent(cleaned)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`
      ];

      for (const pUrl of proxyUrls) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(pUrl, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            const blob = await res.blob();
            if (blob.type.startsWith('image/') || blob.size > 100) {
              const dataUrl = await new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
              });
              if (dataUrl) {
                const img = await new Promise<HTMLImageElement | null>((resolve) => {
                  const i = new Image();
                  i.onload = () => resolve(i);
                  i.onerror = () => resolve(null);
                  i.src = dataUrl;
                });
                if (img && (img.naturalWidth || img.width) > 2) return img;
              }
            }
          }
        } catch {}
      }
    }
  }

  return null;
}

/**
 * Dibuja un libro con portada real, textura artesanal de lomo 3D, cantos de páginas
 * y reflejos satinados idénticos a los mostrados en la estantería de Nexus Library.
 */
function drawBookCover3D(
  ctx: CanvasRenderingContext2D,
  book: Book,
  coverImg: HTMLImageElement | null,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  isDark: boolean
) {
  // 1. Sombra de contacto realista en la base del libro
  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(40, 25, 10, 0.45)';
  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by + bh + 4, bw * 0.46, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Cantos de las páginas en el lateral derecho (artesanal de encuadernación)
  ctx.save();
  ctx.fillStyle = '#dccfae';
  ctx.fillRect(bx + bw, by + 4, 3, bh - 8);
  ctx.fillStyle = '#b6a784';
  ctx.fillRect(bx + bw + 3, by + 6, 2, bh - 12);
  ctx.fillStyle = '#d3c5a2';
  ctx.fillRect(bx + bw + 5, by + 9, 3, bh - 18);
  ctx.fillStyle = '#8e8062';
  ctx.fillRect(bx + bw + 8, by + 12, 2, bh - 24);

  // Líneas de hojas finas agrupadas
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  for (let l = by + 14; l < by + bh - 20; l += 8) {
    ctx.fillRect(bx + bw, l, 9, 1);
  }
  ctx.restore();

  // 3. Tapa dura del libro recortada con esquinas exteriores redondeadas
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, bw, bh, [3, 8, 8, 3]);
  } else {
    ctx.rect(bx, by, bw, bh);
  }
  ctx.clip();

  if (coverImg && (coverImg.naturalWidth || coverImg.width) > 2) {
    // Portada real dibujada proporcionalmente con recorte central (object-fit: cover)
    const imgW = coverImg.naturalWidth || coverImg.width;
    const imgH = coverImg.naturalHeight || coverImg.height;
    const scale = Math.max(bw / imgW, bh / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = bx + (bw - drawW) / 2;
    const drawY = by + (bh - drawH) / 2;
    ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
  } else {
    // Cubierta artesanal de tela con acabado exacto a Nexus BookCover
    const palette = CLOTH_PALETTES[hashString(book.nombre + (book.autor || '')) % CLOTH_PALETTES.length];
    const clothGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
    clothGrad.addColorStop(0, palette[0]);
    clothGrad.addColorStop(1, palette[1]);
    ctx.fillStyle = clothGrad;
    ctx.fillRect(bx, by, bw, bh);

    // Resplandor radial superior izquierdo (idéntico a .book-cover-cloth)
    const clothRadial = ctx.createRadialGradient(
      bx + bw * 0.3, by + bh * 0.15, 10,
      bx + bw * 0.3, by + bh * 0.15, bw * 0.8
    );
    clothRadial.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    clothRadial.addColorStop(1, 'transparent');
    ctx.fillStyle = clothRadial;
    ctx.fillRect(bx, by, bw, bh);

    // Marco exterior e interior dorado grabado en la tela
    const mLeft = bx + Math.round(bw * 0.14);
    const mTop = by + Math.round(bh * 0.06);
    const mW = Math.round(bw * 0.80);
    const mH = Math.round(bh * 0.88);

    ctx.strokeStyle = 'rgba(236, 213, 150, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(mLeft, mTop, mW, mH);

    ctx.strokeStyle = 'rgba(236, 213, 150, 0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(mLeft + 4, mTop + 4, mW - 8, mH - 8);

    // Esquinas ornamentales del marco (pequeños rombos dorados)
    const corners = [
      [mLeft + 4, mTop + 4],
      [mLeft + mW - 4, mTop + 4],
      [mLeft + 4, mTop + mH - 4],
      [mLeft + mW - 4, mTop + mH - 4]
    ];
    ctx.fillStyle = 'rgba(245, 218, 140, 0.8)';
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Medallón circular de iniciales del autor
    const initials = getAuthorInitials(book.autor || '');
    const circleRadius = Math.round(bw * 0.08);
    const circleX = mLeft + mW / 2;
    const circleY = mTop + Math.round(mH * 0.16);

    ctx.strokeStyle = 'rgba(236, 213, 150, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(236, 213, 150, 0.12)';
    ctx.fill();

    ctx.fillStyle = '#fce7b0';
    ctx.font = `bold ${Math.round(circleRadius * 0.95)}px "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials || '✦', circleX, circleY);

    // Título grabado en oro
    ctx.fillStyle = '#fce7b0';
    ctx.font = `bold ${Math.max(17, Math.round(bw * 0.062))}px "Cormorant Garamond", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const titleLines = wrapText(ctx, book.nombre, mW - 24).slice(0, 4);
    let titleY = circleY + circleRadius + Math.round(bh * 0.07);
    titleLines.forEach((line) => {
      ctx.fillText(line, mLeft + mW / 2, titleY);
      titleY += Math.max(22, Math.round(bw * 0.075));
    });

    // Autor estampado en mayúsculas
    ctx.fillStyle = '#ecd596';
    ctx.font = `600 ${Math.max(11, Math.round(bw * 0.038))}px "Plus Jakarta Sans", system-ui, sans-serif`;
    const authorText = (book.autor || 'AUTOR DESCONOCIDO').toUpperCase();
    const shortAuthor = authorText.length > 26 ? authorText.slice(0, 24) + '...' : authorText;
    ctx.fillText(shortAuthor, mLeft + mW / 2, mTop + mH - Math.round(bh * 0.06));
  }

  // 4. Texturas 3D del lomo y articulación de bisagra a la izquierda (idéntica a CSS .book-cover::before)
  const spineW = Math.max(22, Math.round(bw * 0.15));
  const spineGrad = ctx.createLinearGradient(bx, by, bx + spineW, by);
  spineGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  spineGrad.addColorStop(0.08, 'rgba(0, 0, 0, 0.42)');
  spineGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.28)');
  spineGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.07)');
  spineGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.55)');
  spineGrad.addColorStop(0.64, 'rgba(255, 255, 255, 0.16)');
  spineGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = spineGrad;
  ctx.fillRect(bx, by, spineW, bh);

  // 5. Brillo satinado diagonal (barniz editorial, idéntico a CSS .book-cover::after)
  const shineGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
  shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  shineGrad.addColorStop(0.34, 'transparent');
  shineGrad.addColorStop(0.72, 'transparent');
  shineGrad.addColorStop(1, 'rgba(0, 0, 0, 0.24)');
  ctx.fillStyle = shineGrad;
  ctx.fillRect(bx, by, bw, bh);

  // 6. Micro-textura de grano de papel y tela artesanal sobre la tapa
  drawPaperGrain(ctx, bx, by, bw, bh, 0.035);

  // 7. Oscurecimiento en la parte inferior para dar peso y volumen 3D
  const bottomShadow = ctx.createLinearGradient(bx, by + bh * 0.72, bx, by + bh);
  bottomShadow.addColorStop(0, 'transparent');
  bottomShadow.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = bottomShadow;
  ctx.fillRect(bx, by + bh * 0.72, bw, bh * 0.28);

  // 8. Bisel y contorno interior fino de la encuadernación
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);

  ctx.restore();
}

// Función auxiliar para partir texto en líneas respetando palabras
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + ' ' + word).width;
    if (width < maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export const ShareBookCardModal: React.FC<ShareBookCardModalProps> = ({
  isOpen,
  onClose,
  book,
  initialQuote,
  onShowToast
}) => {
  const [format, setFormat] = useState<CardFormat>('story');
  const [theme, setTheme] = useState<CardTheme>('parchment');
  const [selectedQuote, setSelectedQuote] = useState<string>(
    initialQuote || (book.citas && book.citas.length > 0 ? book.citas[0] : '')
  );
  const [customQuote, setCustomQuote] = useState<string>(
    initialQuote || (book.citas && book.citas.length > 0 ? book.citas[0] : '')
  );
  const [includeQuote, setIncludeQuote] = useState<boolean>(
    Boolean(initialQuote || (book.citas && book.citas.length > 0))
  );
  const [includeRating, setIncludeRating] = useState<boolean>(Boolean(book.puntuacion));
  const [includeSaga, setIncludeSaga] = useState<boolean>(Boolean(book.sagaNombre));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sincronizar cita cuando cambia initialQuote o book
  useEffect(() => {
    const quote = initialQuote || (book.citas && book.citas.length > 0 ? book.citas[0] : '');
    setSelectedQuote(quote);
    setCustomQuote(quote);
    setIncludeQuote(Boolean(quote));
  }, [book, initialQuote]);

  // Dibujar la tarjeta en el canvas
  const renderCard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsGenerating(true);

    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    const isStory = format === 'story';
    const isDark = theme === 'midnight';

    // Dimensiones en alta resolución
    const W = isStory ? 1080 : 1080;
    const H = isStory ? 1920 : 1080;
    canvas.width = W;
    canvas.height = H;

    // 1. Fondo según tema
    if (isDark) {
      // Midnight Dark Academia: fondo terciopelo azul noche / carbón con resplandor dorado
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#0c1017');
      bgGrad.addColorStop(0.5, '#121722');
      bgGrad.addColorStop(1, '#090c12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Resplandor radial dorado sutil en el centro
      const radial = ctx.createRadialGradient(W / 2, isStory ? 680 : 480, 50, W / 2, isStory ? 680 : 480, 550);
      radial.addColorStop(0, 'rgba(217, 119, 6, 0.12)');
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, W, H);

      // Marco dorado exterior
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(36, 36, W - 72, H - 72);

      ctx.strokeStyle = 'rgba(217, 119, 6, 0.22)';
      ctx.lineWidth = 1;
      ctx.strokeRect(48, 48, W - 96, H - 96);
    } else {
      // Parchment editorial: tonos cálidos de papel y papiro antiguo
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#fdfaf2');
      bgGrad.addColorStop(0.5, '#f7f0df');
      bgGrad.addColorStop(1, '#ebdcc3');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Textura sutil en los bordes
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(36, 36, W - 72, H - 72);

      ctx.strokeStyle = 'rgba(180, 83, 9, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(48, 48, W - 96, H - 96);
    }

    // Textura táctil de pergamino sobre el fondo de la tarjeta
    drawPaperGrain(ctx, 0, 0, W, H, isDark ? 0.022 : 0.032);

    // Ornamentos en las esquinas
    const drawCornerOrnament = (cx: number, cy: number, flipX: number, flipY: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(flipX, flipY);
      ctx.fillStyle = isDark ? '#f59e0b' : '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(180, 83, 9, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(32, 0);
      ctx.moveTo(0, 12);
      ctx.lineTo(0, 32);
      ctx.stroke();
      ctx.restore();
    };

    drawCornerOrnament(64, 64, 1, 1);
    drawCornerOrnament(W - 64, 64, -1, 1);
    drawCornerOrnament(64, H - 64, 1, -1);
    drawCornerOrnament(W - 64, H - 64, -1, -1);

    // 2. Cabecera editorial
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#d97706' : '#b45309';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.letterSpacing = '7px';
    const headerY = isStory ? 120 : 95;
    ctx.fillText('NEXUS LIBRARY · SANTUARIO LITERARIO', W / 2, headerY);

    ctx.strokeStyle = isDark ? 'rgba(217, 119, 6, 0.35)' : 'rgba(180, 83, 9, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 140, headerY + 16);
    ctx.lineTo(W / 2 + 140, headerY + 16);
    ctx.stroke();

    // 3. Carga y dibujo de la Portada 3D con texturas realistas de Nexus
    const coverImg = await loadSafeCoverImage(book);

    if (isStory) {
      // Formato Vertical (Story 9:16)
      const bookW = 380;
      const bookH = 570;
      const bookX = (W - bookW) / 2;
      const bookY = 200;

      drawBookCover3D(ctx, book, coverImg, bookX, bookY, bookW, bookH, isDark);

      // Puntuación en estrellas
      let currentY = bookY + bookH + 48;
      if (includeRating && book.puntuacion) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.letterSpacing = '5px';
        ctx.fillText(formatStars(book.puntuacion), W / 2, currentY);
        currentY += 46;
      }

      // Título del Libro
      ctx.fillStyle = isDark ? '#ffffff' : '#1c1917';
      ctx.font = 'bold 46px "Cinzel", Georgia, serif';
      ctx.letterSpacing = '1px';
      const titleLines = wrapText(ctx, book.nombre, W - 180).slice(0, 3);
      titleLines.forEach((line) => {
        ctx.fillText(line, W / 2, currentY);
        currentY += 56;
      });

      // Autor
      ctx.fillStyle = isDark ? '#cbd5e1' : '#44403c';
      ctx.font = 'italic 28px Georgia, serif';
      ctx.fillText(book.autor || 'Autor desconocido', W / 2, currentY);
      currentY += 40;

      // Saga si aplica
      if (includeSaga && book.sagaNombre) {
        ctx.fillStyle = isDark ? '#fbbf24' : '#92400e';
        ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const sagaText = `✦ ${book.sagaNombre}${book.volumen ? ` · Libro #${book.volumen}` : ''} ✦`;
        ctx.fillText(sagaText, W / 2, currentY);
        currentY += 44;
      }

      // Cita memorable destacada
      const activeQuote = customQuote.trim();
      if (includeQuote && activeQuote) {
        currentY += 20;

        // Caja de la cita
        const boxMargin = 90;
        const boxW = W - boxMargin * 2;
        ctx.font = 'italic 25px Georgia, serif';
        const quoteLines = wrapText(ctx, `«${activeQuote}»`, boxW - 80).slice(0, 5);
        const boxH = quoteLines.length * 38 + 48;

        ctx.fillStyle = isDark ? 'rgba(217, 119, 6, 0.08)' : 'rgba(255, 255, 255, 0.65)';
        ctx.strokeStyle = isDark ? 'rgba(217, 119, 6, 0.28)' : 'rgba(180, 83, 9, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxMargin, currentY, boxW, boxH, 16);
        } else {
          ctx.rect(boxMargin, currentY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDark ? '#f8fafc' : '#292524';
        let qY = currentY + 42;
        quoteLines.forEach((qLine) => {
          ctx.fillText(qLine, W / 2, qY);
          qY += 38;
        });

        currentY += boxH + 30;
      }

      // Pie con fecha de lectura y marca
      const footerY = H - 100;
      ctx.fillStyle = isDark ? '#94a3b8' : '#78716c';
      ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const readDateText = book.fechaFin
        ? `Lectura completada el ${book.fechaFin}`
        : book.progreso === '✅ Leído'
        ? 'Lectura completada'
        : book.progreso === '⏳ Leyendo'
        ? 'Leyendo actualmente'
        : 'Colección personal';
      ctx.fillText(readDateText, W / 2, footerY - 26);

      ctx.fillStyle = isDark ? '#f59e0b' : '#b45309';
      ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('NEXUS LIBRARY · nexus-library.vercel.app', W / 2, footerY);
    } else {
      // Formato Cuadrado (Square 1:1)
      const bookW = 320;
      const bookH = 480;
      const bookX = 85;
      const bookY = (H - bookH) / 2 + 10;

      drawBookCover3D(ctx, book, coverImg, bookX, bookY, bookW, bookH, isDark);

      // Texto alineado a la derecha del libro
      const textX = bookX + bookW + 65;
      const textMaxW = W - textX - 80;
      let textY = bookY + 36;

      ctx.textAlign = 'left';

      // Estrellas
      if (includeRating && book.puntuacion) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.letterSpacing = '4px';
        ctx.fillText(formatStars(book.puntuacion), textX, textY);
        textY += 46;
      }

      // Título
      ctx.fillStyle = isDark ? '#ffffff' : '#1c1917';
      ctx.font = 'bold 38px "Cinzel", Georgia, serif';
      const titleLines = wrapText(ctx, book.nombre, textMaxW).slice(0, 3);
      titleLines.forEach((tLine) => {
        ctx.fillText(tLine, textX, textY);
        textY += 46;
      });

      // Autor
      ctx.fillStyle = isDark ? '#cbd5e1' : '#44403c';
      ctx.font = 'italic 24px Georgia, serif';
      ctx.fillText(book.autor || 'Autor desconocido', textX, textY);
      textY += 36;

      // Saga
      if (includeSaga && book.sagaNombre) {
        ctx.fillStyle = isDark ? '#fbbf24' : '#92400e';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        const sagaText = `✦ ${book.sagaNombre}${book.volumen ? ` · Libro #${book.volumen}` : ''}`;
        ctx.fillText(sagaText, textX, textY);
        textY += 36;
      }

      // Cita
      const activeQuote = customQuote.trim();
      if (includeQuote && activeQuote) {
        textY += 12;
        ctx.font = 'italic 21px Georgia, serif';
        const qLines = wrapText(ctx, `«${activeQuote}»`, textMaxW).slice(0, 4);

        ctx.fillStyle = isDark ? 'rgba(217, 119, 6, 0.08)' : 'rgba(255, 255, 255, 0.6)';
        ctx.strokeStyle = isDark ? 'rgba(217, 119, 6, 0.25)' : 'rgba(180, 83, 9, 0.22)';
        ctx.lineWidth = 1.2;
        const boxH = qLines.length * 30 + 36;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(textX - 14, textY - 8, textMaxW + 28, boxH, 12);
        } else {
          ctx.rect(textX - 14, textY - 8, textMaxW + 28, boxH);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDark ? '#f8fafc' : '#292524';
        let qLineY = textY + 22;
        qLines.forEach((line) => {
          ctx.fillText(line, textX, qLineY);
          qLineY += 30;
        });

        textY += boxH + 18;
      }

      // Pie
      const footerY = H - 75;
      ctx.fillStyle = isDark ? '#94a3b8' : '#78716c';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const readDateText = book.fechaFin
        ? `Lectura completada el ${book.fechaFin}`
        : book.progreso === '✅ Leído'
        ? 'Lectura completada'
        : 'Colección personal';
      ctx.fillText(readDateText, textX, footerY - 22);

      ctx.fillStyle = isDark ? '#f59e0b' : '#b45309';
      ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('NEXUS LIBRARY · nexus-library.vercel.app', textX, footerY);
    }

    setIsGenerating(false);
  }, [book, customQuote, format, includeQuote, includeRating, includeSaga, theme]);

  // Redibujar siempre que cambien opciones
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      renderCard();
    }, 40);
    return () => clearTimeout(timer);
  }, [isOpen, renderCard]);

  // Exportar a Blob PNG
  const getCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.98);
    });
  }, []);

  // 1. Descargar imagen PNG
  const handleDownload = useCallback(async () => {
    const blob = await getCanvasBlob();
    if (!blob) {
      onShowToast?.('Error al generar la imagen', 'error');
      return;
    }
    const safeTitle = book.nombre
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '_')
      .slice(0, 24);
    const fileName = `nexus_${safeTitle}_${format}.png`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onShowToast?.('Tarjeta descargada en alta resolución', 'success');
  }, [book.nombre, format, getCanvasBlob, onShowToast]);

  // 2. Compartir con Web Share API
  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const blob = await getCanvasBlob();
      if (!blob) throw new Error('No blob');

      const safeTitle = book.nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
      const file = new File([blob], `nexus_${safeTitle}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Lectura: ${book.nombre}`,
          text: `Mi lectura de «${book.nombre}» de ${book.autor || 'Autor desconocido'} en Nexus Library.`
        });
        onShowToast?.('¡Tarjeta compartida con éxito!', 'success');
      } else {
        // Fallback a descarga directa
        await handleDownload();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await handleDownload();
      }
    } finally {
      setIsSharing(false);
    }
  }, [book.autor, book.nombre, getCanvasBlob, handleDownload, onShowToast]);

  // 3. Copiar imagen al portapapeles
  const handleCopyImage = useCallback(async () => {
    try {
      const blob = await getCanvasBlob();
      if (!blob) throw new Error('No blob');

      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2400);
        onShowToast?.('¡Imagen copiada al portapapeles!', 'success');
      } else {
        await handleDownload();
      }
    } catch {
      await handleDownload();
    }
  }, [getCanvasBlob, handleDownload, onShowToast]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-900/30 dark:border-[#283246] bg-[#fbf6ea] dark:bg-[#0f141d] shadow-2xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-900/15 dark:border-[#242f42] bg-[#f7eedc]/80 dark:bg-[#141b27]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 dark:text-slate-100 leading-tight">
                Tarjeta de Lectura para Redes
              </h2>
              <p className="text-[11px] text-stone-600 dark:text-slate-400">
                Genera una tarjeta editorial en alta resolución lista para Stories, Instagram o X
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido dividido: Preview de Canvas + Controles */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-6">
          {/* Panel Izquierdo: Vista previa interactiva de la tarjeta */}
          <div className="md:col-span-6 flex flex-col items-center justify-center rounded-xl border border-amber-900/15 dark:border-[#20293a] bg-[#efe4cc]/40 dark:bg-[#090d14]/70 p-4 relative min-h-[360px]">
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs rounded-xl z-10">
                <div className="flex items-center gap-2 text-xs font-serif text-amber-200 bg-stone-900/90 px-3 py-1.5 rounded-full border border-amber-400/30">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  Pintando tarjeta editorial...
                </div>
              </div>
            )}

            <div
              className={
                'relative transition-all duration-300 shadow-2xl rounded-lg overflow-hidden border border-amber-900/20 dark:border-amber-400/20 ' +
                (format === 'story'
                  ? 'w-[230px] sm:w-[260px] aspect-[9/16]'
                  : 'w-[280px] sm:w-[320px] aspect-square')
              }
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain block"
              />
            </div>

            <p className="mt-3 text-[11px] text-stone-500 dark:text-slate-400 text-center font-medium">
              Resolución de exportación: {format === 'story' ? '1080 × 1920 px (HD)' : '1080 × 1080 px (HD)'}
            </p>
          </div>

          {/* Panel Derecho: Controles y personalización */}
          <div className="md:col-span-6 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              {/* 1. Selector de formato */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-2">
                  Formato de la Tarjeta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('story')}
                    className={
                      'flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition ' +
                      (format === 'story'
                        ? 'border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                        : 'border-stone-300 dark:border-[#283246] hover:bg-black/5 dark:hover:bg-white/5 text-stone-700 dark:text-slate-300')
                    }
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Story (9:16)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('square')}
                    className={
                      'flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition ' +
                      (format === 'square'
                        ? 'border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                        : 'border-stone-300 dark:border-[#283246] hover:bg-black/5 dark:hover:bg-white/5 text-stone-700 dark:text-slate-300')
                    }
                  >
                    <Square className="w-4 h-4" />
                    <span>Cuadrado (1:1)</span>
                  </button>
                </div>
              </div>

              {/* 2. Selector de tema visual */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-slate-300 mb-2">
                  Estética & Paleta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('parchment')}
                    className={
                      'flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition ' +
                      (theme === 'parchment'
                        ? 'border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                        : 'border-stone-300 dark:border-[#283246] hover:bg-black/5 dark:hover:bg-white/5 text-stone-700 dark:text-slate-300')
                    }
                  >
                    <Sun className="w-4 h-4 text-amber-600" />
                    <span>Pergamino Editorial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('midnight')}
                    className={
                      'flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition ' +
                      (theme === 'midnight'
                        ? 'border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                        : 'border-stone-300 dark:border-[#283246] hover:bg-black/5 dark:hover:bg-white/5 text-stone-700 dark:text-slate-300')
                    }
                  >
                    <Moon className="w-4 h-4 text-amber-400" />
                    <span>Noche Dark Academia</span>
                  </button>
                </div>
              </div>

              {/* 3. Cita y texto a destacar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-amber-600" />
                    Cita o Reflexión Destacada
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeQuote}
                      onChange={(e) => setIncludeQuote(e.target.checked)}
                      className="rounded border-amber-600 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Incluir en tarjeta</span>
                  </label>
                </div>

                {includeQuote && (
                  <div className="space-y-2">
                    {book.citas && book.citas.length > 1 && (
                      <select
                        value={selectedQuote}
                        onChange={(e) => {
                          setSelectedQuote(e.target.value);
                          setCustomQuote(e.target.value);
                        }}
                        className="w-full text-xs rounded-lg border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#161c27] p-2 text-stone-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        {book.citas.map((q, idx) => (
                          <option key={idx} value={q}>
                            Cita #{idx + 1}: «{q.slice(0, 45)}...»
                          </option>
                        ))}
                      </select>
                    )}

                    <textarea
                      value={customQuote}
                      onChange={(e) => setCustomQuote(e.target.value)}
                      placeholder="Escribe o edita la cita o reflexión que aparecerá en la tarjeta..."
                      rows={3}
                      maxLength={240}
                      className="w-full text-xs font-serif italic rounded-lg border border-amber-900/20 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#161c27] p-2.5 text-stone-900 dark:text-slate-100 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                    />
                    <div className="text-right text-[10px] text-stone-400">
                      {customQuote.length} / 240 caracteres
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Elementos adicionales */}
              <div className="pt-2 border-t border-amber-900/10 dark:border-[#20293a] flex flex-wrap gap-4 text-xs text-stone-700 dark:text-slate-300">
                {book.puntuacion && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeRating}
                      onChange={(e) => setIncludeRating(e.target.checked)}
                      className="rounded border-amber-600 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Mostrar estrellas ({formatStars(book.puntuacion)})</span>
                  </label>
                )}
                {book.sagaNombre && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSaga}
                      onChange={(e) => setIncludeSaga(e.target.checked)}
                      className="rounded border-amber-600 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Mostrar saga ({book.sagaNombre})</span>
                  </label>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="pt-3 border-t border-amber-900/15 dark:border-[#242f42] flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing || isGenerating}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-98 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {isSharing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span>Compartir en Redes</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-amber-900/25 dark:border-[#283246] bg-[#fffcf5] dark:bg-[#161c28] hover:bg-amber-500/10 text-stone-800 dark:text-slate-200 font-semibold text-xs transition active:scale-98"
              >
                <Download className="w-4 h-4 text-amber-600" />
                <span>Descargar PNG</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                disabled={isGenerating}
                title="Copiar imagen directamente para pegar en chats"
                className="inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-stone-300 dark:border-[#283246] hover:bg-black/5 dark:hover:bg-white/5 text-stone-700 dark:text-slate-300 text-xs transition active:scale-98"
              >
                {copiedImage ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span className="sm:hidden">Copiar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
