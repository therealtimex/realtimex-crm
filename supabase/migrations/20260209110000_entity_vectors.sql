-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Ensure extensions is in the search path
-- This handles cases where the type might not be visible in public
SET search_path TO public, extensions;

-- Create entity_vectors table for semantic search
CREATE TABLE IF NOT EXISTS public.entity_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'contact', 'company', 'deal', 'task', 'note'
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,      -- The text that was embedded
    embedding vector(1536),    -- Standard OpenAI/RealTimeX dimensions
    model TEXT NOT NULL,       -- model name (e.g., 'text-embedding-3-small')
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.entity_vectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entity vectors"
ON public.entity_vectors
FOR SELECT
USING (true); -- Public read for now, filtering usually happens at the entity level in joins

CREATE POLICY "Service role can manage entity vectors"
ON public.entity_vectors
USING (auth.jwt() ->> 'role' = 'service_role');

-- Index for similarity search (IVFFlat or HNSW)
CREATE INDEX IF NOT EXISTS entity_vectors_embedding_idx ON public.entity_vectors 
USING hnsw (embedding vector_cosine_ops);

-- RPC for semantic search
CREATE OR REPLACE FUNCTION match_entities (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_entity_type text DEFAULT NULL,
  p_model text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  entity_id uuid,
  entity_type text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ev.id,
    ev.entity_id,
    ev.entity_type,
    ev.content,
    1 - (ev.embedding <=> query_embedding) AS similarity
  FROM public.entity_vectors ev
  WHERE (p_entity_type IS NULL OR ev.entity_type = p_entity_type)
    AND (p_model IS NULL OR ev.model = p_model)
    AND 1 - (ev.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
