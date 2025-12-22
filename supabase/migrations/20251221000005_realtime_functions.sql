-- Migration: Realtime Helper Functions
-- Purpose: Allow programmatic enabling of Realtime for tables (creating channels)
-- This supports the RealTimeX App integration which requires Realtime subscriptions.

-- 1. Create a function to safely add tables to the supabase_realtime publication
create or replace function enable_realtime_for_table(target_table text, target_schema text default 'public')
returns void
language plpgsql
security definer -- Required: Regular users can't ALTER PUBLICATION
set search_path = public, pg_catalog -- Security: Prevent search_path attacks
as $$
declare
  publication_name text := 'supabase_realtime';
begin
  -- Validate inputs
  if target_table is null or target_table = '' then
    raise exception 'target_table cannot be null or empty';
  end if;

  -- Ensure the publication exists (idempotent)
  if not exists (select 1 from pg_publication where pubname = publication_name) then
    execute format('create publication %I', publication_name);
    raise notice 'Created publication %', publication_name;
  end if;

  -- Check if table is already in publication
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = publication_name
      and schemaname = target_schema
      and tablename = target_table
  ) then
    execute format('alter publication %I add table %I.%I', publication_name, target_schema, target_table);
    raise notice 'Added table %.% to publication %', target_schema, target_table, publication_name;
  else
    raise notice 'Table %.% is already in publication %', target_schema, target_table, publication_name;
  end if;
end;
$$;

comment on function enable_realtime_for_table(text, text) is
'Safely adds tables to supabase_realtime publication. Realtime respects RLS policies - clients only receive changes for rows they can SELECT.';

-- 2. Enable Realtime for 'activities' table (Required for RealTimeX ingestion)
-- Note: RLS policies on activities ensure users only receive notifications for their own data
select enable_realtime_for_table('activities');

-- 3. Enable Realtime for 'tasks' table (Useful for CRM updates)
select enable_realtime_for_table('tasks');
