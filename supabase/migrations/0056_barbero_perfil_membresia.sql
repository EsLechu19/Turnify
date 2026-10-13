-- Migration 0019 made Worker memberships the source of truth for a profile's
-- relationship with a shop. A personal profile may therefore have a NULL
-- perfiles.empresa_id while still being an active member of a barbería.
-- Replace the 0018 trigger checks without changing existing data.
create or replace function public.validar_perfil_barbero()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.perfil_id is null then return new; end if;
  if not exists (
    select 1
    from public.perfiles as p
    join public.membresias_personal_empresa as m
      on m.perfil_id = p.id
     and m.empresa_id = new.empresa_id
     and m.activa
    where p.id = new.perfil_id
      and p.rol = 'personal'
  ) then
    raise exception 'El perfil vinculado debe ser personal con una membresía activa para esta empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_barberos_validar_perfil on public.barberos;
create trigger trg_barberos_validar_perfil
  before insert or update of perfil_id, empresa_id on public.barberos
  for each row execute function public.validar_perfil_barbero();

-- Compatibility with 0019: changing a profile's role or legacy empresa_id is
-- allowed only while every linked barber remains covered by an active
-- membership for that barber's shop. The membership, not perfiles.empresa_id,
-- is the authoritative relationship for personal profiles.
create or replace function public.validar_barbero_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.barberos as b
    where b.perfil_id = new.id
      and (
        new.rol <> 'personal'
        or not exists (
          select 1
          from public.membresias_personal_empresa as m
          where m.perfil_id = new.id
            and m.empresa_id = b.empresa_id
            and m.activa
        )
      )
  ) then
    raise exception 'Un perfil vinculado debe seguir siendo personal con una membresía activa para cada empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_perfiles_validar_barbero on public.perfiles;
create trigger trg_perfiles_validar_barbero
  before update of rol, empresa_id on public.perfiles
  for each row execute function public.validar_barbero_perfil();
