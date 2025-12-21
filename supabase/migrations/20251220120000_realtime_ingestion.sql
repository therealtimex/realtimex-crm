-- Migration: Create Activities Table and Ingestion Logic

-- 1. Create the 'activities' table (The Unified Event Store)
create table "public"."activities" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "type" text not null check (type in ('email', 'call', 'sms', 'meeting', 'note', 'task', 'whatsapp', 'other')),
    "direction" text not null check (direction in ('inbound', 'outbound')),
    "sales_id" bigint, -- References sales(id). If NULL, it is Global/Unassigned.
    "contact_id" bigint, -- References contacts(id).

    -- Processing State Machine
    "processing_status" text not null default 'raw' check (processing_status in ('raw', 'processing', 'completed', 'failed')),
    "locked_by" uuid, -- The ID of the generic user (auth.users) or specific agent (sales.id) processing it.
    "locked_at" timestamp with time zone,

    -- Data Payloads
    "raw_data" jsonb, -- Stores URL or Text content. { "source_type": "url"|"text", "content": "..." }
    "processed_data" jsonb, -- Stores AI results. { "transcript": "...", "summary": "..." }
    "metadata" jsonb, -- Provider info. { "twilio_sid": "...", "from": "..." }
    "provider_id" uuid, -- Link to ingestion_providers(id) for future flexibility

    constraint "activities_pkey" primary key ("id")
);

-- Enable RLS
alter table "public"."activities" enable row level security;

-- 2. Create the 'ingestion_providers' table (Configuration Registry)
create table "public"."ingestion_providers" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "provider_code" text not null check (provider_code in ('twilio', 'postmark', 'gmail', 'generic')),
    "name" text not null, -- Friendly name e.g. "US Support Line"
    "is_active" boolean not null default true,
    "config" jsonb not null default '{}'::jsonb, -- Encrypted secrets go here
    "sales_id" bigint, -- Default Owner. If NULL, leads are Unassigned.
    "ingestion_key" text unique, -- Public identifier used in Webhook URLs e.g. /ingest?key=xyz

    constraint "ingestion_providers_pkey" primary key ("id")
);

alter table "public"."ingestion_providers" enable row level security;

-- 3. Update 'sales' table with Processing Rules
alter table "public"."sales" 
    add column "stale_threshold_minutes" integer default 15,
    add column "allow_remote_processing" boolean default true;

-- 4. Foreign Keys
alter table "public"."activities" 
    add constraint "activities_sales_id_fkey" foreign key ("sales_id") references "public"."sales"("id") on delete set null,
    add constraint "activities_contact_id_fkey" foreign key ("contact_id") references "public"."contacts"("id") on delete cascade,
    add constraint "activities_provider_id_fkey" foreign key ("provider_id") references "public"."ingestion_providers"("id") on delete set null;

alter table "public"."ingestion_providers"
    add constraint "ingestion_providers_sales_id_fkey" foreign key ("sales_id") references "public"."sales"("id") on delete set null;

-- 5. Indexes for Performance (Crucial for Work Stealing)
create index "activities_processing_queue_idx" on "public"."activities" ("processing_status", "created_at") where processing_status = 'raw';
create index "activities_sales_id_idx" on "public"."activities" ("sales_id");

-- 6. RPC: The "Work Stealing" Function
-- Note: p_agent_sales_id must be the BIGINT id from the 'sales' table, not auth.uid()
create or replace function claim_next_pending_activity(
  p_agent_sales_id bigint
)
returns table (
  id uuid,
  raw_data jsonb,
  type text,
  is_global boolean
) 
language plpgsql
security definer -- Runs with elevated privileges to update the row
as $$
begin
  return query
  update "public"."activities" a
  set 
    processing_status = 'processing',
    locked_by = (select user_id from sales where id = p_agent_sales_id), -- Store the Auth UUID for auditing
    locked_at = now()
  from "public"."sales" s_owner
  where a.id = (
    select act.id
    from "public"."activities" act
    left join "public"."sales" owner on act.sales_id = owner.id
    where 
      act.processing_status = 'raw'
      and (
        -- CRITERIA 1: IT IS MINE
        act.sales_id = p_agent_sales_id
        
        -- CRITERIA 2: IT IS GLOBAL
        or act.sales_id is null
        
        -- CRITERIA 3: IT IS STALE AND STEALABLE
        or (
          act.sales_id != p_agent_sales_id         -- Not mine
          and (owner.allow_remote_processing is true or owner.allow_remote_processing is null) -- Owner allows stealing (default true)
          and act.created_at < now() - ((coalesce(owner.stale_threshold_minutes, 15) || ' minutes')::interval)
        )
      )
    order by 
      (act.sales_id = p_agent_sales_id) desc, -- My tasks first
      (act.sales_id is null) desc,            -- Global tasks second
      act.created_at asc                      -- Oldest stale tasks last
    limit 1
    for update skip locked
  )
  and (a.sales_id = s_owner.id or a.sales_id is null) -- Join condition
  returning a.id, a.raw_data, a.type, (a.sales_id is null) as is_global;
end;
$$;

-- 7. Trigger: Link Ingestion Providers -> Sales ID on Insert
-- If we insert an activity with a provider_id but no sales_id, try to auto-assign it based on the provider config.
create or replace function auto_assign_activity_owner()
returns trigger
language plpgsql
as $$
begin
    if new.sales_id is null and new.provider_id is not null then
        select sales_id into new.sales_id
        from ingestion_providers
        where id = new.provider_id;
    end if;
    return new;
end;
$$;

create trigger "before_insert_activity_assign_owner"
before insert on "public"."activities"
for each row execute function auto_assign_activity_owner();

-- 8. Enable pg_cron (if available, this might fail on some Supabase tiers so we wrap it)
do $$
begin
    create extension if not exists pg_cron;
exception when others then
    raise notice 'pg_cron extension could not be enabled - skipping cron setup';
end
$$;

-- 9. RLS Policies
-- Activities: Authenticated users can read all (for Team view). Only Owner or Global can be updated (unless claiming).
create policy "Enable read access for authenticated users" on "public"."activities" for select to authenticated using (true);
create policy "Enable insert for authenticated users" on "public"."activities" for insert to authenticated with check (true);
create policy "Enable update for authenticated users" on "public"."activities" for update to authenticated using (true);

-- Ingestion Providers: Admins only? For now, authenticated read.
create policy "Enable read access for authenticated users" on "public"."ingestion_providers" for select to authenticated using (true);

