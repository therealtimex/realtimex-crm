-- Enable pg_trgm extension for ILIKE/LIKE pattern matching support
-- This matches the actual query patterns used by the app (search_text@ilike)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- HELPER FUNCTIONS FOR JSONB SEARCH (Defensive, handles non-array inputs)
-- =============================================================================

-- Extract all emails from email_jsonb array for search
-- Format: email_jsonb = [{"email": "test@example.com"}, ...]
-- Returns: "test@example.com another@example.com"
-- Defensive: Returns empty string for non-array inputs (null, object, string)
CREATE OR REPLACE FUNCTION contacts_email_text(email_jsonb jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT string_agg(elem->>'email', ' ')
  FROM jsonb_array_elements(
    CASE
      WHEN email_jsonb IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(email_jsonb) = 'array' THEN email_jsonb
      ELSE '[]'::jsonb
    END
  ) elem
  WHERE elem->>'email' IS NOT NULL
$$;

-- Extract all phone numbers from phone_jsonb array for search
-- Format: phone_jsonb = [{"number": "+1234567890", "type": "work"}, ...]
-- Returns: "+1234567890 +0987654321"
-- Defensive: Returns empty string for non-array inputs (null, object, string)
CREATE OR REPLACE FUNCTION contacts_phone_text(phone_jsonb jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT string_agg(elem->>'number', ' ')
  FROM jsonb_array_elements(
    CASE
      WHEN phone_jsonb IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(phone_jsonb) = 'array' THEN phone_jsonb
      ELSE '[]'::jsonb
    END
  ) elem
  WHERE elem->>'number' IS NOT NULL
$$;

-- =============================================================================
-- NOTES
-- =============================================================================

-- Views are already optimized (see 20260111050000_optimize_deals_summary.sql):
-- - contacts_summary: Uses LATERAL joins instead of LEFT JOIN + GROUP BY
-- - tasks_summary: Uses correlated subqueries for nb_notes (see 20260112180000)
-- - deals_summary: Uses correlated subqueries for aggregates
-- - companies_summary: Uses LATERAL joins for all aggregations

-- Next steps:
-- 1. Apply migration 20260209050000_create_performance_indexes.sql (default path)
--    OR run scripts/create_indexes_concurrent.sql manually for zero-downtime index creation
-- 2. Indexes will use the helper functions defined above
-- 3. This enables faster search and filtering on large datasets
