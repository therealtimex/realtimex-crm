-- Migration: Fix RLS policies for ingestion_providers table
-- Add missing INSERT, UPDATE, DELETE policies for authenticated users

-- Allow authenticated users to create ingestion channels
create policy "Enable insert for authenticated users"
on "public"."ingestion_providers"
for insert
to authenticated
with check (true);

-- Allow authenticated users to update their ingestion channels
create policy "Enable update for authenticated users"
on "public"."ingestion_providers"
for update
to authenticated
using (true);

-- Allow authenticated users to delete their ingestion channels
create policy "Enable delete for authenticated users"
on "public"."ingestion_providers"
for delete
to authenticated
using (true);
