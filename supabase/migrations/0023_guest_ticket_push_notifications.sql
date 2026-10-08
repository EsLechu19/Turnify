-- Guest ticket push notifications
-- Adapts device token registration and outgoing notification delivery to support anonymous guests.

-- 1. Allow devices to be owned by a guest ticket instead of an auth.user
alter table public.dispositivos alter column usuario_id drop not null;
alter table public.dispositivos add column ticket_id uuid references public.tickets(id) on delete cascade;
alter table public.dispositivos add constraint dispositivos_owner_ck check (
  (usuario_id is not null and ticket_id is null) or
  (usuario_id is null and ticket_id is not null)
);

-- 2. Allow outgoing notifications for guest tickets
alter table public.notificaciones_salientes alter column cliente_id drop not null;

-- 3. Update the enqueue trigger to handle guest tickets
create or replace function public.encolar_entrega_ticket_llamado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_notificacion_id uuid;
begin
  if old.estado is not distinct from new.estado
    or new.estado <> 'llamado'
    or old.estado not in ('en_espera', 'notificado') then
    return new;
  end if;

  insert into public.notificaciones_salientes (ticket_id, cliente_id, tipo)
  values (new.id, new.cliente_id, 'ticket_llamado')
  on conflict (ticket_id, tipo) do nothing
  returning id into v_notificacion_id;

  if v_notificacion_id is not null then
    insert into public.notificacion_entregas (notificacion_id, dispositivo_id)
    select v_notificacion_id, d.id
    from public.dispositivos as d
    where (new.cliente_id is not null and d.usuario_id = new.cliente_id)
       or (new.cliente_id is null and d.ticket_id = new.id);

    if not found then
      update public.notificaciones_salientes
      set estado = 'sin_destinatarios', completado_en = now()
      where id = v_notificacion_id;
    end if;
  end if;

  return new;
end;
$$;

-- 4. Function to register guest device token
create or replace function public.registrar_dispositivo_invitado(
  p_ticket_id uuid,
  p_capacidad text,
  p_push_token text,
  p_plataforma text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.tickets;
  v_token text := trim(p_push_token);
  v_plataforma text := lower(trim(p_plataforma));
begin
  select * into v_ticket from public.tickets
  where id = p_ticket_id
    and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256')
    and estado in ('en_espera', 'notificado', 'llamado', 'en_atencion');

  if not found then
    raise exception 'Ticket no encontrado o ya no está activo';
  end if;

  if v_token is null or v_token = '' or char_length(v_token) > 4096 then
    raise exception 'Token de dispositivo inválido';
  end if;

  if v_plataforma not in ('android', 'ios') then
    raise exception 'Plataforma de dispositivo inválida';
  end if;

  insert into public.dispositivos (ticket_id, push_token, plataforma, actualizado_en)
  values (v_ticket.id, v_token, v_plataforma, now())
  on conflict (push_token) do update
  set ticket_id = excluded.ticket_id,
      usuario_id = null,
      plataforma = excluded.plataforma,
      actualizado_en = now();
end;
$$;

-- 5. Function to revoke guest device token
create or replace function public.revocar_dispositivo_invitado(
  p_ticket_id uuid,
  p_capacidad text,
  p_push_token text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := trim(p_push_token);
begin
  if not exists (
    select 1 from public.tickets
    where id = p_ticket_id
      and acceso_publico_hash = extensions.digest(p_capacidad, 'sha256')
  ) then
    raise exception 'Ticket no encontrado';
  end if;

  if v_token is null or v_token = '' then
    raise exception 'Token de dispositivo inválido';
  end if;

  delete from public.dispositivos
  where ticket_id = p_ticket_id
    and push_token = v_token;

  return found;
end;
$$;

-- 6. Trigger to automatically clean up guest tokens when the ticket becomes terminal
create or replace function public.limpiar_dispositivos_invitado_terminal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado in ('cancelado', 'finalizado', 'ausente') then
    delete from public.dispositivos where ticket_id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_tickets_limpiar_dispositivos_invitado
  after update of estado on public.tickets
  for each row
  when (new.cliente_id is null)
  execute function public.limpiar_dispositivos_invitado_terminal();

grant execute on function public.registrar_dispositivo_invitado(uuid, text, text, text) to anon, authenticated;
grant execute on function public.revocar_dispositivo_invitado(uuid, text, text) to anon, authenticated;
