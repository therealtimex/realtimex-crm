-- Create performance indexes for search optimization
-- Note: These indexes use regular CREATE INDEX (not CONCURRENTLY) for migration compatibility
-- For zero-downtime production deploys, run the CONCURRENTLY version manually via SQL Editor
-- See: scripts/create_indexes_concurrent.sql for manual execution

-- =============================================================================
-- PHASE 1: PATTERN MATCHING INDEXES (CRITICAL)
-- =============================================================================

-- Contact search with ILIKE support (matches app query patterns)
CREATE INDEX IF NOT EXISTS idx_contacts_search_text_trgm
  ON contacts USING GIN (search_text gin_trgm_ops);

-- Company search with ILIKE support
CREATE INDEX IF NOT EXISTS idx_companies_search_text_trgm
  ON companies USING GIN (search_text gin_trgm_ops);

-- =============================================================================
-- PHASE 2: PARTIAL INDEXES (HIGH PRIORITY)
-- =============================================================================

-- Active contacts by last activity (partial index - smaller & faster)
CREATE INDEX IF NOT EXISTS idx_contacts_active_last_seen
  ON contacts(last_seen, sales_id)
  WHERE status = 'active';

-- Open tasks by due date (partial index)
CREATE INDEX IF NOT EXISTS idx_tasks_open_due_date
  ON tasks(due_date, status)
  WHERE done_date IS NULL;

-- Active deals by stage (partial index)
CREATE INDEX IF NOT EXISTS idx_deals_active_stage
  ON deals(stage, sales_id, created_at)
  WHERE archived_at IS NULL;

-- =============================================================================
-- PHASE 3: COMPOSITE INDEXES (MEDIUM PRIORITY)
-- =============================================================================

-- Contacts by sales rep and activity
CREATE INDEX IF NOT EXISTS idx_contacts_sales_last_seen
  ON contacts(sales_id, last_seen);

-- Contacts by status
CREATE INDEX IF NOT EXISTS idx_contacts_status
  ON contacts(status);

-- Companies by sales rep and creation date
CREATE INDEX IF NOT EXISTS idx_companies_sales_created
  ON companies(sales_id, created_at);

-- Tasks by due date and status
CREATE INDEX IF NOT EXISTS idx_tasks_due_status
  ON tasks(due_date, status);

-- Invoices by contact and issue date
CREATE INDEX IF NOT EXISTS idx_invoices_contact_issue_date
  ON invoices(contact_id, issue_date);

-- Invoices by company and issue date
CREATE INDEX IF NOT EXISTS idx_invoices_company_issue_date
  ON invoices(company_id, issue_date);

-- =============================================================================
-- NOTES
-- =============================================================================

-- Production zero-downtime alternative:
-- Run scripts/create_indexes_concurrent.sql via Supabase SQL Editor
-- That version uses CREATE INDEX CONCURRENTLY for zero blocking
