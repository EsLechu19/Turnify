/**
 * Supabase auth errors are English by contract, so the user-facing copy is
 * mapped here to keep the whole UI in Spanish.
 */
export function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirma tu correo antes de iniciar sesión.';
  }
  if (normalized.includes('user already registered')) {
    return 'Ya existe una cuenta con ese correo.';
  }
  if (normalized.includes('password should be')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (normalized.includes('unable to validate email')) {
    return 'El correo no tiene un formato válido.';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many')) {
    return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  }
  if (normalized.includes('fetch') || normalized.includes('network')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión.';
  }

  return 'No pudimos completar la operación. Intenta de nuevo.';
}
