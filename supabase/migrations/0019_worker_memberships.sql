-- Independent Worker accounts may be approved for more than one shop. The
-- selected shop is server-owned; Worker RPCs never trust a client shop ID.
alter table public.perfiles drop constraint if exists rol_empresa_ck;
alter table public.perfiles add constraint rol_empresa_ck check (rol <> 'admin' or empresa_id is not null);
alter table public.perfiles add column if not exists empresa_personal_actual_id uuid references public.empresas(id) on delete set null;

create table public.membresias_personal_empresa (
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  activa boolean not null default true,
  creada_en timestamptz not null default now(),
  revocada_en timestamptz,
  primary key (perfil_id, empresa_id)
);
alter table public.membresias_personal_empresa enable row level security;

insert into public.membresias_personal_empresa (perfil_id, empresa_id)
select id, empresa_id from public.perfiles where rol = 'personal' and empresa_id is not null
on conflict do nothing;
update public.perfiles set empresa_personal_actual_id = empresa_id
where rol = 'personal' and empresa_personal_actual_id is null;

alter table public.barberos drop constraint if exists barberos_perfil_id_key;
alter table public.barberos add constraint barberos_perfil_empresa_unique unique (perfil_id, empresa_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfiles (id, nombre, telefono, rol)
  values (new.id, nullif(new.raw_user_meta_data ->> 'nombre', ''), nullif(new.raw_user_meta_data ->> 'telefono', ''), case when new.raw_user_meta_data ->> 'worker_intent' = 'true' then 'personal'::public.rol_usuario else 'cliente'::public.rol_usuario end);
  return new;
end; $$;

create or replace function public.mi_empresa_personal_actual_id()
returns uuid language sql security definer set search_path = '' as $$
  select p.empresa_personal_actual_id from public.perfiles p
  join public.membresias_personal_empresa m on m.perfil_id = p.id and m.empresa_id = p.empresa_personal_actual_id and m.activa
  where p.id = auth.uid() and p.rol = 'personal'
$$;

create or replace function public.mi_empresa_id()
returns uuid language sql security definer set search_path = '' as $$
  select case when rol = 'personal' then public.mi_empresa_personal_actual_id() else empresa_id end
  from public.perfiles where id = auth.uid()
$$;

create or replace function public.registrar_como_personal()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.perfiles set rol = 'personal', empresa_id = null where id = auth.uid() and rol = 'cliente';
  if not found then raise exception 'Esta cuenta no puede registrarse como personal'; end if;
end;
$$;

create or replace function public.mis_empresas_personal()
returns table (empresa_id uuid, nombre text, es_actual boolean)
language sql security definer set search_path = '' as $$
  select m.empresa_id, e.nombre, p.empresa_personal_actual_id = m.empresa_id
  from public.membresias_personal_empresa m join public.empresas e on e.id = m.empresa_id join public.perfiles p on p.id = m.perfil_id
  where m.perfil_id = auth.uid() and m.activa order by e.nombre
$$;

create or replace function public.seleccionar_mi_empresa_personal(p_empresa_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.membresias_personal_empresa where perfil_id = auth.uid() and empresa_id = p_empresa_id and activa) then
    raise exception 'No tienes una membresía activa para esta barbería';
  end if;
  update public.perfiles set empresa_personal_actual_id = p_empresa_id where id = auth.uid() and rol = 'personal';
end;
$$;

create or replace function public.agregar_personal_por_correo(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid; v_personal uuid;
begin
  select empresa_id into v_empresa from public.perfiles where id = auth.uid() and rol = 'admin';
  if v_empresa is null then raise exception 'Solo un administrador puede gestionar personal'; end if;
  select p.id into v_personal from auth.users u join public.perfiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email)) and p.rol = 'personal';
  if v_personal is null then raise exception 'No encontramos una cuenta de personal con ese correo'; end if;
  if exists (select 1 from public.membresias_personal_empresa where perfil_id = v_personal and empresa_id = v_empresa and activa) then raise exception 'La cuenta ya pertenece a esta barbería'; end if;
  insert into public.membresias_personal_empresa (perfil_id, empresa_id, activa, revocada_en) values (v_personal, v_empresa, true, null)
  on conflict (perfil_id, empresa_id) do update set activa = true, revocada_en = null;
  insert into public.barberos (empresa_id, nombre, perfil_id)
  select v_empresa, coalesce(nullif(btrim(p.nombre), ''), 'Worker'), v_personal from public.perfiles p where p.id = v_personal
  on conflict (perfil_id, empresa_id) do update set activo = true;
  insert into public.barbero_operaciones (barbero_id, empresa_id, estado)
  select b.id, v_empresa, 'fuera_de_turno' from public.barberos b where b.perfil_id = v_personal and b.empresa_id = v_empresa
  on conflict (barbero_id) do nothing;
  update public.perfiles set empresa_personal_actual_id = coalesce(empresa_personal_actual_id, v_empresa) where id = v_personal;
end;
$$;

create or replace function public.personal_de_mi_empresa()
returns table (perfil_id uuid, nombre text, activa boolean)
language sql security definer set search_path = '' as $$
  select m.perfil_id, p.nombre, m.activa from public.membresias_personal_empresa m join public.perfiles p on p.id = m.perfil_id
  where m.empresa_id = (select empresa_id from public.perfiles where id = auth.uid() and rol = 'admin') order by p.nombre nulls last, m.perfil_id
$$;

grant execute on function public.registrar_como_personal(), public.mis_empresas_personal(), public.seleccionar_mi_empresa_personal(uuid), public.agregar_personal_por_correo(text), public.personal_de_mi_empresa() to authenticated;

