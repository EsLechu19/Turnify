-- Hourly demand baseline: average tickets created per hour on the same weekday
-- over the last weeks, company-scoped. Feeds the dashboard "Estimado vs Real"
-- card so the estimate is history, not invented numbers. Same signature rule:
-- grants are explicit below.

create or replace function public.demanda_estimada(p_semanas integer default 8)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid := public.mi_empresa_id();
  v_dow integer := extract(isodow from current_date)::integer;
  v_dias integer := greatest(1, p_semanas * 7);
  v_jornadas integer;
begin
  if v_empresa is null then raise exception 'Sin barbería seleccionada'; end if;

  select count(distinct t.fecha_operativa) into v_jornadas
  from public.tickets as t
  where t.empresa_id = v_empresa
    and t.fecha_operativa > current_date - v_dias
    and extract(isodow from t.fecha_operativa)::integer = v_dow;

  v_jornadas := greatest(v_jornadas, 1);

  return (
    select jsonb_agg(
      jsonb_build_object('hora', g.h, 'promedio', coalesce(round(x.cnt::numeric / v_jornadas, 1), 0))
      order by g.h
    )
    from generate_series(0, 23) as g(h)
    left join (
      select extract(hour from t.creado_en)::integer as h, count(*) as cnt
      from public.tickets as t
      where t.empresa_id = v_empresa
        and t.fecha_operativa > current_date - v_dias
        and extract(isodow from t.fecha_operativa)::integer = v_dow
      group by 1
    ) as x on x.h = g.h
  );
end;
$$;

revoke all on function public.demanda_estimada(integer) from public;
grant execute on function public.demanda_estimada(integer) to authenticated;
