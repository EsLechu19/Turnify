-- Guest attention rating: one 1-5 vote per finished ticket, plus a per-barber
-- aggregate that the future admin dashboard consumes (Fase 6).
-- Only finalizado tickets can be rated; ausente keeps its recovery CTA.
-- IF NOT EXISTS keeps this replay-safe against the migration-history gap.

alter table public.tickets
  add column if not exists puntuacion smallint null check (puntuacion between 1 and 5),
  add column if not exists puntuacion_en timestamptz null;

create or replace function public.puntuar_atencion_invitado(p_ticket_id uuid, p_capacidad text, p_puntos integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_ticket public.tickets;
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
  if v_ticket.puntuacion is not null then
    if v_ticket.puntuacion = p_puntos then return; end if;
    raise exception 'Ya registraste tu puntuacion';
  end if;
  update public.tickets set puntuacion = p_puntos, puntuacion_en = now(), actualizado_en = now()
  where id = v_ticket.id;
end;
$$;

revoke all on function public.puntuar_atencion_invitado(uuid, text, integer) from public;
grant execute on function public.puntuar_atencion_invitado(uuid, text, integer) to anon, authenticated;

-- Guest state serves the recorded vote so the thanks screen never re-asks.
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
  return jsonb_build_object('codigo_visible',v_ticket.codigo_visible,'estado',v_ticket.estado,'personas_delante',v_delante,'espera_min',v_espera,'servicio_nombre',v_ticket.servicio_nombre,'barbero_solicitado_nombre',v_ticket.barbero_solicitado_nombre,'barbero_asignado_nombre',v_ticket.barbero_asignado_nombre,'llamado_vencimiento_en',public.vencimiento_efectivo_llamado(v_ticket),'respuesta_cliente',v_ticket.respuesta_cliente,'respuesta_cliente_en',v_ticket.respuesta_cliente_en,'puntuacion',v_ticket.puntuacion);
end;
$$;

-- Per-barber rating aggregate for the future admin dashboard (Fase 6):
-- every active roster barber with vote count and average (null when unrated).
create or replace function public.metricas_puntuacion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_rol public.rol_usuario; v_empresa uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesion'; end if;
  select p.rol into v_rol from public.perfiles as p where p.id = v_uid;
  if v_rol = 'personal' then v_empresa := public.mi_empresa_personal_actual_id();
  elsif v_rol = 'admin' then select p.empresa_id into v_empresa from public.perfiles as p where p.id = v_uid;
  end if;
  if v_empresa is null then raise exception 'Sin barberia seleccionada'; end if;
  return (
    select coalesce(jsonb_agg(sub.fila order by sub.nombre), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'barbero_id', b.id, 'nombre', b.nombre,
        'votos', count(t.id),
        'promedio', round(avg(t.puntuacion), 2)
      ) as fila, b.nombre
      from public.barberos as b
      left join public.tickets as t
        on t.barbero_asignado_id = b.id and t.empresa_id = b.empresa_id and t.puntuacion is not null
      where b.empresa_id = v_empresa and b.activo
      group by b.id, b.nombre
    ) as sub
  );
end;
$$;

revoke all on function public.metricas_puntuacion() from public;
grant execute on function public.metricas_puntuacion() to authenticated;
