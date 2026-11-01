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
});
