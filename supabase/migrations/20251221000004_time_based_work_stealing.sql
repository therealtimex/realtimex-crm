-- Migration: Time-Based Work Stealing (No Coordination Table)
-- Removes the need for crm_processing_nodes by using activity age as prioritization signal

-- Function: Unlock stale locks
-- Activities that have been locked for >5 minutes get unlocked (crashed/offline agents)
CREATE OR REPLACE FUNCTION unlock_stale_locks()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  unlocked_count INTEGER;
BEGIN
  UPDATE activities
  SET
    locked_by = NULL,
    locked_at = NULL,
    processing_status = 'raw'
  WHERE
    processing_status = 'processing'
    AND locked_at < NOW() - INTERVAL '5 minutes';

  GET DIAGNOSTICS unlocked_count = ROW_COUNT;
  RETURN unlocked_count;
END;
$$;

COMMENT ON FUNCTION unlock_stale_locks() IS
'Unlocks activities that have been in processing state for >5 minutes.
Should be called periodically (e.g., every minute via pg_cron or application logic).';

-- Function: Claim stale activity from any user
-- Returns activities that are >5 minutes old (timeout fallback for offline users)
CREATE OR REPLACE FUNCTION claim_stale_activity()
RETURNS TABLE (
  id uuid,
  type text,
  direction text,
  sales_id bigint,
  contact_id bigint,
  company_id bigint,
  deal_id bigint,
  raw_data jsonb,
  processing_status text,
  processed_data jsonb,
  metadata jsonb,
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE activities
  SET
    locked_by = 'agent',
    locked_at = NOW(),
    processing_status = 'processing'
  WHERE activities.id = (
    SELECT a.id
    FROM activities a
    WHERE a.processing_status = 'raw'
      AND a.created_at < NOW() - INTERVAL '5 minutes'  -- Only stale activities
      AND a.locked_by IS NULL
    ORDER BY a.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING
    activities.id,
    activities.type,
    activities.direction,
    activities.sales_id,
    activities.contact_id,
    activities.company_id,
    activities.deal_id,
    activities.raw_data,
    activities.processing_status,
    activities.processed_data,
    activities.metadata,
    activities.locked_by,
    activities.locked_at,
    activities.created_at,
    activities.updated_at;
END;
$$;

COMMENT ON FUNCTION claim_stale_activity() IS
'Claims the oldest raw activity that has been waiting for >5 minutes.
Used by agents as fallback when no fresh work is available from their own queue.
Implements time-based work stealing without coordination table.';

-- Note: The existing claim_next_pending_activity(p_agent_sales_id) function
-- continues to work for claiming fresh work from a specific user's queue.
-- Agent prioritization logic:
--   1. Try claim_next_pending_activity(my_sales_id) for my own fresh work
--   2. Try claim_stale_activity() for anyone's stale work (>5 min old)
--   3. Repeat every 5 seconds
