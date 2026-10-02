-- Worker invitation redemption keeps the existing admin-issued association boundary
-- and creates only the worker records that are safe to derive from that invitation.
create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_inv public.invitaciones;
  v_profile public.perfiles;
  v_name text;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión para aceptar una invitación'; end if;
  select * into v_profile from public.perfiles where id = v_uid for update;
  if not found then raise exception 'Perfil no encontrado'; end if;
  if v_profile.rol <> 'cliente' or v_profile.empresa_id is not null then
    raise exception 'Esta cuenta no puede aceptar una invitación de personal';
  end if;
  select * into v_inv from public.invitaciones
  where token = lower(btrim(p_token)) and aceptada = false and (expira_en is null or expira_en > now())
  for update;
  if not found then raise exception 'Invitación inválida o vencida'; end if;
  if v_email = '' or lower(v_inv.email) <> v_email then
    raise exception 'La invitación no corresponde al correo de esta cuenta';
  end if;
  update public.perfiles set empresa_id = v_inv.empresa_id, rol = v_inv.rol where id = v_uid;
  if v_inv.rol = 'personal' then
    v_name := coalesce(nullif(btrim(v_profile.nombre), ''), nullif(split_part(v_email, '@', 1), ''), 'Personal');
    insert into public.barberos (id, empresa_id, nombre) values (v_uid, v_inv.empresa_id, v_name);
    insert into public.barbero_operaciones (barbero_id, empresa_id, estado)
    values (v_uid, v_inv.empresa_id, 'fuera_de_turno');
  end if;
  update public.invitaciones set aceptada = true where id = v_inv.id;
  return v_inv.empresa_id;
end;
$$;
