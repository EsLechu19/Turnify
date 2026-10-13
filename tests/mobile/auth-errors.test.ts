import { describe, expect, it } from 'vitest';

import { translateAuthError } from '../../apps/mobile/src/features/auth/auth-errors';

describe('mobile auth error translation', () => {
  it('preserves the Spanish mapping for authentication and transport failures', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('Correo o contraseña incorrectos.');
    expect(translateAuthError('Email not confirmed')).toBe('Confirma tu correo antes de iniciar sesión.');
    expect(translateAuthError('Failed to fetch')).toBe('No pudimos conectar con el servidor. Revisa tu conexión.');
    expect(translateAuthError('Failed to fetch perfiles')).toBe('No pudimos conectar con el servidor. Revisa tu conexión.');
    expect(translateAuthError('Too many requests')).toBe('Demasiados intentos. Espera un momento e intenta de nuevo.');
  });

  it('explains configuration failures instead of falling back to a generic operation error', () => {
    expect(translateAuthError('Missing EXPO_PUBLIC_SUPABASE_URL')).toBe(
      'Falta configurar Supabase. Copia apps/mobile/.env.example a apps/mobile/.env y completa los valores.',
    );
    expect(translateAuthError('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.')).toBe(
      'La configuración de Supabase no es válida. Revisa la URL y la clave pública.',
    );
    expect(translateAuthError('Invalid API key')).toBe(
      'La configuración de Supabase no es válida. Revisa la URL y la clave pública.',
    );
  });

  it('explains profile loading failures and keeps the generic fallback for unknown errors', () => {
    expect(translateAuthError('profile load failed')).toBe('No pudimos cargar tu perfil. Intenta de nuevo.');
    expect(translateAuthError('unexpected auth failure')).toBe('No pudimos completar la operación. Intenta de nuevo.');
  });
});
