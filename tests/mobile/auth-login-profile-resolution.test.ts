import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('mobile login profile resolution', () => {
  it('keeps the auth layout blocked while the session profile is loading', () => {
    const layout = source('../../apps/mobile/src/app/(auth)/_layout.tsx');

    expect(layout).toContain('if (session && isProfileLoading)');
    expect(layout.indexOf('if (session && isProfileLoading)')).toBeLessThan(layout.indexOf('staffLanding(profile)'));
  });

  it('opens the profile loading gate before sign-in and closes it on every result', () => {
    const auth = source('../../apps/mobile/src/features/auth/use-auth.tsx');
    const signIn = auth.slice(auth.indexOf('const signIn ='), auth.indexOf('const signUp ='));

    expect(signIn).toContain('isSigningOut.current = false;');
    expect(signIn).toContain('setIsProfileLoading(true);');
    expect(signIn).toContain('finally');
    expect(signIn).toContain('setIsProfileLoading(false);');
    expect(signIn.indexOf('setIsProfileLoading(true);')).toBeLessThan(signIn.indexOf('signInWithPassword'));
  });

  it('preserves failed-login and demo-mode behavior', () => {
    const auth = source('../../apps/mobile/src/features/auth/use-auth.tsx');
    const signIn = auth.slice(auth.indexOf('const signIn ='), auth.indexOf('const signUp ='));

    expect(signIn).toContain("return 'La demostración no usa correo y contraseña.';");
    expect(signIn).toContain('if (error)');
    expect(signIn).toContain('translateAuthError(error.message)');
    expect(auth).toContain('if (isDemoSkipAuth) return;');
  });

  it('does not report profile-query success when profile resolution fails', () => {
    const auth = source('../../apps/mobile/src/features/auth/use-auth.tsx');
    const signIn = auth.slice(auth.indexOf('const signIn ='), auth.indexOf('const signUp ='));

    expect(signIn).toContain("return translateAuthError('profile load failed');");
    expect(signIn).toContain('clearAuthenticatedState();');
    expect(auth).toContain('setSession(null);');
    expect(auth).toContain('setProfile(null);');
    expect(auth).toContain('auth.signOut()');
  });

  it('applies the same profile failure rule to an immediately authenticated sign-up', () => {
    const auth = source('../../apps/mobile/src/features/auth/use-auth.tsx');
    const signUp = auth.slice(auth.indexOf('const signUp ='), auth.indexOf('const signOut ='));

    expect(signUp).toContain("return translateAuthError('profile load failed');");
    expect(signUp).toContain('clearAuthenticatedState();');
  });
});
