import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

const login = read('apps', 'web', 'src', 'features', 'auth', 'LoginPage.tsx');
const styles = read('apps', 'web', 'src', 'styles', 'app.css');

describe('branded web login', () => {
  it('uses a dedicated split layout and the supplied barber-shop image', () => {
    expect(login).toContain('login-page');
    expect(login).toContain('login-page__visual');
    expect(login).toContain('login-page__form-panel');
    expect(login).toContain('/barbershop-login-hero.png');
    expect(login).toContain('Sign in to your shop');
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

  it('keeps redesigned selectors isolated from shared registration styles', () => {
    expect(styles).toMatch(/\.login-page(?:__[-\w]+)?\s*\{/);
    expect(styles).toContain('.auth {');
    expect(styles).toContain('.auth__panel {');
  });
});
