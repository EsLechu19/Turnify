-- Durable admin onboarding after Supabase email confirmation.
-- The authenticated user is the only source of identity; the business name is
-- read from auth.users metadata written during signup.

create or replace function public.completar_onboarding_empresa()
returns public.empresas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_perfil public.perfiles;
  v_empresa public.empresas;
  v_nombre text;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para completar el registro';
  end if;

  -- Serialise repeated tabs, retries, and concurrent post-confirmation logins
  -- for this user before checking or creating the business.
  select * into v_perfil
  from public.perfiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if v_perfil.empresa_id is not null then
    select * into v_empresa
    from public.empresas
    where id = v_perfil.empresa_id;

    insert into public.membresias_empresa (usuario_id, empresa_id, rol, activa, revocada_en)
    values (v_uid, v_empresa.id, 'ADMIN'::public.rol_membresia_empresa, true, null)
    on conflict (usuario_id, empresa_id, rol) do update
      set activa = true, revocada_en = null;

    return v_empresa;
  end if;

  select nullif(
    regexp_replace(trim(u.raw_user_meta_data ->> 'empresa_nombre'), '\s+', ' ', 'g'),
    ''
  ) into v_nombre
  from auth.users as u
  where u.id = v_uid;

  -- Users created before this flow, including existing staff, remain usable.
  -- A profile without onboarding metadata simply has nothing to complete.
  if v_nombre is null then
    return null;
  end if;

  if char_length(v_nombre) > 120 or v_nombre ~ '[[:cntrl:]]' then
    raise exception 'El nombre de la empresa no es válido';
  end if;

  -- Keep the established code/default-queue/profile semantics in one place.
  select * into v_empresa
  from public.crear_empresa(v_nombre);

  insert into public.membresias_empresa (usuario_id, empresa_id, rol)
  values (v_uid, v_empresa.id, 'ADMIN'::public.rol_membresia_empresa)
  on conflict (usuario_id, empresa_id, rol) do update
    set activa = true, revocada_en = null;

  return v_empresa;
end;
$$;

revoke all on function public.completar_onboarding_empresa() from public, anon;
grant execute on function public.completar_onboarding_empresa() to authenticated;
