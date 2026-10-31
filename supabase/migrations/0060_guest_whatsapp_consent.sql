-- Guest WhatsApp details are collected only with explicit consent. The phone is
-- normalized before storage and is projected only through the authenticated
-- barber queue below; guest capability RPCs never return it.

alter table public.tickets add column if not exists telefono_invitado text;
alter table public.tickets add column if not exists consentimiento_whatsapp boolean not null default false;

alter table public.tickets add constraint tickets_whatsapp_consent_ck check (
  (consentimiento_whatsapp
    and telefono_invitado is not null
    and telefono_invitado = regexp_replace(telefono_invitado, '[[:space:]().-]', '', 'g')
    and telefono_invitado ~ '^\+[1-9][0-9]{7,14}$')
  or
  (not consentimiento_whatsapp and telefono_invitado is null)
);

-- PostgreSQL cannot replace a function when its argument list changes. Drop the
-- old six-argument overload first so callers cannot resolve an ambiguous RPC.
drop function if exists public.crear_ticket_invitado(text, uuid, text, public.rango_edad_invitado, public.genero_invitado, uuid);

create or replace function public.crear_ticket_invitado(
  p_codigo text,
  p_servicio_id uuid,
  p_nombre text,
  p_rango_edad public.rango_edad_invitado default null,
  p_genero public.genero_invitado default null,
  p_barbero_solicitado_id uuid default null,
  p_telefono text default null,
  p_consentimiento_whatsapp boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa public.empresas;
  v_servicio public.servicios;
  v_fila public.filas;
  v_estimado public.barberos;
  v_fecha date;
  v_numero integer;
  v_ticket public.tickets;
  v_telefono text;
  v_consentimiento boolean := coalesce(p_consentimiento_whatsapp, false);
  v_capacidad text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if p_nombre is null or char_length(btrim(p_nombre)) not between 1 and 80 then
    raise exception 'El nombre del invitado es obligatorio y debe tener hasta 80 caracteres';
  end if;

  if v_consentimiento then
    v_telefono := regexp_replace(coalesce(p_telefono, ''), '[[:space:]().-]', '', 'g');
    if v_telefono !~ '^\+[1-9][0-9]{7,14}$' then
      raise exception 'El teléfono debe ser internacional y tener entre 8 y 15 dígitos';
    end if;
  else
    v_telefono := null;
  end if;

  select * into v_empresa from public.empresas where codigo = upper(btrim(p_codigo));
  if not found then raise exception 'Empresa no encontrada'; end if;
  if not v_empresa.abierta then raise exception 'La empresa está cerrada'; end if;

  select * into v_servicio from public.servicios
  where id = p_servicio_id and empresa_id = v_empresa.id and activo;
  if not found then raise exception 'Servicio no disponible'; end if;

  select * into v_fila from public.filas
  where empresa_id = v_empresa.id order by creado_en limit 1 for update;
  if not found then raise exception 'Fila no encontrada'; end if;

  if p_barbero_solicitado_id is not null then
    select b.* into v_estimado from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    where b.id = p_barbero_solicitado_id and b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id;
    if not found then raise exception 'El barbero solicitado no está disponible para este servicio'; end if;
  else
    select b.* into v_estimado from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    left join public.tickets as t on t.barbero_estimado_id = b.id
      and t.estado in ('en_espera', 'notificado', 'llamado', 'en_atencion')
    where b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id
    group by b.id, bo.estado
    order by coalesce(sum(t.servicio_duracion_seg), 0),
      case bo.estado when 'disponible' then 0 else 1 end, b.nombre, b.id
    limit 1;
    if not found then raise exception 'No hay barberos en turno para este servicio'; end if;
  end if;

  v_fecha := (now() at time zone v_empresa.zona_horaria)::date;
  select coalesce(max(t.numero), 0) + 1 into v_numero
  from public.tickets as t where t.fila_id = v_fila.id and t.fecha_operativa = v_fecha;

  insert into public.tickets (
    empresa_id, fila_id, cliente_id, origen, prioridad, estado, fecha_operativa,
    numero, codigo_visible, servicio_id, servicio_nombre, servicio_duracion_seg,
    barbero_solicitado_id, barbero_solicitado_nombre,
    barbero_estimado_id, barbero_estimado_nombre,
    nombre_invitado, rango_edad_invitado, genero_invitado, acceso_publico_hash,
    telefono_invitado, consentimiento_whatsapp
  ) values (
    v_empresa.id, v_fila.id, null, 'app', 'normal', 'en_espera', v_fecha,
    v_numero, v_fila.prefijo || '-' || lpad(v_numero::text, 3, '0'),
    v_servicio.id, v_servicio.nombre, v_servicio.duracion_estimada_seg,
    case when p_barbero_solicitado_id is null then null else v_estimado.id end,
    case when p_barbero_solicitado_id is null then null else v_estimado.nombre end,
    v_estimado.id, v_estimado.nombre,
    btrim(p_nombre), p_rango_edad, p_genero, extensions.digest(v_capacidad, 'sha256'),
    v_telefono, v_consentimiento
  ) returning * into v_ticket;

  return jsonb_build_object(
    'ticket_id', v_ticket.id,
    'codigo_visible', v_ticket.codigo_visible,
    'capacidad', v_capacidad
  );
end;
$$;

-- Preserve the final 0050 routing/filtering semantics and add only the two
-- notification fields to tickets already visible to the authenticated barber.
create or replace function public.mi_cola_barbero()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero public.barberos; v_operacion public.barbero_operaciones;
begin
  if v_empresa is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select b.* into v_barbero from public.barberos b where b.perfil_id=auth.uid() and b.empresa_id=v_empresa and b.activo;
  if not found then raise exception 'No tienes un perfil de barbero activo para esta barbería'; end if;
  select * into v_operacion from public.barbero_operaciones where barbero_id=v_barbero.id and empresa_id=v_empresa;
  if not found then raise exception 'No tienes estado operativo de barbero'; end if;
  return jsonb_build_object('estado',case when exists(select 1 from public.tickets t where t.empresa_id=v_empresa and t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) then 'ocupado'::public.estado_operativo_barbero else v_operacion.estado end,'tickets',coalesce((select jsonb_agg(jsonb_build_object('ticket_id',t.id,'fila_id',t.fila_id,'fila_nombre',f.nombre,'codigo_visible',t.codigo_visible,'estado',t.estado,'servicio_nombre',t.servicio_nombre,'barbero_solicitado_nombre',t.barbero_solicitado_nombre,'barbero_asignado_nombre',t.barbero_asignado_nombre,'llamado_vencimiento_en', public.vencimiento_efectivo_llamado(t),'respuesta_cliente',t.respuesta_cliente,'respuesta_cliente_en',t.respuesta_cliente_en,'inicio_en', t.inicio_en,'personas_delante',greatest(coalesce(c.posicion,1)-1,0),'espera_min',case when coalesce(c.posicion,1)<=1 then 0 else greatest(1,ceil(((coalesce(c.posicion,1)-1)*f.duracion_promedio_seg/f.puestos_activos/60.0))::int) end,'telefono_invitado',t.telefono_invitado,'consentimiento_whatsapp',t.consentimiento_whatsapp) order by case t.estado when 'llamado' then 0 when 'en_atencion' then 1 else 2 end,c.posicion,t.numero) from public.tickets t join public.filas f on f.id=t.fila_id left join public.cola_ordenada(t.fila_id) c on c.ticket_id=t.id where t.empresa_id=v_empresa and ((t.barbero_asignado_id=v_barbero.id and t.estado in ('llamado','en_atencion')) or (t.estado in ('en_espera','notificado') and ((t.servicio_id is not null and (t.barbero_solicitado_id is null or t.barbero_solicitado_id=v_barbero.id) and exists(select 1 from public.barbero_servicios bs where bs.barbero_id=v_barbero.id and bs.servicio_id=t.servicio_id)) or (t.barbero_solicitado_id=v_barbero.id and t.origen='presencial'))))), '[]'::jsonb));
end;
$$;

revoke all on function public.crear_ticket_invitado(text, uuid, text, public.rango_edad_invitado, public.genero_invitado, uuid, text, boolean) from public;
grant execute on function public.crear_ticket_invitado(text, uuid, text, public.rango_edad_invitado, public.genero_invitado, uuid, text, boolean) to anon, authenticated;
