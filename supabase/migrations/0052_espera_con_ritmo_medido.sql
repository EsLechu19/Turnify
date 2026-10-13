-- Guest wait estimate uses measured pace. estado_ticket_invitado summed the
-- static estimated snapshot, so regulars subsidized outdated catalog numbers.
-- Now each ahead ticket paces at its service's recent measured average (last
-- 10 finished, 30 days) and falls back to the snapshot when unmeasured.
-- Same signature and grants: clients keep calling it unchanged.

create or replace function public.ritmo_medido_servicio_seg(p_empresa uuid, p_servicio_id uuid)
returns integer language sql security definer set search_path = '' as $$
  select case when count(*) = 0 then null else round(avg(extract(epoch from (fin_en - inicio_en))))::integer end
  from (
    select fin_en, inicio_en from public.tickets
    where empresa_id = p_empresa and servicio_id = p_servicio_id and estado = 'finalizado'
      and inicio_en is not null and fin_en is not null and fin_en >= inicio_en
      and fin_en > now() - interval '30 days'
    order by fin_en desc limit 10
  ) as recientes;
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
    select coalesce(sum(coalesce(public.ritmo_medido_servicio_seg(t.empresa_id, t.servicio_id), t.servicio_duracion_seg, 0)),0)::integer into v_segundos from public.tickets t left join public.cola_ordenada(v_ticket.fila_id) c on c.ticket_id=t.id where t.barbero_estimado_id=v_ticket.barbero_estimado_id and t.id<>v_ticket.id and t.estado in ('en_espera','notificado','llamado','en_atencion') and (t.estado in ('llamado','en_atencion') or c.posicion<v_pos);
    if v_segundos>0 then v_espera:=greatest(1,ceil(v_segundos::numeric/60)::integer); end if;
  end if;
  return jsonb_build_object('codigo_visible',v_ticket.codigo_visible,'estado',v_ticket.estado,'personas_delante',v_delante,'espera_min',v_espera,'servicio_nombre',v_ticket.servicio_nombre,'barbero_solicitado_nombre',v_ticket.barbero_solicitado_nombre,'barbero_asignado_nombre',v_ticket.barbero_asignado_nombre,'llamado_vencimiento_en',public.vencimiento_efectivo_llamado(v_ticket),'respuesta_cliente',v_ticket.respuesta_cliente,'respuesta_cliente_en',v_ticket.respuesta_cliente_en,'puntuacion',v_ticket.puntuacion,'gracia_min',(select e.minutos_gracia from public.empresas as e where e.id = v_ticket.empresa_id));
end;
$$;
