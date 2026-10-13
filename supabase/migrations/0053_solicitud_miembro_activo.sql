-- Invitation requests from existing members never reach the admin panel.
-- Redeeming a code while already holding an active membership created a
-- 'requested' row the admin had to stare at and approve to no effect. Now the
-- redemption refuses with a clear message, and the admin listing hides legacy
-- rows whose requester is already an active member. Same signatures: grants stay.

create or replace function public.solicitar_invitacion_personal(p_codigo text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email text := public.normalizar_correo_invitacion_personal(auth.jwt() ->> 'email'); v_empresa uuid;
begin
  if auth.uid() is null or v_email = '' or not exists (select 1 from public.perfiles where id = auth.uid() and rol = 'personal') then
    raise exception 'No se pudo enviar la solicitud';
  end if;
  select s.empresa_id into v_empresa from public.solicitudes_invitacion_personal as s
  where s.codigo_hash = public.hash_invitacion_personal(lower(btrim(coalesce(p_codigo, ''))))
    and s.email_hash = public.hash_invitacion_personal(v_email) and s.estado = 'issued' and s.expira_en > now();
  if not found then raise exception 'No se pudo enviar la solicitud'; end if;
  if exists (select 1 from public.membresias_personal_empresa as m where m.perfil_id = auth.uid() and m.empresa_id = v_empresa and m.activa) then
    raise exception 'Ya perteneces a esta barbería';
  end if;
  update public.solicitudes_invitacion_personal set estado = 'requested', solicitada_en = now(), solicitada_por = auth.uid()
  where codigo_hash = public.hash_invitacion_personal(lower(btrim(coalesce(p_codigo, ''))))
    and email_hash = public.hash_invitacion_personal(v_email) and estado = 'issued' and expira_en > now();
  if not found then raise exception 'No se pudo enviar la solicitud'; end if;
end; $$;

create or replace function public.solicitudes_personal_de_mi_empresa()
returns table(solicitud_id uuid, nombre text, solicitada_en timestamptz)
language sql security definer set search_path = '' as $$
  select s.id, p.nombre, s.solicitada_en from public.solicitudes_invitacion_personal s
  join public.perfiles p on p.id = s.solicitada_por
  where s.empresa_id = (select empresa_id from public.perfiles where id = auth.uid() and rol = 'admin')
    and s.estado = 'requested'
    and not exists (
      select 1 from public.membresias_personal_empresa as m
      where m.perfil_id = s.solicitada_por and m.empresa_id = s.empresa_id and m.activa
    )
  order by s.solicitada_en
$$;
