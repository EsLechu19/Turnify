-- Allows a single two-minute extension of the tolerance deadline when the
-- customer responds 'llega_en_2_min'. Keeps the deadline immutable otherwise.

create or replace function public.proteger_vencimiento_llamado_ticket()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.llamado_vencimiento_en is not null
     and new.llamado_vencimiento_en is distinct from old.llamado_vencimiento_en then
    -- Allow exact 2 minute extension only when setting respuesta_cliente to 'llega_en_2_min' for the first time
    if new.respuesta_cliente = 'llega_en_2_min' and old.respuesta_cliente is null and new.llamado_vencimiento_en = old.llamado_vencimiento_en + interval '2 minutes' then
      -- Valid extension
    else
      raise exception 'El vencimiento del llamado solo se puede extender 2 minutos una vez';
    end if;
  end if;
  return new;
end;
$$;

-- Modify responder_llamado_invitado to add the 2 minutes
create or replace function public.responder_llamado_invitado(p_ticket_id uuid, p_capacidad text, p_respuesta text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets;
begin
  if p_respuesta not in ('presente','llega_en_2_min') then raise exception 'Respuesta de cliente no válida'; end if;
  select * into v_ticket from public.tickets
  where id=p_ticket_id and acceso_publico_hash=extensions.digest(p_capacidad,'sha256') for update;
  if not found then raise exception 'Ticket no encontrado'; end if;
  if v_ticket.estado <> 'llamado' or v_ticket.llamado_vencimiento_en is null or now() >= v_ticket.llamado_vencimiento_en then
    raise exception 'El turno no está llamado o la tolerancia venció';
  end if;
  if v_ticket.respuesta_cliente is null then
    if p_respuesta = 'llega_en_2_min' then
      update public.tickets set respuesta_cliente=p_respuesta, respuesta_cliente_en=now(), llamado_vencimiento_en=llamado_vencimiento_en + interval '2 minutes', actualizado_en=now() where id=v_ticket.id;
    else
      update public.tickets set respuesta_cliente=p_respuesta, respuesta_cliente_en=now(), actualizado_en=now() where id=v_ticket.id;
    end if;
  elsif v_ticket.respuesta_cliente <> p_respuesta then
    raise exception 'La respuesta del cliente ya fue registrada';
  end if;
end;
$$;
