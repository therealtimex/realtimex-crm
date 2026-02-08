-- Backfill missing sales records for existing auth.users
-- This handles cases where users were created but the trigger failed or didn't exist yet
insert into public.sales (first_name, last_name, email, user_id, administrator)
select
  coalesce(u.raw_user_meta_data ->> 'first_name', split_part(u.email, '@', 1)) as first_name,
  coalesce(u.raw_user_meta_data ->> 'last_name', '') as last_name,
  u.email,
  u.id as user_id,
  -- First user in sales table becomes admin, others don't
  case when (select count(*) from public.sales) = 0 then true else false end as administrator
from auth.users u
left join public.sales s on s.user_id = u.id
where s.id is null  -- Only insert if sales record doesn't exist
  and u.deleted_at is null;  -- Don't create records for deleted users

-- Update the handle_new_user trigger to be more robust with missing metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  sales_count int;
begin
  select count(id) into sales_count
  from public.sales;

  -- Use email username as fallback if first_name is missing
  insert into public.sales (first_name, last_name, email, user_id, administrator)
  values (
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    new.id,
    case when sales_count > 0 then false else true end
  );

  return new;
end;
$$;

-- Update the handle_update_user trigger to handle missing metadata gracefully
create or replace function public.handle_update_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.sales
  set
    first_name = coalesce(new.raw_user_meta_data ->> 'first_name', first_name),
    last_name = coalesce(new.raw_user_meta_data ->> 'last_name', last_name),
    email = new.email
  where user_id = new.id;

  return new;
end;
$$;
