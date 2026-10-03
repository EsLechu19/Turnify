import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0021_called_ticket_customer_response.sql'), 'utf8');

describe('called-ticket customer response migration', () => {
  it('owns a fixed five-minute deadline and protects it from later mutation', () => {
    expect(migration).toContain('llamado_vencimiento_en timestamptz');
    expect(migration).toContain("llamado_en + interval '5 minutes'");
    expect(migration).toContain("llamado_vencimiento_en=now() + interval '5 minutes'");
    expect(migration).toContain('El vencimiento del llamado es inmutable');
    expect(migration).not.toContain('minutos_gracia');
  });

  it('initializes both active call paths atomically and clears a previous response', () => {
    expect(migration).toContain('create or replace function public.llamar_siguiente');
    expect(migration).toContain('create or replace function public.llamar_mi_siguiente');
    expect(migration).toContain('respuesta_cliente=null,respuesta_cliente_en=null');
  });

  it('uses the stored deadline, not mutable company configuration, for absence sweep', () => {
    const sweep = migration.slice(migration.indexOf('create or replace function public.marcar_ausentes'), migration.indexOf('-- The guest needs'));
    expect(sweep).toContain('llamado_vencimiento_en <= now()');
    expect(sweep).not.toContain('public.empresas');
  });

  it('requires the existing SHA-256 capability and permits one timely valid response', () => {
    const response = migration.slice(migration.indexOf('create or replace function public.responder_llamado_invitado'), migration.indexOf('create or replace function public.estado_ticket_invitado'));
    expect(response).toContain("p_respuesta not in ('presente','llega_en_2_min')");
    expect(response).toContain("acceso_publico_hash=extensions.digest(p_capacidad,'sha256') for update");
    expect(response).toContain("v_ticket.estado <> 'llamado'");
    expect(response).toContain('now() >= v_ticket.llamado_vencimiento_en');
    expect(response).toContain('if v_ticket.respuesta_cliente is null then');
    expect(response).toContain("elsif v_ticket.respuesta_cliente <> p_respuesta then");
    expect(response).toContain('La respuesta del cliente ya fue registrada');
  });

  it('exposes deadline and response only through capability and selected-shop RPCs', () => {
    expect(migration).toContain("'llamado_vencimiento_en',v_ticket.llamado_vencimiento_en");
    expect(migration).toContain("'respuesta_cliente',t.respuesta_cliente");
    expect(migration).toContain('t.empresa_id=v_empresa');
    expect(migration).toContain('revoke all on function public.responder_llamado_invitado(uuid,text,text) from public;');
    expect(migration).toContain('to anon, authenticated;');
    expect(migration).not.toMatch(/grant\s+(select|update|all)\s+on\s+(table\s+)?public\.tickets\s+to\s+anon/i);
  });
});
