import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const login = read('apps', 'web', 'src', 'features', 'auth', 'LoginPage.tsx');
const styles = read('apps', 'web', 'src', 'styles', 'app.css');
const tokens = read('apps', 'web', 'src', 'styles', 'tokens.css');
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
    expect(login).toContain('signIn(email, password, rememberMe)');
    expect(login).toContain('pending');
    expect(login).toContain('role="alert"');
    expect(login).toContain('bounceMessage');
    expect(login).toContain('isSupabaseConfigured()');
    expect(login).toContain('to="/register"');
    expect(login).not.toMatch(/forgot password|reset password/i);
  });

  it('uses the exact Turnify palette through login-only aliases', () => {
    const colors = ['#0D1B4C', '#2563EB', '#F7F9FC', '#D7DEEA', '#16A34A', '#DC2626', '#E8B14C'];
    const names = ['navy', 'action', 'background', 'border', 'success', 'error', 'accent'];
    colors.forEach((color) => expect(tokens).toContain(color));
    names.forEach((name) => {
      expect(tokens).toContain(`--login-${name}`);
      expect(loginStyles).toContain(`var(--login-${name})`);
    });
    const hexColors = loginStyles.match(/#[\da-f]{3,8}\b/gi) ?? [];
    hexColors.forEach((color) => expect(['#FFF', '#FFFFFF']).toContain(color.toUpperCase()));
  });

  it('shows professional Spanish copy throughout the form panel', () => {
    const formPanel = login.slice(login.indexOf('className="login-page__form-panel"'));
    [
      'Iniciar sesión',
      'Ingresa tus datos para acceder al panel.',
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
    expect(formPanel).toContain("'Entrar al panel'");
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

  it('renders the editorial brand panel and three barber-focused benefits', () => {
    expect(login).toContain('login-page__brand-panel');
    expect(login).toContain('login-page__brand-title');
    expect(login).toContain('login-page__benefits');
    expect(login).toContain('Control de turnos');
    expect(login).toContain('Mejor experiencia');
    expect(login).toContain('Crece tu barbería');
    expect(login).toContain('name="clock"');
    expect(login).toContain('name="star"');
    expect(login).toContain('name="chart"');
  });

  it('uses a 60/40 desktop split and keeps compact brand content on mobile', () => {
    expect(loginStyles).toMatch(/\.login-page__card\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*3fr\)\s+minmax\(0,\s*2fr\)/);
    expect(loginStyles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-page__brand-panel/);
    expect(loginStyles).not.toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-page__brand-panel\s*\{[^}]*display:\s*none/);
  });

  it('uses shared palette aliases and locally installed Manrope and Inter fonts', () => {
    const palette = ['#0D1B4C', '#2563EB', '#F7F9FC', '#D7DEEA', '#16A34A', '#DC2626', '#E8B14C'];
    const names = ['navy', 'action', 'background', 'border', 'success', 'error', 'accent'];
    palette.forEach((color) => expect(tokens).toContain(color));
    names.forEach((name) => expect(tokens).toContain(`--login-${name}`));
    expect(loginStyles).toContain('var(--login-navy)');
    expect(loginStyles).toContain('var(--login-action)');
    expect(loginStyles).toContain('var(--login-background)');
    expect(loginStyles).toContain('var(--login-border)');
    expect(loginStyles).toContain('var(--login-success)');
    expect(loginStyles).toContain('var(--login-error)');
    expect(loginStyles).toContain('var(--login-accent)');
    expect(login).toContain("@fontsource/manrope");
    expect(login).toContain("@fontsource/inter");
  });

  it('toggles password visibility with an accessible, stateful control', () => {
    expect(login).toContain('showPassword');
    expect(login).toContain('getPasswordToggleProps(showPassword)');
    expect(login).toContain('aria-label={passwordToggle.label}');
    expect(login).toContain('aria-pressed={passwordToggle.pressed}');
    expect(login).toContain('type={passwordToggle.inputType}');
    expect(login).toContain('setShowPassword(togglePasswordVisibility)');
    expect(login).toContain('name={passwordToggle.iconName}');
  });

  it('keeps an alert slot and marks invalid credentials on the related fields', () => {
    expect(login).toContain('login-page__alerts');
    expect(login).toContain('credentialsInvalid');
    expect(login).toContain('aria-invalid={credentialsInvalid}');
    expect(login).toContain("aria-describedby={credentialsInvalid ? 'login-credentials-error' : undefined}");
    expect(login).toContain("'login-credentials-error'");
    expect(login).toContain('Correo o contraseña incorrectos.');
    expect(loginStyles).toContain('.login-page__alerts');
  });

  it('exposes pending state, loading indicator, and keyboard focus affordances', () => {
    expect(login).toContain('aria-busy={pending}');
    expect(login).toContain('login-page__spinner');
    expect(loginStyles).toContain('.login-page__spinner');
    expect(loginStyles).toContain(':focus-visible');
    expect(loginStyles).toContain('prefers-reduced-motion');
  });

  it('offers Remember me by default and submits the selected persistence mode', () => {
    expect(login).toContain('Recordarme');
    expect(login).toContain('type="checkbox"');
    expect(login).toContain('checked={rememberMe}');
    expect(login).toContain('setRememberMe');
    expect(login).toContain('signIn(email, password, rememberMe)');
    expect(loginStyles).toContain('.login-page__remember');
  });

  it('contracts the exact compact reference copy and viewport-fit behavior', () => {
    expect(login).toContain('Gestiona turnos con rapidez y orden.');
    expect(login).toContain('Crece tu barbería');
    expect(login).toContain("'Entrar al panel'");
    expect(login).toContain('login-page__separator');
    expect(login).toContain('Controla la agenda y reduce esperas.');
    expect(login).toContain('Ofrece una atención más ágil.');
    expect(login).toContain('Convierte cada visita en crecimiento.');

    expect(loginStyles).toMatch(/\.login-page\s*\{[^}]*min-height:\s*100dvh/);
    expect(loginStyles).toMatch(/\.login-page__card\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*3fr\)\s+minmax\(0,\s*2fr\)/);
    expect(loginStyles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-page__benefits\s*\{[^}]*display:\s*none/);
    expect(loginStyles).toMatch(/@media\s*\(max-height:\s*700px\)[\s\S]*?overflow-y:\s*auto/);
  });

  it('uses a full-bleed shell instead of a floating card on desktop and mobile', () => {
    const pageRule = loginStyles.match(/\.login-page\s*\{([^}]*)\}/)?.[1] ?? '';
    const shellRule = loginStyles.match(/\.login-page__card\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(pageRule).toMatch(/width:\s*100vw/);
    expect(pageRule).toMatch(/min-height:\s*100dvh/);
    expect(pageRule).not.toMatch(/padding:/);

    expect(shellRule).toMatch(/width:\s*100vw/);
    expect(shellRule).toMatch(/height:\s*100dvh/);
    expect(shellRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*3fr\)\s+minmax\(0,\s*2fr\)/);
    expect(shellRule).not.toMatch(/(?:max-width|border(?:-radius)?|box-shadow):/);

    expect(loginStyles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-page\s*\{[^}]*padding:\s*0/);
    expect(loginStyles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-page__card\s*\{[^}]*border-radius:\s*0/);
    expect(loginStyles).toMatch(/@media\s*\(max-width:\s*760px\)[\s\S]*?\.login-page__card\s*\{[^}]*width:\s*100vw/);
  });
});
