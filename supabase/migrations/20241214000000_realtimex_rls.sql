-- Migration: Add RealTimeX RLS (Row-Level Security) Support
-- This migration adds realtimex_user_id column to all tables and creates RLS policies
-- to automatically scope data to the authenticated RealTimeX user.

-- ============================================================================
-- Add realtimex_user_id column to all tables
-- ============================================================================

-- Add to sales table (links sales records to RealTimeX users)
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

-- Add to main data tables
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

ALTER TABLE public."contactNotes"
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

ALTER TABLE public."dealNotes"
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS realtimex_user_id INTEGER;

-- ============================================================================
-- Create helper function to get RealTimeX user ID from headers
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_realtimex_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN CAST(
    NULLIF(current_setting('request.headers', true)::json->>'x-realtimex-user-id', '')
    AS INTEGER
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create triggers to auto-populate realtimex_user_id on INSERT
-- ============================================================================

-- Function to set realtimex_user_id
CREATE OR REPLACE FUNCTION public.set_realtimex_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.realtimex_user_id := public.get_realtimex_user_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sales
DROP TRIGGER IF EXISTS set_realtimex_user_id_sales ON public.sales;
CREATE TRIGGER set_realtimex_user_id_sales
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- Trigger for companies
DROP TRIGGER IF EXISTS set_realtimex_user_id_companies ON public.companies;
CREATE TRIGGER set_realtimex_user_id_companies
  BEFORE INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- Trigger for contacts
DROP TRIGGER IF EXISTS set_realtimex_user_id_contacts ON public.contacts;
CREATE TRIGGER set_realtimex_user_id_contacts
  BEFORE INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- Trigger for deals
DROP TRIGGER IF EXISTS set_realtimex_user_id_deals ON public.deals;
CREATE TRIGGER set_realtimex_user_id_deals
  BEFORE INSERT ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- Trigger for contactNotes
DROP TRIGGER IF EXISTS set_realtimex_user_id_contactNotes ON public."contactNotes";
CREATE TRIGGER set_realtimex_user_id_contactNotes
  BEFORE INSERT ON public."contactNotes"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- Trigger for dealNotes
DROP TRIGGER IF EXISTS set_realtimex_user_id_dealNotes ON public."dealNotes";
CREATE TRIGGER set_realtimex_user_id_dealNotes
  BEFORE INSERT ON public."dealNotes"
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- Trigger for tasks
DROP TRIGGER IF EXISTS set_realtimex_user_id_tasks ON public.tasks;
CREATE TRIGGER set_realtimex_user_id_tasks
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- Trigger for tags
DROP TRIGGER IF EXISTS set_realtimex_user_id_tags ON public.tags;
CREATE TRIGGER set_realtimex_user_id_tags
  BEFORE INSERT ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.set_realtimex_user_id();

-- ============================================================================
-- Create RLS policies for data isolation
-- ============================================================================

-- Drop existing RealTimeX policies if they exist
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public.sales;
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public.companies;
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public.contacts;
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public.deals;
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public."contactNotes";
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public."dealNotes";
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public.tasks;
DROP POLICY IF EXISTS "realtimex_user_isolation" ON public.tags;

-- Sales table policy
CREATE POLICY "realtimex_user_isolation"
  ON public.sales
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- Companies table policy
CREATE POLICY "realtimex_user_isolation"
  ON public.companies
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- Contacts table policy
CREATE POLICY "realtimex_user_isolation"
  ON public.contacts
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- Deals table policy
CREATE POLICY "realtimex_user_isolation"
  ON public.deals
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- ContactNotes table policy
CREATE POLICY "realtimex_user_isolation"
  ON public."contactNotes"
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- DealNotes table policy
CREATE POLICY "realtimex_user_isolation"
  ON public."dealNotes"
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- Tasks table policy
CREATE POLICY "realtimex_user_isolation"
  ON public.tasks
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- Tags table policy
CREATE POLICY "realtimex_user_isolation"
  ON public.tags
  FOR ALL
  USING (
    realtimex_user_id IS NULL OR
    realtimex_user_id = public.get_realtimex_user_id()
  );

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sales_realtimex_user_id
  ON public.sales(realtimex_user_id);

CREATE INDEX IF NOT EXISTS idx_companies_realtimex_user_id
  ON public.companies(realtimex_user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_realtimex_user_id
  ON public.contacts(realtimex_user_id);

CREATE INDEX IF NOT EXISTS idx_deals_realtimex_user_id
  ON public.deals(realtimex_user_id);

CREATE INDEX IF NOT EXISTS idx_contactNotes_realtimex_user_id
  ON public."contactNotes"(realtimex_user_id);

CREATE INDEX IF NOT EXISTS idx_dealNotes_realtimex_user_id
  ON public."dealNotes"(realtimex_user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_realtimex_user_id
  ON public.tasks(realtimex_user_id);

CREATE INDEX IF NOT EXISTS idx_tags_realtimex_user_id
  ON public.tags(realtimex_user_id);

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.sales.realtimex_user_id IS 'RealTimeX user ID for data scoping';
COMMENT ON COLUMN public.companies.realtimex_user_id IS 'RealTimeX user ID for data scoping';
COMMENT ON COLUMN public.contacts.realtimex_user_id IS 'RealTimeX user ID for data scoping';
COMMENT ON COLUMN public.deals.realtimex_user_id IS 'RealTimeX user ID for data scoping';
COMMENT ON COLUMN public."contactNotes".realtimex_user_id IS 'RealTimeX user ID for data scoping';
COMMENT ON COLUMN public."dealNotes".realtimex_user_id IS 'RealTimeX user ID for data scoping';
COMMENT ON COLUMN public.tasks.realtimex_user_id IS 'RealTimeX user ID for data scoping';
COMMENT ON COLUMN public.tags.realtimex_user_id IS 'RealTimeX user ID for data scoping';

COMMENT ON FUNCTION public.get_realtimex_user_id() IS 'Extracts RealTimeX user ID from request headers';
COMMENT ON FUNCTION public.set_realtimex_user_id() IS 'Trigger function to auto-populate realtimex_user_id on INSERT';
