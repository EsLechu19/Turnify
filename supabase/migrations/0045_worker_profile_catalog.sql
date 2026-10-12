-- Read-only worker profile catalog. The authenticated user is the sole scope;
-- clients cannot select an arbitrary barbería or worker profile.
create or replace function public.mi_catalogo_perfil_personal()
returns table (
  empresa_id uuid,
  empresa_nombre text,
  es_actual boolean,
  servicio_id uuid,
  servicio_nombre text,
  servicio_descripcion text,
  duracion_estimada_seg integer,
  precio_referencia_centavos integer
)
language sql
security definer
set search_path = ''
as $$
  select distinct
    m.empresa_id,
    e.nombre,
    p.empresa_personal_actual_id = m.empresa_id,
    s.id,
    s.nombre,
    s.descripcion,
    s.duracion_estimada_seg,
    s.precio_referencia_centavos
  from public.membresias_personal_empresa as m
  join public.perfiles as p on p.id = m.perfil_id and p.id = auth.uid() and p.rol = 'personal'
  join public.empresas as e on e.id = m.empresa_id
  left join public.barberos as b on b.empresa_id = m.empresa_id and b.perfil_id = m.perfil_id and b.activo
  left join public.barbero_servicios as bs on bs.barbero_id = b.id
  left join public.servicios as s on s.id = bs.servicio_id and s.empresa_id = m.empresa_id and s.activo
  where m.activa
  order by e.nombre, s.nombre nulls last;
$$;

grant execute on function public.mi_catalogo_perfil_personal() to authenticated;
