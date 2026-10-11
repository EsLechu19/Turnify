-- Customer-facing geolocation (100% free stack).
--
-- Decision: Leaflet + OpenStreetMap for the admin map picker, the
-- OpenRouteService free tier for driving distance/duration, and phone GPS via
-- expo-location. Paid map vendors stay out: no billing, no vendor key.
--
-- empresas gains nullable shop coordinates (latitud/longitud, numeric).
-- Reads: guests see coordinates only through catalogo_comercial (security
-- definer with an anon grant). There is intentionally no direct anon/authenticated
-- SELECT path to empresas, so no new RLS policy is created here.
-- Writes: covered by the existing empresas_update policy (admin of their own
-- empresa only). Forward-only: additive columns, checks, and a function refresh.

alter table public.empresas add column if not exists latitud numeric;
alter table public.empresas add column if not exists longitud numeric;

comment on column public.empresas.latitud is 'Shop latitude in decimal degrees; null until the admin sets the map point.';
comment on column public.empresas.longitud is 'Shop longitude in decimal degrees; null until the admin sets the map point.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'empresas_latitud_rango_ck') then
    alter table public.empresas
      add constraint empresas_latitud_rango_ck
      check (latitud is null or (latitud >= -90 and latitud <= 90));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'empresas_longitud_rango_ck') then
    alter table public.empresas
      add constraint empresas_longitud_rango_ck
      check (longitud is null or (longitud >= -180 and longitud <= 180));
  end if;
end;
$$;

-- Same signature and grants; adds the nullable shop point to the guest payload.
-- Mirrors 0042 (measured durations + global worker photo) plus latitud/longitud.
create or replace function public.catalogo_comercial(p_codigo text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', e.nombre,
    'abierta', e.abierta,
    'latitud', e.latitud,
    'longitud', e.longitud,
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'servicio_id', s.id,
        'nombre', s.nombre,
        'descripcion', s.descripcion,
        'duracion_estimada_seg', s.duracion_estimada_seg,
        'duracion_medida_seg', (
          with r30 as (
            select extract(epoch from (t.fin_en - t.inicio_en))::integer as segundos
            from public.tickets as t
            where t.empresa_id = e.id and t.servicio_id = s.id
              and t.estado = 'finalizado' and t.inicio_en is not null and t.fin_en is not null
              and t.fin_en >= t.inicio_en
            order by t.fin_en desc limit 30
          ),
          med as (
            select percentile_cont(0.5) within group (order by r30.segundos) as m from r30
          )
          select case when count(*) = 0 then null else round(avg(r30.segundos))::integer end
          from r30 cross join med
          where med.m is null or med.m <= 0 or r30.segundos <= med.m * 2
        ),
        'precio_referencia_centavos', s.precio_referencia_centavos
      ) order by s.nombre)
      from public.servicios as s
      where s.empresa_id = e.id and s.activo
    ), '[]'::jsonb),
    'barberos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'barbero_id', b.id,
        'nombre', b.nombre,
        'estado', bo.estado,
        'foto_url', coalesce(p.foto_url, b.foto_url),
        'servicio_ids', (
          select coalesce(jsonb_agg(bs.servicio_id order by bs.servicio_id), '[]'::jsonb)
          from public.barbero_servicios as bs where bs.barbero_id = b.id
        )
      ) order by b.nombre)
      from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      left join public.perfiles as p on p.id = b.perfil_id
      where b.empresa_id = e.id and b.activo and bo.estado <> 'fuera_de_turno'
        and b.perfil_id is not null
        and exists (
          select 1 from public.perfiles as p2
          join public.membresias_personal_empresa as m
            on m.perfil_id = p2.id and m.empresa_id = b.empresa_id and m.activa
          where p2.id = b.perfil_id and p2.rol = 'personal'
        )
    ), '[]'::jsonb)
  )
  from public.empresas as e
  where e.codigo = upper(btrim(p_codigo));
$$;

grant execute on function public.catalogo_comercial(text) to anon, authenticated;
