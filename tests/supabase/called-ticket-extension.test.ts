import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(join(root, 'supabase', 'migrations', '0024_called_ticket_extension.sql'), 'utf8');

describe('called-ticket extension migration', () => {
  it('updates the protection trigger to allow a strict 2-minute extension exactly once', () => {
    expect(migration).toContain('create or replace function public.proteger_vencimiento_llamado_ticket()');
    expect(migration).toContain("new.respuesta_cliente = 'llega_en_2_min'");
    expect(migration).toContain("old.respuesta_cliente is null");
    expect(migration).toContain("new.llamado_vencimiento_en = old.llamado_vencimiento_en + interval '2 minutes'");
    expect(migration).toContain('El vencimiento del llamado solo se puede extender 2 minutos una vez');
  });

  it('updates responder_llamado_invitado to apply the deadline extension atomically', () => {
    expect(migration).toContain('create or replace function public.responder_llamado_invitado');
    expect(migration).toContain("if p_respuesta = 'llega_en_2_min' then");
    expect(migration).toContain("llamado_vencimiento_en=llamado_vencimiento_en + interval '2 minutes'");
    expect(migration).toContain("update public.tickets set respuesta_cliente=p_respuesta, respuesta_cliente_en=now()");
  });
});
