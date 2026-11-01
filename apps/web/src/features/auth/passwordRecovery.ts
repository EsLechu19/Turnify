export function buildPasswordResetRedirectUrl(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== origin) {
      return null;
    }
    return new URL('/reset-password', parsed.origin).toString();
  } catch {
    return null;
  }
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (password !== confirmation) return 'Las contraseñas no coinciden.';
  return null;
}

export function translateRecoveryError(message: string | undefined): string {
  const normalized = (message ?? '').toLowerCase();
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Se realizaron demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
  }
  if (normalized.includes('expired') || normalized.includes('invalid') || normalized.includes('otp')) {
    return 'El enlace de recuperación no es válido o venció.';
  }
  return 'No pudimos completar la solicitud. Inténtalo nuevamente.';
}
