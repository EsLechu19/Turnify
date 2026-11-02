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
const context = source('apps', 'web', 'src', 'state', 'AuthContext.tsx');
const routes = source('apps', 'web', 'src', 'app', 'routes.tsx');
const login = source('apps', 'web', 'src', 'features', 'auth', 'LoginPage.tsx');
const icons = source('apps', 'web', 'src', 'components', 'Icon.tsx');
const webPackage = source('apps', 'web', 'package.json');
const lockfile = source('package-lock.json');
const callback = source('apps', 'web', 'src', 'features', 'auth', 'GoogleOAuthCallbackPage.tsx');
const task = source('odd', 'tasks', 'turnify-web-login-redesign.md');

describe('Google OAuth login', () => {
  it('uses a fixed same-origin callback, never a caller-provided redirect', async () => {
    const oauth = await import('../../apps/web/src/features/auth/googleOAuth');
    expect(oauth.buildGoogleOAuthRedirectUrl('https://turnify.example')).toBe('https://turnify.example/auth/callback');
    expect(oauth.buildGoogleOAuthRedirectUrl('https://turnify.example.evil/path')).toBeNull();
    expect(oauth.buildGoogleOAuthRedirectUrl('javascript:alert(1)')).toBeNull();
    expect(repository).toContain("signInWithOAuth({ provider: 'google'");
    expect(repository).toContain('buildGoogleOAuthRedirectUrl(window.location.origin)');
    expect(repository).toContain('redirectTo');
  });

  it('passes Remember me to Supabase and exposes an accessible Spanish provider button', () => {
    expect(repository).toContain('startGoogleOAuth(rememberMe)');
    expect(repository).toContain("setPersistenceMode(rememberMe ? 'persistent' : 'session')");
    expect(context).toContain('signInWithGoogle');
    expect(login).toContain('Continuar con Google');
    expect(login).toContain('signInWithGoogle(rememberMe)');
    expect(login).toContain('googlePending');
    expect(login).toContain('aria-busy={pending}');
  });

  it('renders the maintained Font Awesome Google brand icon through the typed icon abstraction', () => {
    expect(webPackage).toContain('"@fortawesome/free-brands-svg-icons"');
    expect(lockfile).toContain('node_modules/@fortawesome/free-brands-svg-icons');
    expect(icons).toContain("import { faGoogle } from '@fortawesome/free-brands-svg-icons'");
    expect(icons).toContain("| 'google'");
    expect(icons).toContain('google: faGoogle');
    expect(login).toContain('<Icon name="google" size={18} />');
  });

  it('keeps the callback public and validates the restored profile before returning locally', () => {
    const callbackRoute = routes.indexOf('path="/auth/callback"');
    const authenticatedGuard = routes.indexOf('<Route element={<RedirectIfAuthenticated />}>');
    expect(callbackRoute).toBeGreaterThan(-1);
    expect(callbackRoute).toBeLessThan(authenticatedGuard);
    expect(routes).toContain('GoogleOAuthCallbackPage');
    expect(repository).toContain("profile.rol !== 'admin' && profile.rol !== 'personal'");
    expect(callback).toContain("navigate('/', { replace: true })");
    expect(callback).toContain('No pudimos iniciar sesión con Google');
    expect(callback).not.toMatch(/searchParams|next=|redirectTo=/i);
  });

  it('documents the required Supabase and Google provider setup without remote mutation', () => {
    expect(task).toContain('Supabase Auth Redirect URLs');
    expect(task).toContain('/auth/v1/callback');
    expect(task).toContain('Do not mutate either external project from this task.');
  });
});
