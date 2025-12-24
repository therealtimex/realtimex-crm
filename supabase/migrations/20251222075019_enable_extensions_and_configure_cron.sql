-- Enable Extensions and Configure Cron for Webhook System
-- This migration ensures all required extensions are enabled for the webhook dispatcher

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Create a helper function to configure cron settings
CREATE OR REPLACE FUNCTION public.configure_webhook_cron_settings(
    p_supabase_url text,
    p_service_role_key text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Set the configuration at database level
    EXECUTE format('ALTER DATABASE %I SET app.settings.supabase_url = %L',
                   current_database(), p_supabase_url);
    EXECUTE format('ALTER DATABASE %I SET app.settings.service_role_key = %L',
                   current_database(), p_service_role_key);

    -- Reload configuration for current session
    PERFORM pg_reload_conf();

    RETURN format('Configuration updated successfully. Please reconnect to see changes. URL: %s', p_supabase_url);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.configure_webhook_cron_settings(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.configure_webhook_cron_settings(text, text) TO service_role;

-- 3. Add a comment with usage instructions
COMMENT ON FUNCTION public.configure_webhook_cron_settings(text, text) IS
'Configures the webhook cron dispatcher settings.

Usage:
  SELECT configure_webhook_cron_settings(
    ''your-project-ref.supabase.co'',
    ''your-service-role-key-here''
  );

You can find these values in your Supabase Dashboard:
- Project URL: Settings → API → Project URL (without https://)
- Service Role Key: Settings → API → service_role key

After running this function, reconnect to the database for changes to take effect.
The cron job scheduled in 20251219120200_webhook_cron.sql will then work properly.';

-- 4. Check if settings are already configured
DO $$
DECLARE
    current_url text;
    current_key text;
BEGIN
    -- Try to read current settings
    BEGIN
        current_url := current_setting('app.settings.supabase_url', true);
        current_key := current_setting('app.settings.service_role_key', true);

        IF current_url IS NOT NULL AND current_key IS NOT NULL THEN
            RAISE NOTICE 'Webhook cron settings already configured:';
            RAISE NOTICE '  URL: %', current_url;
            RAISE NOTICE '  Key: %', left(current_key, 20) || '...';
        ELSE
            RAISE NOTICE '=================================================================';
            RAISE NOTICE 'IMPORTANT: Webhook cron settings NOT configured!';
            RAISE NOTICE '=================================================================';
            RAISE NOTICE 'The webhook dispatcher cron job requires configuration.';
            RAISE NOTICE '';
            RAISE NOTICE 'Run this SQL to configure (replace with your actual values):';
            RAISE NOTICE '';
            RAISE NOTICE '  SELECT configure_webhook_cron_settings(';
            RAISE NOTICE '    ''your-project-ref.supabase.co'',';
            RAISE NOTICE '    ''your-service-role-key-here''';
            RAISE NOTICE '  );';
            RAISE NOTICE '';
            RAISE NOTICE 'Find these values in: Supabase Dashboard → Settings → API';
            RAISE NOTICE '=================================================================';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not check webhook cron settings. This is normal for fresh deployments.';
    END;
END;
$$;
