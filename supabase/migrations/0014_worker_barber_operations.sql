-- Worker-only barber operations. Legacy staff RPCs stay available to preserve
-- the existing operations screen; these RPCs bind a barber to their own work.

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
  join public.perfiles as p on p.id = b.id
  where b.id = v_uid and b.activo and p.rol = 'personal';
  if not found then raise exception 'No tienes un perfil de barbero activo'; end if;

  select * into v_operacion from public.barbero_operaciones where barbero_id = v_uid;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;

  return jsonb_build_object(
    'estado', case when exists (
      select 1 from public.tickets as activo
      where activo.barbero_asignado_id = v_uid and activo.estado in ('llamado', 'en_atencion')
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
      where (t.barbero_asignado_id = v_uid and t.estado in ('llamado', 'en_atencion'))
        or (
          t.estado in ('en_espera', 'notificado')
          and t.servicio_id is not null
          and (t.barbero_solicitado_id is null or t.barbero_solicitado_id = v_uid)
          and exists (
            select 1 from public.barbero_servicios as bs
            where bs.barbero_id = v_uid and bs.servicio_id = t.servicio_id
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
  v_operacion public.barbero_operaciones;
begin
  if p_estado = 'ocupado' then raise exception 'El estado ocupado se actualiza al llamar un turno'; end if;
  select bo.* into v_operacion
  from public.barbero_operaciones as bo
  join public.barberos as b on b.id = bo.barbero_id and b.activo
  join public.perfiles as p on p.id = b.id and p.rol = 'personal'
  where bo.barbero_id = v_uid for update;
  if not found then raise exception 'No tienes un perfil de barbero activo'; end if;
  if exists (
    select 1 from public.tickets as t
    where t.barbero_asignado_id = v_uid and t.estado in ('llamado', 'en_atencion')
  ) then raise exception 'Finaliza o marca ausente tu turno activo antes de cambiar disponibilidad'; end if;
  update public.barbero_operaciones
  set estado = p_estado, actualizado_en = now()
  where barbero_id = v_uid
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
  v_empresa uuid;
  v_ticket public.tickets;
begin
  perform 1 from public.barbero_operaciones as bo
  join public.barberos as b on b.id = bo.barbero_id and b.activo
  join public.perfiles as p on p.id = b.id and p.rol = 'personal'
  where bo.barbero_id = v_uid and bo.estado = 'disponible' for update;
  if not found then raise exception 'No estás disponible para llamar turnos'; end if;
  select empresa_id into v_empresa from public.barberos where id = v_uid;
  perform 1 from public.filas as f where f.id = p_fila_id and f.empresa_id = v_empresa for update;
  if not found then raise exception 'Fila no encontrada'; end if;
  if exists (
    select 1 from public.tickets as activo
    where activo.barbero_asignado_id = v_uid and activo.estado in ('llamado', 'en_atencion')
  ) then raise exception 'Ya tienes un turno activo'; end if;

  select t.* into v_ticket
  from public.cola_ordenada(p_fila_id) as c
  join public.tickets as t on t.id = c.ticket_id
  where t.estado in ('en_espera', 'notificado')
    and t.servicio_id is not null
    and (t.barbero_solicitado_id is null or t.barbero_solicitado_id = v_uid)
    and exists (
      select 1 from public.barbero_servicios as bs
      where bs.barbero_id = v_uid and bs.servicio_id = t.servicio_id
    )
  order by c.posicion
  limit 1;
  if not found then return null; end if;

  update public.tickets
  set estado = 'llamado', llamado_en = now(), atendido_por = v_uid,
      barbero_asignado_id = v_uid, barbero_asignado_nombre = (
        select nombre from public.barberos where id = v_uid
      ), actualizado_en = now()
  where id = v_ticket.id and estado in ('en_espera', 'notificado')
  returning * into v_ticket;
  if not found then return null; end if;
  update public.barbero_operaciones set estado = 'ocupado', actualizado_en = now() where barbero_id = v_uid;
  return v_ticket;
end;
$$;

create or replace function public.iniciar_mi_atencion(p_ticket_id uuid)
returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare v_ticket public.tickets;
begin
  update public.tickets set estado = 'en_atencion', inicio_en = now(), actualizado_en = now()
  where id = p_ticket_id and barbero_asignado_id = auth.uid() and atendido_por = auth.uid() and estado = 'llamado'
  returning * into v_ticket;
  if not found then raise exception 'El turno no está llamado o no te fue asignado'; end if;
  return v_ticket;
end;
$$;

create or replace function public.finalizar_mi_atencion(p_ticket_id uuid, p_ausente boolean default false)
returns public.tickets
language plpgsql security definer set search_path = ''
as $$
declare v_ticket public.tickets;
begin
  update public.tickets
  set estado = case when p_ausente then 'ausente'::public.estado_ticket else 'finalizado'::public.estado_ticket end,
      fin_en = case when p_ausente then fin_en else now() end,
      cerrado_en = now(), actualizado_en = now()
  where id = p_ticket_id and barbero_asignado_id = auth.uid() and atendido_por = auth.uid()
    and estado = case when p_ausente then 'llamado'::public.estado_ticket else 'en_atencion'::public.estado_ticket end
  returning * into v_ticket;
  if not found then raise exception 'El turno no está en el estado esperado o no te fue asignado'; end if;
  update public.barbero_operaciones set estado = 'disponible', actualizado_en = now() where barbero_id = auth.uid();
  return v_ticket;
end;
$$;

grant execute on function public.mi_cola_barbero() to authenticated;
grant execute on function public.cambiar_mi_estado_barbero(public.estado_operativo_barbero) to authenticated;
grant execute on function public.llamar_mi_siguiente(uuid) to authenticated;
grant execute on function public.iniciar_mi_atencion(uuid) to authenticated;
grant execute on function public.finalizar_mi_atencion(uuid, boolean) to authenticated;
