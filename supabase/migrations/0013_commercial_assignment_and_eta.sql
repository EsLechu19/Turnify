-- Commercial ticket dispatch: projected routes are customer-facing estimates;
-- assigned routes are capacity reservations owned by the call operation.

alter table public.tickets add column if not exists barbero_estimado_id uuid references public.barberos(id) on delete set null;
alter table public.tickets add column if not exists barbero_estimado_nombre text;

alter table public.tickets add constraint tickets_barbero_estimado_snapshot_ck check (
  (barbero_estimado_id is null and barbero_estimado_nombre is null)
  or (barbero_estimado_id is not null and barbero_estimado_nombre is not null)
);

create index tickets_barbero_estimado_espera_idx on public.tickets (barbero_estimado_id, estado)
  where barbero_estimado_id is not null
    and estado in ('en_espera', 'notificado');

-- One called or in-service ticket consumes a barber's single walk-in chair.
-- Waiting estimates never reserve capacity; llamar_siguiente performs that
-- reservation atomically while holding the queue lock.
create unique index tickets_barbero_capacidad_activa_idx
  on public.tickets (barbero_asignado_id)
  where barbero_asignado_id is not null
    and estado in ('llamado', 'en_atencion');

-- Keep the route snapshots tenant-safe and service-compatible even for direct
-- privileged writes. Assignment remains mutable only through explicit worker
-- operations introduced below; an estimate is immutable after ticket creation.
create or replace function public.validar_ruta_comercial_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
begin
  if tg_op = 'UPDATE' and (
    old.servicio_id is distinct from new.servicio_id
    or old.servicio_nombre is distinct from new.servicio_nombre
    or old.servicio_duracion_seg is distinct from new.servicio_duracion_seg
    or old.barbero_solicitado_id is distinct from new.barbero_solicitado_id
    or old.barbero_solicitado_nombre is distinct from new.barbero_solicitado_nombre
    or old.barbero_estimado_id is distinct from new.barbero_estimado_id
    or old.barbero_estimado_nombre is distinct from new.barbero_estimado_nombre
  ) then
    raise exception 'Los snapshots de servicio, solicitud y estimación son inmutables';
  end if;

  if new.servicio_id is not null then
    select s.empresa_id into v_empresa from public.servicios as s where s.id = new.servicio_id;
    if v_empresa is null or v_empresa <> new.empresa_id then
      raise exception 'El servicio no pertenece a la empresa del ticket';
    end if;
  end if;

  if new.barbero_solicitado_id is not null and (
    new.servicio_id is null or not exists (
      select 1 from public.barbero_servicios as bs
      join public.barberos as b on b.id = bs.barbero_id
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      where bs.barbero_id = new.barbero_solicitado_id
        and bs.servicio_id = new.servicio_id
        and b.empresa_id = new.empresa_id
        and bo.estado <> 'fuera_de_turno'
    )
  ) then
    raise exception 'El barbero solicitado no está en turno o no es compatible con el servicio';
  end if;

  if new.barbero_estimado_id is not null and (
    new.servicio_id is null or not exists (
      select 1 from public.barbero_servicios as bs
      join public.barberos as b on b.id = bs.barbero_id
      where bs.barbero_id = new.barbero_estimado_id
        and bs.servicio_id = new.servicio_id
        and b.empresa_id = new.empresa_id
    )
  ) then
    raise exception 'El barbero estimado no es compatible con el servicio';
  end if;

  if new.barbero_asignado_id is not null and (
    new.servicio_id is null or not exists (
      select 1 from public.barbero_servicios as bs
      join public.barberos as b on b.id = bs.barbero_id
      where bs.barbero_id = new.barbero_asignado_id
        and bs.servicio_id = new.servicio_id
        and b.empresa_id = new.empresa_id
    )
  ) then
    raise exception 'El barbero asignado no es compatible con el servicio';
  end if;
  return new;
end;
$$;

-- The customer contract chooses an immutable projected route. Named requests
-- keep their guarantee while busy; any-available chooses the compatible route
-- with the least projected seconds, then operational state, name and id.
create or replace function public.tomar_turno_comercial(
  p_codigo text,
  p_servicio_id uuid,
  p_barbero_solicitado_id uuid default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa public.empresas;
  v_servicio public.servicios;
  v_fila public.filas;
  v_estimado public.barberos;
  v_fecha date;
  v_numero integer;
  v_ticket public.tickets;
begin
  if v_uid is null or public.mi_rol() <> 'cliente' then
    raise exception 'Solo los clientes pueden tomar turnos desde la app';
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
    barbero_estimado_id, barbero_estimado_nombre
  ) values (
    v_empresa.id, v_fila.id, v_uid, 'app', 'normal', 'en_espera', v_fecha,
    v_numero, v_fila.prefijo || '-' || lpad(v_numero::text, 3, '0'),
    v_servicio.id, v_servicio.nombre, v_servicio.duracion_estimada_seg,
    case when p_barbero_solicitado_id is null then null else v_estimado.id end,
    case when p_barbero_solicitado_id is null then null else v_estimado.nombre end,
    v_estimado.id, v_estimado.nombre
  ) returning * into v_ticket;
  return v_ticket;
