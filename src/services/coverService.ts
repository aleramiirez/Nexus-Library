export function normalizeCoverUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  if (url.startsWith('http://')) {
    url = 'https://' + url.slice('http://'.length);
  }

  url = url.replace('&edge=curl', '').replace('?edge=curl&', '?');
  return url;
}

export function buildOpenLibraryIsbnCover(isbn: string): string {
  const clean = isbn.replace(/[^0-9X]/gi, '');
  if (!clean) return '';
  return 'https://covers.openlibrary.org/b/isbn/' + clean + '-L.jpg?default=false';
}

export function buildOpenLibraryIdCover(coverId?: number | null): string {
  if (!coverId) return '';
  return 'https://covers.openlibrary.org/b/id/' + String(coverId) + '-L.jpg?default=false';
}

export function getAuthorInitials(author: string): string {
  if (!author) return 'NL';
  const parts = author
    .split(',')[0]
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'NL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function tryCacheCoverDataUrl(url: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(url, { mode: 'cors', signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/') || blob.size > 350000) {
      return undefined;
    }
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}
