-- Replace the previously scheduled service-role authorization with a dedicated
-- dispatcher token. The named cron job is overwritten in place, so deployed
-- environments receive this repair when the migration is applied.
--
-- Before applying, provision `turnify_dispatch_ticket_calls_cron_token` in
-- Vault with the same value configured as the Edge Function's
-- DISPATCH_TICKET_CALLS_CRON_TOKEN secret. Never store that value in source.
select cron.schedule(
  'turnify-dispatch-ticket-calls',
  '* * * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'turnify_project_url'
      ) || '/functions/v1/dispatch-ticket-calls',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'turnify_dispatch_ticket_calls_cron_token'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
