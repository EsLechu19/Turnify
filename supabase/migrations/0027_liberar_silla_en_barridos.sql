-- Release barber chairs when batch sweeps close their active tickets.
--
-- Root cause: llamar_mi_siguiente marks barbero_operaciones 'ocupado', but the
-- batch sweeps moved tickets out of 'llamado' without resetting the chair, so
-- barbers stayed 'ocupado' with no active ticket (Estaciones shows OCUPADA +
-- "Sin turno asignado", and llamar_mi_siguiente stays blocked because it
-- requires 'disponible').
--
-- Only 'ocupado' rows with no remaining llamado/en_atencion ticket are
-- released: 'disponible' rows need nothing, and 'fuera_de_turno' is an
-- explicit human state that sweeps must never touch. Grants are preserved:
-- CREATE OR REPLACE keeps service_role ownership of both batch functions.

-- One-time repair for chairs stranded before this migration.
update public.barbero_operaciones as bo
set estado = 'disponible', actualizado_en = now()
where bo.estado = 'ocupado'
  and not exists (
    select 1 from public.tickets as t
    where t.barbero_asignado_id = bo.barbero_id
      and t.empresa_id = bo.empresa_id
      and t.estado in ('llamado', 'en_atencion')
  );

-- ---------------------------------------------------------------------------
-- Batch (service_role/cron only): sweep every llamado ticket past its own
-- company grace window (llamado_en + minutos_gracia) to ausente, then release
-- the chairs left without an active ticket.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_ausentes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  update public.tickets as t
  set estado = 'ausente',
      cerrado_en = now(),
      actualizado_en = now()
  from public.empresas as e
  where t.empresa_id = e.id
    and t.estado = 'llamado'
    and t.llamado_en is not null
    and t.llamado_en <= now() - (e.minutos_gracia * interval '1 minute');

  get diagnostics v_count = row_count;

  -- A chair is only meaningful while its barber holds a llamado/en_atencion
  -- ticket: barbers with an en_atencion ticket in progress stay 'ocupado'.
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

-- ---------------------------------------------------------------------------
-- Batch (service_role/cron only): cancel open tickets whose operative date
-- already passed, then release the chairs left without an active ticket.
-- Only waiting/called states move; en_atencion tickets of past days are left
-- for separate review (they may still be served).
-- ---------------------------------------------------------------------------
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
    and fecha_operativa < current_date;

  get diagnostics v_count = row_count;

  -- Same chair release as marcar_ausentes: barbers keeping an en_atencion
  -- ticket stay 'ocupado'.
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
