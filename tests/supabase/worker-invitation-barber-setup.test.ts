import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0017_worker_invitation_barber_setup.sql'), 'utf8');

describe('worker invitation barber setup migration', () => {
  it('requires the authenticated account to match an unaccepted invitation', () => {
    expect(migration).toContain("v_email text := lower(coalesce(auth.jwt() ->> 'email', ''))");
    expect(migration).toContain("lower(v_inv.email) <> v_email");
    expect(migration).toContain('and aceptada = false');
  });

  it('does not convert an existing admin or associated account into a worker', () => {
    expect(migration).toContain("v_profile.rol <> 'cliente' or v_profile.empresa_id is not null");
  });

  it('creates the invited personal barber and off-shift operational records without assigning services', () => {
    expect(migration).toContain('insert into public.barberos');
    expect(migration).toContain('insert into public.barbero_operaciones');
    expect(migration).toContain("'fuera_de_turno'");
    expect(migration).not.toContain('barbero_servicios');
  });
});
