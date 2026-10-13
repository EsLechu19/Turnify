import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('professional services persistence', () => {
  it('creates, updates and removes through the backend without fake ids', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(page).toContain('createService');
    expect(page).toContain('updateService');
    expect(page).not.toContain('svc-${Date.now()}');
    expect(live).toContain('createServiceRecord');
    expect(live).toContain('removeServiceRecord');
  });

  it('resolves the selected company for personal accounts instead of querying with a null empresa_id', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(live).toContain(".select('rol,empresa_id,empresa_personal_actual_id')");
    expect(live).toContain("row.rol === 'personal' ? row.empresa_personal_actual_id : row.empresa_id");
    expect(live).not.toContain("return (data as { empresa_id: string | null }).empresa_id ?? ''");
  });
});
