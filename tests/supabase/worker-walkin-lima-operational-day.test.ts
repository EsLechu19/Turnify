import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0041_worker_walkin_lima_operational_day.sql'),
  'utf8',
);

function limaDateAt(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

describe('worker walk-in operational day', () => {
  it('uses the server-defined Lima date for both queue numbering and the inserted ticket', () => {
    expect(migration).toContain('create or replace function public.crear_mi_ticket_presencial');
    expect(migration).toContain("v_fecha := ((now() at time zone 'America/Lima'))::date;");
    expect(migration).toContain('fecha_operativa=v_fecha');
    expect(migration).toContain("'presencial',p_prioridad,'en_espera',v_fecha,v_num");
    expect(migration).not.toContain('current_date');
  });

  it('keeps the pre- and post-midnight Lima tickets in separate operational days', () => {
    expect(limaDateAt('2026-01-15T04:59:59Z')).toBe('2026-01-14');
    expect(limaDateAt('2026-01-15T05:00:00Z')).toBe('2026-01-15');
  });

  it('retains server-side selected-shop and worker authority', () => {
    expect(migration).toContain('public.mi_empresa_personal_actual_id()');
    expect(migration).toContain('public.mi_barbero_actual_id()');
    expect(migration).toContain('security definer set search_path = \'\'');
  });
});
