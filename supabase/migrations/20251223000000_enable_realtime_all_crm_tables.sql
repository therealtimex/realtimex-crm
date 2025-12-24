-- Enable Realtime for all core CRM tables
-- This migration adds realtime support for tables not covered in the initial setup
-- Safe to run on existing deployments (idempotent - won't duplicate if already enabled)

-- Enable realtime for core CRM entities
select enable_realtime_for_table('contacts');
select enable_realtime_for_table('companies');
select enable_realtime_for_table('deals');
select enable_realtime_for_table('contactNotes');
select enable_realtime_for_table('dealNotes');
select enable_realtime_for_table('sales');
select enable_realtime_for_table('ingestion_providers');

-- Verify all tables are enabled
do $$
declare
  expected_tables text[] := ARRAY[
    'activities',
    'tasks',
    'contacts',
    'companies',
    'deals',
    'contactNotes',
    'dealNotes',
    'sales',
    'ingestion_providers'
  ];
  enabled_tables text[];
  missing_tables text[];
begin
  -- Get list of enabled tables
  select array_agg(tablename)
  into enabled_tables
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public';

  -- Find missing tables
  select array_agg(t)
  into missing_tables
  from unnest(expected_tables) as t
  where t != ALL(coalesce(enabled_tables, ARRAY[]::text[]));

  -- Report results
  if missing_tables is null or array_length(missing_tables, 1) = 0 then
    raise notice '✅ All CRM tables have realtime enabled';
  else
    raise warning '⚠️  Missing realtime for: %', array_to_string(missing_tables, ', ');
  end if;
end $$;
