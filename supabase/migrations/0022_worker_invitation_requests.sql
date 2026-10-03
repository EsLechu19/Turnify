-- Secure Worker onboarding. Legacy invitations/memberships remain supported.
create type public.estado_solicitud_invitacion_personal as enum ('issued', 'requested', 'approved', 'rejected');

create table public.solicitudes_invitacion_personal (
  id uuid primary key default extensions.gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  email_hash text not null,
  codigo_hash text not null,
  estado public.estado_solicitud_invitacion_personal not null default 'issued',
  expira_en timestamptz not null,
  creada_en timestamptz not null default now(),
  solicitada_en timestamptz,
  solicitada_por uuid references public.perfiles(id) on delete set null,
  resuelta_en timestamptz,
  resuelta_por uuid references public.perfiles(id) on delete set null,
  constraint solicitudes_invitacion_personal_expiry_ck check (expira_en > creada_en),
  constraint solicitudes_invitacion_personal_requested_ck check ((estado = 'issued') = (solicitada_en is null))
);
create unique index solicitudes_invitacion_personal_activa_email_idx
  on public.solicitudes_invitacion_personal (empresa_id, email_hash)
  where estado in ('issued', 'requested');
alter table public.solicitudes_invitacion_personal enable row level security;

create or replace function public.normalizar_correo_invitacion_personal(p_correo text)
returns text language sql immutable set search_path = '' as $$
  select lower(btrim(coalesce(p_correo, '')))
$$;

create or replace function public.hash_invitacion_personal(p_valor text)
returns text language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_valor, 'sha256'), 'hex')
$$;

create or replace function public.generar_codigo_invitacion_personal(p_correo text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid; v_correo text := public.normalizar_correo_invitacion_personal(p_correo); v_codigo text;
begin
  select empresa_id into v_empresa from public.perfiles where id = auth.uid() and rol = 'admin';
  if v_empresa is null or v_correo = '' then raise exception 'No se pudo generar la invitación'; end if;
  v_codigo := encode(extensions.gen_random_bytes(16), 'hex');
  update public.solicitudes_invitacion_personal set estado = 'rejected', resuelta_en = now(), resuelta_por = auth.uid()
    where empresa_id = v_empresa and email_hash = public.hash_invitacion_personal(v_correo) and estado = 'issued';
  insert into public.solicitudes_invitacion_personal (empresa_id, email_hash, codigo_hash, expira_en)
  values (v_empresa, public.hash_invitacion_personal(v_correo), public.hash_invitacion_personal(lower(v_codigo)), now() + interval '7 days');
  return v_codigo;
end; $$;

create or replace function public.solicitar_invitacion_personal(p_codigo text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email text := public.normalizar_correo_invitacion_personal(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or v_email = '' or not exists (select 1 from public.perfiles where id = auth.uid() and rol = 'personal') then
    raise exception 'No se pudo enviar la solicitud';
  end if;
  update public.solicitudes_invitacion_personal set estado = 'requested', solicitada_en = now(), solicitada_por = auth.uid()
    where codigo_hash = public.hash_invitacion_personal(lower(btrim(coalesce(p_codigo, ''))))
      and email_hash = public.hash_invitacion_personal(v_email) and estado = 'issued' and expira_en > now();
  if not found then raise exception 'No se pudo enviar la solicitud'; end if;
end; $$;

create or replace function public.mis_solicitudes_invitacion_personal()
returns table(estado public.estado_solicitud_invitacion_personal, empresa_id uuid, nombre text)
language sql security definer set search_path = '' as $$
  select s.estado, s.empresa_id, e.nombre from public.solicitudes_invitacion_personal s
  join public.empresas e on e.id = s.empresa_id
  where s.solicitada_por = auth.uid() and s.estado = 'requested'
  order by s.solicitada_en desc
$$;

create or replace function public.solicitudes_personal_de_mi_empresa()
returns table(solicitud_id uuid, nombre text, solicitada_en timestamptz)
language sql security definer set search_path = '' as $$
  select s.id, p.nombre, s.solicitada_en from public.solicitudes_invitacion_personal s
  join public.perfiles p on p.id = s.solicitada_por
  where s.empresa_id = (select empresa_id from public.perfiles where id = auth.uid() and rol = 'admin')
    and s.estado = 'requested' order by s.solicitada_en
$$;

create or replace function public.resolver_solicitud_invitacion_personal(p_solicitud_id uuid, p_aprobar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid; v_solicitud public.solicitudes_invitacion_personal; v_nombre text;
begin
  select empresa_id into v_empresa from public.perfiles where id = auth.uid() and rol = 'admin';
  if v_empresa is null then raise exception 'No se pudo resolver la solicitud'; end if;
  select * into v_solicitud from public.solicitudes_invitacion_personal where id = p_solicitud_id and empresa_id = v_empresa for update;
  if not found then raise exception 'No se pudo resolver la solicitud'; end if;
  if v_solicitud.estado <> 'requested' then return; end if;
  update public.solicitudes_invitacion_personal set estado = case when p_aprobar then 'approved'::public.estado_solicitud_invitacion_personal else 'rejected'::public.estado_solicitud_invitacion_personal end, resuelta_en = now(), resuelta_por = auth.uid() where id = v_solicitud.id;
  if not p_aprobar then return; end if;
  insert into public.membresias_personal_empresa (perfil_id, empresa_id, activa, revocada_en) values (v_solicitud.solicitada_por, v_empresa, true, null)
    on conflict (perfil_id, empresa_id) do update set activa = true, revocada_en = null;
  select coalesce(nullif(btrim(nombre), ''), 'Personal') into v_nombre from public.perfiles where id = v_solicitud.solicitada_por;
  insert into public.barberos (empresa_id, nombre, perfil_id) values (v_empresa, v_nombre, v_solicitud.solicitada_por)
    on conflict (perfil_id, empresa_id) do update set activo = true;
  insert into public.barbero_operaciones (barbero_id, empresa_id, estado)
    select id, v_empresa, 'fuera_de_turno' from public.barberos where perfil_id = v_solicitud.solicitada_por and empresa_id = v_empresa
    on conflict (barbero_id) do update set estado = 'fuera_de_turno';
end; $$;

-- Exact-shop active membership is the Worker profile boundary; Admin keeps ownership validation.
create or replace function public.mi_barbero_actual_id()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_id uuid;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select b.id into v_id from public.barberos b join public.membresias_personal_empresa m on m.perfil_id = auth.uid() and m.empresa_id = v_empresa and m.activa
  where b.perfil_id = auth.uid() and b.empresa_id = v_empresa and b.activo;
  if v_id is null then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  return v_id;
end; $$;

revoke all on table public.solicitudes_invitacion_personal from anon, authenticated;
grant execute on function public.generar_codigo_invitacion_personal(text), public.solicitar_invitacion_personal(text), public.mis_solicitudes_invitacion_personal(), public.solicitudes_personal_de_mi_empresa(), public.resolver_solicitud_invitacion_personal(uuid, boolean) to authenticated;
