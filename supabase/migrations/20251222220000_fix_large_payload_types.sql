-- Fix type mismatch in large payload storage system
-- activities.id is UUID but move_payload_to_storage expected BIGINT

-- Drop the old function
DROP FUNCTION IF EXISTS move_payload_to_storage(BIGINT, TEXT);

-- Recreate with correct UUID type
CREATE OR REPLACE FUNCTION move_payload_to_storage(
  p_activity_id UUID,  -- Changed from BIGINT to UUID
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
    'moved_at', NOW()
  );

  -- Update activity: replace raw_data with reference, update status
  UPDATE activities
  SET
    raw_data = payload_metadata,
    payload_storage_status = 'in_storage',
    storage_path = p_storage_path
  WHERE id = p_activity_id;

  -- Return the original payload (to be uploaded by Edge Function)
  result := jsonb_build_object(
    'success', true,
    'activity_id', p_activity_id,
    'storage_path', p_storage_path,
    'payload', original_payload
  );

  RETURN result;
END;
$$;

-- Update permissions
GRANT EXECUTE ON FUNCTION move_payload_to_storage(UUID, TEXT) TO service_role;

-- Update comment
COMMENT ON FUNCTION move_payload_to_storage(UUID, TEXT) IS
'Moves a large activity payload to Supabase Storage.
Called by the process-large-payloads Edge Function.

Usage:
  SELECT move_payload_to_storage(''25f160be-0e93-48c0-8a49-8eeda2e25762''::uuid, ''25f160be-0e93-48c0-8a49-8eeda2e25762/1234567890.json'');

Returns the original payload for upload to storage.';
