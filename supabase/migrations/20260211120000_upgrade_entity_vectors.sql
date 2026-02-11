-- Upgrade entity_vectors table for existing databases
-- This migration handles cases where the table was created with the old schema

-- Step 1: Check if the table exists and needs upgrading
DO $$
DECLARE
    entity_id_type text;
    has_unique_constraint boolean;
BEGIN
    -- Check current entity_id type
    SELECT data_type INTO entity_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'entity_vectors'
      AND column_name = 'entity_id';

    -- Check if unique constraint exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'entity_vectors'
          AND constraint_type = 'UNIQUE'
          AND constraint_name LIKE '%entity_type%entity_id%model%'
    ) INTO has_unique_constraint;

    -- Only proceed if table exists
    IF entity_id_type IS NOT NULL THEN
        -- Step 2: If entity_id is UUID, convert to BIGINT
        IF entity_id_type = 'uuid' THEN
            RAISE NOTICE 'Converting entity_id from UUID to BIGINT...';

            -- Drop existing data (since UUID can't be cast to BIGINT directly)
            -- This is safe for a new feature that hasn't been used in production yet
            TRUNCATE TABLE public.entity_vectors;

            -- Alter column type
            ALTER TABLE public.entity_vectors
            ALTER COLUMN entity_id TYPE BIGINT USING NULL;
        END IF;

        -- Step 3: If embedding is fixed dimension, make it variable
        -- Note: PostgreSQL allows this change without data loss
        -- The vector type is flexible - vector(1536) can be read as vector

        -- Step 4: Add unique constraint if missing
        IF NOT has_unique_constraint THEN
            RAISE NOTICE 'Adding unique constraint on (entity_type, entity_id, model)...';

            -- Remove any duplicate rows first (shouldn't exist, but safety first)
            DELETE FROM public.entity_vectors a
            USING public.entity_vectors b
            WHERE a.id > b.id
              AND a.entity_type = b.entity_type
              AND a.entity_id = b.entity_id
              AND a.model = b.model;

            -- Add unique constraint
            ALTER TABLE public.entity_vectors
            ADD CONSTRAINT entity_vectors_entity_type_entity_id_model_key
            UNIQUE (entity_type, entity_id, model);
        END IF;

        RAISE NOTICE 'entity_vectors table upgrade complete!';
    END IF;
END $$;

COMMENT ON TABLE public.entity_vectors IS 'Stores embeddings for CRM entities with support for multiple models and dimensions (upgraded schema)';
