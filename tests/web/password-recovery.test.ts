import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = (...parts: string[]) => {
  const path = join(root, ...parts);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};

const repository = source('apps', 'web', 'src', 'data', 'repositories.ts');
const routes = source('apps', 'web', 'src', 'app', 'routes.tsx');
const login = source('apps', 'web', 'src', 'features', 'auth', 'LoginPage.tsx');
const requestPage = source('apps', 'web', 'src', 'features', 'auth', 'ForgotPasswordPage.tsx');
const resetPage = source('apps', 'web', 'src', 'features', 'auth', 'ResetPasswordPage.tsx');
const authContext = source('apps', 'web', 'src', 'state', 'AuthContext.tsx');

describe('password recovery request', () => {
  it('builds a fixed same-origin callback without open redirects', async () => {
    const recovery = await import('../../apps/web/src/features/auth/passwordRecovery');
    expect(recovery.buildPasswordResetRedirectUrl('https://turnify.example')).toBe('https://turnify.example/reset-password');
    expect(recovery.buildPasswordResetRedirectUrl('https://turnify.example.evil/path')).toBeNull();
    expect(recovery.buildPasswordResetRedirectUrl('javascript:alert(1)')).toBeNull();
  });

  it('requests the email with the fixed callback', () => {
    expect(repository).toContain('resetPasswordForEmail');
    expect(repository).toContain('buildPasswordResetRedirectUrl(window.location.origin)');
    expect(repository).toContain('redirectTo:');
    expect(repository).toContain('requestPasswordReset');
  });

  it('exposes a public request route and non-enumerating confirmation', () => {
    expect(login).toContain('¿Olvidaste tu contraseña?');
    expect(login).toContain('to="/forgot-password"');
    expect(routes).toContain('path="/forgot-password"');
    expect(requestPage).toContain('Si existe una cuenta asociada');
    expect(requestPage).toContain('aria-busy');
  });

  it('validates password length and confirmation', async () => {
    const recovery = await import('../../apps/web/src/features/auth/passwordRecovery');
    expect(recovery.validateNewPassword('short', 'short')).toBe('La contraseña debe tener al menos 8 caracteres.');
    expect(recovery.validateNewPassword('long-enough', 'different-value')).toBe('Las contraseñas no coinciden.');
    expect(recovery.validateNewPassword('long-enough', 'long-enough')).toBeNull();
  });

  it('maps expired links, rate limits, and connection failures to safe Spanish feedback', async () => {
    const recovery = await import('../../apps/web/src/features/auth/passwordRecovery');
    expect(recovery.translateRecoveryError('over_email_send_rate_limit')).toContain('demasiados intentos');
    expect(recovery.translateRecoveryError('Invalid or expired OTP')).toBe('El enlace de recuperación no es válido o venció.');
    expect(recovery.translateRecoveryError('network fetch failed')).toContain('Revisa tu conexión');
  });

  it('only allows updateUser after a Supabase recovery event', () => {
    expect(repository).toContain("event === 'PASSWORD_RECOVERY'");
    expect(repository).toContain("event === 'SIGNED_IN' || event === 'SIGNED_OUT'");
    expect(repository).toContain('recoverySessionActive');
    expect(repository).toContain('if (recoverySessionActive) return null;');
    expect(repository).toContain('updateUser({ password })');
    expect(authContext).toContain('subscribeToPasswordRecovery');
  });

  it('exposes a public reset route and keeps success visible', () => {
    expect(routes).toContain('path="/reset-password"');
    expect(resetPage).toContain('El enlace de recuperación no es válido o venció.');
    expect(resetPage).toContain('Contraseña actualizada');
    expect(resetPage).toContain('to="/login"');
    expect(resetPage).toContain('aria-busy');
    expect(resetPage).toContain('aria-describedby');
    expect(resetPage).toContain('aria-invalid');
  });
});
