-- Fix preferential queue ordering without modifying already-applied migrations.
-- `preferencial_cada = N` means one preferential slot first, followed by N
-- normal slots while both lanes wait. Empty-lane fallback remains gapless.

create or replace function public.cola_ordenada(p_fila uuid)
returns table (ticket_id uuid, posicion integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cada integer := 3;
  v_normales uuid[] := '{}';
  v_prefs uuid[] := '{}';
  v_total integer := 0;
  v_pos integer := 1;
  v_in integer := 1;
  v_ip integer := 1;
begin
  select e.preferencial_cada into v_cada
  from public.filas as f
  join public.empresas as e on e.id = f.empresa_id
  where f.id = p_fila;
  if not found then
    return;
  end if;

  select coalesce(array_agg(t.id order by t.creado_en asc, t.numero asc), '{}')
    into v_normales
  from public.tickets as t
  where t.fila_id = p_fila
    and t.estado in ('en_espera', 'notificado')
    and t.prioridad = 'normal';

  select coalesce(array_agg(t.id order by t.creado_en asc, t.numero asc), '{}')
    into v_prefs
  from public.tickets as t
  where t.fila_id = p_fila
    and t.estado in ('en_espera', 'notificado')
    and t.prioridad = 'preferencial';

  v_total := coalesce(array_length(v_normales, 1), 0)
    + coalesce(array_length(v_prefs, 1), 0);

  while v_pos <= v_total loop
    if ((v_pos - 1) % (v_cada + 1) = 0) then
      -- Preferential slot; fall back to normals when the lane is empty.
      if v_ip <= coalesce(array_length(v_prefs, 1), 0) then
        ticket_id := v_prefs[v_ip];
        v_ip := v_ip + 1;
      else
        ticket_id := v_normales[v_in];
        v_in := v_in + 1;
      end if;
    else
      -- Normal slot; fall back to preferentials when the lane is empty.
      if v_in <= coalesce(array_length(v_normales, 1), 0) then
        ticket_id := v_normales[v_in];
        v_in := v_in + 1;
      else
        ticket_id := v_prefs[v_ip];
        v_ip := v_ip + 1;
      end if;
    end if;
    posicion := v_pos;
    return next;
    v_pos := v_pos + 1;
  end loop;
  return;
end;
$$;
