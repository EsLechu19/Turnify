-- Generating for an existing member or over a pending row must not explode.
-- Two gaps fed the Josue loop: (1) generar only superseded 'issued' rows, so a
-- pending ('requested') row for the same email violated the active unique
-- index and surfaced a generic error; (2) nothing stopped issuing codes to
-- people who already belong. Now generation refuses active members with a
-- clear message and treats any live row as superseded. Same signature.

create or replace function public.generar_codigo_invitacion_personal(p_correo text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid; v_correo text := public.normalizar_correo_invitacion_personal(p_correo); v_codigo text;
begin
  select empresa_id into v_empresa from public.perfiles where id = auth.uid() and rol = 'admin';
  if v_empresa is null or v_correo = '' then raise exception 'No se pudo generar la invitación'; end if;
  if exists (
    select 1 from auth.users as u
    join public.perfiles as p on p.id = u.id
    join public.membresias_personal_empresa as m on m.perfil_id = p.id
    where lower(u.email) = v_correo and m.empresa_id = v_empresa and m.activa
  ) then
    raise exception 'Ya pertenece a esta barbería';
  end if;
  v_codigo := encode(extensions.gen_random_bytes(16), 'hex');
  update public.solicitudes_invitacion_personal set estado = 'rejected', resuelta_en = now(), resuelta_por = auth.uid()
    where empresa_id = v_empresa and email_hash = public.hash_invitacion_personal(v_correo) and estado in ('issued', 'requested');
  insert into public.solicitudes_invitacion_personal (empresa_id, email_hash, codigo_hash, expira_en)
  values (v_empresa, public.hash_invitacion_personal(v_correo), public.hash_invitacion_personal(lower(v_codigo)), now() + interval '7 days');
  return v_codigo;
end; $$;
