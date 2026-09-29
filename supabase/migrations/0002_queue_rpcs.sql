-- Turnify MVP queue RPCs and triggers (migration 0002).
-- English comments only; database object names stay in Spanish per spec.
-- This migration defines RPC functions and triggers only.
-- It is NOT applied to any live database here (no credentials, no network).
--
-- Conventions:
--   * Public RPCs are SECURITY DEFINER with an empty search_path, so every
--     reference is schema-qualified (public.*, auth.uid()).
--   * Metric functions are SECURITY INVOKER on purpose, so RLS still applies.
--   * Internal helpers (cola_ordenada, revisar_avisos) plus the cron batch
--     jobs (marcar_ausentes, cerrar_tickets_vencidos) have EXECUTE revoked
--     from public/anon/authenticated at the end of this file.

-- ---------------------------------------------------------------------------
-- Small additive columns required by the RPCs below.
-- Migration 0001 stays untouched; these columns are added idempotently here.
-- ---------------------------------------------------------------------------

-- Company profile fields accepted by crear_empresa.
alter table public.empresas add column if not exists id_fiscal text;
alter table public.empresas add column if not exists correo text;
alter table public.empresas add column if not exists telefono text;
alter table public.empresas add column if not exists direccion text;

-- Guest reference name for walk-in tickets (crear_ticket_presencial).
alter table public.tickets add column if not exists nombre_ref text;

