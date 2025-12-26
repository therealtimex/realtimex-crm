-- Fix ambiguous column reference in compute_company_internal_heartbeat by renaming parameter
-- This fix is moved earlier in the migration sequence to ensure it's available 
-- before the tasks enhancement migration runs its updates.

DROP FUNCTION IF EXISTS compute_company_internal_heartbeat(bigint);

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
