-- Large Payload Storage System
-- Automatically moves large raw_data payloads to Supabase Storage to prevent table bloat

-- 1. Create storage bucket for activity payloads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'activity-payloads',
  'activity-payloads',
  false, -- Private bucket
  NULL, -- No file size limit (supports large payloads of any size)
  NULL  -- Allow all MIME types (PDFs, images, videos, etc.)
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create storage policy for service role access
CREATE POLICY "Service role can manage activity payloads"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'activity-payloads')
WITH CHECK (bucket_id = 'activity-payloads');

-- Allow authenticated users to read their own activity payloads
CREATE POLICY "Users can read their activity payloads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'activity-payloads' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM activities WHERE sales_id = (
      SELECT id FROM sales WHERE user_id = auth.uid()
    )
  )
);

-- 3. Add columns to activities table for payload storage tracking
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS payload_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS payload_storage_status TEXT DEFAULT 'inline' CHECK (payload_storage_status IN ('inline', 'pending_move', 'in_storage')),
  ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create index for finding activities that need storage migration
CREATE INDEX IF NOT EXISTS idx_activities_pending_storage
  ON activities(payload_storage_status, created_at)
  WHERE payload_storage_status = 'pending_move';

-- 4. Function to calculate payload size
CREATE OR REPLACE FUNCTION calculate_payload_size(data JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN octet_length(data::text);
END;
$$;

-- 5. Trigger function to detect large payloads
CREATE OR REPLACE FUNCTION check_payload_size()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  payload_size INTEGER;
  size_threshold INTEGER := 102400; -- 100KB threshold
BEGIN
  -- Calculate payload size
  payload_size := calculate_payload_size(NEW.raw_data);
  NEW.payload_size_bytes := payload_size;

  -- If payload exceeds threshold, mark for storage migration
  IF payload_size > size_threshold THEN
    NEW.payload_storage_status := 'pending_move';

    RAISE NOTICE 'Large payload detected (% bytes) for activity %. Will be moved to storage asynchronously.',
      payload_size, NEW.id;
  ELSE
    NEW.payload_storage_status := 'inline';
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Create trigger on activities table
DROP TRIGGER IF EXISTS trigger_check_payload_size ON activities;
CREATE TRIGGER trigger_check_payload_size
  BEFORE INSERT OR UPDATE OF raw_data ON activities
  FOR EACH ROW
  EXECUTE FUNCTION check_payload_size();

-- 7. Function to move payload to storage (called by Edge Function)
CREATE OR REPLACE FUNCTION move_payload_to_storage(
  p_activity_id BIGINT,
  p_storage_path TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  original_payload JSONB;
  payload_metadata JSONB;
  result JSONB;
BEGIN
  -- Get the original payload
  SELECT raw_data INTO original_payload
  FROM activities
  WHERE id = p_activity_id
  FOR UPDATE;

  IF original_payload IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Activity not found'
    );
  END IF;

  -- Create metadata object to replace raw_data
  payload_metadata := jsonb_build_object(
    'payload_type', 'storage_ref',
    'storage_path', p_storage_path,
    'size_bytes', calculate_payload_size(original_payload),
    'moved_at', now()
  );

  -- Update the activity record
  UPDATE activities
  SET
    raw_data = payload_metadata,
    payload_storage_status = 'in_storage',
    storage_path = p_storage_path,
    updated_at = now()
  WHERE id = p_activity_id;

  -- Return the original payload for upload
  result := jsonb_build_object(
    'success', true,
    'activity_id', p_activity_id,
    'storage_path', p_storage_path,
    'payload', original_payload
  );

  RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_payload_size(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION move_payload_to_storage(BIGINT, TEXT) TO service_role;

-- 8. Helper function to retrieve full payload (handles both inline and storage)
CREATE OR REPLACE FUNCTION get_activity_payload(p_activity_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_record RECORD;
BEGIN
  SELECT
    raw_data,
    payload_storage_status,
    storage_path
  INTO activity_record
  FROM activities
  WHERE id = p_activity_id;

  IF activity_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Activity not found');
  END IF;

  -- If payload is inline or pending move, return raw_data directly
  IF activity_record.payload_storage_status IN ('inline', 'pending_move') THEN
    RETURN activity_record.raw_data;
  END IF;

  -- If in storage, return metadata with instructions
  -- (Actual retrieval from storage must be done via Storage API)
  RETURN jsonb_build_object(
    'payload_type', 'storage_ref',
    'storage_path', activity_record.storage_path,
    'message', 'Payload is in storage. Use Supabase Storage API to retrieve.',
    'url', '/storage/v1/object/activity-payloads/' || activity_record.storage_path
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_activity_payload(BIGINT) TO authenticated, service_role;

-- 9. Add comment with usage instructions
COMMENT ON COLUMN activities.payload_storage_status IS
'Tracks where the activity payload is stored:
- inline: Payload is in raw_data column (< 100KB)
- pending_move: Payload is large and queued for storage migration
- in_storage: Payload has been moved to Supabase Storage, raw_data contains reference';

COMMENT ON FUNCTION move_payload_to_storage(BIGINT, TEXT) IS
'Moves a large activity payload to Supabase Storage.
Called by the process-large-payloads Edge Function.

Usage:
  SELECT move_payload_to_storage(12345, ''12345/1234567890.json'');

Returns the original payload for upload to storage.';

COMMENT ON FUNCTION get_activity_payload(BIGINT) IS
'Retrieves activity payload, handling both inline and storage-based payloads.

Usage:
  SELECT get_activity_payload(12345);

For storage-based payloads, returns metadata with storage path.
Use Supabase Storage API to download the actual content.';
