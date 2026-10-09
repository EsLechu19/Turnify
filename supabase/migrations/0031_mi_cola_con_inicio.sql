-- Serve the attention start in mi_cola_barbero so the worker can count the
-- elapsed service time live. Body identical to 0029 plus the inicio_en key;
-- every attention path (manual start, presente auto-start) records it.
-- Same signature: existing grants stay valid.

create or replace function public.mi_cola_barbero()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero public.barberos; v_operacion public.barbero_operaciones;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select b.* into v_barbero from public.barberos b where b.perfil_id=auth.uid() and b.empresa_id=v_empresa and b.activo;
  if not found then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id=v_barbero.id and empresa_id=v_empresa;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;
  return jsonb_build_object('estado',case when exists(select 1 from public.tickets t where t.empresa_id=v_empresa and t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end,'tickets',coalesce((select jsonb_agg(jsonb_build_object('ticket_id',t.id,'fila_id',t.fila_id,'fila_nombre',f.nombre,'codigo_visible',t.codigo_visible,'estado',t.estado,'servicio_nombre',t.servicio_nombre,'barbero_solicitado_nombre',t.barbero_solicitado_nombre,'barbero_asignado_nombre',t.barbero_asignado_nombre,'llamado_vencimiento_en', public.vencimiento_efectivo_llamado(t),'respuesta_cliente',t.respuesta_cliente,'respuesta_cliente_en',t.respuesta_cliente_en,'inicio_en', t.inicio_en,'personas_delante',greatest(coalesce(c.posicion,1)-1,0),'espera_min',case when coalesce(c.posicion,1)<=1 then 0 else greatest(1,ceil(((coalesce(c.posicion,1)-1)*f.duracion_promedio_seg/f.puestos_activos/60.0))::int) end) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end,c.posicion,t.numero) from public.tickets t join public.filas f on f.id=t.fila_id left join public.cola_ordenada(t.fila_id) c on c.ticket_id=t.id where t.empresa_id=v_empresa and ((t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) or (t.estado in ('en_espera','notificado') and t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_barbero.id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_barbero.id and bs.servicio_id=t.servicio_id)))), '[]'::jsonb));
end;
$$;
