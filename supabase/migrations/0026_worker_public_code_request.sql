-- Permite a un Personal sin membresías solicitar acceso usando el código público de la barbería
-- en lugar del código único efímero, manteniendo la moderación en manos del administrador.

-- Elimina el índice único restrictivo que impedía solicitar múltiples veces a la misma empresa (incluso si son rechazadas).
-- En su lugar, garantizamos que no haya solicitudes 'issued' o 'requested' pendientes y activas simultáneamente por correo en la misma empresa.
drop index if exists public.solicitudes_invitacion_personal_activa_email_idx;
create unique index solicitudes_invitacion_personal_pendientes_idx
  on public.solicitudes_invitacion_personal (empresa_id, email_hash)
  where estado in ('issued', 'requested');

create or replace function public.solicitar_acceso_codigo_publico(p_codigo text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text := public.normalizar_correo_invitacion_personal(auth.jwt() ->> 'email');
  v_empresa_id uuid;
begin
  if auth.uid() is null or v_email = '' or not exists (select 1 from public.perfiles where id = auth.uid() and rol = 'personal') then
    raise exception 'No se pudo enviar la solicitud';
  end if;

  -- 1. Obtener ID de la empresa por su código público
  select id into v_empresa_id from public.empresas where codigo = upper(btrim(p_codigo));
  if not found then
    raise exception 'El código de barbería no existe';
  end if;

  -- 2. Verificar que el personal NO tenga ya una membresía aprobada en esta empresa
  if exists (select 1 from public.membresias_personal_empresa where perfil_id = auth.uid() and empresa_id = v_empresa_id and activa = true) then
    raise exception 'Ya tienes una membresía activa en esta barbería';
  end if;

  -- 3. Crear directamente la solicitud en estado 'requested', bypass 'issued'
  insert into public.solicitudes_invitacion_personal (
    empresa_id,
    email_hash,
    codigo_hash,
    estado,
    expira_en,
    solicitada_en,
    solicitada_por
  ) values (
    v_empresa_id,
    public.hash_invitacion_personal(v_email),
    public.hash_invitacion_personal('PUBLIC_REQUEST'), -- Dummy hash since it wasn't a specific worker code
    'requested',
    now() + interval '7 days',
    now(),
    auth.uid()
  ) on conflict (empresa_id, email_hash) where estado in ('issued', 'requested') do nothing;

  -- The on conflict rule means if they already requested, it does nothing and silently succeeds (idempotent),
  -- which avoids spamming but doesn't crash the UI.
end;
$$;

grant execute on function public.solicitar_acceso_codigo_publico(text) to authenticated;
