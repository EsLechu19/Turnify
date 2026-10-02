-- A called ticket can be reassigned before service starts. The customer request
-- snapshot remains immutable; only the actual operational assignment changes.

create or replace function public.barberos_reasignables(p_ticket_id uuid)
returns table (barbero_id uuid, nombre text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_rol public.rol_usuario;
  v_ticket public.tickets;
begin
  select p.empresa_id, p.rol into v_empresa, v_rol from public.perfiles as p where p.id = v_uid;
  if v_empresa is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo personal autorizado puede reasignar turnos';
  end if;

  select * into v_ticket from public.tickets
  where id = p_ticket_id and empresa_id = v_empresa and estado = 'llamado';
  if not found then raise exception 'El turno no está llamado o ya inició su atención'; end if;
  if v_rol = 'personal' and (v_ticket.barbero_asignado_id <> v_uid or v_ticket.atendido_por <> v_uid) then
    raise exception 'El turno no te fue asignado';
  end if;

  return query
  select b.id, b.nombre
  from public.barberos as b
  join public.barbero_operaciones as bo on bo.barbero_id = b.id
  join public.barbero_servicios as bs on bs.barbero_id = b.id
  where b.empresa_id = v_empresa and b.activo and b.id <> v_ticket.barbero_asignado_id
    and bo.estado = 'disponible' and bs.servicio_id = v_ticket.servicio_id
    and not exists (
      select 1 from public.tickets as activo
      where activo.barbero_asignado_id = b.id and activo.estado in ('llamado', 'en_atencion')
    )
  order by b.nombre, b.id;
end;
$$;

create or replace function public.reasignar_turno_llamado(p_ticket_id uuid, p_barbero_destino_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_rol public.rol_usuario;
  v_ticket public.tickets;
  v_destino public.barberos;
  v_origen_id uuid;
begin
  select p.empresa_id, p.rol into v_empresa, v_rol from public.perfiles as p where p.id = v_uid;
  if v_empresa is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo personal autorizado puede reasignar turnos';
  end if;

  select * into v_ticket from public.tickets
  where id = p_ticket_id and empresa_id = v_empresa for update;
  if not found then raise exception 'Turno no encontrado'; end if;
  if v_ticket.estado <> 'llamado' then raise exception 'El turno no está llamado o ya inició su atención'; end if;
  if v_rol = 'personal' and (v_ticket.barbero_asignado_id <> v_uid or v_ticket.atendido_por <> v_uid) then
    raise exception 'El turno no te fue asignado';
  end if;
  if p_barbero_destino_id = v_ticket.barbero_asignado_id then
    raise exception 'El turno ya está asignado a ese barbero';
  end if;
  v_origen_id := v_ticket.barbero_asignado_id;

  select b.* into v_destino
  from public.barberos as b
  join public.barbero_operaciones as bo on bo.barbero_id = b.id
  join public.barbero_servicios as bs on bs.barbero_id = b.id
  where b.id = p_barbero_destino_id and b.empresa_id = v_empresa and b.activo
    and bo.estado = 'disponible' and bs.servicio_id = v_ticket.servicio_id
    and not exists (
      select 1 from public.tickets as activo
      where activo.barbero_asignado_id = b.id and activo.estado in ('llamado', 'en_atencion')
    )
  for update of bo;
  if not found then raise exception 'El barbero destino no está en turno, no es compatible o ya tiene un turno activo'; end if;

  update public.tickets
  set barbero_asignado_id = v_destino.id, barbero_asignado_nombre = v_destino.nombre,
      atendido_por = v_destino.id, actualizado_en = now()
  where id = v_ticket.id and estado = 'llamado'
  returning * into v_ticket;
  if not found then raise exception 'El turno cambió antes de poder reasignarlo'; end if;

  update public.barbero_operaciones
  set estado = 'ocupado', actualizado_en = now()
  where barbero_id = v_destino.id;
  update public.barbero_operaciones
  set estado = 'disponible', actualizado_en = now()
  where barbero_id = v_origen_id;
  return v_ticket;
end;
$$;

grant execute on function public.barberos_reasignables(uuid) to authenticated;
grant execute on function public.reasignar_turno_llamado(uuid, uuid) to authenticated;
