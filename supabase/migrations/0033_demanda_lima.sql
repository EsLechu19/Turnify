-- Hourly demand baseline in America/Lima (no DST, fixed UTC-5, but the named
-- zone keeps it correct): weekday, day boundary and hour buckets all follow
-- the shop clock, not the database UTC clock. Body otherwise identical to
-- 0032. Same signature: existing grants stay valid.

create or replace function public.demanda_estimada(p_semanas integer default 8)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.mi_empresa_id();
  v_hoy date := ((now() at time zone 'America/Lima'))::date;
  v_dow integer := extract(isodow from v_hoy)::integer;
  v_dias integer := greatest(1, p_semanas * 7);
  v_jornadas integer;
begin
  if v_empresa is null then raise exception 'Sin barbería seleccionada'; end if;

  select count(distinct t.fecha_operativa) into v_jornadas
  from public.tickets as t
  where t.empresa_id = v_empresa
    and t.fecha_operativa > v_hoy - v_dias
    and extract(isodow from t.fecha_operativa)::integer = v_dow;

  v_jornadas := greatest(v_jornadas, 1);

  return (
    select jsonb_agg(
      jsonb_build_object('hora', g.h, 'promedio', coalesce(round(x.cnt::numeric / v_jornadas, 1), 0))
      order by g.h
    )
    from generate_series(0, 23) as g(h)
    left join (
      select extract(hour from t.creado_en at time zone 'America/Lima')::integer as h, count(*) as cnt
      from public.tickets as t
      where t.empresa_id = v_empresa
        and t.fecha_operativa > v_hoy - v_dias
        and extract(isodow from t.fecha_operativa)::integer = v_dow
      group by 1
    ) as x on x.h = g.h
  );
end;
$$;

revoke all on function public.demanda_estimada(integer) from public;
grant execute on function public.demanda_estimada(integer) to authenticated;
