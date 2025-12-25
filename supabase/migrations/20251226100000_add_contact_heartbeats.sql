-- ============================================================================
-- Contact Heartbeats Migration
-- ============================================================================

-- 1. Schema Changes
-- ============================================================================

-- Internal engagement tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS internal_heartbeat_score integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS internal_heartbeat_status text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS internal_heartbeat_updated_at timestamptz DEFAULT now();

-- External validation tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_heartbeat_status text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS external_heartbeat_checked_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_validation_status text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_last_bounced_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_profile_status text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS employment_verified_at timestamptz;

-- 2. Constraints and Indexes
-- ============================================================================

-- Score range constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_contact_internal_heartbeat_score'
  ) THEN
    ALTER TABLE contacts ADD CONSTRAINT chk_contact_internal_heartbeat_score
      CHECK (internal_heartbeat_score IS NULL OR (internal_heartbeat_score BETWEEN 0 AND 100));
  END IF;
END $$;

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_contacts_internal_heartbeat
  ON contacts(internal_heartbeat_status, internal_heartbeat_score);

CREATE INDEX IF NOT EXISTS idx_contacts_external_heartbeat
  ON contacts(external_heartbeat_status);

CREATE INDEX IF NOT EXISTS idx_contacts_email_validation
  ON contacts(email_validation_status);

-- 3. Functions
-- ============================================================================

-- Function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_contact_internal_heartbeat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.internal_heartbeat_score IS DISTINCT FROM OLD.internal_heartbeat_score)
     OR (NEW.internal_heartbeat_status IS DISTINCT FROM OLD.internal_heartbeat_status) THEN
    NEW.internal_heartbeat_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_contact_internal_heartbeat_timestamp ON contacts;
CREATE TRIGGER set_contact_internal_heartbeat_timestamp
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_internal_heartbeat_timestamp();

-- Core computation function
CREATE OR REPLACE FUNCTION compute_contact_internal_heartbeat(target_contact_id bigint)
RETURNS void AS $$
DECLARE
  v_nb_tasks integer;
  v_nb_notes integer;
  v_nb_completed_tasks integer;
  v_last_activity_date timestamptz;
  
  v_days_since_activity integer;
  v_task_completion_rate numeric;
  
  v_recency_score integer := 0;
  v_frequency_score integer := 0;
  v_quality_score integer := 0;
  v_final_score integer := 0;
  v_status text;
BEGIN
  -- Gather metrics
  SELECT
    COUNT(DISTINCT t.id),
    COUNT(DISTINCT cn.id),
    COUNT(DISTINCT t.id) FILTER (WHERE t.done_date IS NOT NULL),
    GREATEST(MAX(cn.date), MAX(t.due_date), MAX(c.last_seen))
  INTO
    v_nb_tasks,
    v_nb_notes,
    v_nb_completed_tasks,
    v_last_activity_date
  FROM contacts c
  LEFT JOIN "contactNotes" cn ON c.id = cn.contact_id
  LEFT JOIN tasks t ON c.id = t.contact_id
  WHERE c.id = target_contact_id
  GROUP BY c.id;

  -- Handle NULLs
  v_nb_tasks := COALESCE(v_nb_tasks, 0);
  v_nb_notes := COALESCE(v_nb_notes, 0);
  v_nb_completed_tasks := COALESCE(v_nb_completed_tasks, 0);
  
  -- Calculate derived metrics
  IF v_last_activity_date IS NOT NULL THEN
    v_days_since_activity := EXTRACT(EPOCH FROM (now() - v_last_activity_date))/86400;
  ELSE
    v_days_since_activity := 999999;
  END IF;

  IF v_nb_tasks > 0 THEN
    v_task_completion_rate := v_nb_completed_tasks::numeric / v_nb_tasks::numeric;
  ELSE
    v_task_completion_rate := 0;
  END IF;

  -- 1. Recency Score (0-50)
  v_recency_score := CASE
    WHEN v_days_since_activity <= 7 THEN 50
    WHEN v_days_since_activity <= 30 THEN 40
    WHEN v_days_since_activity <= 90 THEN 25
    WHEN v_days_since_activity <= 180 THEN 10
    ELSE 0
  END;

  -- 2. Frequency Score (0-30)
  v_frequency_score := LEAST(30, (v_nb_tasks + v_nb_notes) * 2);

  -- 3. Quality Score (0-20)
  v_quality_score := CASE
    WHEN v_task_completion_rate >= 0.8 THEN 20
    WHEN v_task_completion_rate >= 0.5 THEN 15
    WHEN v_task_completion_rate >= 0.3 THEN 10
    ELSE 5
  END;

  -- Final Score
  v_final_score := v_recency_score + v_frequency_score + v_quality_score;

  -- Status Mapping
  v_status := CASE
    WHEN v_final_score >= 80 THEN 'strong'
    WHEN v_final_score >= 60 THEN 'active'
    WHEN v_final_score >= 40 THEN 'cooling'
    WHEN v_final_score >= 20 THEN 'cold'
    ELSE 'dormant'
  END;

  -- Update Contact
  UPDATE contacts
  SET
    internal_heartbeat_score = v_final_score,
    internal_heartbeat_status = v_status,
    internal_heartbeat_updated_at = now()
  WHERE id = target_contact_id;

