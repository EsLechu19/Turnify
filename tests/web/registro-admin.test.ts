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

  it('persists the business intent and completes onboarding through the durable RPC', () => {
    const page = read('apps', 'web', 'src', 'features', 'auth', 'RegisterPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain('signUp(');
    expect(page).toContain('completeBusinessOnboarding(');
    expect(page).toContain('shopName');
    expect(page).toContain('confirm-email');
    expect(live).toContain("rpc('crear_empresa'");
    expect(live).toContain("rpc('completar_onboarding_empresa'");
    expect(read('apps', 'web', 'src', 'data', 'repositories.ts')).toContain('empresa_nombre');
  });

  it('shows the counter code once the shop exists', () => {
    const page = read('apps', 'web', 'src', 'features', 'auth', 'RegisterPage.tsx');

    expect(page).toContain('shopCode');
    expect(page).toContain('Entrar al panel');
  });

  it('runs onboarding before panel profile authorization after login', () => {
    const repositories = read('apps', 'web', 'src', 'data', 'repositories.ts');
    expect(repositories.indexOf('completeBusinessOnboarding')).toBeLessThan(
      repositories.indexOf('fetchOwnPanelProfile(data.session.user.id)'),
    );
  });
});
