-- ============================================================================
-- Backfill Contact Heartbeats
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM contacts LOOP
    PERFORM compute_contact_internal_heartbeat(r.id);
  END LOOP;
END $$;
