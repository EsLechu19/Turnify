-- Complete Worker-only actions against the server-owned selected membership.
create or replace function public.crear_mi_ticket_presencial(p_fila_id uuid, p_prioridad public.prioridad_ticket default 'normal', p_nombre_ref text default null)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero uuid := public.mi_barbero_actual_id(); v_fila public.filas; v_num integer; v_ticket public.tickets; v_fecha date;
begin
  if v_empresa is null or v_barbero is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select * into v_fila from public.filas where id=p_fila_id and empresa_id=v_empresa for update; if not found then raise exception 'Fila no encontrada'; end if;
  select coalesce(max(numero),0)+1 into v_num from public.tickets where fila_id=v_fila.id and fecha_operativa=current_date;
  insert into public.tickets(empresa_id,fila_id,origen,prioridad,estado,fecha_operativa,numero,codigo_visible,nombre_ref,barbero_solicitado_id,barbero_solicitado_nombre)
  values(v_empresa,v_fila.id,'presencial',p_prioridad,'en_espera',current_date,v_num,v_fila.prefijo||'-'||lpad(v_num::text,3,'0'),nullif(btrim(p_nombre_ref),''),v_barbero,(select nombre from public.barberos where id=v_barbero)) returning * into v_ticket;
  return v_ticket;
end; $$;

create or replace function public.mi_historial_barbero()
returns table(ticket_id uuid, codigo_visible text, fila_nombre text, servicio_nombre text, estado public.estado_ticket, finalizado_en timestamptz)
language sql security definer set search_path = '' as $$
  select t.id,t.codigo_visible,f.nombre,t.servicio_nombre,t.estado,t.cerrado_en
  from public.tickets t join public.filas f on f.id=t.fila_id
  where t.empresa_id=public.mi_empresa_personal_actual_id() and t.atendido_por=auth.uid() and t.estado in ('finalizado','ausente')
  order by t.cerrado_en desc nulls last, t.actualizado_en desc limit 50
$$;

create or replace function public.mis_filas_barbero()
returns table(fila_id uuid,nombre text) language sql security definer set search_path = '' as $$
  select f.id,f.nombre from public.filas f where f.empresa_id=public.mi_empresa_personal_actual_id() order by f.nombre
$$;

create or replace function public.barberos_reasignables(p_ticket_id uuid)
returns table(barbero_id uuid,nombre text) language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_origen uuid := public.mi_barbero_actual_id();
begin
  if not exists(select 1 from public.tickets where id=p_ticket_id and empresa_id=v_empresa and estado='llamado' and barbero_asignado_id=v_origen and atendido_por=auth.uid()) then raise exception 'El turno no te fue asignado'; end if;
  return query select b.id,b.nombre from public.barberos b join public.barbero_operaciones bo on bo.barbero_id=b.id join public.barbero_servicios bs on bs.barbero_id=b.id join public.tickets t on t.id=p_ticket_id
  where b.empresa_id=v_empresa and b.activo and b.perfil_id is not null and b.id<>v_origen and bo.estado='disponible' and bs.servicio_id=t.servicio_id and not exists(select 1 from public.tickets a where a.empresa_id=v_empresa and a.barbero_asignado_id=b.id and a.estado in ('llamado','en_atencion')) order by b.nombre,b.id;
end; $$;

create or replace function public.reasignar_turno_llamado(p_ticket_id uuid,p_barbero_destino_id uuid)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_origen uuid := public.mi_barbero_actual_id(); v_ticket public.tickets; v_destino public.barberos;
begin
  select * into v_ticket from public.tickets where id=p_ticket_id and empresa_id=v_empresa and estado='llamado' and barbero_asignado_id=v_origen and atendido_por=auth.uid() for update; if not found then raise exception 'El turno no te fue asignado'; end if;
  select b.* into v_destino from public.barberos b join public.barbero_operaciones bo on bo.barbero_id=b.id join public.barbero_servicios bs on bs.barbero_id=b.id where b.id=p_barbero_destino_id and b.empresa_id=v_empresa and b.activo and b.perfil_id is not null and bo.estado='disponible' and bs.servicio_id=v_ticket.servicio_id and not exists(select 1 from public.tickets a where a.empresa_id=v_empresa and a.barbero_asignado_id=b.id and a.estado in ('llamado','en_atencion')) for update of bo; if not found then raise exception 'El barbero destino no está disponible o no es compatible'; end if;
  update public.tickets set barbero_asignado_id=v_destino.id,barbero_asignado_nombre=v_destino.nombre,atendido_por=v_destino.perfil_id,actualizado_en=now() where id=p_ticket_id and empresa_id=v_empresa returning * into v_ticket;
  update public.barbero_operaciones set estado='ocupado',actualizado_en=now() where barbero_id=v_destino.id and empresa_id=v_empresa; update public.barbero_operaciones set estado='disponible',actualizado_en=now() where barbero_id=v_origen and empresa_id=v_empresa; return v_ticket;
end; $$;

grant execute on function public.crear_mi_ticket_presencial(uuid,public.prioridad_ticket,text), public.mi_historial_barbero(), public.mis_filas_barbero(), public.barberos_reasignables(uuid), public.reasignar_turno_llamado(uuid,uuid) to authenticated;
