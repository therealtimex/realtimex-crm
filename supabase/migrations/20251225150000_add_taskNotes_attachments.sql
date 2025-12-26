-- Add attachments column to taskNotes table to match contactNotes and dealNotes

ALTER TABLE public."taskNotes"
  ADD COLUMN IF NOT EXISTS attachments jsonb[];

COMMENT ON COLUMN public."taskNotes".attachments IS 'Array of attachment metadata (file URLs, names, types)';
