export function buildPasswordResetRedirectUrl(origin: string): string | null {
  try {
    const parsed = new URL(origin);
    if ((parsed.protocol !== 'https:' && parsed.protocol !== 'http:') || parsed.origin !== origin) return null;
    return new URL('/reset-password', parsed.origin).toString();
  } catch {
    return null;
  }
}

export function translateRecoveryError(message: string | undefined): string {
  const normalized = (message ?? '').toLowerCase();
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Se realizaron demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
  }
  return 'No pudimos completar la solicitud. Inténtalo nuevamente.';
}
