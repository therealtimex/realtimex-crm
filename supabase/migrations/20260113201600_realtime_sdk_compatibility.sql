-- Migration: RealTime SDK Compatibility
-- This migration renames columns and aligns status values with the RealTime SDK requirements.

-- 1. Rename columns
ALTER TABLE public.activities RENAME COLUMN processing_status TO status;
ALTER TABLE public.activities RENAME COLUMN locked_by TO owner_id;
ALTER TABLE public.activities RENAME COLUMN machine_id TO locked_by;

-- 2. Update status value check constraint and values
-- First, drop the old check constraint if it exists (it was created in 20251220120000_realtime_ingestion.sql)
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_processing_status_check;

-- Update values to match SDK
UPDATE public.activities SET status = 'pending' WHERE status = 'raw';
UPDATE public.activities SET status = 'claimed' WHERE status = 'processing';

-- Add new check constraint
ALTER TABLE public.activities ADD CONSTRAINT activities_status_check CHECK (status IN ('pending', 'claimed', 'processing', 'completed', 'failed'));

-- 3. Update Indexes (Optional but recommended for consistency)
DROP INDEX IF EXISTS activities_processing_queue_idx;
CREATE INDEX IF NOT EXISTS activities_status_queue_idx ON public.activities (status, created_at) WHERE status = 'pending';

-- 4. Update RPC Functions

-- 4.1. claim_next_pending_activity (CRM specific)
CREATE OR REPLACE FUNCTION claim_next_pending_activity(
  p_agent_sales_id bigint
)
RETURNS TABLE (
  id uuid,
  raw_data jsonb,
  type text,
  is_global boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE "public"."activities" a
  SET 
    status = 'claimed',
    owner_id = (SELECT user_id FROM sales WHERE id = p_agent_sales_id),
    locked_at = now()
  FROM "public"."sales" s_owner
  WHERE a.id = (
    SELECT act.id
    FROM "public"."activities" act
    LEFT JOIN "public"."sales" owner ON act.sales_id = owner.id
    WHERE 
      act.status = 'pending'
      AND (
        -- CRITERIA 1: IT IS MINE
        act.sales_id = p_agent_sales_id
        
        -- CRITERIA 2: IT IS GLOBAL
        OR act.sales_id IS NULL
        
        -- CRITERIA 3: IT IS STALE AND STEALABLE
        OR (
          act.sales_id != p_agent_sales_id
          AND (owner.allow_remote_processing IS TRUE OR owner.allow_remote_processing IS NULL)
          AND act.created_at < now() - ((COALESCE(owner.stale_threshold_minutes, 15) || ' minutes')::interval)
        )
      )
    ORDER BY 
      (act.sales_id = p_agent_sales_id) DESC,
      (act.sales_id IS NULL) DESC,
      act.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  AND (a.sales_id = s_owner.id OR a.sales_id IS NULL)
  RETURNING a.id, a.raw_data, a.type, (a.sales_id IS NULL) AS is_global;
END;
$$;

-- 4.2. claim_task_compatible (SDK compatible)
CREATE OR REPLACE FUNCTION claim_task_compatible(
  target_task_id uuid,
  p_machine_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows int;
BEGIN
  UPDATE public.activities
  SET
    status = 'claimed',
    locked_by = p_machine_id,
    locked_at = now(),
    retry_count = retry_count + 1
  WHERE id = target_task_id
    AND (status = 'pending' OR status = 'failed')
    AND (locked_by IS NULL OR locked_at < now() - INTERVAL '5 minutes')
    AND NOT (p_machine_id = ANY(attempted_by));

  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  IF updated_rows > 0 THEN
    UPDATE public.activities
    SET attempted_by = array_append(attempted_by, p_machine_id)
    WHERE id = target_task_id;
  END IF;

  RETURN updated_rows > 0;
END;
$$;

-- 4.3. claim_next_task_standard (SDK compatible)
CREATE OR REPLACE FUNCTION claim_next_task_standard(
  p_machine_id text,
  p_task_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  raw_data jsonb,
  type text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  SELECT a.id INTO v_task_id
  FROM public.activities a
  WHERE
    (status = 'pending' OR status = 'failed')
    AND (locked_by IS NULL OR locked_at < now() - INTERVAL '5 minutes')
    AND NOT (p_machine_id = ANY(attempted_by))
    AND (p_task_type IS NULL OR a.type = p_task_type)
  ORDER BY
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_task_id IS NOT NULL THEN
    IF claim_task_compatible(v_task_id, p_machine_id) THEN
      RETURN QUERY
      SELECT a.id, a.raw_data, a.type
      FROM public.activities a
      WHERE a.id = v_task_id;
    END IF;
  END IF;
END;
$$;

-- 4.4. complete_task_standard
CREATE OR REPLACE FUNCTION complete_task_standard(
  p_task_id uuid,
  p_machine_id text,
  p_result jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows int;
BEGIN
  UPDATE public.activities
  SET
    status = 'completed',
    completed_at = now(),
    result = p_result,
    error_message = NULL
  WHERE id = p_task_id
    AND locked_by = p_machine_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- 4.5. fail_task_standard
CREATE OR REPLACE FUNCTION fail_task_standard(
  p_task_id uuid,
  p_machine_id text,
  p_error_message text,
  p_max_retries integer DEFAULT 3
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_rows int;
  current_retry_count int;
BEGIN
  SELECT retry_count INTO current_retry_count
  FROM public.activities
  WHERE id = p_task_id;

  UPDATE public.activities
  SET
    status = CASE
      WHEN current_retry_count >= p_max_retries THEN 'failed'
      ELSE 'pending'
    END,
    error_message = p_error_message,
    locked_by = NULL,
    locked_at = NULL
  WHERE id = p_task_id
    AND locked_by = p_machine_id;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- 5. Update Column Comments for clarity
COMMENT ON COLUMN public.activities.owner_id IS 'UUID of auth user (CRM context)';
COMMENT ON COLUMN public.activities.locked_by IS 'Text ID of machine (SDK context)';
COMMENT ON COLUMN public.activities.status IS 'Standard status: pending, claimed, processing, completed, failed';
