-- Turnify live validation V3: pg_cron schedules for back-office sweeps.
-- marcar_ausentes runs every minute (grace is per-empresa, default 5 min);
-- cerrar_tickets_vencidos runs hourly and compares against each empresa's
-- local operative date, since pg_cron runs in UTC.
create extension if not exists pg_cron;

select cron.schedule(
  'turnify-marcar-ausentes',
  '* * * * *',
  $$select public.marcar_ausentes()$$
);

select cron.schedule(
  'turnify-cierre-dia',
  '0 * * * *',
  $$select public.cerrar_tickets_vencidos()$$
);
