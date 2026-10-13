import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('professional settings section', () => {
  it('wires only real shop rules and drops the fictional controls', () => {
    const page = read('apps', 'web', 'src', 'features', 'settings', 'SettingsPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain('fetchShopSettings');
    expect(page).toContain('saveShopSettings');
    expect(page).toContain('preferentialEvery');
    expect(page).not.toContain('capacityLimit');
    expect(page).not.toContain('autoPause');
    expect(page).not.toContain('geoEnabled');
    expect(page).not.toContain('calledTemplate');
    expect(page).not.toContain('expireAction');
    expect(live).toContain('fetchShopSettings');
    expect(live).toContain('saveShopSettings');
  });
});
