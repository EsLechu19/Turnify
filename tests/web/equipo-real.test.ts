import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('professional team section', () => {
  it('persists roster edits through the admin RPC without email', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain('updateStaff');
    expect(page).toContain('reloadServices');
    expect(page).toContain('paceMinutes');
    expect(page).not.toContain('restStart');
    expect(page).not.toContain('Cronograma de descansos');
    expect(page).not.toContain('station');
    expect(live).toContain('actualizar_barbero_personal');
  });
});