-- The worker queue function is redefined against the selected active membership.
create or replace function public.mi_cola_barbero()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero public.barberos; v_operacion public.barbero_operaciones;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select b.* into v_barbero from public.barberos b where b.perfil_id = auth.uid() and b.empresa_id = v_empresa and b.activo;
  if not found then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id = v_barbero.id and empresa_id = v_empresa;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;
  return jsonb_build_object('estado', case when exists (select 1 from public.tickets t where t.empresa_id = v_empresa and t.barbero_asignado_id = v_barbero.id and t.estado in ('llamado','en_atencion')) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end, 'tickets', coalesce((select jsonb_agg(jsonb_build_object('ticket_id',t.id,'fila_id',t.fila_id,'fila_nombre',f.nombre,'codigo_visible',t.codigo_visible,'estado',t.estado,'servicio_nombre',t.servicio_nombre,'barbero_solicitado_nombre',t.barbero_solicitado_nombre,'barbero_asignado_nombre',t.barbero_asignado_nombre) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end,c.posicion,t.numero) from public.tickets t join public.filas f on f.id=t.fila_id left join public.cola_ordenada(t.fila_id) c on c.ticket_id=t.id where t.empresa_id=v_empresa and ((t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) or (t.estado in ('en_espera','notificado') and t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_barbero.id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_barbero.id and bs.servicio_id=t.servicio_id)))), '[]'::jsonb));
end; $$;

create or replace function public.mi_barbero_actual_id()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_id uuid;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select id into v_id from public.barberos where perfil_id = auth.uid() and empresa_id = v_empresa and activo;
  if v_id is null then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  return v_id;
end; $$;

create or replace function public.cambiar_mi_estado_barbero(p_estado public.estado_operativo_barbero)
returns public.barbero_operaciones language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.mi_barbero_actual_id(); v_empresa uuid := public.mi_empresa_personal_actual_id(); v_result public.barbero_operaciones;
begin
  if p_estado = 'ocupado' then raise exception 'El estado ocupado se actualiza al llamar un turno'; end if;
  if exists(select 1 from public.tickets where empresa_id=v_empresa and barbero_asignado_id=v_id and estado in ('llamado','en_atencion')) then raise exception 'Finaliza o marca ausente tu turno activo antes de cambiar disponibilidad'; end if;
  update public.barbero_operaciones set estado=p_estado, actualizado_en=now() where barbero_id=v_id and empresa_id=v_empresa returning * into v_result;
  return v_result;
end; $$;

create or replace function public.llamar_mi_siguiente(p_fila_id uuid)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.mi_barbero_actual_id(); v_empresa uuid := public.mi_empresa_personal_actual_id(); v_ticket public.tickets;
begin
  perform 1 from public.barbero_operaciones where barbero_id=v_id and empresa_id=v_empresa and estado='disponible' for update;
  if not found then raise exception 'No estás disponible para llamar turnos'; end if;
  perform 1 from public.filas where id=p_fila_id and empresa_id=v_empresa for update; if not found then raise exception 'Fila no encontrada'; end if;
  if exists(select 1 from public.tickets where empresa_id=v_empresa and barbero_asignado_id=v_id and estado in ('llamado','en_atencion')) then raise exception 'Ya tienes un turno activo'; end if;
  select t.* into v_ticket from public.cola_ordenada(p_fila_id) c join public.tickets t on t.id=c.ticket_id where t.empresa_id=v_empresa and t.estado in ('en_espera','notificado') and t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_id and bs.servicio_id=t.servicio_id) order by c.posicion limit 1;
  if not found then return null; end if;
  update public.tickets set estado='llamado',llamado_en=now(),atendido_por=auth.uid(),barbero_asignado_id=v_id,barbero_asignado_nombre=(select nombre from public.barberos where id=v_id),actualizado_en=now() where id=v_ticket.id and empresa_id=v_empresa and estado in ('en_espera','notificado') returning * into v_ticket;
  if not found then return null; end if; update public.barbero_operaciones set estado='ocupado',actualizado_en=now() where barbero_id=v_id and empresa_id=v_empresa; return v_ticket;
end; $$;

create or replace function public.iniciar_mi_atencion(p_ticket_id uuid)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.mi_barbero_actual_id(); v_empresa uuid := public.mi_empresa_personal_actual_id(); v_ticket public.tickets;
begin update public.tickets set estado='en_atencion',inicio_en=now(),actualizado_en=now() where id=p_ticket_id and empresa_id=v_empresa and barbero_asignado_id=v_id and atendido_por=auth.uid() and estado='llamado' returning * into v_ticket; if not found then raise exception 'El turno no está llamado o no te fue asignado'; end if; return v_ticket; end; $$;

create or replace function public.finalizar_mi_atencion(p_ticket_id uuid, p_ausente boolean default false)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_id uuid := public.mi_barbero_actual_id(); v_empresa uuid := public.mi_empresa_personal_actual_id(); v_ticket public.tickets;
begin update public.tickets set estado=case when p_ausente then 'ausente'::public.estado_ticket else 'finalizado'::public.estado_ticket end,fin_en=case when p_ausente then fin_en else now() end,cerrado_en=now(),actualizado_en=now() where id=p_ticket_id and empresa_id=v_empresa and barbero_asignado_id=v_id and atendido_por=auth.uid() and estado=case when p_ausente then 'llamado'::public.estado_ticket else 'en_atencion'::public.estado_ticket end returning * into v_ticket; if not found then raise exception 'El turno no está en el estado esperado o no te fue asignado'; end if; update public.barbero_operaciones set estado='disponible',actualizado_en=now() where barbero_id=v_id and empresa_id=v_empresa; return v_ticket; end; $$;
