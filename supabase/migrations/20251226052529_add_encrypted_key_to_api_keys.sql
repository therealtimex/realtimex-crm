-- Add encrypted_key column to api_keys table to allow key retrieval
-- This improves UX by letting users copy their keys after creation
-- Keys are encrypted at rest for security

-- Add column to store encrypted API key
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS encrypted_key text;

COMMENT ON COLUMN public.api_keys.encrypted_key IS 'Encrypted full API key for retrieval. Encrypted using application-level encryption.';
