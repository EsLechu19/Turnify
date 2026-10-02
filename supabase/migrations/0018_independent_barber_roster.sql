-- Operational roster records have their own identity. A linked Worker profile is
-- optional and only grants that account ownership of the roster barber's work.
alter table public.barberos
  add column perfil_id uuid unique references public.perfiles(id) on delete set null;

-- Historic roster IDs were profile IDs. Preserve those associations before
-- removing the historic foreign key so existing Worker operations keep working.
update public.barberos as b
set perfil_id = p.id
from public.perfiles as p
where b.id = p.id;

alter table public.barberos drop constraint barberos_id_fkey;
alter table public.barberos alter column id set default gen_random_uuid();

-- A linked profile is a Worker account for this exact business. Validate both
-- sides so direct privileged writes cannot create or retain an invalid link.
create or replace function public.validar_perfil_barbero()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles;
begin
  if new.perfil_id is null then return new; end if;
  select * into v_perfil from public.perfiles where id = new.perfil_id;
  if not found or v_perfil.rol <> 'personal' or v_perfil.empresa_id <> new.empresa_id then
    raise exception 'El perfil vinculado debe ser personal de la misma empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_barberos_validar_perfil on public.barberos;
create trigger trg_barberos_validar_perfil
  before insert or update of perfil_id, empresa_id on public.barberos
  for each row execute function public.validar_perfil_barbero();

create or replace function public.validar_barbero_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.barberos as b
    where b.perfil_id = new.id
      and (new.rol <> 'personal' or new.empresa_id <> b.empresa_id)
  ) then
    raise exception 'Un perfil vinculado debe seguir siendo personal de la misma empresa';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_perfiles_validar_barbero on public.perfiles;
create trigger trg_perfiles_validar_barbero
  before update of rol, empresa_id on public.perfiles
  for each row execute function public.validar_barbero_perfil();

-- Invitation redemption creates a roster barber with a generated roster ID and
-- links the invited Worker profile. Service capabilities remain administrator
-- configuration, exactly as before.
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
  v_barbero_id uuid;
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
    insert into public.barberos (empresa_id, nombre, perfil_id)
    values (v_inv.empresa_id, v_name, v_uid)
    returning id into v_barbero_id;
    insert into public.barbero_operaciones (barbero_id, empresa_id, estado)
    values (v_barbero_id, v_inv.empresa_id, 'fuera_de_turno');
  end if;
  update public.invitaciones set aceptada = true where id = v_inv.id;
  return v_inv.empresa_id;
end;
$$;

-- Worker-only operations resolve their roster barber from the optional profile
-- link. Ticket atendido_por remains the authenticated profile ID.
create or replace function public.mi_cola_barbero()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_barbero public.barberos;
  v_operacion public.barbero_operaciones;
begin
  select b.* into v_barbero
  from public.barberos as b
  join public.perfiles as p on p.id = b.perfil_id
  where b.perfil_id = v_uid and b.activo and p.rol = 'personal' and p.empresa_id = b.empresa_id;
  if not found then raise exception 'No tienes un perfil de barbero activo'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id = v_barbero.id;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;

  return jsonb_build_object(
    'estado', case when exists (
      select 1 from public.tickets as activo
      where activo.barbero_asignado_id = v_barbero.id and activo.estado in ('llamado', 'en_atencion')
    ) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end,
    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ticket_id', t.id, 'fila_id', t.fila_id, 'fila_nombre', f.nombre,
        'codigo_visible', t.codigo_visible, 'estado', t.estado,
        'servicio_nombre', t.servicio_nombre,
        'barbero_solicitado_nombre', t.barbero_solicitado_nombre,
        'barbero_asignado_nombre', t.barbero_asignado_nombre
      ) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end, c.posicion, t.numero)
      from public.tickets as t
      join public.filas as f on f.id = t.fila_id
      left join public.cola_ordenada(t.fila_id) as c on c.ticket_id = t.id
      where (t.barbero_asignado_id = v_barbero.id and t.estado in ('llamado', 'en_atencion'))
        or (
          t.estado in ('en_espera', 'notificado') and t.servicio_id is not null
          and (t.barbero_solicitado_id is null or t.barbero_solicitado_id = v_barbero.id)
          and exists (
            select 1 from public.barbero_servicios as bs
            where bs.barbero_id = v_barbero.id and bs.servicio_id = t.servicio_id
          )
        )
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.cambiar_mi_estado_barbero(p_estado public.estado_operativo_barbero)
returns public.barbero_operaciones
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_barbero_id uuid;
  v_operacion public.barbero_operaciones;
