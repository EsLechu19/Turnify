import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0022_worker_invitation_requests.sql'), 'utf8');

describe('Worker invitation request migration', () => {
  it('stores only SHA-256 hashes and creates codes with at least 128 bits of entropy', () => {
    expect(migration).toContain('codigo_hash text not null');
    expect(migration).toContain("extensions.digest(p_valor, 'sha256')");
    expect(migration).toContain('extensions.gen_random_bytes(16)');
    expect(migration).not.toContain('codigo text not null');
  });

  it('limits code lifetime, active records, and request redemption to one atomic update', () => {
    expect(migration).toContain("now() + interval '7 days'");
    expect(migration).toContain("where estado in ('issued', 'requested')");
    expect(migration).toContain("set estado = 'requested'");
    expect(migration).toContain("estado = 'issued' and expira_en > now()");
  });

  it('binds redemption to the authenticated JWT email and provides a generic error', () => {
    expect(migration).toContain("auth.jwt() ->> 'email'");
    expect(migration).toContain('email_hash = public.hash_invitacion_personal(v_email)');
    expect(migration).toContain("raise exception 'No se pudo enviar la solicitud'");
  });

  it('keeps requests private and exposes Admin-only generation, listing, and locked resolution', () => {
    expect(migration).toContain('enable row level security');
    expect(migration).toContain("where id = auth.uid() and rol = 'admin'");
    expect(migration).toContain('for update;');
    expect(migration).toContain("if v_solicitud.estado <> 'requested' then return;");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain('revoke all on table public.solicitudes_invitacion_personal from anon, authenticated');
  });

  it('approves by provisioning membership, barber, and operations without changing selected shop', () => {
    expect(migration).toContain('insert into public.membresias_personal_empresa');
    expect(migration).toContain('insert into public.barberos');
    expect(migration).toContain('insert into public.barbero_operaciones');
    expect(migration).not.toContain('empresa_personal_actual_id = v_empresa');
    expect(migration).toContain('if not p_aprobar then return; end if;');
    expect(migration).not.toContain('delete from public.membresias_personal_empresa');
  });

  it('validates a Worker barber through an active membership in the exact selected shop', () => {
    expect(migration).toContain('join public.membresias_personal_empresa m');
    expect(migration).toContain('m.empresa_id = v_empresa and m.activa');
  });
});