-- Refresh timestamp maintained by tickets_actualiza_fila().
alter table public.filas add column if not exists actualizado_en timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Internal helper: ordered waiting queue for one fila.
-- Preferential tickets take every (N+1)-th slot, where N is the company
-- preferencial_cada setting; an empty lane yields its slots to the other
-- side so positions stay gapless. Mirrors src/domain/queue.ts.
-- Only en_espera/notificado tickets wait; every other state is ignored.
-- ---------------------------------------------------------------------------
create or replace function public.cola_ordenada(p_fila uuid)
returns table (ticket_id uuid, posicion integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cada integer := 3;
  v_normales uuid[] := '{}';
  v_prefs uuid[] := '{}';
  v_total integer := 0;
  v_pos integer := 1;
  v_in integer := 1;
  v_ip integer := 1;
begin
  -- Slot rule of the company owning this queue.
  select e.preferencial_cada into v_cada
  from public.filas as f
  join public.empresas as e on e.id = f.empresa_id
  where f.id = p_fila;
  if not found then
    return;
  end if;

  -- Arrival order inside each lane: creado_en, then numero.
  select coalesce(array_agg(t.id order by t.creado_en asc, t.numero asc), '{}')
    into v_normales
  from public.tickets as t
  where t.fila_id = p_fila
    and t.estado in ('en_espera', 'notificado')
    and t.prioridad = 'normal';

  select coalesce(array_agg(t.id order by t.creado_en asc, t.numero asc), '{}')
    into v_prefs
  from public.tickets as t
  where t.fila_id = p_fila
    and t.estado in ('en_espera', 'notificado')
    and t.prioridad = 'preferencial';

  v_total := coalesce(array_length(v_normales, 1), 0)
    + coalesce(array_length(v_prefs, 1), 0);

  while v_pos <= v_total loop
    if (v_pos % (v_cada + 1) = 0) then
      -- Preferential slot; fall back to normals when the lane is empty.
      if v_ip <= coalesce(array_length(v_prefs, 1), 0) then
        ticket_id := v_prefs[v_ip];
        v_ip := v_ip + 1;
      else
        ticket_id := v_normales[v_in];
        v_in := v_in + 1;
      end if;
    else
      -- Normal slot; fall back to preferentials when the lane is empty.
      if v_in <= coalesce(array_length(v_normales, 1), 0) then
        ticket_id := v_normales[v_in];
        v_in := v_in + 1;
      else
        ticket_id := v_prefs[v_ip];
        v_ip := v_ip + 1;
      end if;
    end if;
    posicion := v_pos;
    return next;
    v_pos := v_pos + 1;
  end loop;
  return;
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal helper: promote waiting app tickets to notificado once they are
-- close enough to the front ((posicion - 1) <= aviso_posiciones).
-- Only en_espera tickets from origen 'app' move; notificado tickets stay.
-- Returns the number of promoted tickets.
-- ---------------------------------------------------------------------------
create or replace function public.revisar_avisos(p_fila uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_umbral integer := 3;
  v_count integer := 0;
begin
  select e.aviso_posiciones into v_umbral
  from public.filas as f
  join public.empresas as e on e.id = f.empresa_id
  where f.id = p_fila;
  if not found then
    return 0;
  end if;

  update public.tickets as t
  set estado = 'notificado',
      notificado_en = now(),
      actualizado_en = now()
  from public.cola_ordenada(p_fila) as c
  where c.ticket_id = t.id
    and t.estado = 'en_espera'
    and t.origen = 'app'
    and (c.posicion - 1) <= v_umbral;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: take a turn as an authenticated customer.
-- Only rol 'cliente' may call it; the company is found by upper(trim(codigo))
-- and must be abierta. The fila row is locked FOR UPDATE so concurrent calls
-- cannot take the same daily numero; the partial unique index from 0001 is
-- the backstop and maps to 'Ya tienes un turno activo'.
-- ---------------------------------------------------------------------------
create or replace function public.tomar_turno(p_codigo text, p_fila_id uuid default null)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_rol public.rol_usuario;
  v_emp public.empresas;
  v_fila public.filas;
  v_fecha date;
  v_num integer;
  v_ticket public.tickets;
  v_constraint text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para tomar un turno';
  end if;

  select p.rol into v_rol from public.perfiles as p where p.id = v_uid;
  if v_rol is null or v_rol <> 'cliente' then
    raise exception 'Solo los clientes pueden tomar turnos desde la app';
  end if;

  select * into v_emp from public.empresas where codigo = upper(trim(p_codigo));
  if not found then
    raise exception 'Empresa no encontrada';
  end if;
  if not v_emp.abierta then
    raise exception 'La empresa está cerrada';
  end if;

  if p_fila_id is null then
    select * into v_fila
    from public.filas
    where empresa_id = v_emp.id
    order by creado_en asc
    limit 1
    for update;
  else
    select * into v_fila
    from public.filas
    where id = p_fila_id and empresa_id = v_emp.id
    for update;
  end if;
  if not found then
    raise exception 'Fila no encontrada';
  end if;

  -- Operative date in the company timezone (one daily counter per fila).
  v_fecha := (now() at time zone v_emp.zona_horaria)::date;
  select coalesce(max(t.numero), 0) + 1 into v_num
  from public.tickets as t
  where t.fila_id = v_fila.id and t.fecha_operativa = v_fecha;

  begin
    insert into public.tickets
      (empresa_id, fila_id, cliente_id, origen, prioridad, estado,
       fecha_operativa, numero, codigo_visible)
    values
      (v_emp.id, v_fila.id, v_uid, 'app', 'normal', 'en_espera',
       v_fecha, v_num, v_fila.prefijo || '-' || lpad(v_num::text, 3, '0'))
    returning * into v_ticket;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'un_ticket_activo_por_cliente' then
      raise exception 'Ya tienes un turno activo';
    else
      raise;
    end if;
  end;
  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: company summary by code. Returns only aggregate data
-- (no personal data): name, open flag, and per fila the waiting count plus
-- an estimated wait of ceil(delante * promedio / puestos) in minutes.
-- Callable without login so customers can check a queue before signing in.
-- ---------------------------------------------------------------------------
create or replace function public.resumen_empresa(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emp public.empresas;
  v_out jsonb;
begin
  select * into v_emp from public.empresas where codigo = upper(trim(p_codigo));
  if not found then
    raise exception 'Empresa no encontrada';
  end if;

  select jsonb_build_object(
    'nombre', v_emp.nombre,
    'abierta', v_emp.abierta,
    'filas', coalesce(jsonb_agg(fila order by fila ->> 'nombre'), '[]'::jsonb)
  )
  into v_out
  from (
    select jsonb_build_object(
      'fila_id', f.id,
      'nombre', f.nombre,
      'en_espera', w.n,
      'espera_min', case
        when w.n = 0 then 0
        else greatest(1, ceil(w.n::numeric * f.duracion_promedio_seg / f.puestos_activos / 60)::int)
      end
    ) as fila
    from public.filas as f
    left join lateral (
      select count(*) as n
      from public.tickets as t
      where t.fila_id = f.id
        and t.estado in ('en_espera', 'notificado')
    ) as w on true
    where f.empresa_id = v_emp.id
  ) as s;

  return v_out;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: state of one own ticket (customers see only their own tickets).
-- Returns code, state, people ahead and estimated wait in minutes.
-- ---------------------------------------------------------------------------
create or replace function public.mi_ticket_estado(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_ticket public.tickets;
  v_fila public.filas;
  v_pos integer;
  v_delante integer := 0;
  v_espera integer := 0;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para ver tu turno';
  end if;

  select * into v_ticket
  from public.tickets
  where id = p_ticket_id and cliente_id = v_uid;
  if not found then
    raise exception 'Ticket no encontrado';
  end if;

  select * into v_fila from public.filas where id = v_ticket.fila_id;

  select c.posicion into v_pos
  from public.cola_ordenada(v_ticket.fila_id) as c
  where c.ticket_id = p_ticket_id;
  if found then
    v_delante := v_pos - 1;
    if v_delante > 0 then
      v_espera := greatest(1, ceil(v_delante::numeric * v_fila.duracion_promedio_seg / v_fila.puestos_activos / 60)::int);
    end if;
  end if;

  return jsonb_build_object(
    'codigo_visible', v_ticket.codigo_visible,
    'estado', v_ticket.estado,
    'personas_delante', v_delante,
    'espera_min', v_espera
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: cancel one own ticket. Only en_espera/notificado tickets move;
-- llamado and later states are handled by the staff flow instead.
-- ---------------------------------------------------------------------------
create or replace function public.cancelar_ticket(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_ticket public.tickets;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para cancelar tu turno';
  end if;

  update public.tickets
  set estado = 'cancelado',
      cerrado_en = now(),
      actualizado_en = now()
  where id = p_ticket_id
    and cliente_id = v_uid
    and estado in ('en_espera', 'notificado')
  returning * into v_ticket;

  if not found then
    raise exception 'Solo puedes cancelar un turno en espera';
  end if;
  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: create a company. Generates a unique 8-char code from an alphabet
-- without ambiguous glyphs (no 0/O/1/I), creates the default fila
-- (General/A), and promotes the caller to admin of the new company.
-- ---------------------------------------------------------------------------
create or replace function public.crear_empresa(
  p_nombre text,
  p_id_fiscal text default null,
  p_correo text default null,
  p_telefono text default null,
  p_direccion text default null
)
returns public.empresas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_perfil public.perfiles;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_emp public.empresas;
  v_attempt integer;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para crear una empresa';
  end if;

  select * into v_perfil from public.perfiles where id = v_uid;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;
  if v_perfil.empresa_id is not null then
    raise exception 'Ya perteneces a una empresa';
  end if;
  if p_nombre is null or trim(p_nombre) = '' then
    raise exception 'El nombre de la empresa es obligatorio';
  end if;

  -- Draw an 8-char code until it is unique (bounded retries).
  v_codigo := '';
  for v_attempt in 1..10 loop
    select string_agg(substr(v_chars, (floor(random() * char_length(v_chars))::int) + 1, 1), '')
      into v_codigo
    from generate_series(1, 8);
    exit when not exists (select 1 from public.empresas where codigo = v_codigo);
    v_codigo := '';
  end loop;
  if v_codigo is null or v_codigo = '' then
    raise exception 'No se pudo generar un código único, intenta de nuevo';
  end if;

  insert into public.empresas (nombre, codigo, id_fiscal, correo, telefono, direccion)
  values (trim(p_nombre), v_codigo, p_id_fiscal, p_correo, p_telefono, p_direccion)
  returning * into v_emp;

  -- Default queue for the new company.
  insert into public.filas (empresa_id, nombre, prefijo)
  values (v_emp.id, 'General', 'A');

  update public.perfiles
  set rol = 'admin', empresa_id = v_emp.id
  where id = v_uid;

  return v_emp;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: an admin creates a staff invitation for their own company.
-- Returns the invitation row (the token is delivered out of band).
-- ---------------------------------------------------------------------------
create or replace function public.crear_invitacion(
  p_email text,
  p_rol public.rol_usuario default 'personal'
)
returns public.invitaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_emp uuid;
  v_rol public.rol_usuario;
  v_inv public.invitaciones;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para invitar personal';
  end if;

  select p.empresa_id, p.rol into v_emp, v_rol
  from public.perfiles as p where p.id = v_uid;
  if v_emp is null or v_rol <> 'admin' then
    raise exception 'Solo un administrador puede invitar personal';
  end if;
  if p_rol not in ('personal', 'admin') then
    raise exception 'Rol de invitación inválido';
  end if;
  if p_email is null or trim(p_email) = '' then
    raise exception 'El correo de la invitación es obligatorio';
  end if;

  insert into public.invitaciones (empresa_id, email, rol, token, creada_por, expira_en)
  values (v_emp, trim(p_email), p_rol, encode(gen_random_bytes(24), 'hex'), v_uid, now() + interval '7 days')
  returning * into v_inv;
  return v_inv;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: redeem a staff invitation token. Links the caller to the company
-- with the invited role and marks the invitation as accepted.
-- ---------------------------------------------------------------------------
create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_inv public.invitaciones;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para aceptar una invitación';
  end if;

  select * into v_inv
  from public.invitaciones
  where token = p_token
    and aceptada = false
    and (expira_en is null or expira_en > now());
  if not found then
    raise exception 'Invitación inválida o vencida';
  end if;

  update public.perfiles
  set empresa_id = v_inv.empresa_id, rol = v_inv.rol
  where id = v_uid;

  update public.invitaciones
  set aceptada = true
  where id = v_inv.id;

  return v_inv.empresa_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: staff creates a walk-in ticket (cliente_id stays null).
-- Only admin/personal of the fila's own company may call it.
-- ---------------------------------------------------------------------------
create or replace function public.crear_ticket_presencial(
  p_fila_id uuid,
  p_prioridad public.prioridad_ticket default 'normal',
  p_nombre_ref text default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_emp uuid;
  v_rol public.rol_usuario;
  v_fila public.filas;
  v_zona text;
  v_fecha date;
  v_num integer;
  v_ticket public.tickets;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para crear un ticket presencial';
  end if;

  select p.empresa_id, p.rol into v_emp, v_rol
  from public.perfiles as p where p.id = v_uid;
  if v_emp is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo el personal puede crear tickets presenciales';
  end if;

  select * into v_fila
  from public.filas
  where id = p_fila_id and empresa_id = v_emp
  for update;
  if not found then
    raise exception 'Fila no encontrada';
  end if;

  select e.zona_horaria into v_zona
  from public.empresas as e where e.id = v_emp;
  v_fecha := (now() at time zone v_zona)::date;
  select coalesce(max(t.numero), 0) + 1 into v_num
  from public.tickets as t
  where t.fila_id = v_fila.id and t.fecha_operativa = v_fecha;

  insert into public.tickets
    (empresa_id, fila_id, cliente_id, origen, prioridad, estado,
     fecha_operativa, numero, codigo_visible, nombre_ref)
  values
    (v_emp, v_fila.id, null, 'presencial', p_prioridad, 'en_espera',
     v_fecha, v_num, v_fila.prefijo || '-' || lpad(v_num::text, 3, '0'), p_nombre_ref)
  returning * into v_ticket;
  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: staff calls the next waiting ticket of their own company.
-- Takes the head of cola_ordenada to llamado, stamping llamado_en and
-- atendido_por. Returns null when nobody waits (no exception on empty).
-- ---------------------------------------------------------------------------
create or replace function public.llamar_siguiente(p_fila_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_emp uuid;
  v_rol public.rol_usuario;
  v_first uuid;
  v_ticket public.tickets;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para llamar turnos';
  end if;

  select p.empresa_id, p.rol into v_emp, v_rol
  from public.perfiles as p where p.id = v_uid;
  if v_emp is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo el personal puede llamar turnos';
  end if;

  -- Serialize concurrent calls on the same queue.
  perform 1 from public.filas where id = p_fila_id and empresa_id = v_emp for update;
  if not found then
    raise exception 'Fila no encontrada';
  end if;

  select c.ticket_id into v_first
  from public.cola_ordenada(p_fila_id) as c
  limit 1;
  if not found then
    return null;
  end if;

  update public.tickets
  set estado = 'llamado',
      llamado_en = now(),
      atendido_por = v_uid,
      actualizado_en = now()
  where id = v_first
    and estado in ('en_espera', 'notificado')
  returning * into v_ticket;

  if not found then
    -- Lost a race with another staff member; report empty instead of failing.
    return null;
  end if;
  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: staff starts serving a called ticket (llamado -> en_atencion).
-- ---------------------------------------------------------------------------
create or replace function public.iniciar_atencion(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_emp uuid;
  v_rol public.rol_usuario;
  v_ticket public.tickets;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para atender turnos';
  end if;

  select p.empresa_id, p.rol into v_emp, v_rol
  from public.perfiles as p where p.id = v_uid;
  if v_emp is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo el personal puede atender turnos';
  end if;

  update public.tickets as t
  set estado = 'en_atencion',
      inicio_en = now(),
      actualizado_en = now()
  from public.filas as f
  where t.id = p_ticket_id
    and t.fila_id = f.id
    and f.empresa_id = v_emp
    and t.estado = 'llamado'
  returning t.* into v_ticket;

  if not found then
    raise exception 'El ticket no está llamado';
  end if;
  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: staff finishes service (en_atencion -> finalizado) and refreshes
-- the fila average from the last 20 finalizados. Fewer than 3 samples keeps
-- the previous average (mirrors resolveAverage in src/domain/eta.ts).
-- ---------------------------------------------------------------------------
create or replace function public.finalizar_atencion(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_emp uuid;
  v_rol public.rol_usuario;
  v_ticket public.tickets;
  v_n integer := 0;
  v_avg numeric;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para finalizar turnos';
  end if;

  select p.empresa_id, p.rol into v_emp, v_rol
  from public.perfiles as p where p.id = v_uid;
  if v_emp is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo el personal puede finalizar turnos';
  end if;

  update public.tickets as t
  set estado = 'finalizado',
      fin_en = now(),
      cerrado_en = now(),
      actualizado_en = now()
  from public.filas as f
  where t.id = p_ticket_id
    and t.fila_id = f.id
    and f.empresa_id = v_emp
    and t.estado = 'en_atencion'
  returning t.* into v_ticket;

  if not found then
    raise exception 'El ticket no está en atención';
  end if;

  -- Recompute the average service time from the last 20 finalizados.
  select count(*), avg(s.seg) into v_n, v_avg
  from (
    select extract(epoch from (h.fin_en - h.inicio_en)) as seg
    from public.tickets as h
    where h.fila_id = v_ticket.fila_id
      and h.estado = 'finalizado'
      and h.inicio_en is not null
      and h.fin_en is not null
    order by h.fin_en desc
    limit 20
  ) as s;

  if v_n >= 3 then
    update public.filas
    set duracion_promedio_seg = greatest(1, v_avg::int)
    where id = v_ticket.fila_id;
  end if;

  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public: staff marks a called ticket absent by hand (llamado -> ausente).
-- Absent tickets never re-enter the queue; the customer takes a new one.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_ausente(p_ticket_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_emp uuid;
  v_rol public.rol_usuario;
  v_ticket public.tickets;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Debes iniciar sesión para marcar ausentes';
  end if;

  select p.empresa_id, p.rol into v_emp, v_rol
  from public.perfiles as p where p.id = v_uid;
  if v_emp is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo el personal puede marcar ausentes';
  end if;

  update public.tickets as t
  set estado = 'ausente',
      cerrado_en = now(),
      actualizado_en = now()
  from public.filas as f
  where t.id = p_ticket_id
    and t.fila_id = f.id
    and f.empresa_id = v_emp
    and t.estado = 'llamado'
  returning t.* into v_ticket;

  if not found then
    raise exception 'El ticket no está llamado';
  end if;
  return v_ticket;
end;
$$;

-- ---------------------------------------------------------------------------
-- Batch (service_role/cron only): sweep every llamado ticket past its own
-- company grace window (llamado_en + minutos_gracia) to ausente.
-- Cutoff is inclusive, mirroring isPastGrace in src/domain/noShow.ts.
-- ---------------------------------------------------------------------------
create or replace function public.marcar_ausentes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  update public.tickets as t
  set estado = 'ausente',
      cerrado_en = now(),
      actualizado_en = now()
  from public.empresas as e
  where t.empresa_id = e.id
    and t.estado = 'llamado'
    and t.llamado_en is not null
    and t.llamado_en <= now() - (e.minutos_gracia * interval '1 minute');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Batch (service_role/cron only): cancel open tickets whose operative date
-- already passed. Only waiting/called states move; en_atencion tickets of
-- past days are left for separate review (they may still be served).
-- ---------------------------------------------------------------------------
create or replace function public.cerrar_tickets_vencidos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
begin
  update public.tickets
  set estado = 'cancelado',
      cerrado_en = now(),
      actualizado_en = now()
  where estado in ('en_espera', 'notificado', 'llamado')
    and fecha_operativa < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Metrics with caller rights (SECURITY INVOKER): RLS policies keep applying,
-- so staff only ever aggregate rows of their own company.
-- ---------------------------------------------------------------------------

-- Per-state counts for the current operative date of one company.
create or replace function public.metricas_resumen(p_empresa_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_out jsonb;
begin
  select jsonb_build_object(
    'por_estado', coalesce(jsonb_object_agg(s.estado, s.total), '{}'::jsonb),
    'total_hoy', coalesce(sum(s.total), 0)
  )
  into v_out
  from (
    select t.estado::text as estado, count(*) as total
    from public.tickets as t
    where t.empresa_id = p_empresa_id
      and t.fecha_operativa = current_date
    group by t.estado
  ) as s;
  return v_out;
end;
$$;

-- Tickets created per hour (0-23) for the current operative date.
create or replace function public.metricas_horas_pico(p_empresa_id uuid)
returns table (hora integer, total bigint)
language sql
as $$
  select extract(hour from t.creado_en)::int as hora, count(*) as total
  from public.tickets as t
  where t.empresa_id = p_empresa_id
    and t.fecha_operativa = current_date
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: keep filas counters fresh and promotions running on every
-- ticket insert or estado change. The depth guard stops the recursion
-- caused by revisar_avisos() updating tickets inside the trigger.
-- ---------------------------------------------------------------------------
create or replace function public.tickets_actualiza_fila()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila uuid;
  v_ultimo text;
begin
  -- Nested trigger calls (from revisar_avisos below) do nothing.
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  v_fila := coalesce(new.fila_id, old.fila_id);

  select t.codigo_visible into v_ultimo
  from public.tickets as t
  where t.fila_id = v_fila
    and t.estado = 'llamado'
  order by t.llamado_en desc nulls last
  limit 1;

  update public.filas
  set en_espera = (
      select count(*)
      from public.tickets as t
      where t.fila_id = v_fila
        and t.estado in ('en_espera', 'notificado')
    ),
    ultimo_llamado = v_ultimo,
    actualizado_en = now()
  where id = v_fila;

  -- Promote close app tickets to notificado (fires nested triggers,
  -- which return early through the depth guard above).
  perform public.revisar_avisos(v_fila);

  return null;
end;
$$;

drop trigger if exists trg_tickets_fila on public.tickets;

create trigger trg_tickets_fila
  after insert or update of estado on public.tickets
  for each row execute function public.tickets_actualiza_fila();

-- ---------------------------------------------------------------------------
-- Grants: public directory info is world-readable; staff/customer RPCs need
-- a login; metrics rely on RLS through invoker rights.
-- ---------------------------------------------------------------------------
grant execute on function public.resumen_empresa(text) to anon, authenticated;

grant execute on function public.tomar_turno(text, uuid) to authenticated;
grant execute on function public.mi_ticket_estado(uuid) to authenticated;
grant execute on function public.cancelar_ticket(uuid) to authenticated;
grant execute on function public.crear_empresa(text, text, text, text, text) to authenticated;
grant execute on function public.crear_invitacion(text, public.rol_usuario) to authenticated;
grant execute on function public.aceptar_invitacion(text) to authenticated;
grant execute on function public.crear_ticket_presencial(uuid, public.prioridad_ticket, text) to authenticated;
grant execute on function public.llamar_siguiente(uuid) to authenticated;
grant execute on function public.iniciar_atencion(uuid) to authenticated;
grant execute on function public.finalizar_atencion(uuid) to authenticated;
grant execute on function public.marcar_ausente(uuid) to authenticated;
grant execute on function public.metricas_resumen(uuid) to authenticated;
grant execute on function public.metricas_horas_pico(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Internal helpers and batch jobs are never callable by client roles;
-- only the owner and service_role (cron) keep access.
-- ---------------------------------------------------------------------------
revoke all on function public.cola_ordenada(uuid) from public, anon, authenticated;
revoke all on function public.revisar_avisos(uuid) from public, anon, authenticated;
revoke all on function public.marcar_ausentes() from public, anon, authenticated;
revoke all on function public.cerrar_tickets_vencidos() from public, anon, authenticated;

grant execute on function public.cola_ordenada(uuid) to service_role;
grant execute on function public.revisar_avisos(uuid) to service_role;
grant execute on function public.marcar_ausentes() to service_role;
grant execute on function public.cerrar_tickets_vencidos() to service_role;
