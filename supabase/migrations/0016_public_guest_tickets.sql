-- Public guest tickets use a capability, not an account. The raw capability is
-- returned only by creation and never stored; the database stores its SHA-256 hash.

do $$
begin
  create type public.rango_edad_invitado as enum ('under_18', '18_24', '25_34', '35_44', '45_plus');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.genero_invitado as enum ('male', 'female', 'prefer_not_to_say');
exception when duplicate_object then null;
end;
$$;

alter table public.tickets add column if not exists nombre_invitado text;
alter table public.tickets add column if not exists rango_edad_invitado public.rango_edad_invitado;
alter table public.tickets add column if not exists genero_invitado public.genero_invitado;
alter table public.tickets add column if not exists acceso_publico_hash bytea;

alter table public.tickets add constraint tickets_invitado_publico_ck check (
  (acceso_publico_hash is null
    and nombre_invitado is null
    and rango_edad_invitado is null
    and genero_invitado is null)
  or
  (acceso_publico_hash is not null
    and nombre_invitado is not null
    and char_length(btrim(nombre_invitado)) between 1 and 80)
);

create unique index tickets_acceso_publico_hash_uidx
  on public.tickets (acceso_publico_hash)
  where acceso_publico_hash is not null;

-- Creates a public guest ticket without granting anon any table permissions.
-- A named on-shift barber remains valid even when busy; any available uses the
-- same deterministic projected routing as the authenticated commercial path.
create or replace function public.crear_ticket_invitado(
  p_codigo text,
  p_servicio_id uuid,
  p_nombre text,
  p_rango_edad public.rango_edad_invitado default null,
  p_genero public.genero_invitado default null,
  p_barbero_solicitado_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa public.empresas;
  v_servicio public.servicios;
  v_fila public.filas;
  v_estimado public.barberos;
  v_fecha date;
  v_numero integer;
  v_ticket public.tickets;
  v_capacidad text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if p_nombre is null or char_length(btrim(p_nombre)) not between 1 and 80 then
    raise exception 'El nombre del invitado es obligatorio y debe tener hasta 80 caracteres';
  end if;

  select * into v_empresa from public.empresas where codigo = upper(btrim(p_codigo));
  if not found then raise exception 'Empresa no encontrada'; end if;
  if not v_empresa.abierta then raise exception 'La empresa está cerrada'; end if;

  select * into v_servicio from public.servicios
  where id = p_servicio_id and empresa_id = v_empresa.id and activo;
  if not found then raise exception 'Servicio no disponible'; end if;

  select * into v_fila from public.filas
  where empresa_id = v_empresa.id order by creado_en limit 1 for update;
  if not found then raise exception 'Fila no encontrada'; end if;

  if p_barbero_solicitado_id is not null then
    select b.* into v_estimado from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    where b.id = p_barbero_solicitado_id and b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id;
    if not found then raise exception 'El barbero solicitado no está disponible para este servicio'; end if;
  else
    select b.* into v_estimado from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    left join public.tickets as t on t.barbero_estimado_id = b.id
      and t.estado in ('en_espera', 'notificado', 'llamado', 'en_atencion')
    where b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id
    group by b.id, bo.estado
    order by coalesce(sum(t.servicio_duracion_seg), 0),
      case bo.estado when 'disponible' then 0 else 1 end, b.nombre, b.id
    limit 1;
    if not found then raise exception 'No hay barberos en turno para este servicio'; end if;
  end if;

  v_fecha := (now() at time zone v_empresa.zona_horaria)::date;
  select coalesce(max(t.numero), 0) + 1 into v_numero
  from public.tickets as t where t.fila_id = v_fila.id and t.fecha_operativa = v_fecha;

  insert into public.tickets (
    empresa_id, fila_id, cliente_id, origen, prioridad, estado, fecha_operativa,
    numero, codigo_visible, servicio_id, servicio_nombre, servicio_duracion_seg,
    barbero_solicitado_id, barbero_solicitado_nombre,
    barbero_estimado_id, barbero_estimado_nombre,
    nombre_invitado, rango_edad_invitado, genero_invitado, acceso_publico_hash
  ) values (
    v_empresa.id, v_fila.id, null, 'app', 'normal', 'en_espera', v_fecha,
    v_numero, v_fila.prefijo || '-' || lpad(v_numero::text, 3, '0'),
    v_servicio.id, v_servicio.nombre, v_servicio.duracion_estimada_seg,
    case when p_barbero_solicitado_id is null then null else v_estimado.id end,
    case when p_barbero_solicitado_id is null then null else v_estimado.nombre end,
    v_estimado.id, v_estimado.nombre,
    btrim(p_nombre), p_rango_edad, p_genero, extensions.digest(v_capacidad, 'sha256')
  ) returning * into v_ticket;

  return jsonb_build_object(
    'ticket_id', v_ticket.id,
    'codigo_visible', v_ticket.codigo_visible,
    'capacidad', v_capacidad
  );
end;
$$;

-- Guest retrieval deliberately omits the guest profile fields and all staff or
-- queue detail. Both the ticket UUID and the unguessable capability are needed.
create or replace function public.estado_ticket_invitado(p_ticket_id uuid, p_capacidad text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_pos integer;
  v_delante integer := 0;
  v_espera integer := 0;
  v_segundos integer := 0;
begin
  select * into v_ticket from public.tickets
  where id = p_ticket_id
    and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256');
  if not found then raise exception 'Ticket no encontrado'; end if;

  select c.posicion into v_pos from public.cola_ordenada(v_ticket.fila_id) as c where c.ticket_id = v_ticket.id;
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

  return jsonb_build_object(
    'codigo_visible', v_ticket.codigo_visible, 'estado', v_ticket.estado,
    'personas_delante', v_delante, 'espera_min', v_espera,
    'servicio_nombre', v_ticket.servicio_nombre,
    'barbero_solicitado_nombre', v_ticket.barbero_solicitado_nombre,
    'barbero_asignado_nombre', v_ticket.barbero_asignado_nombre
  );
end;
$$;

create or replace function public.cancelar_ticket_invitado(p_ticket_id uuid, p_capacidad text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tickets
  set estado = 'cancelado', cerrado_en = now(), actualizado_en = now()
  where id = p_ticket_id
    and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256')
    and estado in ('en_espera', 'notificado');
  if not found then raise exception 'Ticket no encontrado o no puede cancelarse'; end if;
end;
$$;

revoke all on function public.crear_ticket_invitado(text, uuid, text, public.rango_edad_invitado, public.genero_invitado, uuid) from public;
revoke all on function public.estado_ticket_invitado(uuid, text) from public;
revoke all on function public.cancelar_ticket_invitado(uuid, text) from public;
grant execute on function public.crear_ticket_invitado(text, uuid, text, public.rango_edad_invitado, public.genero_invitado, uuid) to anon, authenticated;
grant execute on function public.estado_ticket_invitado(uuid, text) to anon, authenticated;
grant execute on function public.cancelar_ticket_invitado(uuid, text) to anon, authenticated;
