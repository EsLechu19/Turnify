import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0056_barbero_perfil_membresia.sql'), 'utf8');

describe('barber profile membership migration', () => {
  it('validates linked profiles through active memberships instead of perfiles.empresa_id', () => {
    expect(migration).toContain('create or replace function public.validar_perfil_barbero()');
    expect(migration).toContain('join public.membresias_personal_empresa as m');
    expect(migration).toContain("p.rol = 'personal'");
    expect(migration).toContain('m.empresa_id = new.empresa_id');
    expect(migration).toContain('m.activa');
    expect(migration).toContain('where p.id = new.perfil_id');
    expect(migration).not.toContain('v_perfil.empresa_id <> new.empresa_id');
  });

  it('keeps profile-side validation aligned with every linked barber membership', () => {
    expect(migration).toContain('create or replace function public.validar_barbero_perfil()');
    expect(migration).toContain('where b.perfil_id = new.id');
    expect(migration).toContain('m.perfil_id = new.id');
    expect(migration).toContain('m.empresa_id = b.empresa_id');
    expect(migration).toContain("new.rol <> 'personal'");
    expect(migration).not.toContain('new.empresa_id <> b.empresa_id');
  });

  it('preserves trigger names, security, and data-free replacement semantics', () => {
    expect(migration).toContain('security definer');
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('trg_barberos_validar_perfil');
    expect(migration).toContain('trg_perfiles_validar_barbero');
    expect(migration).toContain('drop trigger if exists');
    expect(migration).not.toMatch(/\b(insert|update|delete)\s+(into\s+)?public\./i);
    expect(migration).toContain('Migration 0019');
  });
});
