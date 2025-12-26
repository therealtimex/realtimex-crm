-- ============================================================================
-- Company Entity Enhancement Migration
-- ============================================================================
-- This migration adds structured fields for lifecycle management, engagement
-- tracking, and data enrichment while maintaining backward compatibility.
-- All new fields are nullable or have safe defaults.
-- ============================================================================

-- Phase 1: Add Core Fields
-- ============================================================================

-- Lifecycle & Classification
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS lifecycle_stage text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_type text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS qualification_status text;

-- External Integration
ALTER TABLE companies ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS external_system text;

-- Contact Information
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email text;

-- Firmographics (complementary to existing 'size' and 'revenue' fields)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS revenue_range text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year integer;

-- Social & Enrichment (complementary to existing 'linkedin_url' field)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS social_profiles jsonb DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

-- External Heartbeat (entity validity)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS external_heartbeat_status text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS external_heartbeat_checked_at timestamptz;

-- Internal Heartbeat (relationship health)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_heartbeat_status text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_heartbeat_score integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS internal_heartbeat_updated_at timestamptz;

-- Phase 2: Add Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_companies_lifecycle_stage ON companies(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_companies_company_type ON companies(company_type);
CREATE INDEX IF NOT EXISTS idx_companies_external_id ON companies(external_id, external_system);
CREATE INDEX IF NOT EXISTS idx_companies_social_profiles ON companies USING GIN (social_profiles);
CREATE INDEX IF NOT EXISTS idx_companies_internal_heartbeat_status ON companies(internal_heartbeat_status);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON companies(updated_at);

-- Phase 3: Add Constraints
-- ============================================================================

-- Ensure heartbeat score is between 0-100 if set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_internal_heartbeat_score'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT chk_internal_heartbeat_score
      CHECK (internal_heartbeat_score IS NULL OR (internal_heartbeat_score BETWEEN 0 AND 100));
  END IF;
END $$;

-- Unique constraint for external IDs (per system)
-- Use partial unique index to allow multiple NULLs but enforce uniqueness for non-NULL values
CREATE UNIQUE INDEX IF NOT EXISTS unq_external_id_system
  ON companies(external_id, external_system)
  WHERE external_id IS NOT NULL AND external_system IS NOT NULL;

-- Phase 4: Create Triggers
-- ============================================================================

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_companies_updated_at ON companies;
CREATE TRIGGER set_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Trigger to auto-update internal_heartbeat_updated_at when score/status changes
CREATE OR REPLACE FUNCTION update_internal_heartbeat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.internal_heartbeat_score IS DISTINCT FROM OLD.internal_heartbeat_score)
     OR (NEW.internal_heartbeat_status IS DISTINCT FROM OLD.internal_heartbeat_status) THEN
    NEW.internal_heartbeat_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_internal_heartbeat_timestamp ON companies;
CREATE TRIGGER set_internal_heartbeat_timestamp
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_internal_heartbeat_timestamp();

-- Phase 5: Internal Heartbeat Computation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_company_internal_heartbeat(p_company_id bigint)
RETURNS void AS $$
DECLARE
  score integer := 0;
  status text;
  days_since_note integer;
  days_since_deal integer;
  days_since_task integer;
BEGIN
  -- Get recency metrics
  -- Note: Tasks are related to contacts, not directly to companies
  SELECT
    EXTRACT(EPOCH FROM (now() - MAX(cn.date)))/86400,
    EXTRACT(EPOCH FROM (now() - MAX(d.updated_at)))/86400,
    EXTRACT(EPOCH FROM (now() - MAX(t.due_date)))/86400
  INTO days_since_note, days_since_deal, days_since_task
  FROM companies c
  LEFT JOIN "companyNotes" cn ON c.id = cn.company_id
  LEFT JOIN deals d ON c.id = d.company_id
  LEFT JOIN contacts co ON c.id = co.company_id
  LEFT JOIN tasks t ON co.id = t.contact_id
  WHERE c.id = p_company_id;

  -- Scoring algorithm (simple recency-based, 0-100 scale)
  score := 100;

  -- Deduct points based on days since last activity
  IF days_since_note IS NOT NULL THEN
    score := score - LEAST(days_since_note::integer, 50);
  END IF;

  IF days_since_deal IS NOT NULL THEN
    score := score - LEAST(days_since_deal::integer, 30);
  END IF;

  IF days_since_task IS NOT NULL THEN
    score := score - LEAST(days_since_task::integer, 20);
  END IF;

  -- Ensure score stays within bounds
  score := GREATEST(0, LEAST(100, score));

  -- Map score to status
  status := CASE
    WHEN score >= 76 THEN 'engaged'
    WHEN score >= 51 THEN 'quiet'
    WHEN score >= 26 THEN 'at_risk'
    ELSE 'unresponsive'
  END;

  -- Update company heartbeat fields
  UPDATE companies
  SET
    internal_heartbeat_score = score,
    internal_heartbeat_status = status,
    internal_heartbeat_updated_at = now()
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql;

