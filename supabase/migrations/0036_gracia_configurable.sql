-- Call deadlines follow the company grace window: both call paths stamp
-- now() + minutos_gracia, and the guest payload serves gracia_min so the
-- countdown bar and copy match the panel setting. Same signatures and grants.

create or replace function public.llamar_siguiente(p_fila_id uuid)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_emp uuid; v_rol public.rol_usuario; v_ticket public.tickets; v_barbero public.barberos;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión para llamar turnos'; end if;
  select p.empresa_id,p.rol into v_emp,v_rol from public.perfiles p where p.id=v_uid;
  if v_emp is null or v_rol not in ('admin','personal') then raise exception 'Solo el personal puede llamar turnos'; end if;
  perform 1 from public.filas where id=p_fila_id and empresa_id=v_emp for update; if not found then raise exception 'Fila no encontrada'; end if;
  select t.* into v_ticket from public.cola_ordenada(p_fila_id) c join public.tickets t on t.id=c.ticket_id
  where t.servicio_id is null
    or (t.barbero_solicitado_id is not null and exists(select 1 from public.barbero_operaciones bo where bo.barbero_id=t.barbero_solicitado_id and bo.estado='disponible' and not exists(select 1 from public.tickets ocupado where ocupado.barbero_asignado_id=bo.barbero_id and ocupado.estado in ('llamado','en_atencion'))))
    or (t.barbero_solicitado_id is null and exists(select 1 from public.barberos b join public.barbero_operaciones bo on bo.barbero_id=b.id join public.barbero_servicios bs on bs.barbero_id=b.id where b.empresa_id=v_emp and b.activo and bo.estado='disponible' and bs.servicio_id=t.servicio_id and not exists(select 1 from public.tickets ocupado where ocupado.barbero_asignado_id=b.id and ocupado.estado in ('llamado','en_atencion'))))
  order by c.posicion limit 1;
  if not found then return null; end if;
  if v_ticket.servicio_id is not null then
    if v_ticket.barbero_solicitado_id is not null then select b.* into v_barbero from public.barberos b where b.id=v_ticket.barbero_solicitado_id;
    else select b.* into v_barbero from public.barberos b join public.barbero_operaciones bo on bo.barbero_id=b.id join public.barbero_servicios bs on bs.barbero_id=b.id where b.empresa_id=v_emp and b.activo and bo.estado='disponible' and bs.servicio_id=v_ticket.servicio_id and not exists(select 1 from public.tickets ocupado where ocupado.barbero_asignado_id=b.id and ocupado.estado in ('llamado','en_atencion')) order by b.nombre,b.id limit 1; if not found then return null; end if;
    end if;
  end if;
  update public.tickets set estado='llamado',llamado_en=now(),llamado_vencimiento_en=now() + (select e.minutos_gracia from public.empresas as e where e.id = v_emp) * interval '1 minute',respuesta_cliente=null,respuesta_cliente_en=null,atendido_por=v_uid,barbero_asignado_id=v_barbero.id,barbero_asignado_nombre=v_barbero.nombre,actualizado_en=now()
  where id=v_ticket.id and estado in ('en_espera','notificado') returning * into v_ticket;
  return v_ticket;
end;
$$;

create or replace function public.llamar_mi_siguiente(p_fila_id uuid)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.mi_barbero_actual_id(); v_empresa uuid := public.mi_empresa_personal_actual_id(); v_ticket public.tickets;
begin
  perform 1 from public.barbero_operaciones where barbero_id=v_id and empresa_id=v_empresa and estado='disponible' for update;
  if not found then raise exception 'No estás disponible para llamar turnos'; end if;
  perform 1 from public.filas where id=p_fila_id and empresa_id=v_empresa for update; if not found then raise exception 'Fila no encontrada'; end if;
  if exists(select 1 from public.tickets where empresa_id=v_empresa and barbero_asignado_id=v_id and estado in ('llamado','en_atencion')) then raise exception 'Ya tienes un turno activo'; end if;
  select t.* into v_ticket from public.cola_ordenada(p_fila_id) c join public.tickets t on t.id=c.ticket_id where t.empresa_id=v_empresa and t.estado in ('en_espera','notificado') and t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_id and bs.servicio_id=t.servicio_id) order by c.posicion limit 1;
  if not found then return null; end if;
  update public.tickets set estado='llamado',llamado_en=now(),llamado_vencimiento_en=now() + (select e.minutos_gracia from public.empresas as e where e.id = v_empresa) * interval '1 minute',respuesta_cliente=null,respuesta_cliente_en=null,atendido_por=auth.uid(),barbero_asignado_id=v_id,barbero_asignado_nombre=(select nombre from public.barberos where id=v_id),actualizado_en=now() where id=v_ticket.id and empresa_id=v_empresa and estado in ('en_espera','notificado') returning * into v_ticket;
  if not found then return null; end if;
  update public.barbero_operaciones set estado='ocupado',actualizado_en=now() where barbero_id=v_id and empresa_id=v_empresa;
  return v_ticket;
end;
$$;

create or replace function public.estado_ticket_invitado(p_ticket_id uuid, p_capacidad text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets; v_pos integer; v_delante integer := 0; v_espera integer := 0; v_segundos integer := 0;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256');
  if not found then raise exception 'Ticket no encontrado'; end if;
  select c.posicion into v_pos from public.cola_ordenada(v_ticket.fila_id) c where c.ticket_id = v_ticket.id;
  if found then v_delante := v_pos - 1; end if;
  if v_ticket.servicio_id is not null and v_ticket.barbero_estimado_id is not null then
    select coalesce(sum(t.servicio_duracion_seg),0)::integer into v_segundos from public.tickets t left join public.cola_ordenada(v_ticket.fila_id) c on c.ticket_id=t.id where t.barbero_estimado_id=v_ticket.barbero_estimado_id and t.id<>v_ticket.id and t.estado in ('en_espera','notificado','llamado','en_atencion') and (t.estado in ('llamado','en_atencion') or c.posicion<v_pos);
    if v_segundos>0 then v_espera:=greatest(1,ceil(v_segundos::numeric/60)::integer); end if;
  end if;
  return jsonb_build_object('codigo_visible',v_ticket.codigo_visible,'estado',v_ticket.estado,'personas_delante',v_delante,'espera_min',v_espera,'servicio_nombre',v_ticket.servicio_nombre,'barbero_solicitado_nombre',v_ticket.barbero_solicitado_nombre,'barbero_asignado_nombre',v_ticket.barbero_asignado_nombre,'llamado_vencimiento_en',public.vencimiento_efectivo_llamado(v_ticket),'respuesta_cliente',v_ticket.respuesta_cliente,'respuesta_cliente_en',v_ticket.respuesta_cliente_en,'puntuacion',v_ticket.puntuacion,'gracia_min',(select e.minutos_gracia from public.empresas as e where e.id = v_ticket.empresa_id));
end;
$$;
