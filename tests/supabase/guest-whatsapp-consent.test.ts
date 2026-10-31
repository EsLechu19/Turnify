import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/0060_guest_whatsapp_consent.sql', 'utf8');

describe('guest WhatsApp consent migration contract', () => {
  it('replaces the six-argument RPC and enforces normalized consent storage', () => {
    expect(migration).toContain('drop function if exists public.crear_ticket_invitado(text, uuid, text, public.rango_edad_invitado, public.genero_invitado, uuid)');
    expect(migration).toContain('p_telefono text default null');
    expect(migration).toContain('p_consentimiento_whatsapp boolean default false');
    expect(migration).toContain("telefono_invitado ~ '^\\+[1-9][0-9]{7,14}$'");
    expect(migration).toContain('not consentimiento_whatsapp and telefono_invitado is null');
    expect(migration).toContain("regexp_replace(coalesce(p_telefono, ''), '[[:space:]().-]', '', 'g')");
  });

  it('keeps guest RPC responses private and preserves the final worker routing filter', () => {
    expect(migration).toContain("return jsonb_build_object(\n    'ticket_id'");
    expect(migration).toContain("'telefono_invitado',t.telefono_invitado,'consentimiento_whatsapp',t.consentimiento_whatsapp");
    expect(migration).toContain("t.barbero_solicitado_id=v_barbero.id and t.origen='presencial'");
    expect(migration).toContain('grant execute on function public.crear_ticket_invitado(text, uuid, text, public.rango_edad_invitado, public.genero_invitado, uuid, text, boolean) to anon, authenticated');
  });
});