END;
$$ LANGUAGE plpgsql;

-- 4. Triggers for Auto-Computation
-- ============================================================================

-- Trigger for Tasks
CREATE OR REPLACE FUNCTION trigger_recompute_contact_heartbeat_from_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    PERFORM compute_contact_internal_heartbeat(NEW.contact_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_contact_heartbeat_on_task ON tasks;
CREATE TRIGGER trg_update_contact_heartbeat_on_task
AFTER INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_recompute_contact_heartbeat_from_task();

-- Trigger for Notes
CREATE OR REPLACE FUNCTION trigger_recompute_contact_heartbeat_from_note()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM compute_contact_internal_heartbeat(NEW.contact_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_contact_heartbeat_on_note ON "contactNotes";
CREATE TRIGGER trg_update_contact_heartbeat_on_note
AFTER INSERT OR UPDATE ON "contactNotes"
FOR EACH ROW
EXECUTE FUNCTION trigger_recompute_contact_heartbeat_from_note();

-- 5. Update View
-- ============================================================================

DROP VIEW IF EXISTS contacts_summary CASCADE;

CREATE VIEW contacts_summary
  WITH (security_invoker=on)
  AS
SELECT
  c.*,
  comp.name as company_name,

  -- Existing aggregations
  COUNT(DISTINCT t.id) as nb_tasks,
  COUNT(DISTINCT cn.id) as nb_notes,
  COUNT(DISTINCT t.id) FILTER (WHERE t.done_date IS NULL) as nb_open_tasks,

  -- New: Task completion metrics
  COUNT(DISTINCT t.id) FILTER (WHERE t.done_date IS NOT NULL) as nb_completed_tasks,
  CASE
    WHEN COUNT(DISTINCT t.id) > 0
    THEN ROUND(COUNT(DISTINCT t.id) FILTER (WHERE t.done_date IS NOT NULL)::numeric / COUNT(DISTINCT t.id), 2)
    ELSE 0
  END as task_completion_rate,

  -- Activity timestamps
  MAX(cn.date) as last_note_date,
  MAX(t.due_date) as last_task_activity,

  -- Computed engagement indicator (days since last activity)
  LEAST(
    COALESCE(EXTRACT(EPOCH FROM (now() - c.last_seen))/86400, 999999),
    COALESCE(EXTRACT(EPOCH FROM (now() - MAX(cn.date)))/86400, 999999),
    COALESCE(EXTRACT(EPOCH FROM (now() - MAX(t.due_date)))/86400, 999999)
  )::integer as days_since_last_activity

FROM contacts c
LEFT JOIN "contactNotes" cn ON c.id = cn.contact_id
LEFT JOIN tasks t ON c.id = t.contact_id
LEFT JOIN companies comp ON c.company_id = comp.id
GROUP BY c.id, comp.name;