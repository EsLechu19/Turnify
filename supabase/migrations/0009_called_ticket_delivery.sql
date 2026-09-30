-- Server-side, at-most-once delivery outbox for customer tickets called by staff.
-- This migration deliberately does not contact a push provider. A separately
-- deployed server function processes rows with server-only environment secrets.

create table public.notificaciones_salientes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  cliente_id uuid not null references public.perfiles(id) on delete cascade,
  tipo text not null check (tipo = 'ticket_llamado'),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'entregada', 'sin_destinatarios', 'indeterminada')),
  creado_en timestamptz not null default now(),
  completado_en timestamptz,
  unique (ticket_id, tipo)
);

create table public.notificacion_entregas (
  id uuid primary key default gen_random_uuid(),
  notificacion_id uuid not null references public.notificaciones_salientes(id) on delete cascade,
  dispositivo_id uuid not null references public.dispositivos(id) on delete cascade,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'enviando', 'entregada', 'indeterminada')),
  intentos integer not null default 0 check (intentos >= 0),
  proveedor_mensaje_id text,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz,
  unique (notificacion_id, dispositivo_id)
);

create index notificacion_entregas_pendientes_idx
  on public.notificacion_entregas (estado, creado_en)
  where estado = 'pendiente';

-- The only enqueue point is a real state transition into llamado for a customer
-- ticket. A retry of delivery processing cannot create another event or recipient.
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
    or old.estado not in ('en_espera', 'notificado')
    or new.cliente_id is null then
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
    where d.usuario_id = new.cliente_id;

    if not found then
      update public.notificaciones_salientes
      set estado = 'sin_destinatarios', completado_en = now()
      where id = v_notificacion_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tickets_entrega_llamado on public.tickets;

create trigger trg_tickets_entrega_llamado
  after update of estado on public.tickets
  for each row execute function public.encolar_entrega_ticket_llamado();

-- Outbox records can reveal delivery timing, so no browser role may read or
-- mutate them. The Edge Function authenticates as service_role instead.
alter table public.notificaciones_salientes enable row level security;
alter table public.notificacion_entregas enable row level security;
revoke all on table public.notificaciones_salientes, public.notificacion_entregas from anon, authenticated;
revoke all on function public.encolar_entrega_ticket_llamado() from public, anon, authenticated;
grant select, insert, update, delete on table public.notificaciones_salientes, public.notificacion_entregas to service_role;
