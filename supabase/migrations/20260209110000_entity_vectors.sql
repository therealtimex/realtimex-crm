-- Entity Vectors for Semantic Search
-- Based on realtimex-alchemy's proven multi-dimensional vector strategy
-- Supports embeddings from multiple models with different dimensions

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Ensure extensions schema is in search path
SET search_path TO public, extensions;

-- Create entity_vectors table for semantic search
CREATE TABLE IF NOT EXISTS public.entity_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- 'contact', 'company', 'deal', 'task', 'note'
    entity_id BIGINT NOT NULL,  -- Foreign key to CRM entities (bigint, not UUID!)
    content TEXT NOT NULL,      -- The text that was embedded
    embedding vector NOT NULL,  -- Variable dimension support (384, 768, 1024, 1536, etc.)
    model TEXT NOT NULL,        -- model name (e.g., 'text-embedding-3-small')
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Unique constraint: allows multiple embeddings per entity (one per model)
    UNIQUE(entity_type, entity_id, model)
);

-- RLS Policies
ALTER TABLE public.entity_vectors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own vectors
CREATE POLICY "Authenticated users can view entity vectors"
ON public.entity_vectors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert entity vectors"
ON public.entity_vectors FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update entity vectors"
ON public.entity_vectors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete entity vectors"
ON public.entity_vectors FOR DELETE TO authenticated USING (true);

-- Service role can do everything
CREATE POLICY "Service role can manage all entity vectors"
ON public.entity_vectors FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX idx_entity_vectors_entity_id ON public.entity_vectors(entity_id);
CREATE INDEX idx_entity_vectors_entity_type ON public.entity_vectors(entity_type);
CREATE INDEX idx_entity_vectors_model ON public.entity_vectors(model);

-- Partial HNSW indexes per dimension for fast similarity search
-- Each dimension gets its own optimized index

-- 384 dimensions (sentence-transformers/all-MiniLM-L6-v2)
CREATE INDEX idx_entity_vectors_embed_384 ON public.entity_vectors
    USING hnsw ((embedding::vector(384)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 384;

-- 768 dimensions (nomic-embed-text-v1.5, BAAI/bge-base-en-v1.5)
CREATE INDEX idx_entity_vectors_embed_768 ON public.entity_vectors
    USING hnsw ((embedding::vector(768)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 768;

-- 1024 dimensions (mxbai-embed-large, BAAI/bge-large-en-v1.5)
CREATE INDEX idx_entity_vectors_embed_1024 ON public.entity_vectors
    USING hnsw ((embedding::vector(1024)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 1024;

-- 1536 dimensions (text-embedding-3-small, text-embedding-ada-002)
CREATE INDEX idx_entity_vectors_embed_1536 ON public.entity_vectors
    USING hnsw ((embedding::vector(1536)) vector_cosine_ops)
    WHERE array_length(embedding::real[], 1) = 1536;

-- RPC for semantic search with variable dimension support
CREATE OR REPLACE FUNCTION match_entities (
  query_embedding vector,
  match_threshold float,
  match_count int,
  p_entity_type text DEFAULT NULL,
  p_model text DEFAULT NULL,
  p_dimensions int DEFAULT 1536
)
RETURNS TABLE (
  id uuid,
  entity_id bigint,
  entity_type text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use dynamic SQL to apply explicit dimension casting
  -- This triggers the partial index for the specified dimension
  RETURN QUERY EXECUTE format(
    'SELECT
      ev.id,
      ev.entity_id,
      ev.entity_type,
      ev.content,
      (1 - (ev.embedding::vector(%s) <=> $1::vector(%s)))::FLOAT AS similarity
    FROM public.entity_vectors ev
    WHERE ($2::text IS NULL OR ev.entity_type = $2)
      AND ($3::text IS NULL OR ev.model = $3)
      AND array_length(ev.embedding::real[], 1) = %s
      AND 1 - (ev.embedding::vector(%s) <=> $1::vector(%s)) > $4
    ORDER BY ev.embedding::vector(%s) <=> $1::vector(%s)
    LIMIT $5',
    p_dimensions, p_dimensions,
    p_dimensions,
    p_dimensions, p_dimensions,
    p_dimensions, p_dimensions
  )
  USING query_embedding, p_entity_type, p_model, match_threshold, match_count;
END;
$$;

COMMENT ON TABLE public.entity_vectors IS 'Stores embeddings for CRM entities with support for multiple models and dimensions';
COMMENT ON COLUMN public.entity_vectors.entity_id IS 'Foreign key to CRM entities (contacts.id, companies.id, etc.) - uses bigint to match CRM schema';
COMMENT ON FUNCTION match_entities(vector, float, int, text, text, int) IS 'Semantic similarity search with variable dimension support. Filters by entity_type and model to ensure only compatible vectors are compared.';