-- Phase 6: Triggers to Auto-Update Heartbeat on Activity
-- ============================================================================

-- Trigger on companyNotes insert/update
CREATE OR REPLACE FUNCTION trigger_recompute_company_heartbeat()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM compute_company_internal_heartbeat(NEW.company_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recompute_heartbeat_on_company_note ON "companyNotes";
CREATE TRIGGER recompute_heartbeat_on_company_note
AFTER INSERT OR UPDATE ON "companyNotes"
FOR EACH ROW
EXECUTE FUNCTION trigger_recompute_company_heartbeat();

-- Trigger on deals insert/update (for companies)
CREATE OR REPLACE FUNCTION trigger_recompute_company_heartbeat_from_deal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    PERFORM compute_company_internal_heartbeat(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recompute_heartbeat_on_deal ON deals;
CREATE TRIGGER recompute_heartbeat_on_deal
AFTER INSERT OR UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION trigger_recompute_company_heartbeat_from_deal();

-- Trigger on tasks insert/update (for companies via contacts)
CREATE OR REPLACE FUNCTION trigger_recompute_company_heartbeat_from_task()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id bigint;
BEGIN
  -- Tasks are related to contacts, so we need to get the company_id from the contact
  SELECT company_id INTO v_company_id
  FROM contacts
  WHERE id = NEW.contact_id;

  IF v_company_id IS NOT NULL THEN
    PERFORM compute_company_internal_heartbeat(v_company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recompute_heartbeat_on_task ON tasks;
CREATE TRIGGER recompute_heartbeat_on_task
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_recompute_company_heartbeat_from_task();

-- Phase 7: Update companies_summary View
-- ============================================================================

DROP VIEW IF EXISTS companies_summary;

CREATE VIEW companies_summary
  WITH (security_invoker=on)
  AS
SELECT
  c.*,
  -- Existing aggregations
  COUNT(DISTINCT d.id) as nb_deals,
  COUNT(DISTINCT co.id) as nb_contacts,
  COUNT(DISTINCT cn.id) as nb_notes,
  COUNT(DISTINCT t.id) FILTER (WHERE t.done_date IS NULL) as nb_tasks,
  COALESCE(SUM(d.amount), 0) as total_deal_amount,

  -- New aggregations for heartbeat context
  MAX(cn.date) as last_note_date,
  MAX(d.updated_at) as last_deal_activity,
  MAX(t.due_date) as last_task_activity,

  -- Computed engagement indicator (days since last activity)
  LEAST(
    COALESCE(EXTRACT(EPOCH FROM (now() - MAX(cn.date)))/86400, 999999),
    COALESCE(EXTRACT(EPOCH FROM (now() - MAX(d.updated_at)))/86400, 999999),
    COALESCE(EXTRACT(EPOCH FROM (now() - MAX(t.due_date)))/86400, 999999)
  )::integer as days_since_last_activity

FROM companies c
LEFT JOIN deals d ON c.id = d.company_id
LEFT JOIN contacts co ON c.id = co.company_id
LEFT JOIN "companyNotes" cn ON c.id = cn.company_id
LEFT JOIN tasks t ON co.id = t.contact_id
GROUP BY c.id;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
-- - Added 18 new nullable/defaulted fields
-- - Created 6 indexes for performance
-- - Added 2 check constraints
-- - Created 3 triggers for auto-updates
-- - Added heartbeat computation function
-- - Updated companies_summary view with engagement metrics
-- ============================================================================
