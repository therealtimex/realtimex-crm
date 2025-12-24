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

-- 2. Enable Realtime for core CRM tables
-- Note: All realtime subscriptions respect RLS policies - users only receive changes for rows they can SELECT

-- Activities: Real-time ingestion, activity feed updates
select enable_realtime_for_table('activities');

-- Tasks: Task assignments, status changes, team collaboration
select enable_realtime_for_table('tasks');

-- Contacts: Contact profile updates, new contact notifications
select enable_realtime_for_table('contacts');

-- Companies: Company data changes, relationship updates
select enable_realtime_for_table('companies');

-- Deals: Pipeline movement, stage changes, deal value updates (critical for sales teams!)
select enable_realtime_for_table('deals');

-- Contact Notes: Real-time note additions/updates
select enable_realtime_for_table('contactNotes');

-- Deal Notes: Deal discussion updates
select enable_realtime_for_table('dealNotes');

-- Sales: Team member changes, user status updates
select enable_realtime_for_table('sales');

-- Ingestion Providers: Channel configuration changes
select enable_realtime_for_table('ingestion_providers');
