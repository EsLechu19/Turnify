-- Commercial queue foundation for customer service and barber preference.
-- This additive migration leaves legacy tickets and tomar_turno(text, uuid)
-- intact while customer V2 adopts the explicit commercial RPC below.

do $$
begin
  create type public.estado_operativo_barbero as enum (
    'fuera_de_turno', 'disponible', 'ocupado'
  );
exception
  when duplicate_object then null;
end;
$$;

create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null check (btrim(nombre) <> ''),
  descripcion text,
  duracion_estimada_seg integer not null check (duracion_estimada_seg >= 60),
  precio_referencia_centavos integer check (precio_referencia_centavos is null or precio_referencia_centavos >= 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (empresa_id, nombre)
);

-- A barber is a staff profile with commercial routing metadata. Configuration
-- screens are deferred; this table is deliberately the data foundation only.
create table public.barberos (
  id uuid primary key references public.perfiles(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null check (btrim(nombre) <> ''),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.barbero_servicios (
  barbero_id uuid not null references public.barberos(id) on delete cascade,
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (barbero_id, servicio_id)
);

-- One operational record per barber. Off-shift barbers remain in the roster but
-- never appear in the customer catalog and cannot be requested by the V2 RPC.
create table public.barbero_operaciones (
  barbero_id uuid primary key references public.barberos(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  estado public.estado_operativo_barbero not null default 'fuera_de_turno',
  actualizado_en timestamptz not null default now()
);

create index servicios_empresa_activo_idx on public.servicios (empresa_id, activo);
create index barberos_empresa_activo_idx on public.barberos (empresa_id, activo);
create index barbero_operaciones_ruta_idx on public.barbero_operaciones (empresa_id, estado);
create index barbero_servicios_servicio_idx on public.barbero_servicios (servicio_id, barbero_id);

-- Nullable defaults backfill safely for historic tickets. New commercial
-- tickets always populate the service snapshot; a requested barber is optional
-- because "Any available barber" is an explicit choice.
alter table public.tickets add column if not exists servicio_id uuid references public.servicios(id) on delete set null;
alter table public.tickets add column if not exists servicio_nombre text;
alter table public.tickets add column if not exists servicio_duracion_seg integer;
alter table public.tickets add column if not exists barbero_solicitado_id uuid references public.barberos(id) on delete set null;
alter table public.tickets add column if not exists barbero_solicitado_nombre text;
alter table public.tickets add column if not exists barbero_asignado_id uuid references public.barberos(id) on delete set null;
alter table public.tickets add column if not exists barbero_asignado_nombre text;

alter table public.tickets add constraint tickets_servicio_snapshot_ck check (
  (servicio_id is null and servicio_nombre is null and servicio_duracion_seg is null)
  or (servicio_id is not null and servicio_nombre is not null and servicio_duracion_seg >= 60)
);
alter table public.tickets add constraint tickets_barbero_solicitado_snapshot_ck check (
  (barbero_solicitado_id is null and barbero_solicitado_nombre is null)
  or (barbero_solicitado_id is not null and barbero_solicitado_nombre is not null)
);
alter table public.tickets add constraint tickets_barbero_asignado_snapshot_ck check (
  (barbero_asignado_id is null and barbero_asignado_nombre is null)
  or (barbero_asignado_id is not null and barbero_asignado_nombre is not null)
);
create index tickets_barbero_asignado_activo_idx on public.tickets (barbero_asignado_id, estado)
  where barbero_asignado_id is not null
    and estado in ('en_espera', 'notificado', 'llamado', 'en_atencion');

-- Cross-table tenant and capability checks cannot be expressed as simple CHECK
-- constraints. The trigger protects direct owner/service-role writes too.
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
  ) then
    raise exception 'Los snapshots de servicio y barbero solicitado son inmutables';
  end if;

  if new.servicio_id is not null then
    select s.empresa_id into v_empresa from public.servicios as s where s.id = new.servicio_id;
    if v_empresa is null or v_empresa <> new.empresa_id then
      raise exception 'El servicio no pertenece a la empresa del ticket';
    end if;
  end if;

  if new.barbero_solicitado_id is not null then
    select b.empresa_id into v_empresa from public.barberos as b where b.id = new.barbero_solicitado_id;
    if v_empresa is null or v_empresa <> new.empresa_id then
      raise exception 'El barbero solicitado no pertenece a la empresa del ticket';
    end if;
    if new.servicio_id is null or not exists (
      select 1 from public.barbero_servicios as bs
      join public.barbero_operaciones as bo on bo.barbero_id = bs.barbero_id
      where bs.barbero_id = new.barbero_solicitado_id
        and bs.servicio_id = new.servicio_id
        and bo.estado <> 'fuera_de_turno'
    ) then
      raise exception 'El barbero solicitado no está en turno o no es compatible con el servicio';
    end if;
  end if;

  if new.barbero_asignado_id is not null then
    select b.empresa_id into v_empresa from public.barberos as b where b.id = new.barbero_asignado_id;
    if v_empresa is null or v_empresa <> new.empresa_id then
      raise exception 'El barbero asignado no pertenece a la empresa del ticket';
    end if;
    if new.servicio_id is null or not exists (
      select 1 from public.barbero_servicios as bs
      where bs.barbero_id = new.barbero_asignado_id and bs.servicio_id = new.servicio_id
    ) then
      raise exception 'El barbero asignado no es compatible con el servicio';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_tickets_validar_ruta_comercial
  before insert or update of empresa_id, servicio_id, barbero_solicitado_id, barbero_asignado_id
  on public.tickets
  for each row execute function public.validar_ruta_comercial_ticket();

alter table public.servicios enable row level security;
alter table public.barberos enable row level security;
alter table public.barbero_servicios enable row level security;
alter table public.barbero_operaciones enable row level security;

create policy servicios_staff_select on public.servicios for select to authenticated
  using (empresa_id = public.mi_empresa_id() and public.mi_rol() in ('admin', 'personal'));
create policy barberos_staff_select on public.barberos for select to authenticated
  using (empresa_id = public.mi_empresa_id() and public.mi_rol() in ('admin', 'personal'));
create policy barbero_servicios_staff_select on public.barbero_servicios for select to authenticated
  using (exists (
    select 1 from public.barberos as b
    where b.id = barbero_servicios.barbero_id
      and b.empresa_id = public.mi_empresa_id()
      and public.mi_rol() in ('admin', 'personal')
  ));
create policy barbero_operaciones_staff_select on public.barbero_operaciones for select to authenticated
  using (empresa_id = public.mi_empresa_id() and public.mi_rol() in ('admin', 'personal'));

-- Public catalog data contains no customer or staff account identifiers. It is
-- intentionally exposed only through this narrow, read-only RPC.
create or replace function public.catalogo_comercial(p_codigo text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', e.nombre,
    'abierta', e.abierta,
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'servicio_id', s.id,
        'nombre', s.nombre,
        'descripcion', s.descripcion,
        'duracion_estimada_seg', s.duracion_estimada_seg,
        'precio_referencia_centavos', s.precio_referencia_centavos
      ) order by s.nombre)
      from public.servicios as s
      where s.empresa_id = e.id and s.activo
    ), '[]'::jsonb),
    'barberos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'barbero_id', b.id,
        'nombre', b.nombre,
        'estado', bo.estado,
        'servicio_ids', (
          select coalesce(jsonb_agg(bs.servicio_id order by bs.servicio_id), '[]'::jsonb)
          from public.barbero_servicios as bs where bs.barbero_id = b.id
        )
      ) order by b.nombre)
      from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      where b.empresa_id = e.id and b.activo and bo.estado <> 'fuera_de_turno'
    ), '[]'::jsonb)
  )
  from public.empresas as e
  where e.codigo = upper(btrim(p_codigo));
