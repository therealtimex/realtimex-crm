-- ==============================================================================
-- CONCURRENT INDEX CREATION (Manual Execution)
-- ==============================================================================
--
-- USAGE:
--   Run this SQL in Supabase Dashboard → SQL Editor
--   OR via psql: psql $DATABASE_URL < create_indexes_concurrent.sql
--
-- WHY MANUAL:
--   CREATE INDEX CONCURRENTLY cannot run in transactions
--   Supabase CLI migrations run in transactions
--   Therefore, CONCURRENTLY requires manual execution
--
-- BENEFITS OF CONCURRENTLY:
--   - Zero downtime (no table locks)
--   - Queries continue during index creation
--   - Safe for production
--
-- NOTE:
--   If indexes already exist, they'll be skipped gracefully
--
-- ==============================================================================

-- Phase 1: Pattern Matching Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_search_text_trgm
  ON contacts USING GIN (search_text gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_search_text_trgm
  ON companies USING GIN (search_text gin_trgm_ops);

-- Phase 2: Partial Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_active_last_seen
  ON contacts(last_seen, sales_id)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_open_due_date
  ON tasks(due_date, status)
  WHERE done_date IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_active_stage
  ON deals(stage, sales_id, created_at)
  WHERE archived_at IS NULL;

-- Phase 3: Composite Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_sales_last_seen
  ON contacts(sales_id, last_seen);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_status
  ON contacts(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_sales_created
  ON companies(sales_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_status
  ON tasks(due_date, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_contact_issue_date
  ON invoices(contact_id, issue_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_company_issue_date
  ON invoices(company_id, issue_date);

-- ==============================================================================
-- COMPLETION
-- ==============================================================================

-- Check created indexes:
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
