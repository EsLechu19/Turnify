import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const login = read('apps', 'web', 'src', 'features', 'auth', 'LoginPage.tsx');
const styles = read('apps', 'web', 'src', 'styles', 'app.css');
const loginStyles = styles.slice(
  styles.indexOf('/* ---------- Branded login ---------- */'),
  styles.indexOf('/* ---------- End branded login ---------- */'),
);

describe('branded web login', () => {
  it('uses a dedicated split layout and the supplied barber-shop image', () => {
    expect(login).toContain('login-page');
    expect(login).toContain('login-page__visual');
    expect(login).toContain('login-page__form-panel');
    expect(login).toContain('/barbershop-login-hero.png');
    expect(login).toContain('login-page__form-panel');
    expect(styles).toContain('.login-page__visual');
    expect(styles).toMatch(/@media[^{]+\{[\s\S]*?\.login-page/);
  });

  it('preserves password sign-in, return and configuration states, and registration', () => {
    expect(login).toContain('signIn(email, password)');
    expect(login).toContain('pending');
    expect(login).toContain('role="alert"');
    expect(login).toContain('bounceMessage');
    expect(login).toContain('isSupabaseConfigured()');
    expect(login).toContain('to="/register"');
    expect(login).not.toMatch(/Google|OAuth|forgot password|reset password/i);
  });

  it('uses the exact Turnify reference palette in login-only styles', () => {
    const palette = [
      '#0D1B4C',
      '#2563EB',
      '#F7F9FC',
      '#D7DEEA',
      '#16A34A',
      '#DC2626',
      '#E8B14C',
    ];
    palette.forEach((color) => expect(loginStyles).toContain(color));

    const hexColors = loginStyles.match(/#[\da-f]{3,8}\b/gi) ?? [];
    const allowedColors = [...palette, '#FFFFFF'];
    hexColors.forEach((color) => expect(allowedColors).toContain(color.toUpperCase()));
  });

  it('shows professional Spanish copy throughout the form panel', () => {
    const formPanel = login.slice(login.indexOf('className="login-page__form-panel"'));
    [
      'Iniciar sesión en tu barbería',
      'Accede a tu cuenta para administrar el día.',
      'Correo electrónico',
      'tu@barberia.com',
      'Contraseña',
      'Ingresa tu contraseña',
      'Iniciando sesión…',
      "¿Aún no tienes cuenta?",
      'Registra tu barbería',
      'Solo para administradores de barberías. Los barberos pueden gestionar su jornada desde la aplicación móvil.',
      'La conexión con el servidor no está disponible. Configura Supabase para iniciar sesión.',
    ].forEach((copy) => expect(formPanel).toContain(copy));
    expect(formPanel).toContain("'Iniciar sesión'");
    expect(formPanel).not.toContain('Sign in to your shop');
    expect(formPanel).not.toContain('Welcome back. Let’s get your day moving.');
    expect(formPanel).not.toContain('Email address');
    expect(formPanel).not.toContain('Register your barbershop');
  });

  it('keeps redesigned selectors isolated from shared registration styles', () => {
    expect(styles).toMatch(/\.login-page(?:__[-\w]+)?\s*\{/);
    expect(styles).toContain('.auth {');
    expect(styles).toContain('.auth__panel {');
  });
});
