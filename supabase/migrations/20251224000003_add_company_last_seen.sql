-- Add last_seen to companies for activity tracking
alter table "public"."companies" add column "last_seen" timestamp with time zone;

-- Backfill with created_at
update "public"."companies" set last_seen = created_at where last_seen is null;
