-- Admin roster writes: one atomic call updates the name, the operational
-- availability (never 'ocupado': the system owns it), the active flag and the
-- authorized services of a barber in the admin's own shop.
--
-- Guards: leaving availability or deactivating with an active called or
-- in-service ticket is rejected; deactivating revokes the membership (history
-- stays) and parks the chair off shift; reactivating restores both. Grants are
-- explicit (Supabase defaults would also reach anon).

create or replace function public.actualizar_barbero_personal(
  p_barbero_id uuid,
  p_nombre text,
  p_disponibilidad public.estado_operativo_barbero,
  p_activo boolean,
  p_servicios uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_nombre text := btrim(coalesce(p_nombre, ''));
begin
  select empresa_id into v_empresa from public.perfiles where id = auth.uid() and rol = 'admin';
  if v_empresa is null then raise exception 'Solo un administrador puede gestionar personal'; end if;
  if v_nombre = '' then raise exception 'El nombre es obligatorio'; end if;
  if p_disponibilidad = 'ocupado' then raise exception 'El estado ocupado lo actualiza el sistema'; end if;
  if not exists (select 1 from public.barberos where id = p_barbero_id and empresa_id = v_empresa) then
    raise exception 'El barbero no pertenece a esta barbería';
  end if;
  if (not p_activo or p_disponibilidad = 'fuera_de_turno')
    and exists (
      select 1 from public.tickets
      where empresa_id = v_empresa and barbero_asignado_id = p_barbero_id and estado in ('llamado', 'en_atencion')
    ) then
    raise exception 'Ya tienes un turno activo';
  end if;
  if p_servicios is not null and exists (
    select 1 from unnest(p_servicios) as wanted(id)
    where not exists (select 1 from public.servicios as s where s.id = wanted.id and s.empresa_id = v_empresa)
  ) then
    raise exception 'Un servicio no pertenece a esta barbería';
  end if;

  update public.barberos set nombre = v_nombre, activo = p_activo where id = p_barbero_id;

  if not p_activo then
    update public.membresias_personal_empresa
    set activa = false, revocada_en = now()
    where perfil_id = (select perfil_id from public.barberos where id = p_barbero_id) and empresa_id = v_empresa;
    update public.barbero_operaciones set estado = 'fuera_de_turno', actualizado_en = now()
    where barbero_id = p_barbero_id and empresa_id = v_empresa;
  else
    update public.membresias_personal_empresa
    set activa = true, revocada_en = null
    where perfil_id = (select perfil_id from public.barberos where id = p_barbero_id) and empresa_id = v_empresa;
    update public.barbero_operaciones set estado = p_disponibilidad, actualizado_en = now()
    where barbero_id = p_barbero_id and empresa_id = v_empresa;
  end if;

  if p_servicios is not null then
    delete from public.barbero_servicios where barbero_id = p_barbero_id;
    insert into public.barbero_servicios (barbero_id, servicio_id)
    select p_barbero_id, wanted.id from unnest(p_servicios) as wanted(id);
  end if;
end;
$$;

revoke all on function public.actualizar_barbero_personal(uuid, text, public.estado_operativo_barbero, boolean, uuid[]) from public, anon;
grant execute on function public.actualizar_barbero_personal(uuid, text, public.estado_operativo_barbero, boolean, uuid[]) to authenticated;
