import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0018_independent_barber_roster.sql'), 'utf8');

describe('independent barber roster migration', () => {
  it('backfills optional profile links before removing the historic barber ID foreign key', () => {
    expect(migration).toContain('add column perfil_id uuid unique references public.perfiles(id) on delete set null');
    expect(migration).toContain('set perfil_id = p.id');
    expect(migration).toContain('where b.id = p.id');
    expect(migration).toContain('drop constraint barberos_id_fkey');
    expect(migration).toContain('alter column id set default gen_random_uuid()');
  });

  it('requires a linked same-business personal profile and prevents later invalidation', () => {
    expect(migration).toContain("v_perfil.rol <> 'personal' or v_perfil.empresa_id <> new.empresa_id");
    expect(migration).toContain('before insert or update of perfil_id, empresa_id on public.barberos');
    expect(migration).toContain("new.rol <> 'personal' or new.empresa_id <> b.empresa_id");
    expect(migration).toContain('before update of rol, empresa_id on public.perfiles');
  });

  it('keeps unlinked roster barbers suitable for public catalog, guest tickets, capacity, and ETA', () => {
    expect(migration).not.toContain('catalogo_comercial');
    expect(migration).not.toContain('crear_ticket_invitado');
    expect(migration).not.toContain('tomar_turno_comercial');
    expect(migration).toContain('if new.perfil_id is null then return new; end if;');
  });

  it('resolves Worker ownership through perfil_id while retaining the profile in atendido_por', () => {
    expect(migration).toContain('where b.perfil_id = v_uid and b.activo');
    expect(migration).toContain('barbero_asignado_id = v_barbero_id and atendido_por = auth.uid()');
    expect(migration).toContain("atendido_por = v_uid,");
    expect(migration).toContain('barbero_asignado_id = v_barbero_id');
  });

  it('allows reassignment only to linked Worker roster barbers and transfers profile ownership', () => {
    expect(migration).toContain('b.activo and b.perfil_id is not null and b.id <> v_ticket.barbero_asignado_id');
    expect(migration).toContain('b.activo and b.perfil_id is not null');
    expect(migration).toContain('atendido_por = v_destino.perfil_id');
    expect(migration).toContain('v_ticket.barbero_asignado_id <> v_barbero_id or v_ticket.atendido_por <> v_uid');
  });
});
