-- Adds an optional rating and feedback loop for finished tickets.
-- Customers and guests can rate their finished tickets once (idempotent).
-- Feedback is moderated by default to prevent exposing abusive comments to the business.

create table public.ticket_calificaciones (
  ticket_id uuid primary key references public.tickets(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  barbero_id uuid references public.barberos(id) on delete set null,
  cliente_id uuid references public.perfiles(id) on delete set null,
  puntuacion integer not null check (puntuacion between 1 and 5),
  comentario text check (char_length(btrim(comentario)) <= 1000),
  estado_moderacion text not null default 'pendiente' check (estado_moderacion in ('pendiente', 'aprobado', 'rechazado')),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index ticket_calificaciones_empresa_idx on public.ticket_calificaciones (empresa_id, estado_moderacion, puntuacion);

alter table public.ticket_calificaciones enable row level security;

-- Admins can read all feedback for their own company
create policy calificaciones_admin_select on public.ticket_calificaciones for select to authenticated
  using (empresa_id = public.mi_empresa_id() and public.mi_rol() = 'admin');

-- Workers can read only approved feedback assigned to them
create policy calificaciones_personal_select on public.ticket_calificaciones for select to authenticated
  using (
    empresa_id = public.mi_empresa_id()
    and public.mi_rol() = 'personal'
    and barbero_id = public.mi_barbero_actual_id()
    and estado_moderacion = 'aprobado'
  );

-- Authenticated customers can read their own feedback
create policy calificaciones_cliente_select on public.ticket_calificaciones for select to authenticated
  using (cliente_id = auth.uid());

-- Expose duration and rating via the guest RPC
create or replace function public.estado_ticket_invitado(p_ticket_id uuid, p_capacidad text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets; v_pos integer; v_delante integer := 0; v_espera integer := 0; v_segundos integer := 0; v_calificacion public.ticket_calificaciones;
begin
  select * into v_ticket from public.tickets where id=p_ticket_id and acceso_publico_hash=extensions.digest(p_capacidad,'sha256');
  if not found then raise exception 'Ticket no encontrado'; end if;
  select c.posicion into v_pos from public.cola_ordenada(v_ticket.fila_id) c where c.ticket_id=v_ticket.id;
  if found then v_delante := v_pos - 1; end if;
  if v_ticket.servicio_id is not null and v_ticket.barbero_estimado_id is not null then
    select coalesce(sum(t.servicio_duracion_seg),0)::integer into v_segundos from public.tickets t left join public.cola_ordenada(v_ticket.fila_id) c on c.ticket_id=t.id where t.barbero_estimado_id=v_ticket.barbero_estimado_id and t.id<>v_ticket.id and t.estado in ('en_espera','notificado','llamado','en_atencion') and (t.estado in ('llamado','en_atencion') or c.posicion<v_pos);
    if v_segundos>0 then v_espera:=greatest(1,ceil(v_segundos::numeric/60)::integer); end if;
  end if;

  if v_ticket.estado = 'finalizado' then
    select * into v_calificacion from public.ticket_calificaciones where ticket_id = v_ticket.id;
  end if;

  return jsonb_build_object('codigo_visible',v_ticket.codigo_visible,'estado',v_ticket.estado,'personas_delante',v_delante,'espera_min',v_espera,'servicio_nombre',v_ticket.servicio_nombre,'barbero_solicitado_nombre',v_ticket.barbero_solicitado_nombre,'barbero_asignado_nombre',v_ticket.barbero_asignado_nombre,'llamado_vencimiento_en',v_ticket.llamado_vencimiento_en,'respuesta_cliente',v_ticket.respuesta_cliente,'respuesta_cliente_en',v_ticket.respuesta_cliente_en,'inicio_en',v_ticket.inicio_en,'fin_en',v_ticket.fin_en,'calificacion',v_calificacion.puntuacion,'comentario',v_calificacion.comentario);
end;
$$;

create or replace function public.mi_ticket_estado(p_ticket_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets; v_pos integer; v_delante integer := 0; v_espera integer := 0; v_segundos integer := 0; v_calificacion public.ticket_calificaciones;
begin
  select * into v_ticket from public.tickets
  where id = p_ticket_id and cliente_id = auth.uid();
  if not found then raise exception 'Ticket no encontrado'; end if;
  select c.posicion into v_pos from public.cola_ordenada(v_ticket.fila_id) as c where c.ticket_id = p_ticket_id;
  if found then v_delante := v_pos - 1; end if;

  if v_ticket.servicio_id is not null and v_ticket.barbero_estimado_id is not null then
    select coalesce(sum(t.servicio_duracion_seg), 0)::integer into v_segundos
    from public.tickets as t
    left join public.cola_ordenada(v_ticket.fila_id) as c on c.ticket_id = t.id
    where t.barbero_estimado_id = v_ticket.barbero_estimado_id
      and t.id <> v_ticket.id
      and t.estado in ('en_espera', 'notificado', 'llamado', 'en_atencion')
      and (t.estado in ('llamado', 'en_atencion') or c.posicion < v_pos);
    if v_segundos > 0 then v_espera := greatest(1, ceil(v_segundos::numeric / 60)::integer); end if;
  end if;

  if v_ticket.estado = 'finalizado' then
    select * into v_calificacion from public.ticket_calificaciones where ticket_id = v_ticket.id;
  end if;

  return jsonb_build_object(
    'codigo_visible', v_ticket.codigo_visible, 'estado', v_ticket.estado,
    'personas_delante', v_delante, 'espera_min', v_espera,
    'servicio_nombre', v_ticket.servicio_nombre,
    'barbero_solicitado_nombre', v_ticket.barbero_solicitado_nombre,
    'barbero_estimado_nombre', v_ticket.barbero_estimado_nombre,
    'barbero_asignado_nombre', v_ticket.barbero_asignado_nombre,
    'llamado_vencimiento_en', v_ticket.llamado_vencimiento_en,
    'respuesta_cliente', v_ticket.respuesta_cliente,
    'respuesta_cliente_en', v_ticket.respuesta_cliente_en,
    'inicio_en', v_ticket.inicio_en,
    'fin_en', v_ticket.fin_en,
    'calificacion', v_calificacion.puntuacion,
    'comentario', v_calificacion.comentario
  );
end;
$$;

create or replace function public.calificar_ticket_invitado(p_ticket_id uuid, p_capacidad text, p_puntuacion integer, p_comentario text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
begin
  select * into v_ticket from public.tickets
  where id=p_ticket_id and acceso_publico_hash=extensions.digest(p_capacidad,'sha256');
  if not found then raise exception 'Ticket no encontrado'; end if;

  if v_ticket.estado <> 'finalizado' then
    raise exception 'Solo se pueden calificar turnos finalizados';
  end if;

  insert into public.ticket_calificaciones (
    ticket_id, empresa_id, barbero_id, cliente_id, puntuacion, comentario, estado_moderacion
  ) values (
    v_ticket.id, v_ticket.empresa_id, v_ticket.barbero_asignado_id, null, p_puntuacion, nullif(btrim(p_comentario), ''), 'pendiente'
  ) on conflict (ticket_id) do update set
    puntuacion = excluded.puntuacion,
    comentario = excluded.comentario,
    actualizado_en = now(),
    estado_moderacion = 'pendiente';
end;
$$;

create or replace function public.calificar_mi_ticket(p_ticket_id uuid, p_puntuacion integer, p_comentario text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ticket public.tickets;
begin
  select * into v_ticket from public.tickets
  where id=p_ticket_id and cliente_id=auth.uid();
  if not found then raise exception 'Ticket no encontrado'; end if;

  if v_ticket.estado <> 'finalizado' then
    raise exception 'Solo se pueden calificar turnos finalizados';
  end if;

  insert into public.ticket_calificaciones (
    ticket_id, empresa_id, barbero_id, cliente_id, puntuacion, comentario, estado_moderacion
  ) values (
    v_ticket.id, v_ticket.empresa_id, v_ticket.barbero_asignado_id, auth.uid(), p_puntuacion, nullif(btrim(p_comentario), ''), 'pendiente'
  ) on conflict (ticket_id) do update set
    puntuacion = excluded.puntuacion,
    comentario = excluded.comentario,
    actualizado_en = now(),
    estado_moderacion = 'pendiente';
end;
$$;

grant execute on function public.calificar_ticket_invitado(uuid, text, integer, text) to anon, authenticated;
grant execute on function public.calificar_mi_ticket(uuid, integer, text) to authenticated;