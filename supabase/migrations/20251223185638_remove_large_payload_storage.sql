-- Remove Large JSON Payload Storage System
-- This migration removes the move_payload_to_storage function and related infrastructure
-- that was designed to move large JSON payloads to storage.
--
-- Decision: Files are now uploaded directly to storage in the incoming/ folder
-- and marked as 'in_storage' immediately. No cron job needed to move them.

-- Unschedule the cron job (safe to run even if it doesn't exist)
SELECT cron.unschedule('process-large-payloads') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-large-payloads'
);

-- Drop the trigger that auto-detects large payloads
DROP TRIGGER IF EXISTS trigger_check_payload_size ON activities;

-- Drop the trigger function
DROP FUNCTION IF EXISTS check_payload_size();

-- Drop the move_payload_to_storage function
DROP FUNCTION IF EXISTS move_payload_to_storage(UUID, TEXT);

-- Drop the get_activity_payload helper function (no longer needed)
DROP FUNCTION IF EXISTS get_activity_payload(UUID);

-- Drop the calculate_payload_size helper function (no longer needed)
DROP FUNCTION IF EXISTS calculate_payload_size(JSONB);

-- Drop the index for pending_move queries (no longer needed)
DROP INDEX IF EXISTS idx_activities_pending_storage;

-- Remove the CHECK constraint on payload_storage_status to allow NULL and 'in_storage' only
-- First drop the constraint, then add a new one
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_payload_storage_status_check;

-- Clean up any existing data that doesn't match the new constraint
-- Convert 'pending_move' or any other status to 'in_storage'
UPDATE activities
SET payload_storage_status = 'in_storage'
WHERE payload_storage_status IS NOT NULL
  AND payload_storage_status != 'in_storage';

-- Now add the constraint
ALTER TABLE activities ADD CONSTRAINT activities_payload_storage_status_check
  CHECK (payload_storage_status IS NULL OR payload_storage_status = 'in_storage');

-- Update pg_cron comment to remove reference to process-large-payloads
COMMENT ON EXTENSION pg_cron IS
'Cron jobs:
- webhook-dispatcher: Runs every minute to dispatch webhooks';

-- Add comment to explain the simplified storage model
COMMENT ON COLUMN activities.payload_storage_status IS
'Storage status for file attachments:
- NULL: No files attached (raw_data is pure JSON)
- ''in_storage'': Files uploaded to storage/incoming/ folder, referenced in raw_data.storage_path

Files are uploaded directly to storage by the ingest-activity Edge Function.
No post-processing or file moving is needed.';

COMMENT ON COLUMN activities.storage_path IS
'Storage path for file attachments. Populated when raw_data.source_type = ''storage_ref''.
Files are stored in the activity-payloads bucket under incoming/ folder.
Example: incoming/1766514359388_document.pdf';
