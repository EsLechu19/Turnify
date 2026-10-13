import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('nominative worker invitation', () => {
  it('wires the admin invite flow through the existing RPCs', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(live).toContain('generar_codigo_invitacion_personal');
    expect(live).toContain('solicitudes_personal_de_mi_empresa');
    expect(live).toContain('resolver_solicitud_invitacion_personal');
    expect(page).toContain('fetchShopWorkerRequests');
    expect(page).toContain('generateWorkerInvitation');
    expect(page).toContain('Aprobar');
  });

  it('refuses codes for existing members and supersedes live rows', () => {
    const migration = read('supabase', 'migrations', '0055_generar_sin_duplicado_miembro.sql');
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(migration).toContain("raise exception 'Ya pertenece a esta barbería'");
    expect(migration).toContain("estado in ('issued', 'requested')");
    expect(page).toContain('Ya pertenece a esta barbería: no necesita invitación.');
  });
});
