import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('worker avatar wiring', () => {
  it('lets the worker pick, upload and save their photo', () => {
    const avatar = read('apps', 'mobile', 'src', 'features', 'worker', 'worker-avatar.ts');
    const profile = read('apps', 'mobile', 'src', 'components', 'worker', 'worker-profile-content.tsx');

    expect(avatar).toContain('actualizar_mi_foto_barbero');
    expect(avatar).toContain('avatares-barberos');
    expect(profile).toContain('Cambiar foto');
    expect(profile).toContain('fotoUrl');
  });

  it('shows the photo to guests and admins', () => {
    const api = read('apps', 'mobile', 'src', 'features', 'queue', 'commercial-queue-api.ts');
    const picker = read('apps', 'mobile', 'src', 'app', '(public)', 'barber.tsx');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(api).toContain('fotoUrl');
    expect(picker).toContain('fotoUrl');
    expect(live).toContain('foto_url');
  });
});