begin
  if p_estado = 'ocupado' then raise exception 'El estado ocupado se actualiza al llamar un turno'; end if;
  select b.id into v_barbero_id
  from public.barbero_operaciones as bo
  join public.barberos as b on b.id = bo.barbero_id and b.activo
  join public.perfiles as p on p.id = b.perfil_id and p.rol = 'personal' and p.empresa_id = b.empresa_id
  where b.perfil_id = v_uid for update of bo;
  if not found then raise exception 'No tienes un perfil de barbero activo'; end if;
  if exists (
    select 1 from public.tickets as t
    where t.barbero_asignado_id = v_barbero_id and t.estado in ('llamado', 'en_atencion')
  ) then raise exception 'Finaliza o marca ausente tu turno activo antes de cambiar disponibilidad'; end if;
  update public.barbero_operaciones
  set estado = p_estado, actualizado_en = now()
  where barbero_id = v_barbero_id
  returning * into v_operacion;
  return v_operacion;
end;
$$;

create or replace function public.llamar_mi_siguiente(p_fila_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_barbero_id uuid;
  v_empresa uuid;
  v_ticket public.tickets;
begin
  select b.id, b.empresa_id into v_barbero_id, v_empresa
  from public.barbero_operaciones as bo
  join public.barberos as b on b.id = bo.barbero_id and b.activo
  join public.perfiles as p on p.id = b.perfil_id and p.rol = 'personal' and p.empresa_id = b.empresa_id
  where b.perfil_id = v_uid and bo.estado = 'disponible' for update of bo;
  if not found then raise exception 'No estás disponible para llamar turnos'; end if;
  perform 1 from public.filas as f where f.id = p_fila_id and f.empresa_id = v_empresa for update;
  if not found then raise exception 'Fila no encontrada'; end if;
  if exists (
    select 1 from public.tickets as activo
    where activo.barbero_asignado_id = v_barbero_id and activo.estado in ('llamado', 'en_atencion')
  ) then raise exception 'Ya tienes un turno activo'; end if;
  select t.* into v_ticket
  from public.cola_ordenada(p_fila_id) as c
  join public.tickets as t on t.id = c.ticket_id
  where t.estado in ('en_espera', 'notificado') and t.servicio_id is not null
    and (t.barbero_solicitado_id is null or t.barbero_solicitado_id = v_barbero_id)
    and exists (
      select 1 from public.barbero_servicios as bs
      where bs.barbero_id = v_barbero_id and bs.servicio_id = t.servicio_id
    )
  order by c.posicion
  limit 1;
  if not found then return null; end if;
  update public.tickets
  set estado = 'llamado', llamado_en = now(), atendido_por = v_uid,
      barbero_asignado_id = v_barbero_id, barbero_asignado_nombre = (
        select nombre from public.barberos where id = v_barbero_id
      ), actualizado_en = now()
  where id = v_ticket.id and estado in ('en_espera', 'notificado')
  returning * into v_ticket;
  if not found then return null; end if;
  update public.barbero_operaciones set estado = 'ocupado', actualizado_en = now() where barbero_id = v_barbero_id;
  return v_ticket;
end;
$$;

create or replace function public.iniciar_mi_atencion(p_ticket_id uuid)
returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare
  v_barbero_id uuid;
  v_ticket public.tickets;
begin
  select b.id into v_barbero_id from public.barberos as b
  join public.perfiles as p on p.id = b.perfil_id and p.rol = 'personal' and p.empresa_id = b.empresa_id
  where b.perfil_id = auth.uid() and b.activo;
  update public.tickets set estado = 'en_atencion', inicio_en = now(), actualizado_en = now()
  where id = p_ticket_id and barbero_asignado_id = v_barbero_id and atendido_por = auth.uid() and estado = 'llamado'
  returning * into v_ticket;
  if not found then raise exception 'El turno no está llamado o no te fue asignado'; end if;
  return v_ticket;
end;
$$;

create or replace function public.finalizar_mi_atencion(p_ticket_id uuid, p_ausente boolean default false)
returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare
  v_barbero_id uuid;
  v_ticket public.tickets;
begin
  select b.id into v_barbero_id from public.barberos as b
  join public.perfiles as p on p.id = b.perfil_id and p.rol = 'personal' and p.empresa_id = b.empresa_id
  where b.perfil_id = auth.uid() and b.activo;
  update public.tickets
  set estado = case when p_ausente then 'ausente'::public.estado_ticket else 'finalizado'::public.estado_ticket end,
      fin_en = case when p_ausente then fin_en else now() end,
      cerrado_en = now(), actualizado_en = now()
  where id = p_ticket_id and barbero_asignado_id = v_barbero_id and atendido_por = auth.uid()
    and estado = case when p_ausente then 'llamado'::public.estado_ticket else 'en_atencion'::public.estado_ticket end
  returning * into v_ticket;
  if not found then raise exception 'El turno no está en el estado esperado o no te fue asignado'; end if;
  update public.barbero_operaciones set estado = 'disponible', actualizado_en = now() where barbero_id = v_barbero_id;
  return v_ticket;
end;
$$;

-- Reassignment moves lifecycle ownership to a linked Worker only. Unlinked
-- roster barbers remain public/catalog and dispatch candidates, never workers.
create or replace function public.barberos_reasignables(p_ticket_id uuid)
returns table (barbero_id uuid, nombre text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_rol public.rol_usuario;
  v_barbero_id uuid;
  v_ticket public.tickets;
begin
  select p.empresa_id, p.rol into v_empresa, v_rol from public.perfiles as p where p.id = v_uid;
  if v_empresa is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo personal autorizado puede reasignar turnos';
  end if;
  if v_rol = 'personal' then
    select b.id into v_barbero_id from public.barberos as b
    where b.perfil_id = v_uid and b.empresa_id = v_empresa and b.activo;
    if not found then raise exception 'No tienes un perfil de barbero activo'; end if;
  end if;
  select * into v_ticket from public.tickets
  where id = p_ticket_id and empresa_id = v_empresa and estado = 'llamado';
  if not found then raise exception 'El turno no está llamado o ya inició su atención'; end if;
  if v_rol = 'personal' and (v_ticket.barbero_asignado_id <> v_barbero_id or v_ticket.atendido_por <> v_uid) then
    raise exception 'El turno no te fue asignado';
  end if;
  return query
  select b.id, b.nombre
  from public.barberos as b
  join public.barbero_operaciones as bo on bo.barbero_id = b.id
  join public.barbero_servicios as bs on bs.barbero_id = b.id
  where b.empresa_id = v_empresa and b.activo and b.perfil_id is not null and b.id <> v_ticket.barbero_asignado_id
    and bo.estado = 'disponible' and bs.servicio_id = v_ticket.servicio_id
    and not exists (
      select 1 from public.tickets as activo
      where activo.barbero_asignado_id = b.id and activo.estado in ('llamado', 'en_atencion')
    )
  order by b.nombre, b.id;
end;
$$;

create or replace function public.reasignar_turno_llamado(p_ticket_id uuid, p_barbero_destino_id uuid)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_rol public.rol_usuario;
  v_barbero_id uuid;
  v_ticket public.tickets;
  v_destino public.barberos;
  v_origen_id uuid;
begin
  select p.empresa_id, p.rol into v_empresa, v_rol from public.perfiles as p where p.id = v_uid;
  if v_empresa is null or v_rol not in ('admin', 'personal') then
    raise exception 'Solo personal autorizado puede reasignar turnos';
  end if;
  if v_rol = 'personal' then
    select b.id into v_barbero_id from public.barberos as b
    where b.perfil_id = v_uid and b.empresa_id = v_empresa and b.activo;
    if not found then raise exception 'No tienes un perfil de barbero activo'; end if;
  end if;
  select * into v_ticket from public.tickets where id = p_ticket_id and empresa_id = v_empresa for update;
  if not found then raise exception 'Turno no encontrado'; end if;
  if v_ticket.estado <> 'llamado' then raise exception 'El turno no está llamado o ya inició su atención'; end if;
  if v_rol = 'personal' and (v_ticket.barbero_asignado_id <> v_barbero_id or v_ticket.atendido_por <> v_uid) then
    raise exception 'El turno no te fue asignado';
  end if;
  if p_barbero_destino_id = v_ticket.barbero_asignado_id then
    raise exception 'El turno ya está asignado a ese barbero';
  end if;
  v_origen_id := v_ticket.barbero_asignado_id;
  select b.* into v_destino
  from public.barberos as b
  join public.barbero_operaciones as bo on bo.barbero_id = b.id
  join public.barbero_servicios as bs on bs.barbero_id = b.id
  where b.id = p_barbero_destino_id and b.empresa_id = v_empresa and b.activo and b.perfil_id is not null
    and bo.estado = 'disponible' and bs.servicio_id = v_ticket.servicio_id
    and not exists (
      select 1 from public.tickets as activo
      where activo.barbero_asignado_id = b.id and activo.estado in ('llamado', 'en_atencion')
    )
  for update of bo;
  if not found then raise exception 'El barbero destino no está en turno, no es compatible, no tiene personal vinculado o ya tiene un turno activo'; end if;
  update public.tickets
  set barbero_asignado_id = v_destino.id, barbero_asignado_nombre = v_destino.nombre,
      atendido_por = v_destino.perfil_id, actualizado_en = now()
  where id = v_ticket.id and estado = 'llamado'
  returning * into v_ticket;
  if not found then raise exception 'El turno cambió antes de poder reasignarlo'; end if;
  update public.barbero_operaciones set estado = 'ocupado', actualizado_en = now() where barbero_id = v_destino.id;
  update public.barbero_operaciones set estado = 'disponible', actualizado_en = now() where barbero_id = v_origen_id;
  return v_ticket;
end;
$$;
