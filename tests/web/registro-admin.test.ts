import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('admin and shop self-registration', () => {
  it('exposes a public register route from the login footer', () => {
    const routes = read('apps', 'web', 'src', 'app', 'routes.tsx');
    const login = read('apps', 'web', 'src', 'features', 'auth', 'LoginPage.tsx');

    expect(routes).toContain('RegisterPage');
    expect(routes).toContain('path="/register"');
    expect(login).toContain('to="/register"');
  });

  it('creates the account and then its shop through the real RPCs', () => {
    const page = read('apps', 'web', 'src', 'features', 'auth', 'RegisterPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain('signUp(');
    expect(page).toContain('createBusiness(');
    expect(page.indexOf('signUp(')).toBeLessThan(page.indexOf('createBusiness('));
    expect(page).toContain('confirm-email');
    expect(live).toContain("rpc('crear_empresa'");
  });

  it('shows the counter code once the shop exists', () => {
    const page = read('apps', 'web', 'src', 'features', 'auth', 'RegisterPage.tsx');

    expect(page).toContain('shopCode');
    expect(page).toContain('Entrar al panel');
  });
});
