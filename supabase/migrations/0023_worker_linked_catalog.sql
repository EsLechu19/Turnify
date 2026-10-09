-- Client-facing barbers must be real workers: a roster barber is offered only
-- when it links to a personal profile with an active membership in that shop.
-- Unlinked roster rows stay for history but never take new turns: the named
-- request is rejected and the auto-route never picks them (no worker account
-- could ever attend those tickets).

-- Shared backing check, inlined per statement so each RPC stays self-contained.
-- A barber `b` of the same shop qualifies when:
--   b.perfil_id is not null
--   and exists (
--     select 1 from public.perfiles as p
--     join public.membresias_personal_empresa as m
--       on m.perfil_id = p.id and m.empresa_id = b.empresa_id and m.activa
--     where p.id = b.perfil_id and p.rol = 'personal'
--   )

create or replace function public.catalogo_comercial(p_codigo text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nombre', e.nombre,
    'abierta', e.abierta,
    'servicios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'servicio_id', s.id,
        'nombre', s.nombre,
        'descripcion', s.descripcion,
        'duracion_estimada_seg', s.duracion_estimada_seg,
        'precio_referencia_centavos', s.precio_referencia_centavos
      ) order by s.nombre)
      from public.servicios as s
      where s.empresa_id = e.id and s.activo
    ), '[]'::jsonb),
    'barberos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'barbero_id', b.id,
        'nombre', b.nombre,
        'estado', bo.estado,
        'servicio_ids', (
          select coalesce(jsonb_agg(bs.servicio_id order by bs.servicio_id), '[]'::jsonb)
          from public.barbero_servicios as bs where bs.barbero_id = b.id
        )
      ) order by b.nombre)
      from public.barberos as b
      join public.barbero_operaciones as bo on bo.barbero_id = b.id
      where b.empresa_id = e.id and b.activo and bo.estado <> 'fuera_de_turno'
        and b.perfil_id is not null
        and exists (
          select 1 from public.perfiles as p
          join public.membresias_personal_empresa as m
            on m.perfil_id = p.id and m.empresa_id = b.empresa_id and m.activa
          where p.id = b.perfil_id and p.rol = 'personal'
        )
    ), '[]'::jsonb)
  )
  from public.empresas as e
  where e.codigo = upper(btrim(p_codigo));
$$;

create or replace function public.tomar_turno_comercial(
  p_codigo text,
  p_servicio_id uuid,
  p_barbero_solicitado_id uuid default null
)
returns public.tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa public.empresas;
  v_servicio public.servicios;
  v_fila public.filas;
  v_solicitado public.barberos;
  v_ruta public.barberos;
  v_fecha date;
  v_numero integer;
  v_ticket public.tickets;
begin
  if v_uid is null or public.mi_rol() <> 'cliente' then
    raise exception 'Solo los clientes pueden tomar turnos desde la app';
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
    select b.* into v_solicitado from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    where b.id = p_barbero_solicitado_id
      and b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id;
    if not found then raise exception 'El barbero solicitado no está disponible para este servicio'; end if;
    if v_solicitado.perfil_id is null or not exists (
      select 1 from public.perfiles as p
      join public.membresias_personal_empresa as m
        on m.perfil_id = p.id and m.empresa_id = v_empresa.id and m.activa
      where p.id = v_solicitado.perfil_id and p.rol = 'personal'
    ) then raise exception 'El barbero solicitado no tiene una cuenta de trabajador activa'; end if;
  else
    select b.* into v_ruta from public.barberos as b
    join public.barbero_operaciones as bo on bo.barbero_id = b.id
    join public.barbero_servicios as bs on bs.barbero_id = b.id
    left join public.tickets as t on t.barbero_asignado_id = b.id
      and t.estado in ('en_espera', 'notificado', 'llamado', 'en_atencion')
    where b.empresa_id = v_empresa.id and b.activo
      and bo.estado <> 'fuera_de_turno' and bs.servicio_id = v_servicio.id
      and b.perfil_id is not null
      and exists (
        select 1 from public.perfiles as p
        join public.membresias_personal_empresa as m
          on m.perfil_id = p.id and m.empresa_id = b.empresa_id and m.activa
        where p.id = b.perfil_id and p.rol = 'personal'
      )
    group by b.id, bo.estado
    order by case bo.estado when 'disponible' then 0 else 1 end,
      count(t.id), b.nombre, b.id
    limit 1;
    if not found then raise exception 'No hay barberos en turno para este servicio'; end if;
  end if;

  v_fecha := (now() at time zone v_empresa.zona_horaria)::date;
  select coalesce(max(t.numero), 0) + 1 into v_numero
  from public.tickets as t where t.fila_id = v_fila.id and t.fecha_operativa = v_fecha;
  insert into public.tickets (
    empresa_id, fila_id, cliente_id, origen, prioridad, estado, fecha_operativa,
    numero, codigo_visible, servicio_id, servicio_nombre, servicio_duracion_seg,
    barbero_solicitado_id, barbero_solicitado_nombre, barbero_asignado_id, barbero_asignado_nombre
  ) values (
    v_empresa.id, v_fila.id, v_uid, 'app', 'normal', 'en_espera', v_fecha,
    v_numero, v_fila.prefijo || '-' || lpad(v_numero::text, 3, '0'),
    v_servicio.id, v_servicio.nombre, v_servicio.duracion_estimada_seg,
    v_solicitado.id, v_solicitado.nombre, v_ruta.id, v_ruta.nombre
  ) returning * into v_ticket;
  return v_ticket;
end;
$$;

grant execute on function public.catalogo_comercial(text) to anon, authenticated;
grant execute on function public.tomar_turno_comercial(text, uuid, uuid) to authenticated;
