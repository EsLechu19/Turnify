-- Turnify live validation V4: publish tickets + filas to Realtime.
-- Clients listen to the fila summary row (not other customers' tickets)
-- and re-query their own ticket state on every event (see section 13).
-- Found live: supabase_realtime publication was empty.
alter publication supabase_realtime add table public.tickets, public.filas;
