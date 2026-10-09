-- Worker queue tickets carry their queue position and wait estimate, computed
-- with the same formula as the customer ETA (mi_ticket_estado): people ahead
-- from cola_ordenada times the fila average over the active counters. Called
-- and attended tickets are already out of the waiting order, so they resolve
-- to zero. Same signature: existing grants stay valid.

create or replace function public.mi_cola_barbero()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_barbero public.barberos;
  v_operacion public.barbero_operaciones;
begin
  select b.* into v_barbero
  from public.barberos as b
  join public.perfiles as p on p.id = b.perfil_id
  where b.perfil_id = v_uid and b.activo and p.rol = 'personal' and p.empresa_id = b.empresa_id;
  if not found then raise exception 'No tienes un perfil de barbero activo'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id = v_barbero.id;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;

  return jsonb_build_object(
    'estado', case when exists (
      select 1 from public.tickets as activo
      where activo.barbero_asignado_id = v_barbero.id and activo.estado in ('llamado', 'en_atencion')
    ) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end,
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ticket_id', t.id, 'fila_id', t.fila_id, 'fila_nombre', f.nombre,
        'codigo_visible', t.codigo_visible, 'estado', t.estado,
        'servicio_nombre', t.servicio_nombre,
        'barbero_solicitado_nombre', t.barbero_solicitado_nombre,
        'barbero_asignado_nombre', t.barbero_asignado_nombre,
        'personas_delante', greatest(coalesce(c.posicion, 1) - 1, 0),
        'espera_min', case
          when coalesce(c.posicion, 1) <= 1 then 0
          else greatest(1, ceil(((coalesce(c.posicion, 1) - 1) * f.duracion_promedio_seg / f.puestos_activos / 60.0))::int)
        end
      ) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end, c.posicion, t.numero)
      from public.tickets as t
      join public.filas as f on f.id = t.fila_id
      left join public.cola_ordenada(t.fila_id) as c on c.ticket_id = t.id
      where (t.barbero_asignado_id = v_barbero.id and t.estado in ('llamado', 'en_atencion'))
        or (
          t.estado in ('en_espera', 'notificado') and t.servicio_id is not null
          and (t.barbero_solicitado_id is null or t.barbero_solicitado_id = v_barbero.id)
          and exists (
            select 1 from public.barbero_servicios as bs
            where bs.barbero_id = v_barbero.id and bs.servicio_id = t.servicio_id
          )
        )
    ), '[]'::jsonb)
  );
end;
$$;
