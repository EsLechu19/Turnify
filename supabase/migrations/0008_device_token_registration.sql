-- Authenticated device-token registration for customer push notifications.
-- Tokens are write-only from mobile clients: registration and revocation use
-- SECURITY DEFINER functions that derive ownership from auth.uid().

alter table public.dispositivos
  add column if not exists actualizado_en timestamptz not null default now();

-- A provider token identifies one installed app. Retain only the most recently
-- refreshed owner before enforcing global uniqueness for databases created by
-- earlier migrations that allowed duplicate tokens across users.
with ranked as (
  select id,
    row_number() over (
      partition by push_token
      order by actualizado_en desc, creado_en desc, id desc
    ) as position
  from public.dispositivos
)
delete from public.dispositivos as d
using ranked
where d.id = ranked.id
  and ranked.position > 1;

create unique index if not exists dispositivos_push_token_uidx
  on public.dispositivos (push_token);

alter table public.dispositivos
  drop constraint if exists dispositivos_plataforma_ck;

alter table public.dispositivos
  add constraint dispositivos_plataforma_ck
  check (plataforma is null or plataforma in ('android', 'ios'));

-- Registers or refreshes the caller's current device. A token that was bound
-- to a prior account on this installation is safely reassigned, never copied.
create or replace function public.registrar_dispositivo(
  p_push_token text,
  p_plataforma text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := trim(p_push_token);
  v_plataforma text := lower(trim(p_plataforma));
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para registrar este dispositivo';
  end if;

  if not exists (
    select 1
    from public.perfiles as p
    where p.id = v_uid and p.rol = 'cliente'
  ) then
    raise exception 'Solo los clientes pueden registrar dispositivos';
  end if;

  if v_token is null or v_token = '' or char_length(v_token) > 4096 then
    raise exception 'Token de dispositivo inválido';
  end if;

  if v_plataforma not in ('android', 'ios') then
    raise exception 'Plataforma de dispositivo inválida';
  end if;

  insert into public.dispositivos (usuario_id, push_token, plataforma, actualizado_en)
  values (v_uid, v_token, v_plataforma, now())
  on conflict (push_token) do update
  set usuario_id = excluded.usuario_id,
      plataforma = excluded.plataforma,
      actualizado_en = now();
end;
$$;

-- Removes only a token owned by the authenticated customer. The boolean does
-- not reveal whether another account has registered the supplied token.
create or replace function public.revocar_dispositivo(p_push_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_token text := trim(p_push_token);
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para revocar este dispositivo';
  end if;

  if not exists (
    select 1
    from public.perfiles as p
    where p.id = v_uid and p.rol = 'cliente'
  ) then
    raise exception 'Solo los clientes pueden revocar dispositivos';
  end if;

  if v_token is null or v_token = '' then
    raise exception 'Token de dispositivo inválido';
  end if;

  delete from public.dispositivos
  where usuario_id = v_uid
    and push_token = v_token;

  return found;
end;
$$;

-- Direct table access is unnecessary for the mobile client and would expose
-- provider tokens. RLS remains enabled with its owner policy as defence in
-- depth; only the scoped RPCs below are available to authenticated clients.
revoke all on table public.dispositivos from anon, authenticated;

grant execute on function public.registrar_dispositivo(text, text) to authenticated;
grant execute on function public.revocar_dispositivo(text) to authenticated;
