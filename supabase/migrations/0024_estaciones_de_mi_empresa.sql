-- Live shop stations: every linked roster barber with an active membership,
-- its operational state, and its current called/attended ticket (if any).
-- Staff reads its selected shop; admins read their own shop. Unlinked roster
-- rows never appear here, matching the client catalog contract (0023).

create or replace function public.estaciones_de_mi_empresa()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rol public.rol_usuario;
  v_empresa uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  select p.rol into v_rol from public.perfiles as p where p.id = v_uid;
  if v_rol = 'personal' then
    v_empresa := public.mi_empresa_personal_actual_id();
  elsif v_rol = 'admin' then
    select p.empresa_id into v_empresa from public.perfiles as p where p.id = v_uid;
  end if;
  if v_empresa is null then raise exception 'Sin barbería seleccionada'; end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'barbero_id', b.id,
      'nombre', b.nombre,
      'estado', bo.estado,
      'ticket_codigo', t.codigo_visible,
      'ticket_servicio', t.servicio_nombre,
      'ticket_estado', t.estado
    ) order by b.nombre), '[]'::jsonb)
    from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    left join lateral (
      select t.codigo_visible, t.servicio_nombre, t.estado
      from public.tickets as t
      where t.barbero_asignado_id = b.id
        and t.estado in ('llamado', 'en_atencion')
      order by t.llamado_en desc nulls last, t.actualizado_en desc
      limit 1
    ) as t on true
    where b.empresa_id = v_empresa and b.activo
      and b.perfil_id is not null
      and exists (
        select 1 from public.perfiles as p
        join public.membresias_personal_empresa as m
          on m.perfil_id = p.id and m.empresa_id = b.empresa_id and m.activa
        where p.id = b.perfil_id and p.rol = 'personal'
      )
  );
end;
$$;

grant execute on function public.estaciones_de_mi_empresa() to authenticated;
