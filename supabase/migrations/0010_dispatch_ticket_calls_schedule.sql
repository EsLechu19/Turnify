-- Invoke the private outbox dispatcher once per minute. The operator must
-- provision the two named Vault entries before enabling this migration:
-- turnify_project_url and turnify_service_role_key. Their values are never
-- stored in this repository, migration output, or cron job definition.
create extension if not exists pg_net;

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
          where name = 'turnify_service_role_key'
        )
      ),
      body := '{}'::jsonb
    );
  $$
);
