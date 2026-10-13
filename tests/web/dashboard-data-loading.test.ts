import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('dashboard protected data loading contracts', () => {
  it('does not mount protected providers before authentication', () => {
    const source = read('apps', 'web', 'src', 'state', 'AppProviders.tsx');

    expect(source).toContain("if (status !== 'authenticated')");
    expect(source).toContain('<ProtectedProviders>{children}</ProtectedProviders>');
  });

  it('keeps restore failures visible while leaving auth in a safe anonymous state', () => {
    const source = read('apps', 'web', 'src', 'state', 'AuthContext.tsx');

    expect(source).toContain("type: 'restore-failed'");
    expect(source).toContain("status: 'anonymous', session: null");
    expect(source).toContain("No pudimos restaurar la sesión.");
  });

  it('preserves backend errors for shop and services retry surfaces', () => {
    const shop = read('apps', 'web', 'src', 'state', 'ShopContext.tsx');
    const services = read('apps', 'web', 'src', 'state', 'ServicesContext.tsx');

    expect(shop).toContain('error: string | null');
    expect(shop).toContain('refreshShop');
    expect(services).toContain('error: string | null');
    expect(services).toContain("type: 'failed'");
    expect(services).toContain('reloadServices');
  });
});
