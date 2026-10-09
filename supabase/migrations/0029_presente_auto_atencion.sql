-- Presente starts the service; absence can be marked from llamado or en_atencion.
--
-- 1. "Llego en 2 minutos" extends tolerance once (effective deadline, same as
--    0026 which production never received).
-- 2. "Ya estoy aquí" starts the attention at once (en_atencion + inicio_en),
--    as if the client had pressed start: the tolerance clock stops mattering.
-- 3. The worker may mark absent from llamado (client never showed) or from
--    en_atencion (client claimed presente but is not there); the chair is
--    freed in both cases. finalizar stays llamado/en_atencion-only otherwise.
-- Grants are preserved: every statement below is CREATE OR REPLACE.

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
  set estado = 'ausente', cerrado_en = now(), actualizado_en = now()
  where estado = 'llamado'
    and llamado_vencimiento_en is not null
    and public.vencimiento_efectivo_llamado(tickets) <= now();
  get diagnostics v_count = row_count;
  update public.barbero_operaciones as bo
  set estado = 'disponible', actualizado_en = now()
  where bo.estado = 'ocupado'
    and not exists (
      select 1 from public.tickets as t
      where t.barbero_asignado_id = bo.barbero_id
        and t.empresa_id = bo.empresa_id
        and t.estado in ('llamado', 'en_atencion')
    );
  return v_count;
end;
$$;

-- The response lock and first-response guard from 0021/0026 remain the only
-- extension path. Once the effective deadline has passed, neither response is
-- accepted; a different later response still fails as an already-recorded one.
create or replace function public.responder_llamado_invitado(p_ticket_id uuid, p_capacidad text, p_respuesta text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets;
begin
  if p_respuesta not in ('presente','llega_en_2_min') then raise exception 'Respuesta de cliente no válida'; end if;
  select * into v_ticket from public.tickets
  where id = p_ticket_id and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256') for update;
  if not found then raise exception 'Ticket no encontrado'; end if;

  -- Idempotent re-entry: repeating the recorded response (double tap after
  -- the auto-start moved the ticket) changes nothing instead of failing.
  if v_ticket.respuesta_cliente is not null and v_ticket.respuesta_cliente = p_respuesta then return; end if;
  if v_ticket.respuesta_cliente is not null then raise exception 'La respuesta del cliente ya fue registrada'; end if;

  if v_ticket.estado = 'en_atencion' then
    -- The worker started first: only a presente acknowledgement is accepted,
    -- and it records the response without moving anything.
    if p_respuesta <> 'presente' then raise exception 'El turno ya está en atención'; end if;
    update public.tickets set respuesta_cliente = p_respuesta, respuesta_cliente_en = now(), actualizado_en = now() where id = v_ticket.id;
    return;
  end if;

  if v_ticket.estado <> 'llamado' or v_ticket.llamado_vencimiento_en is null then
    raise exception 'El turno no está llamado o la tolerancia venció';
  end if;
  if now() >= public.vencimiento_efectivo_llamado(v_ticket) then
    raise exception 'El turno no está llamado o la tolerancia venció';
  end if;
  update public.tickets set respuesta_cliente = p_respuesta, respuesta_cliente_en = now(), actualizado_en = now() where id = v_ticket.id;

  -- "Ya estoy aquí" starts the service at once: the tolerance clock stops and
  -- the worker flow continues from en_atencion.
  if p_respuesta = 'presente' then
    update public.tickets set estado = 'en_atencion', inicio_en = now(), actualizado_en = now()
    where id = v_ticket.id and estado = 'llamado';
  end if;
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
  return jsonb_build_object('codigo_visible',v_ticket.codigo_visible,'estado',v_ticket.estado,'personas_delante',v_delante,'espera_min',v_espera,'servicio_nombre',v_ticket.servicio_nombre,'barbero_solicitado_nombre',v_ticket.barbero_solicitado_nombre,'barbero_asignado_nombre',v_ticket.barbero_asignado_nombre,'llamado_vencimiento_en',public.vencimiento_efectivo_llamado(v_ticket),'respuesta_cliente',v_ticket.respuesta_cliente,'respuesta_cliente_en',v_ticket.respuesta_cliente_en);
end;
$$;

-- Worker queue: 0028 keys serving the effective deadline, so both sides count
-- down the same tolerance (0026 + respuesta fields restored).
create or replace function public.mi_cola_barbero()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero public.barberos; v_operacion public.barbero_operaciones;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select b.* into v_barbero from public.barberos b where b.perfil_id=auth.uid() and b.empresa_id=v_empresa and b.activo;
  if not found then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id=v_barbero.id and empresa_id=v_empresa;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;
  return jsonb_build_object('estado',case when exists(select 1 from public.tickets t where t.empresa_id=v_empresa and t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end,'tickets',coalesce((select jsonb_agg(jsonb_build_object('ticket_id',t.id,'fila_id',t.fila_id,'fila_nombre',f.nombre,'codigo_visible',t.codigo_visible,'estado',t.estado,'servicio_nombre',t.servicio_nombre,'barbero_solicitado_nombre',t.barbero_solicitado_nombre,'barbero_asignado_nombre',t.barbero_asignado_nombre,'llamado_vencimiento_en', public.vencimiento_efectivo_llamado(t),'respuesta_cliente',t.respuesta_cliente,'respuesta_cliente_en',t.respuesta_cliente_en,'personas_delante',greatest(coalesce(c.posicion,1)-1,0),'espera_min',case when coalesce(c.posicion,1)<=1 then 0 else greatest(1,ceil(((coalesce(c.posicion,1)-1)*f.duracion_promedio_seg/f.puestos_activos/60.0))::int) end) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end,c.posicion,t.numero) from public.tickets t join public.filas f on f.id=t.fila_id left join public.cola_ordenada(t.fila_id) c on c.ticket_id=t.id where t.empresa_id=v_empresa and ((t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) or (t.estado in ('en_espera','notificado') and t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_barbero.id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_barbero.id and bs.servicio_id=t.servicio_id)))), '[]'::jsonb));
end;
$$;

-- Absence from llamado (client never showed) or from en_atencion (client
-- claimed presente but is not there). From en_atencion the service had begun,
-- so fin_en is recorded; from llamado it stays untouched as before. The chair
-- is freed in both cases; finalizar stays en_atencion-only.
create or replace function public.finalizar_mi_atencion(p_ticket_id uuid, p_ausente boolean default false)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.mi_barbero_actual_id(); v_empresa uuid := public.mi_empresa_personal_actual_id(); v_ticket public.tickets;
begin
  if p_ausente then
    update public.tickets
    set estado = 'ausente'::public.estado_ticket,
        fin_en = case when estado = 'en_atencion' then now() else fin_en end,
        cerrado_en = now(), actualizado_en = now()
    where id = p_ticket_id and empresa_id = v_empresa and barbero_asignado_id = v_id
      and atendido_por = auth.uid() and estado in ('llamado', 'en_atencion')
    returning * into v_ticket;
  else
    update public.tickets
    set estado = 'finalizado'::public.estado_ticket, fin_en = now(), cerrado_en = now(), actualizado_en = now()
    where id = p_ticket_id and empresa_id = v_empresa and barbero_asignado_id = v_id
      and atendido_por = auth.uid() and estado = 'en_atencion'
    returning * into v_ticket;
  end if;
  if not found then raise exception 'El turno no está en el estado esperado o no te fue asignado'; end if;
  update public.barbero_operaciones set estado = 'disponible', actualizado_en = now() where barbero_id = v_id and empresa_id = v_empresa;
  return v_ticket;
end;
$$;
