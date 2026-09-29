-- Turnify live fix: schema-qualify the pgcrypto call.
-- Public RPCs run with an empty search_path, so the unqualified
-- gen_random_bytes() in crear_invitacion could not resolve (it lives in
-- the extensions schema). Found live: 'function gen_random_bytes(integer)
-- does not exist' even with pgcrypto installed. Rule for future RPCs:
-- every non-core function must be schema-qualified under search_path = ''.
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
  values (v_emp, trim(p_email), p_rol, encode(extensions.gen_random_bytes(24), 'hex'), v_uid, now() + interval '7 days')
  returning * into v_inv;
  return v_inv;
end;
$$;
