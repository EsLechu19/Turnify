-- Operative day on the Lima clock: new tickets are stamped with the Lima date
-- and the day-close sweep compares against the Lima date, so the evening
-- shift is no longer split at 19:00 (00:00 UTC). The per-minute absence sweep
-- and the hourly close cadence are timezone-agnostic and stay as they are.

alter table public.tickets alter column fecha_operativa set default ((now() at time zone 'America/Lima'))::date;

create or replace function public.cerrar_tickets_vencidos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  update public.tickets
  set estado = 'cancelado',
      cerrado_en = now(),
      actualizado_en = now()
  where estado in ('en_espera', 'notificado', 'llamado')
    and fecha_operativa < ((now() at time zone 'America/Lima'))::date;

  get diagnostics v_count = row_count;

  update public.barbero_operaciones as bo
  set estado = 'disponible', actualizado_en = now()
  where bo.estado = 'ocupado'
    and not exists (
      select 1 from public.tickets as t
      where t.barbero_asignado_id = bo.barbero_id
        and t.empresa_id = bo.empresa_id
        and t.estado in ('llamado', 'en_atencion')
    );

  return v_count;
end;
$$;