end;
$$;

-- Calling is the only operation that reserves commercial capacity. A named
-- request is never silently reassigned; unavailable named tickets are skipped.
-- Any-available selects the deterministic first free compatible barber.
create or replace function public.llamar_siguiente(p_fila_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_emp uuid;
  v_rol public.rol_usuario;
  v_ticket public.tickets;
  v_barbero public.barberos;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión para llamar turnos'; end if;
  select p.empresa_id, p.rol into v_emp, v_rol from public.perfiles as p where p.id = v_uid;
  if v_emp is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo el personal puede llamar turnos';
  end if;
  perform 1 from public.filas where id = p_fila_id and empresa_id = v_emp for update;
  if not found then raise exception 'Fila no encontrada'; end if;

  select t.* into v_ticket
  from public.cola_ordenada(p_fila_id) as c
  join public.tickets as t on t.id = c.ticket_id
  where t.servicio_id is null
    or (t.barbero_solicitado_id is not null and exists (
      select 1 from public.barbero_operaciones as bo
      where bo.barbero_id = t.barbero_solicitado_id and bo.estado = 'disponible'
        and not exists (
          select 1 from public.tickets as ocupado
          where ocupado.barbero_asignado_id = bo.barbero_id
            and ocupado.estado in ('llamado', 'en_atencion')
        )
    ))
    or (t.barbero_solicitado_id is null and exists (
      select 1 from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      join public.barbero_servicios as bs on bs.barbero_id = b.id
      where b.empresa_id = v_emp and b.activo and bo.estado = 'disponible'
        and bs.servicio_id = t.servicio_id
        and not exists (
          select 1 from public.tickets as ocupado
          where ocupado.barbero_asignado_id = b.id
            and ocupado.estado in ('llamado', 'en_atencion')
        )
    ))
  order by c.posicion
  limit 1;
  if not found then return null; end if;

  if v_ticket.servicio_id is not null then
    if v_ticket.barbero_solicitado_id is not null then
      select b.* into v_barbero from public.barberos as b
      where b.id = v_ticket.barbero_solicitado_id;
    else
      select b.* into v_barbero from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      join public.barbero_servicios as bs on bs.barbero_id = b.id
      where b.empresa_id = v_emp and b.activo and bo.estado = 'disponible'
        and bs.servicio_id = v_ticket.servicio_id
        and not exists (
          select 1 from public.tickets as ocupado
          where ocupado.barbero_asignado_id = b.id
            and ocupado.estado in ('llamado', 'en_atencion')
        )
      order by b.nombre, b.id
      limit 1;
      if not found then return null; end if;
    end if;
  end if;

  update public.tickets
  set estado = 'llamado', llamado_en = now(), atendido_por = v_uid,
      barbero_asignado_id = v_barbero.id,
      barbero_asignado_nombre = v_barbero.nombre,
      actualizado_en = now()
  where id = v_ticket.id and estado in ('en_espera', 'notificado')
  returning * into v_ticket;
  return v_ticket;
end;
$$;

-- Customer ETA is per projected route: sum active and waiting projected work
-- before this ticket, then convert to a whole minute. This is deterministic,
-- service-aware, and deliberately separate from the eventual call assignment.
create or replace function public.mi_ticket_estado(p_ticket_id uuid)
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

  return jsonb_build_object(
    'codigo_visible', v_ticket.codigo_visible, 'estado', v_ticket.estado,
    'personas_delante', v_delante, 'espera_min', v_espera,
    'servicio_nombre', v_ticket.servicio_nombre,
    'barbero_solicitado_nombre', v_ticket.barbero_solicitado_nombre,
    'barbero_estimado_nombre', v_ticket.barbero_estimado_nombre,
    'barbero_asignado_nombre', v_ticket.barbero_asignado_nombre
  );
end;
$$;

grant execute on function public.llamar_siguiente(uuid) to authenticated;
grant execute on function public.mi_ticket_estado(uuid) to authenticated;
