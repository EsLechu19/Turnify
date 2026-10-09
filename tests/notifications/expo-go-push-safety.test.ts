import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const staticPushImport = /import\s+[^;]*from\s+['"]expo-notifications['"]/;

describe('Expo Go push safety', () => {
  it('keeps expo-notifications out of the static boot path', () => {
    expect(staticPushImport.test(source('../../apps/mobile/src/app/_layout.tsx'))).toBe(false);
    expect(staticPushImport.test(source('../../apps/mobile/src/lib/notifications.ts'))).toBe(false);
    expect(staticPushImport.test(source('../../apps/mobile/src/features/notifications/use-notification-lifecycle.tsx'))).toBe(false);
  });

  it('detects push-capable runtimes and loads the push module lazily', () => {
    const runtime = source('../../apps/mobile/src/features/notifications/push-runtime.ts');

    expect(runtime).toContain('appOwnership');
    expect(runtime).toContain('EXPO_PUBLIC_ENABLE_PUSH');
    expect(runtime).toContain('isPushRuntimeSupported');
    expect(runtime).toContain('loadPushModule');
    expect(runtime).toContain("import('expo-notifications')");
    expect(staticPushImport.test(runtime)).toBe(false);
  });

  it('skips registration work when the runtime cannot deliver push', () => {
    const lifecycle = source('../../apps/mobile/src/features/notifications/use-notification-lifecycle.tsx');

    expect(lifecycle).toContain('isPushRuntimeSupported');
    expect(lifecycle).toContain('loadPushModule');
  });
});
