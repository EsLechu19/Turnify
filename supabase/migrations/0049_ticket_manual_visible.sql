-- Manual tickets visible and callable. crear_mi_ticket_presencial never sets
-- servicio_id, so the worker queue filters (servicio_id is not null) hid every
-- manual ticket forever: created, confirmed, then invisible. Manual tickets
-- always carry barbero_solicitado_id = the creating barber, which scopes them
-- precisely without touching guest logic. Same signatures, existing grants stay.

create or replace function public.mi_cola_barbero()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero public.barberos; v_operacion public.barbero_operaciones;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select b.* into v_barbero from public.barberos b where b.perfil_id=auth.uid() and b.empresa_id=v_empresa and b.activo;
  if not found then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id=v_barbero.id and empresa_id=v_empresa;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;
  return jsonb_build_object('estado',case when exists(select 1 from public.tickets t where t.empresa_id=v_empresa and t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end,'tickets',coalesce((select jsonb_agg(jsonb_build_object('ticket_id',t.id,'fila_id',t.fila_id,'fila_nombre',f.nombre,'codigo_visible',t.codigo_visible,'estado',t.estado,'servicio_nombre',t.servicio_nombre,'barbero_solicitado_nombre',t.barbero_solicitado_nombre,'barbero_asignado_nombre',t.barbero_asignado_nombre,'llamado_vencimiento_en', public.vencimiento_efectivo_llamado(t),'respuesta_cliente',t.respuesta_cliente,'respuesta_cliente_en',t.respuesta_cliente_en,'inicio_en', t.inicio_en,'personas_delante',greatest(coalesce(c.posicion,1)-1,0),'espera_min',case when coalesce(c.posicion,1)<=1 then 0 else greatest(1,ceil(((coalesce(c.posicion,1)-1)*f.duracion_promedio_seg/f.puestos_activos/60.0))::int) end) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end,c.posicion,t.numero) from public.tickets t join public.filas f on f.id=t.fila_id left join public.cola_ordenada(t.fila_id) c on c.ticket_id=t.id where t.empresa_id=v_empresa and ((t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) or (t.estado in ('en_espera','notificado') and ((t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_barbero.id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_barbero.id and bs.servicio_id=t.servicio_id)) or (t.servicio_id is null and t.barbero_solicitado_id=v_barbero.id)))), '[]'::jsonb));
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
  if not found then select t.* into v_ticket from public.cola_ordenada(p_fila_id) c join public.tickets t on t.id=c.ticket_id where t.empresa_id=v_empresa and t.estado in ('en_espera','notificado') and t.servicio_id is null and t.barbero_solicitado_id=v_id order by c.posicion limit 1; end if;
  if not found then return null; end if;
  update public.tickets set estado='llamado',llamado_en=now(),llamado_vencimiento_en=now() + (select e.minutos_gracia from public.empresas as e where e.id = v_empresa) * interval '1 minute',respuesta_cliente=null,respuesta_cliente_en=null,atendido_por=auth.uid(),barbero_asignado_id=v_id,barbero_asignado_nombre=(select nombre from public.barberos where id=v_id),actualizado_en=now() where id=v_ticket.id and empresa_id=v_empresa and estado in ('en_espera','notificado') returning * into v_ticket;
  if not found then return null; end if;
  update public.barbero_operaciones set estado='ocupado',actualizado_en=now() where barbero_id=v_id and empresa_id=v_empresa;
  return v_ticket;
end;
$$;
