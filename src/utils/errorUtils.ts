/**
 * Transforma errores técnicos o de red en mensajes cálidos, claros
 * y comprensibles para personas reales, sin jerga de desarrollo ni trazas.
 */
export function formatFriendlyErrorMessage(
  err: unknown,
  fallbackMessage: string = 'Ha ocurrido un pequeño inconveniente. Por favor, inténtalo de nuevo.'
): string {
  if (!err) return fallbackMessage;

  const rawMessage =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : '';

  const lower = rawMessage.toLowerCase();

  // Errores de red y conexión
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('connection refused') ||
    lower.includes('timeout') ||
    lower.includes('offline') ||
    lower.includes('fetch failed')
  ) {
    return 'Parece que ha habido una interrupción en tu conexión a internet. Comprueba tu red y vuelve a intentarlo.';
  }

  // Errores de sesión o tokens
  if (
    lower.includes('jwt') ||
    lower.includes('token') ||
    lower.includes('session expired') ||
    lower.includes('invalid refresh token')
  ) {
    return 'Tu sesión ha caducado por seguridad. Vuelve a iniciar sesión para continuar.';
  }

  // Permisos o RLS
  if (
    lower.includes('row-level security') ||
    lower.includes('permission denied') ||
    lower.includes('unauthorized') ||
    lower.includes('policy')
  ) {
    return 'No tienes permisos para realizar este cambio o necesitas identificarte de nuevo.';
  }

  // Límites o cuotas
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Hemos recibido muchas peticiones en poco tiempo. Espera unos segundos y vuelve a intentarlo.';
  }

  // Duplicados
  if (lower.includes('duplicate key') || lower.includes('unique constraint') || lower.includes('already exists')) {
    return 'Ya existe un registro con estos mismos datos.';
  }

  // Si el mensaje es razonablemente corto y legible para un humano (sin SQL, sin códigos)
  if (
    rawMessage &&
    !rawMessage.includes('SELECT') &&
    !rawMessage.includes('INSERT') &&
    !rawMessage.includes('UPDATE') &&
    !rawMessage.includes('DELETE') &&
    !rawMessage.includes('400') &&
    !rawMessage.includes('500') &&
    !rawMessage.includes('PGRST') &&
    rawMessage.length < 120
  ) {
    return rawMessage;
  }

  return fallbackMessage;
}
