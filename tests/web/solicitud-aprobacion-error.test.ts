import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('request approval error contract', () => {
  it('translates the known remote failure categories locally', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(page).toContain('export function translateRequestError');
    expect(page).toContain('pgrst202|42883');
    expect(page).toContain('permission denied');
    expect(page).toContain('request.*not found');
    expect(page).toContain('already resolved');
    expect(page).toContain('sin barbería|sin empresa');
    expect(page).toContain('23505|constraint');
    expect(page).toContain('failed to fetch|network');
    expect(page).toContain('Referencia: solicitudes.');
  });

  it('uses the translated message for loading and resolving without changing the live adapter', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain("translateRequestError(reason, 'load')");
    expect(page).toContain("translateRequestError(reason, approve ? 'approve' : 'deny')");
    expect(page).toContain('loadRequests();');
    expect(page).toContain('loadStaff();');
    expect(live).not.toContain('translateRequestError');
  });

  it('does not render unsafe remote details', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(page).toContain('safeRemoteDetail');
    expect(page).toContain('select|insert|update|delete');
    expect(page).toContain('[;{}]');
    expect(page).toContain('token|secret|password');
  });
});
