-- Guest llamado push: capability-bound devices for account-less tickets.
--
-- The 0009 outbox only serves authenticated customers (cliente_id is not null
-- and recipients join dispositivos by usuario_id). Guest tickets carry no
-- account, so without this migration a called guest can never be pushed and
-- the app's "te avisamos" promise only holds with the app open.
--
-- Design: the Expo token is bound to (ticket, capability-hash), never to an
-- account. The raw capability is verified exactly like every other guest RPC
-- (SHA-256 against acceso_publico_hash) and is never stored. Rows expire one
-- day after creation; the dispatcher purges them on every run.

create table public.dispositivos_invitados (
  id uuid primary key default gen_random_uuid(),
  push_token text not null check (btrim(push_token) <> '' and char_length(push_token) <= 4096),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '1 day',
  unique (push_token, ticket_id)
);

create index dispositivos_invitados_ticket_idx
  on public.dispositivos_invitados (ticket_id, expira_en);

alter table public.dispositivos_invitados enable row level security;

-- Guest tickets have no account, so the outbox owner column must accept them.
alter table public.notificaciones_salientes
  alter column cliente_id drop not null;

-- Deliveries address either an account device or a guest device, never both.
alter table public.notificacion_entregas
  alter column dispositivo_id drop not null;

alter table public.notificacion_entregas
  add column if not exists dispositivo_invitado_id uuid references public.dispositivos_invitados(id) on delete cascade;

alter table public.notificacion_entregas
  add constraint notificacion_entregas_un_destinatario_ck
  check (
    (dispositivo_id is null) <> (dispositivo_invitado_id is null)
  );

create unique index if not exists notificacion_entregas_invitado_uidx
  on public.notificacion_entregas (notificacion_id, dispositivo_invitado_id)
  where dispositivo_invitado_id is not null;

create or replace function public.registrar_dispositivo_invitado(
  p_push_token text,
  p_ticket_id uuid,
  p_capacidad text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := trim(coalesce(p_push_token, ''));
begin
  if v_token = '' or char_length(v_token) > 4096 then
    raise exception 'Token de dispositivo inválido';
  end if;

  if not exists (
    select 1 from public.tickets as t
    where t.id = p_ticket_id
      and t.estado in ('en_espera', 'notificado')
      and t.acceso_publico_hash = extensions.digest(coalesce(p_capacidad, ''), 'sha256')
  ) then
    raise exception 'El turno no admite avisos';
  end if;

  insert into public.dispositivos_invitados (push_token, ticket_id, expira_en)
  values (v_token, p_ticket_id, now() + interval '1 day')
  on conflict (push_token, ticket_id) do update
  set expira_en = now() + interval '1 day';
end;
$$;

create or replace function public.revocar_dispositivo_invitado(
  p_push_token text,
  p_ticket_id uuid,
  p_capacidad text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.dispositivos_invitados as d
  using public.tickets as t
  where d.ticket_id = p_ticket_id
    and d.push_token = trim(coalesce(p_push_token, ''))
    and t.id = p_ticket_id
    and t.acceso_publico_hash = extensions.digest(coalesce(p_capacidad, ''), 'sha256');
end;
$$;

-- Guest enqueue mirrors the 0009 customer trigger without touching it: only a
-- real transition into llamado, only for account-less tickets, only with a
-- live guest device. The shared (ticket_id, tipo) key keeps at-most-once.
create or replace function public.encolar_entrega_ticket_llamado_invitado()
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
    or new.cliente_id is not null then
    return new;
  end if;

  insert into public.notificaciones_salientes (ticket_id, cliente_id, tipo)
  values (new.id, null, 'ticket_llamado')
  on conflict (ticket_id, tipo) do nothing
  returning id into v_notificacion_id;

  if v_notificacion_id is not null then
    insert into public.notificacion_entregas (notificacion_id, dispositivo_id, dispositivo_invitado_id)
    select v_notificacion_id, null, d.id
    from public.dispositivos_invitados as d
    where d.ticket_id = new.id
      and d.expira_en > now();

    if not found then
      update public.notificaciones_salientes
      set estado = 'sin_destinatarios', completado_en = now()
      where id = v_notificacion_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tickets_entrega_llamado_invitado on public.tickets;

create trigger trg_tickets_entrega_llamado_invitado
  after update of estado on public.tickets
  for each row execute function public.encolar_entrega_ticket_llamado_invitado();

-- Direct table access would expose provider tokens. Only the scoped RPCs are
-- available to anonymous and authenticated guest clients.
revoke all on table public.dispositivos_invitados from anon, authenticated;

grant execute on function public.registrar_dispositivo_invitado(text, uuid, text) to anon, authenticated;
grant execute on function public.revocar_dispositivo_invitado(text, uuid, text) to anon, authenticated;
