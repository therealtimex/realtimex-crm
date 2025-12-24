-- Schedule cron job to process large payloads
-- Runs every 5 minutes to move pending large payloads to storage

-- Schedule the large payload processor
SELECT cron.schedule(
    'process-large-payloads',
    '*/5 * * * *', -- Every 5 minutes
    $$
    SELECT
      net.http_post(
          url:='https://' || current_setting('app.settings.supabase_url', true) || '/functions/v1/process-large-payloads',
          headers:=jsonb_build_object(
              'Content-Type','application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          ),
          body:=jsonb_build_object(
              'limit', 20,
              'max_age_minutes', 1
          )
      ) as request_id;
    $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS
'Cron jobs:
- webhook-dispatcher: Runs every minute to dispatch webhooks
- process-large-payloads: Runs every 5 minutes to move large activity payloads to storage';
