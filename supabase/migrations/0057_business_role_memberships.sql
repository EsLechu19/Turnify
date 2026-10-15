-- Additive business-scoped role memberships.
-- Legacy perfiles.rol, perfiles.empresa_id, and worker shop selection remain
-- authoritative for existing flows until a later routing work unit adopts this
-- contract.

do $$
begin
  create type public.rol_membresia_empresa as enum ('ADMIN', 'WORKER');
exception
  when duplicate_object then null;
end;
$$;

create table public.membresias_empresa (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  rol public.rol_membresia_empresa not null,
  activa boolean not null default true,
  creada_en timestamptz not null default now(),
  revocada_en timestamptz,
  primary key (usuario_id, empresa_id, rol),
  constraint membresias_empresa_revocacion_ck check (
    (activa and revocada_en is null) or (not activa and revocada_en is not null)
  )
);

create index membresias_empresa_empresa_rol_activa_idx
  on public.membresias_empresa (empresa_id, rol)
  where activa;

-- Backfill legacy admin ownership without changing the legacy source fields.
insert into public.membresias_empresa (usuario_id, empresa_id, rol)
select p.id, p.empresa_id, 'ADMIN'::public.rol_membresia_empresa
from public.perfiles as p
where p.rol = 'admin' and p.empresa_id is not null
on conflict (usuario_id, empresa_id, rol) do nothing;

-- Preserve the existing worker membership and selected-shop behavior. This is
-- intentionally a projection of active worker memberships, not a replacement.
insert into public.membresias_empresa (usuario_id, empresa_id, rol)
select m.perfil_id, m.empresa_id, 'WORKER'::public.rol_membresia_empresa
from public.membresias_personal_empresa as m
join public.perfiles as p on p.id = m.perfil_id
where p.rol = 'personal' and m.activa
on conflict (usuario_id, empresa_id, rol) do nothing;

-- These helpers derive identity from auth.uid(); callers cannot supply a user
-- ID to obtain another user's admin capability.
create or replace function public.tengo_membresia_empresa(
  p_empresa_id uuid,
  p_rol public.rol_membresia_empresa
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membresias_empresa as m
    where m.usuario_id = auth.uid()
      and m.empresa_id = p_empresa_id
      and m.rol = p_rol
      and m.activa
  );
$$;

create or replace function public.soy_admin_de_empresa(p_empresa_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.tengo_membresia_empresa(p_empresa_id, 'ADMIN'::public.rol_membresia_empresa);
$$;

alter table public.membresias_empresa enable row level security;

-- Members may inspect only their own memberships; admins may inspect the
-- membership roster of their own business. Writes stay behind future RPCs.
create policy membresias_empresa_select on public.membresias_empresa
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.soy_admin_de_empresa(empresa_id)
  );

revoke all on table public.membresias_empresa from anon, authenticated;
grant select on table public.membresias_empresa to authenticated;

revoke all on function public.tengo_membresia_empresa(uuid, public.rol_membresia_empresa) from public, anon;
grant execute on function public.tengo_membresia_empresa(uuid, public.rol_membresia_empresa) to authenticated;
revoke all on function public.soy_admin_de_empresa(uuid) from public, anon;
grant execute on function public.soy_admin_de_empresa(uuid) to authenticated;
