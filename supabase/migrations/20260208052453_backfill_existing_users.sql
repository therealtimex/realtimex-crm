-- Backfill existing auth.users to sales table
-- This ensures that when connecting to an existing Supabase database,
-- users that were created before the CRM schema was installed get synced
-- to the sales table, allowing the app to recognize the database as initialized.

-- Insert existing auth.users that don't have corresponding sales records
insert into public.sales (first_name, last_name, email, user_id, administrator)
select
  coalesce(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)) as first_name,
  coalesce(u.raw_user_meta_data->>'last_name', '') as last_name,
  u.email,
  u.id as user_id,
  -- First user (by created_at) becomes administrator
  case
    when u.created_at = (select min(created_at) from auth.users) then true
    else false
  end as administrator
from auth.users u
where not exists (
  select 1
  from public.sales s
  where s.user_id = u.id
)
and u.email is not null
order by u.created_at;

-- Refresh init_state cache if using materialized view approach
-- (Not needed for view, but good practice for future compatibility)