$$;

-- V2 creation contract. A named request only needs an on-shift compatible
-- barber, so a busy barber is valid. Any available barber selects the least
-- loaded compatible on-shift route deterministically: available first, then
-- active assigned workload, name, and id. The selected route is snapshotted as
-- an initial assignment; later worker ownership/reassignment remains deferred.
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
  v_solicitado public.barberos;
  v_ruta public.barberos;
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
    select b.* into v_solicitado from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    where b.id = p_barbero_solicitado_id
      and b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id;
    if not found then raise exception 'El barbero solicitado no está disponible para este servicio'; end if;
  else
    select b.* into v_ruta from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    left join public.tickets as t on t.barbero_asignado_id = b.id
      and t.estado in ('en_espera', 'notificado', 'llamado', 'en_atencion')
    where b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id
    group by b.id, bo.estado
    order by case bo.estado when 'disponible' then 0 else 1 end,
      count(t.id), b.nombre, b.id
    limit 1;
    if not found then raise exception 'No hay barberos en turno para este servicio'; end if;
  end if;

  v_fecha := (now() at time zone v_empresa.zona_horaria)::date;
  select coalesce(max(t.numero), 0) + 1 into v_numero
  from public.tickets as t where t.fila_id = v_fila.id and t.fecha_operativa = v_fecha;
  insert into public.tickets (
    empresa_id, fila_id, cliente_id, origen, prioridad, estado, fecha_operativa,
    numero, codigo_visible, servicio_id, servicio_nombre, servicio_duracion_seg,
    barbero_solicitado_id, barbero_solicitado_nombre, barbero_asignado_id, barbero_asignado_nombre
  ) values (
    v_empresa.id, v_fila.id, v_uid, 'app', 'normal', 'en_espera', v_fecha,
    v_numero, v_fila.prefijo || '-' || lpad(v_numero::text, 3, '0'),
    v_servicio.id, v_servicio.nombre, v_servicio.duracion_estimada_seg,
    v_solicitado.id, v_solicitado.nombre, v_ruta.id, v_ruta.nombre
  ) returning * into v_ticket;
  return v_ticket;
end;
$$;

-- Preserve the legacy response fields and add optional snapshots for V2.
create or replace function public.mi_ticket_estado(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_fila public.filas;
  v_pos integer;
  v_delante integer := 0;
  v_espera integer := 0;
begin
  select * into v_ticket from public.tickets
  where id = p_ticket_id and cliente_id = auth.uid();
  if not found then raise exception 'Ticket no encontrado'; end if;
  select * into v_fila from public.filas where id = v_ticket.fila_id;
  select c.posicion into v_pos from public.cola_ordenada(v_ticket.fila_id) as c where c.ticket_id = p_ticket_id;
  if found then
    v_delante := v_pos - 1;
    if v_delante > 0 then
      v_espera := greatest(1, ceil(v_delante::numeric * v_fila.duracion_promedio_seg / v_fila.puestos_activos / 60)::int);
    end if;
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

grant execute on function public.catalogo_comercial(text) to anon, authenticated;
grant execute on function public.tomar_turno_comercial(text, uuid, uuid) to authenticated;
revoke all on function public.validar_ruta_comercial_ticket() from public, anon, authenticated;
