-- Read the authenticated user's active business memberships for a future
-- context chooser. The client never supplies identity or business scope.
create or replace function public.mis_membresias_empresa()
returns table(
  empresa_id uuid,
  empresa_nombre text,
  empresa_codigo text,
  rol public.rol_membresia_empresa
)
language sql
security definer
set search_path = ''
as $$
  select m.empresa_id, e.nombre, e.codigo, m.rol
  from public.membresias_empresa as m
  join public.empresas as e on e.id = m.empresa_id
  where m.usuario_id = auth.uid()
    and m.activa
  order by e.nombre, e.codigo, m.rol;
$$;

revoke all on function public.mis_membresias_empresa() from public, anon;
grant execute on function public.mis_membresias_empresa() to authenticated;
