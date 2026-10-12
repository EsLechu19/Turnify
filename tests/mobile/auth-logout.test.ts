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
    expect(auth).toContain('setIsSigningOut(true)');
    expect(auth).toContain('isSigningOut: boolean');
  });

  it('routes every logout button through the shared auth transition', () => {
    for (const path of [
      '../../apps/mobile/src/components/worker/worker-profile-content.tsx',
      '../../apps/mobile/src/app/(app)/worker-shops.tsx',
      '../../apps/mobile/src/app/(app)/profile.tsx',
    ]) {
      const screen = source(path);
      expect(screen).toContain('void signOut();');
      expect(screen).not.toContain("router.replace('/')");
    }
  });

  it('has one logout navigation owner and suppresses the app guard during transition', () => {
    const rootLayout = source('../../apps/mobile/src/app/_layout.tsx');
    const appLayout = source('../../apps/mobile/src/app/(app)/_layout.tsx');
    const shops = source('../../apps/mobile/src/app/(app)/worker-shops.tsx');
    const profile = source('../../apps/mobile/src/components/worker/worker-profile-content.tsx');

    expect(rootLayout).toContain("router.replace('/(auth)/login');");
    expect(rootLayout).toContain('isSigningOut');
    expect(appLayout).toContain('if (isSigningOut)');
    expect(appLayout.indexOf('if (isSigningOut)')).toBeLessThan(appLayout.indexOf('if (!session)'));
    expect(shops).not.toContain("import { Redirect");
    expect(shops).not.toContain('<Redirect href="/" />');
    expect(profile).toContain('let active = true;');
    expect(profile).toContain('active = false;');
    expect(shops).toContain('isMounted.current = true;');
    expect(shops).toContain('isMounted.current = false;');
  });

  it('keeps customer logout wired to auth and demo mode as a no-op', () => {
    const profile = source('../../apps/mobile/src/app/(app)/profile.tsx');
    const auth = source('../../apps/mobile/src/features/auth/use-auth.tsx');

    expect(profile).toContain('signOut()');
    expect(auth).toContain('if (isDemoSkipAuth) return;');
  });
});
