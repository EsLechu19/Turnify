-- Keep worker-created walk-ins on the same named Lima operational day as
-- ticket defaults, day closing, and operational reports.
create or replace function public.crear_mi_ticket_presencial(p_fila_id uuid, p_prioridad public.prioridad_ticket default 'normal', p_nombre_ref text default null)
returns public.tickets language plpgsql security definer set search_path = '' as $$
declare v_empresa uuid := public.mi_empresa_personal_actual_id(); v_barbero uuid := public.mi_barbero_actual_id(); v_fila public.filas; v_num integer; v_ticket public.tickets; v_fecha date;
begin
  if v_empresa is null or v_barbero is null then raise exception 'Selecciona una barbería aprobada antes de operar'; end if;
  select * into v_fila from public.filas where id=p_fila_id and empresa_id=v_empresa for update; if not found then raise exception 'Fila no encontrada'; end if;
  v_fecha := ((now() at time zone 'America/Lima'))::date;
  select coalesce(max(numero),0)+1 into v_num from public.tickets where fila_id=v_fila.id and fecha_operativa=v_fecha;
  insert into public.tickets(empresa_id,fila_id,origen,prioridad,estado,fecha_operativa,numero,codigo_visible,nombre_ref,barbero_solicitado_id,barbero_solicitado_nombre)
  values(v_empresa,v_fila.id,'presencial',p_prioridad,'en_espera',v_fecha,v_num,v_fila.prefijo||'-'||lpad(v_num::text,3,'0'),nullif(btrim(p_nombre_ref),''),v_barbero,(select nombre from public.barberos where id=v_barbero)) returning * into v_ticket;
  return v_ticket;
end; $$;
