-- ==================================================================================
-- HARDCODED WEBHOOK FIX (Bypasses Permission Issues)
-- ==================================================================================

-- 1. Ensure extensions are active
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Remove the old dynamic job that relies on missing settings
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'webhook-dispatcher';

-- 3. Schedule the new job with HARDCODED credentials
-- !!! IMPORTANT: Replace [YOUR_SERVICE_ROLE_KEY] below before running !!!

SELECT cron.schedule(
    'webhook-dispatcher',
    '* * * * *', -- Run every minute
    $$
    select
      net.http_post(
          url:='https://xydvyhnspkzcsocewhuy.supabase.co/functions/v1/webhook-dispatcher',
          headers:=jsonb_build_object(
              'Content-Type','application/json',
              'Authorization', 'Bearer [YOUR_SERVICE_ROLE_KEY]'
          ),
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 4. Check that the job is scheduled
SELECT jobid, jobname, command FROM cron.job WHERE jobname = 'webhook-dispatcher';
