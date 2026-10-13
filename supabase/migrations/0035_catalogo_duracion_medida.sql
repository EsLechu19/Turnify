-- Catalog serves the measured duration per service: trimmed mean of the last 30
-- finished attentions (values over twice the median are interruptions, not
-- service time). Null when unmeasured so clients fall back to the configured
-- estimate. Same signature: existing grants stay valid.

create or replace function public.catalogo_comercial(p_codigo text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', e.nombre,
    'abierta', e.abierta,
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
        'servicio_ids', (
          select coalesce(jsonb_agg(bs.servicio_id order by bs.servicio_id), '[]'::jsonb)
          from public.barbero_servicios as bs where bs.barbero_id = b.id
        )
      ) order by b.nombre)
      from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      where b.empresa_id = e.id and b.activo and bo.estado <> 'fuera_de_turno'
        and b.perfil_id is not null
        and exists (
          select 1 from public.perfiles as p
          join public.membresias_personal_empresa as m
            on m.perfil_id = p.id and m.empresa_id = b.empresa_id and m.activa
          where p.id = b.perfil_id and p.rol = 'personal'
        )
    ), '[]'::jsonb)
  )
  from public.empresas as e
  where e.codigo = upper(btrim(p_codigo));
$$;
