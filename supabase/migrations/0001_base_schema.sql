-- Turnify MVP base schema (migration 0001).
-- English comments only; database object names stay in Spanish per spec.
-- This migration defines structure, indexes and RLS only.
-- It is NOT applied to any live database here (no credentials, no network).
-- Writes to tickets happen through RPC functions (added in a later task),
-- so tickets expose a SELECT policy only.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- User roles across the platform.
create type rol_usuario as enum ('cliente', 'admin', 'personal');

-- How a ticket entered the queue.
create type origen_ticket as enum ('app', 'presencial');

-- Queue priority lane.
create type prioridad_ticket as enum ('normal', 'preferencial');

-- Ticket lifecycle states. The 7 literals must match src/domain/turn.ts exactly.
create type estado_ticket as enum (
  'en_espera',
  'notificado',
  'llamado',
  'en_atencion',
  'finalizado',
  'cancelado',
  'ausente'
);

-- ---------------------------------------------------------------------------
-- Helper functions (created first: RLS policies below depend on them)
-- ---------------------------------------------------------------------------

-- Returns the role of the current authenticated user.
create or replace function mi_rol()
returns rol_usuario
language sql
security definer
set search_path = ''
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

-- Returns the empresa the current authenticated user belongs to.
create or replace function mi_empresa_id()
returns uuid
language sql
security definer
set search_path = ''
as $$
  select empresa_id from public.perfiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Companies (tenants) that operate queues.
create table empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  codigo text not null unique,
  abierta boolean not null default true,
  aviso_posiciones integer not null default 3 check (aviso_posiciones >= 1),
  minutos_gracia integer not null default 5 check (minutos_gracia >= 1),
  preferencial_cada integer not null default 3 check (preferencial_cada >= 1),
  zona_horaria text not null default 'America/Lima',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- User profiles, one per auth user. Staff must belong to an empresa.
create table perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  rol rol_usuario not null default 'cliente',
  empresa_id uuid references empresas (id) on delete set null,
  nombre text,
  telefono text,
  creado_en timestamptz not null default now(),
  constraint rol_empresa_ck check (rol = 'cliente' or empresa_id is not null)
);

-- Staff invitations issued by an admin for their own empresa.
create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  email text not null,
  rol rol_usuario not null default 'personal',
  token text not null unique,
  creada_por uuid references perfiles (id) on delete set null,
  aceptada boolean not null default false,
  expira_en timestamptz,
  creado_en timestamptz not null default now()
);

-- Push-notification devices owned by a single user.
create table dispositivos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  push_token text not null,
  plataforma text,
  creado_en timestamptz not null default now(),
  unique (usuario_id, push_token)
);

-- Service queues (lines) operated by an empresa.
create table filas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  nombre text not null,
  prefijo varchar(3) not null check (char_length(prefijo) between 1 and 3),
  puestos_activos integer not null default 1 check (puestos_activos >= 1),
  duracion_promedio_seg integer not null default 300,
  en_espera integer not null default 0,
  ultimo_llamado text,
  creado_en timestamptz not null default now(),
  unique (empresa_id, prefijo)
);

-- Queue tickets. One row per customer turn.
create table tickets (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas (id) on delete cascade,
  fila_id uuid not null references filas (id) on delete cascade,
  cliente_id uuid references auth.users (id) on delete set null,
  atendido_por uuid references perfiles (id) on delete set null,
  origen origen_ticket not null default 'app',
  prioridad prioridad_ticket not null default 'normal',
  estado estado_ticket not null default 'en_espera',
  fecha_operativa date not null default current_date,
  numero integer not null,
  codigo_visible text not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  notificado_en timestamptz,
  llamado_en timestamptz,
  inicio_en timestamptz,
  fin_en timestamptz,
  cerrado_en timestamptz,
  unique (fila_id, fecha_operativa, numero)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- One active ticket per customer per empresa (partial unique index).
create unique index un_ticket_activo_por_cliente
  on tickets (cliente_id, empresa_id)
  where cliente_id is not null
    and estado in ('en_espera', 'notificado', 'llamado', 'en_atencion');

-- Queue lookups by line and state.
create index tickets_fila_estado_idx on tickets (fila_id, estado);

-- Daily operation lookups per empresa.
create index tickets_empresa_fecha_idx on tickets (empresa_id, fecha_operativa);

-- Customer history lookups.
create index tickets_cliente_idx on tickets (cliente_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table empresas enable row level security;
alter table perfiles enable row level security;
alter table invitaciones enable row level security;
alter table dispositivos enable row level security;
alter table filas enable row level security;
alter table tickets enable row level security;

-- Users read their own profile; admins also read staff of their own empresa.
create policy perfiles_select on perfiles
  for select to authenticated
  using (
    id = auth.uid()
    or (
      empresa_id = mi_empresa_id()
      and mi_rol() = 'admin'
    )
  );

-- Users update their own profile; column grant below restricts it to nombre/telefono.
create policy perfiles_update on perfiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only nombre and telefono are writable by the profile owner.
revoke update on perfiles from authenticated;
grant update (nombre, telefono) on perfiles to authenticated;

-- Members read their own empresa.
create policy empresas_select on empresas
  for select to authenticated
  using (id = mi_empresa_id());

-- Admins update their own empresa.
create policy empresas_update on empresas
  for update to authenticated
  using (id = mi_empresa_id() and mi_rol() = 'admin')
  with check (id = mi_empresa_id() and mi_rol() = 'admin');

-- Members read the queues of their own empresa.
create policy filas_select on filas
  for select to authenticated
  using (empresa_id = mi_empresa_id());

-- Admins manage the queues of their own empresa.
create policy filas_admin_write on filas
  for all to authenticated
  using (empresa_id = mi_empresa_id() and mi_rol() = 'admin')
  with check (empresa_id = mi_empresa_id() and mi_rol() = 'admin');

-- Ticket reads: the owning customer, or staff of the same empresa.
-- No insert/update/delete policies: ticket writes go through RPC only.
create policy tickets_select on tickets
  for select to authenticated
  using (
    cliente_id = auth.uid()
    or (
      empresa_id = mi_empresa_id()
      and mi_rol() in ('admin', 'personal')
    )
  );

-- Users fully manage only their own devices.
create policy dispositivos_own on dispositivos
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- Admins fully manage invitations of their own empresa.
create policy invitaciones_admin on invitaciones
  for all to authenticated
  using (empresa_id = mi_empresa_id() and mi_rol() = 'admin')
  with check (empresa_id = mi_empresa_id() and mi_rol() = 'admin');

-- ---------------------------------------------------------------------------
-- Profile auto-create on signup
-- ---------------------------------------------------------------------------

-- Creates a profile row for every new auth user,
-- seeding nombre/telefono from the signup metadata.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, telefono)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'nombre', ''),
    nullif(new.raw_user_meta_data ->> 'telefono', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
