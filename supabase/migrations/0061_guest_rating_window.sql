-- A guest can rate once within 24 hours of actual service completion.
-- Keep the existing capability, lock and RPC permissions; reject retries at expiry.
create or replace function public.puntuar_atencion_invitado(p_ticket_id uuid, p_capacidad text, p_puntos integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_ticket public.tickets; v_ahora timestamptz;
begin
  if p_puntos is null or p_puntos < 1 or p_puntos > 5 then
    raise exception 'La puntuacion debe ser de 1 a 5 estrellas';
  end if;
  select * into v_ticket from public.tickets
  where id = p_ticket_id and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256') for update;
  if not found then raise exception 'Ticket no encontrado'; end if;
  if v_ticket.estado <> 'finalizado' then
    raise exception 'Solo puedes puntuar una atencion finalizada';
  end if;
  -- Read wall time after acquiring the lock, not at transaction start.
  v_ahora := clock_timestamp();
  if v_ticket.fin_en is null
    or v_ticket.fin_en > v_ahora
    or v_ahora >= v_ticket.fin_en + interval '24 hours' then
    raise exception 'El plazo para puntuar esta atencion ha vencido';
  end if;
  if v_ticket.puntuacion is not null then
    if v_ticket.puntuacion = p_puntos then return; end if;
    raise exception 'Ya registraste tu puntuacion';
  end if;
  update public.tickets set puntuacion = p_puntos, puntuacion_en = v_ahora, actualizado_en = v_ahora
  where id = v_ticket.id;
end;
$$;

revoke all on function public.puntuar_atencion_invitado(uuid, text, integer) from public;
grant execute on function public.puntuar_atencion_invitado(uuid, text, integer) to anon, authenticated;

-- Extend only the capability-bound projection. Preserve 0052's measured pace,
-- effective called deadline and configurable grace fields unchanged.
create or replace function public.estado_ticket_invitado(p_ticket_id uuid, p_capacidad text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets; v_pos integer; v_delante integer := 0; v_espera integer := 0; v_segundos integer := 0;
  v_ahora timestamptz; v_puede_puntuar boolean;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256');
  if not found then raise exception 'Ticket no encontrado'; end if;
  select c.posicion into v_pos from public.cola_ordenada(v_ticket.fila_id) c where c.ticket_id = v_ticket.id;
  if found then v_delante := v_pos - 1; end if;
  if v_ticket.servicio_id is not null and v_ticket.barbero_estimado_id is not null then
    select coalesce(sum(coalesce(public.ritmo_medido_servicio_seg(t.empresa_id, t.servicio_id), t.servicio_duracion_seg, 0)),0)::integer into v_segundos from public.tickets t left join public.cola_ordenada(v_ticket.fila_id) c on c.ticket_id=t.id where t.barbero_estimado_id=v_ticket.barbero_estimado_id and t.id<>v_ticket.id and t.estado in ('en_espera','notificado','llamado','en_atencion') and (t.estado in ('llamado','en_atencion') or c.posicion<v_pos);
    if v_segundos>0 then v_espera:=greatest(1,ceil(v_segundos::numeric/60)::integer); end if;
  end if;
  v_ahora := clock_timestamp();
  v_puede_puntuar := v_ticket.estado = 'finalizado'
    and v_ticket.puntuacion is null
    and v_ticket.fin_en is not null
    and v_ticket.fin_en <= v_ahora
    and v_ahora < v_ticket.fin_en + interval '24 hours';
  return jsonb_build_object('codigo_visible',v_ticket.codigo_visible,'estado',v_ticket.estado,'personas_delante',v_delante,'espera_min',v_espera,'servicio_nombre',v_ticket.servicio_nombre,'barbero_solicitado_nombre',v_ticket.barbero_solicitado_nombre,'barbero_asignado_nombre',v_ticket.barbero_asignado_nombre,'llamado_vencimiento_en',public.vencimiento_efectivo_llamado(v_ticket),'respuesta_cliente',v_ticket.respuesta_cliente,'respuesta_cliente_en',v_ticket.respuesta_cliente_en,'puntuacion',v_ticket.puntuacion,'gracia_min',(select e.minutos_gracia from public.empresas as e where e.id = v_ticket.empresa_id),'puede_puntuar',v_puede_puntuar,'puntuacion_vencimiento_en',case when v_ticket.estado = 'finalizado' and v_ticket.fin_en is not null and v_ticket.fin_en <= v_ahora then v_ticket.fin_en + interval '24 hours' else null end);
end;
$$;
