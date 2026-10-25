/**
 * Valida sintácticamente una dirección de correo electrónico según los estándares habituales.
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const trimmed = email.trim();
  // Validación regex estándar para correo electrónico (RFC 5322 simplificada)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

/**
 * Transforma errores técnicos de autenticación (Supabase / GoTrue / SMTP)
 * en mensajes comprensibles, claros y orientados al usuario en español.
 */
export function formatAuthErrorMessage(
  err: unknown,
  fallbackMessage: string = 'No se pudo completar la operación. Por favor, comprueba los datos e inténtalo de nuevo.'
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

  // Envío de correos / SMTP / Destinatario inexistente o rechazado
  if (
    lower.includes('error sending recovery email') ||
    lower.includes('error sending confirmation email') ||
    lower.includes('error sending email') ||
    lower.includes('smtp') ||
    lower.includes('recipient address rejected') ||
    lower.includes('mailbox unavailable') ||
    lower.includes('550') ||
    lower.includes('553') ||
    lower.includes('relay access denied')
  ) {
    return 'No se ha podido enviar el correo. Comprueba que la dirección de correo esté bien escrita y exista.';
  }

  // Límites de frecuencia / Rate limiting / Bloqueo temporal
  if (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('security purposes, you can only request this once')
  ) {
    return 'Has solicitado varios correos en poco tiempo. Por seguridad, espera unos minutos o revisa si ya recibiste un correo anterior en tu bandeja de entrada o spam.';
  }

  // Credenciales erróneas (Login)
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid email or password')
  ) {
    return 'El correo electrónico o la contraseña no son correctos.';
  }

  // Usuario inexistente
  if (lower.includes('user not found') || lower.includes('no user found')) {
    return 'No existe ninguna cuenta asociada a este correo electrónico.';
  }

  // Cuenta ya existente (Registro)
  if (
    lower.includes('user already registered') ||
    lower.includes('already registered') ||
    lower.includes('already exists')
  ) {
    return 'Ya existe una cuenta registrada con este correo electrónico. Prueba a iniciar sesión.';
  }

  // Email no confirmado
  if (lower.includes('email not confirmed')) {
    return 'Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o spam para activarlo antes de entrar.';
  }

  // Formato de email no válido
  if (
    lower.includes('unable to validate email') ||
    lower.includes('invalid format') ||
    lower.includes('email is invalid') ||
    lower.includes('format is invalid') ||
    lower.includes('invalid email')
  ) {
    return 'La dirección de correo electrónico no es válida. Comprueba que esté bien escrita (ejemplo: usuario@correo.com).';
  }

  // Contraseña demasiado corta
  if (
    lower.includes('password should be at least') ||
    lower.includes('password is too short')
  ) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }

  // Misma contraseña en recuperación
  if (lower.includes('new password should be different from the old password')) {
    return 'La nueva contraseña debe ser diferente a la contraseña anterior.';
  }

  // Sesión o enlace de recuperación expirado/inválido
  if (
    lower.includes('otp_expired') ||
    lower.includes('token has expired') ||
    lower.includes('token is expired') ||
    lower.includes('token expired') ||
    lower.includes('auth session missing') ||
    lower.includes('session missing') ||
    lower.includes('session_not_found') ||
    lower.includes('invalid token')
  ) {
    return 'El enlace de recuperación ha caducado o ya ha sido utilizado. Por favor, solicita uno nuevo.';
  }

  // Registro cerrado o invitado deshabilitado
  if (lower.includes('signup is disabled') || lower.includes('signups not allowed')) {
    return 'El registro de nuevos usuarios está deshabilitado temporalmente.';
  }
  if (lower.includes('anonymous provider is disabled')) {
    return 'El modo de exploración local/invitado no está habilitado en este momento.';
  }
  if (lower.includes('user is banned') || lower.includes('user banned')) {
    return 'Esta cuenta ha sido suspendida temporalmente por seguridad.';
  }

  // Errores de red y conexión
  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('connection refused') ||
    lower.includes('timeout') ||
    lower.includes('offline') ||
    lower.includes('fetch failed') ||
    lower.includes('network request failed')
  ) {
    return 'Parece que hay un problema con tu conexión a internet. Comprueba tu red y vuelve a intentarlo.';
  }

  // Si contiene palabras en inglés de error técnico genérico, evitar mostrarlas en inglés
  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('cannot') ||
    lower.includes('denied') ||
    lower.includes('unexpected') ||
    lower.includes('exception')
  ) {
    return fallbackMessage;
  }

  // Si es un mensaje en español legible y sin trazas técnicas
  if (
    rawMessage &&
    !rawMessage.includes('SELECT') &&
    !rawMessage.includes('INSERT') &&
    !rawMessage.includes('UPDATE') &&
    !rawMessage.includes('DELETE') &&
    !rawMessage.includes('PGRST') &&
    rawMessage.length < 120
  ) {
    return rawMessage;
  }

  return fallbackMessage;
}

/**
 * Transforma errores técnicos generales o de base de datos en mensajes amigables para el usuario.
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
    !lower.includes('error') &&
    !lower.includes('failed') &&
    rawMessage.length < 120
  ) {
    return rawMessage;
  }

  return fallbackMessage;
}
