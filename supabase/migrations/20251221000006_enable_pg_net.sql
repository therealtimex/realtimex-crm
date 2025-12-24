-- Enable pg_net extension for webhook dispatcher
-- This extension provides the net.http_post function used by the cron job
create extension if not exists pg_net with schema extensions;
