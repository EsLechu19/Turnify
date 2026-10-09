-- The "llego en 2 minutos" acknowledgement grants a single two-minute grace
-- extension: the first response wins, later ones are rejected or no-ops. The
-- base deadline stays immutable (trigger untouched); the effective deadline is
-- derived on read and enforced by the sweep. Absent customers keep their
-- history and may take a new ticket from the app.

-- Effective called-ticket deadline: base plus two minutes when the customer
-- asked for it. Null stays null so missing deadlines never become due.
create or replace function public.vencimiento_efectivo_llamado(v_ticket public.tickets)
returns timestamptz
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when v_ticket.llamado_vencimiento_en is null then null
    when v_ticket.respuesta_cliente = 'llega_en_2_min'
      then v_ticket.llamado_vencimiento_en + interval '2 minutes'
    else v_ticket.llamado_vencimiento_en
  end
$$;

create or replace function public.marcar_ausentes()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer := 0;
begin
  update public.tickets
  set estado='ausente',cerrado_en=now(),actualizado_en=now()
  where estado='llamado'
    and llamado_vencimiento_en is not null
    and public.vencimiento_efectivo_llamado(tickets) <= now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- The response lock and first-response guard from 0021 remain the only
-- extension path. Once the effective deadline has passed, neither response is
-- accepted; a different later response still fails as an already-recorded one.
create or replace function public.responder_llamado_invitado(p_ticket_id uuid, p_capacidad text, p_respuesta text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets;
begin
  if p_respuesta not in ('presente','llega_en_2_min') then raise exception 'Respuesta de cliente no válida'; end if;
  select * into v_ticket from public.tickets
  where id=p_ticket_id and acceso_publico_hash=extensions.digest(p_capacidad,'sha256') for update;
  if not found then raise exception 'Ticket no encontrado'; end if;
  if v_ticket.estado <> 'llamado' or v_ticket.llamado_vencimiento_en is null then
    raise exception 'El turno no está llamado o la tolerancia venció';
  end if;
  if v_ticket.respuesta_cliente is not null and v_ticket.respuesta_cliente <> p_respuesta then
    raise exception 'La respuesta del cliente ya fue registrada';
  end if;
  if v_ticket.respuesta_cliente is not null then return; end if;
  if now() >= public.vencimiento_efectivo_llamado(v_ticket) then
    raise exception 'El turno no está llamado o la tolerancia venció';
  end if;
  update public.tickets set respuesta_cliente=p_respuesta,respuesta_cliente_en=now(),actualizado_en=now() where id=v_ticket.id;
end;
$$;

create or replace function public.estado_ticket_invitado(p_ticket_id uuid, p_capacidad text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets; v_pos integer; v_delante integer := 0; v_espera integer := 0; v_segundos integer := 0;
begin
  select * into v_ticket from public.tickets where id=p_ticket_id and acceso_publico_hash=extensions.digest(p_capacidad,'sha256');
  if not found then raise exception 'Ticket no encontrado'; end if;
  select c.posicion into v_pos from public.cola_ordenada(v_ticket.fila_id) c where c.ticket_id=v_ticket.id;
  if found then v_delante := v_pos - 1; end if;
  if v_ticket.servicio_id is not null and v_ticket.barbero_estimado_id is not null then
    select coalesce(sum(t.servicio_duracion_seg),0)::integer into v_segundos from public.tickets t left join public.cola_ordenada(v_ticket.fila_id) c on c.ticket_id=t.id where t.barbero_estimado_id=v_ticket.barbero_estimado_id and t.id<>v_ticket.id and t.estado in ('en_espera','notificado','llamado','en_atencion') and (t.estado in ('llamado','en_atencion') or c.posicion<v_pos);
    if v_segundos>0 then v_espera:=greatest(1,ceil(v_segundos::numeric/60)::integer); end if;
  end if;
  return jsonb_build_object('codigo_visible',v_ticket.codigo_visible,'estado',v_ticket.estado,'personas_delante',v_delante,'espera_min',v_espera,'servicio_nombre',v_ticket.servicio_nombre,'barbero_solicitado_nombre',v_ticket.barbero_solicitado_nombre,'barbero_asignado_nombre',v_ticket.barbero_asignado_nombre,'llamado_vencimiento_en',public.vencimiento_efectivo_llamado(v_ticket),'respuesta_cliente',v_ticket.respuesta_cliente,'respuesta_cliente_en',v_ticket.respuesta_cliente_en);
end;
$$;

-- Worker queue with the 0021 snapshots restored (0025 dropped them) plus the
-- 0025 queue position/wait fields; the served deadline is the effective one so
-- both sides count down the same tolerance.
create or replace function public.mi_cola_barbero()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero public.barberos; v_operacion public.barbero_operaciones;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select b.* into v_barbero from public.barberos b where b.perfil_id=auth.uid() and b.empresa_id=v_empresa and b.activo;
  if not found then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id=v_barbero.id and empresa_id=v_empresa;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;
  return jsonb_build_object('estado',case when exists(select 1 from public.tickets t where t.empresa_id=v_empresa and t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end,'tickets',coalesce((select jsonb_agg(jsonb_build_object('ticket_id',t.id,'fila_id',t.fila_id,'fila_nombre',f.nombre,'codigo_visible',t.codigo_visible,'estado',t.estado,'servicio_nombre',t.servicio_nombre,'barbero_solicitado_nombre',t.barbero_solicitado_nombre,'barbero_asignado_nombre',t.barbero_asignado_nombre,'llamado_vencimiento_en',public.vencimiento_efectivo_llamado(t),'respuesta_cliente',t.respuesta_cliente,'respuesta_cliente_en',t.respuesta_cliente_en,'personas_delante',greatest(coalesce(c.posicion,1)-1,0),'espera_min',case when coalesce(c.posicion,1)<=1 then 0 else greatest(1,ceil(((coalesce(c.posicion,1)-1)*f.duracion_promedio_seg/f.puestos_activos/60.0))::int) end) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end,c.posicion,t.numero) from public.tickets t join public.filas f on f.id=t.fila_id left join public.cola_ordenada(t.fila_id) c on c.ticket_id=t.id where t.empresa_id=v_empresa and ((t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) or (t.estado in ('en_espera','notificado') and t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_barbero.id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_barbero.id and bs.servicio_id=t.servicio_id)))), '[]'::jsonb));
end;
$$;
