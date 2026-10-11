import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('mobile logout regression', () => {
  it('clears auth state locally and coalesces repeated sign-out calls', () => {
    const auth = source('../../apps/mobile/src/features/auth/use-auth.tsx');

    expect(auth).toContain('useRef');
    expect(auth).toContain('signOutPromise');
    expect(auth).toContain('isSigningOut');
    expect(auth).toContain('!active || isSigningOut.current');
    expect(auth).toContain('active && !isSigningOut.current');
    expect(auth).toContain('setSession(null)');
    expect(auth).toContain('setProfile(null)');
    expect(auth).toContain('setIsRestoring(false)');
    expect(auth).toContain('setIsProfileLoading(false)');
  });

  it('lets the worker guard perform the single public navigation after logout', () => {
    for (const path of [
      '../../apps/mobile/src/app/(app)/worker-profile.tsx',
      '../../apps/mobile/src/app/(app)/worker-shops.tsx',
    ]) {
      const screen = source(path);
      expect(screen).toContain('void signOut();');
      expect(screen).not.toContain("router.replace('/')");
    }
  });

  it('keeps customer logout wired to auth and demo mode as a no-op', () => {
    const profile = source('../../apps/mobile/src/app/(app)/profile.tsx');
    const auth = source('../../apps/mobile/src/features/auth/use-auth.tsx');

    expect(profile).toContain('signOut()');
    expect(auth).toContain('if (isDemoSkipAuth) return;');
  });
});
