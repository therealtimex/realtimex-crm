-- =====================================================
-- Standardize Timestamps Across All Tables
-- =====================================================
--
-- This migration ensures all entity tables have:
-- - created_at: timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
-- - updated_at: timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
-- - Auto-update trigger for updated_at column
--
-- Tables updated:
-- - contacts, companies, deals, tasks
-- - contactNotes, companyNotes, dealNotes, taskNotes
-- - sales, tags
-- =====================================================

-- 1. Ensure update_updated_at_column function exists (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMENT ON FUNCTION update_updated_at_column() IS 'Auto-update updated_at column to current UTC timestamp on row update';

-- =====================================================
-- 2. CONTACTS TABLE
-- =====================================================

-- Add created_at and updated_at to contacts
ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

-- Drop existing trigger if it exists (to recreate)
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. COMPANIES TABLE
-- =====================================================

-- Standardize created_at (change NULL to NOT NULL if needed)
-- Note: existing created_at already has default now(), we'll standardize to timezone('utc'::text, now())
ALTER TABLE public.companies
    ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
    ALTER COLUMN created_at SET NOT NULL;

-- Add updated_at column
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;

-- Create trigger
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. DEALS TABLE
-- =====================================================

-- Add created_at and updated_at
ALTER TABLE public.deals
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;

-- Create trigger
CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON public.deals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. TASKS TABLE (already has created_at/updated_at from enhance_tasks_schema)
-- =====================================================

-- Standardize NULL to NOT NULL if needed
ALTER TABLE public.tasks
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- Trigger already exists from 20251225120000_enhance_tasks_schema.sql

-- =====================================================
-- 6. CONTACT NOTES TABLE
-- =====================================================

ALTER TABLE public."contactNotes"
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS update_contactNotes_updated_at ON public."contactNotes";

CREATE TRIGGER update_contactNotes_updated_at
    BEFORE UPDATE ON public."contactNotes"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. COMPANY NOTES TABLE
-- =====================================================

ALTER TABLE public."companyNotes"
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS update_companyNotes_updated_at ON public."companyNotes";

CREATE TRIGGER update_companyNotes_updated_at
    BEFORE UPDATE ON public."companyNotes"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. DEAL NOTES TABLE
-- =====================================================

ALTER TABLE public."dealNotes"
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS update_dealNotes_updated_at ON public."dealNotes";

CREATE TRIGGER update_dealNotes_updated_at
    BEFORE UPDATE ON public."dealNotes"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. TASK NOTES TABLE (already has created_at/updated_at from enhance_tasks_schema)
-- =====================================================

-- Ensure NOT NULL (may have been created as nullable)
ALTER TABLE public."taskNotes"
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- Trigger already exists from 20251225120000_enhance_tasks_schema.sql

-- =====================================================
-- 10. SALES TABLE (users)
-- =====================================================

ALTER TABLE public.sales
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON public.sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. TAGS TABLE
-- =====================================================

ALTER TABLE public.tags
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS update_tags_updated_at ON public.tags;

CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. API_KEYS TABLE
-- =====================================================

-- API keys likely already have created_at, but let's ensure consistency
ALTER TABLE public.api_keys
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now());

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes on created_at for common queries (WHERE, ORDER BY)
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON public.contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON public.deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contactNotes_created_at ON public."contactNotes"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companyNotes_created_at ON public."companyNotes"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dealNotes_created_at ON public."dealNotes"(created_at DESC);

-- Add indexes on updated_at for tracking recent changes
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON public.contacts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON public.companies(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON public.deals(updated_at DESC);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN public.contacts.created_at IS 'Timestamp when contact was created (UTC)';
COMMENT ON COLUMN public.contacts.updated_at IS 'Timestamp when contact was last updated (UTC, auto-updated)';

COMMENT ON COLUMN public.companies.created_at IS 'Timestamp when company was created (UTC)';
COMMENT ON COLUMN public.companies.updated_at IS 'Timestamp when company was last updated (UTC, auto-updated)';

COMMENT ON COLUMN public.deals.created_at IS 'Timestamp when deal was created (UTC)';
COMMENT ON COLUMN public.deals.updated_at IS 'Timestamp when deal was last updated (UTC, auto-updated)';

COMMENT ON COLUMN public.sales.created_at IS 'Timestamp when user account was created (UTC)';
COMMENT ON COLUMN public.sales.updated_at IS 'Timestamp when user was last updated (UTC, auto-updated)';
