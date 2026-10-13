-- Manual tickets route to a chosen barber. Until now the walk-in screen let the
-- worker pick a barber that the server silently ignored (solicitado was always
-- the creator), so "assigning" changed nothing. The picker now filters to
-- barbers actually authorized for the chosen service, and the choice is stored.
-- Additive: the new parameter defaults to the previous behavior (self).

create or replace function public.crear_mi_ticket_presencial(p_fila_id uuid, p_prioridad public.prioridad_ticket default 'normal', p_nombre_ref text default null, p_servicio_id uuid default null, p_barbero_solicitado_id uuid default null)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero uuid := public.mi_barbero_actual_id(); v_fila public.filas; v_num integer; v_ticket public.tickets; v_fecha date; v_servicio public.servicios; v_destino uuid := v_barbero;
begin
  if v_empresa is null or v_barbero is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select * into v_fila from public.filas where id=p_fila_id and empresa_id=v_empresa for update; if not found then raise exception 'Fila no encontrada'; end if;
  if p_servicio_id is not null then
    select * into v_servicio from public.servicios where id=p_servicio_id and empresa_id=v_empresa and activo;
    if not found then raise exception 'Servicio no disponible'; end if;
  end if;
  if p_barbero_solicitado_id is not null then
    if not exists (select 1 from public.barberos where id=p_barbero_solicitado_id and empresa_id=v_empresa and activo) then
      raise exception 'El barbero no pertenece a esta barbería';
    end if;
    if p_servicio_id is not null and not exists (select 1 from public.barbero_servicios where barbero_id=p_barbero_solicitado_id and servicio_id=p_servicio_id) then
      raise exception 'Ese barbero no atiende este servicio';
    end if;
    v_destino := p_barbero_solicitado_id;
  end if;
  v_fecha := ((now() at time zone 'America/Lima'))::date;
  select coalesce(max(numero),0)+1 into v_num from public.tickets where fila_id=v_fila.id and fecha_operativa=v_fecha;
  insert into public.tickets(empresa_id,fila_id,origen,prioridad,estado,fecha_operativa,numero,codigo_visible,nombre_ref,barbero_solicitado_id,barbero_solicitado_nombre,servicio_id,servicio_nombre,servicio_duracion_seg)
  values(v_empresa,v_fila.id,'presencial',p_prioridad,'en_espera',v_fecha,v_num,v_fila.prefijo||'-'||lpad(v_num::text,3,'0'),nullif(btrim(p_nombre_ref),''),v_destino,(select nombre from public.barberos where id=v_destino),v_servicio.id,v_servicio.nombre,v_servicio.duracion_estimada_seg) returning * into v_ticket;
  return v_ticket;
end; $$;

grant execute on function public.crear_mi_ticket_presencial(uuid, public.prioridad_ticket, text, uuid, uuid) to authenticated;
