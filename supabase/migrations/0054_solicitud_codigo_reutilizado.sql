-- Redeemed codes also answer membership. 0053 only guarded fresh ('issued')
-- rows, so a member re-entering an already-used code fell through to the
-- generic error instead of 'Ya perteneces'. Now any code row belonging to the
-- caller (issued, or requested by themselves) resolves its shop first, and
-- active members get the clear message. Same signature: grants stay.

create or replace function public.solicitar_invitacion_personal(p_codigo text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_email text := public.normalizar_correo_invitacion_personal(auth.jwt() ->> 'email'); v_empresa uuid; v_estado public.estado_solicitud_invitacion_personal;
begin
  if auth.uid() is null or v_email = '' or not exists (select 1 from public.perfiles where id = auth.uid() and rol = 'personal') then
    raise exception 'No se pudo enviar la solicitud';
  end if;
  select s.empresa_id, s.estado into v_empresa, v_estado from public.solicitudes_invitacion_personal as s
  where s.codigo_hash = public.hash_invitacion_personal(lower(btrim(coalesce(p_codigo, ''))))
    and s.email_hash = public.hash_invitacion_personal(v_email) and s.expira_en > now()
    and (s.estado = 'issued' or (s.estado = 'requested' and s.solicitada_por = auth.uid()));
  if not found then raise exception 'No se pudo enviar la solicitud'; end if;
  if exists (select 1 from public.membresias_personal_empresa as m where m.perfil_id = auth.uid() and m.empresa_id = v_empresa and m.activa) then
    raise exception 'Ya perteneces a esta barbería';
  end if;
  if v_estado <> 'issued' then raise exception 'No se pudo enviar la solicitud'; end if;
  update public.solicitudes_invitacion_personal set estado = 'requested', solicitada_en = now(), solicitada_por = auth.uid()
  where codigo_hash = public.hash_invitacion_personal(lower(btrim(coalesce(p_codigo, ''))))
    and email_hash = public.hash_invitacion_personal(v_email) and estado = 'issued' and expira_en > now();
  if not found then raise exception 'No se pudo enviar la solicitud'; end if;
end; $$;
