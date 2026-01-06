-- Migration: Add Vector Search Support
-- Created: 2025-02-02
-- Description: Enables pgvector extension and adds embedding columns for semantic search on jobs and contractors

-- ============================================================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- ADD EMBEDDING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add embedding column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-small';

-- Add embedding column to users table (for contractor profiles)
ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-small';

COMMENT ON COLUMN jobs.embedding IS 'Vector embedding of job title + description + category for semantic search';
COMMENT ON COLUMN jobs.embedding_updated_at IS 'Timestamp when embedding was last generated';
COMMENT ON COLUMN jobs.embedding_model IS 'OpenAI model used to generate the embedding';

COMMENT ON COLUMN users.embedding IS 'Vector embedding of contractor profile (bio + skills + experience) for semantic search';
COMMENT ON COLUMN users.embedding_updated_at IS 'Timestamp when embedding was last generated';
COMMENT ON COLUMN users.embedding_model IS 'OpenAI model used to generate the embedding';

-- ============================================================================
-- VECTOR SIMILARITY INDEXES
-- ============================================================================

-- Create HNSW index for fast approximate nearest neighbor search on jobs
-- HNSW (Hierarchical Navigable Small World) is optimal for high-dimensional vectors
CREATE INDEX IF NOT EXISTS idx_jobs_embedding_hnsw
  ON jobs USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Create IVFFlat index as fallback (faster build time, slightly slower queries)
-- Useful for development/testing environments
-- CREATE INDEX IF NOT EXISTS idx_jobs_embedding_ivfflat
--   ON jobs USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100)
--   WHERE embedding IS NOT NULL;

-- Create HNSW index for contractor profiles
CREATE INDEX IF NOT EXISTS idx_users_embedding_hnsw
  ON users USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL AND role = 'contractor';

-- ============================================================================
-- SEMANTIC SEARCH FUNCTIONS
-- ============================================================================

-- Function to search jobs semantically
CREATE OR REPLACE FUNCTION search_jobs_semantic(
  query_embedding vector(1536),
  category_filter TEXT DEFAULT NULL,
  location_filter TEXT DEFAULT NULL,
  price_min NUMERIC DEFAULT NULL,
  price_max NUMERIC DEFAULT NULL,
  status_filter TEXT DEFAULT 'posted',
  match_limit INTEGER DEFAULT 20,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  location TEXT,
  budget NUMERIC,
  status TEXT,
  homeowner_id UUID,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    j.category,
    j.location,
    j.budget,
    j.status,
    j.homeowner_id,
    1 - (j.embedding <=> query_embedding) AS similarity,
    j.created_at
  FROM jobs j
  WHERE
    j.embedding IS NOT NULL
    AND (category_filter IS NULL OR j.category = category_filter)
    AND (location_filter IS NULL OR j.location ILIKE '%' || location_filter || '%')
    AND (price_min IS NULL OR j.budget >= price_min)
    AND (price_max IS NULL OR j.budget <= price_max)
    AND (status_filter IS NULL OR j.status = status_filter)
    AND (1 - (j.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Function to search contractors semantically
CREATE OR REPLACE FUNCTION search_contractors_semantic(
  query_embedding vector(1536),
  skills_filter TEXT[] DEFAULT NULL,
  location_filter TEXT DEFAULT NULL,
  min_rating NUMERIC DEFAULT NULL,
  verification_required BOOLEAN DEFAULT FALSE,
  match_limit INTEGER DEFAULT 20,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  bio TEXT,
  location TEXT,
  rating NUMERIC,
  total_jobs INTEGER,
  is_verified BOOLEAN,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.bio,
    u.location,
    u.rating,
    u.total_jobs,
    u.is_verified,
    1 - (u.embedding <=> query_embedding) AS similarity
  FROM users u
  WHERE
    u.role = 'contractor'
    AND u.embedding IS NOT NULL
    AND (location_filter IS NULL OR u.location ILIKE '%' || location_filter || '%')
    AND (min_rating IS NULL OR u.rating >= min_rating)
    AND (verification_required = FALSE OR u.is_verified = TRUE)
    AND (skills_filter IS NULL OR EXISTS (
      SELECT 1 FROM contractor_skills cs
      WHERE cs.contractor_id = u.id
      AND cs.skill_name = ANY(skills_filter)
    ))
    AND (1 - (u.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY u.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;

-- Function to find similar jobs (for recommendations)
CREATE OR REPLACE FUNCTION find_similar_jobs(
  job_id UUID,
  match_limit INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  budget NUMERIC,
  status TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  source_embedding vector(1536);
BEGIN
  -- Get the embedding of the source job
  SELECT embedding INTO source_embedding
  FROM jobs
  WHERE jobs.id = job_id;

  -- Return early if no embedding found
  IF source_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    j.id,
    j.title,
    j.description,
    j.category,
    j.budget,
    j.status,
    1 - (j.embedding <=> source_embedding) AS similarity
  FROM jobs j
  WHERE
    j.id != job_id
    AND j.embedding IS NOT NULL
    AND (1 - (j.embedding <=> source_embedding)) >= similarity_threshold
  ORDER BY j.embedding <=> source_embedding
  LIMIT match_limit;
END;
$$;

-- Function to find similar contractors (for recommendations)
CREATE OR REPLACE FUNCTION find_similar_contractors(
  contractor_id UUID,
  match_limit INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  bio TEXT,
  rating NUMERIC,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  source_embedding vector(1536);
BEGIN
  -- Get the embedding of the source contractor
  SELECT embedding INTO source_embedding
  FROM users
  WHERE users.id = contractor_id AND users.role = 'contractor';

  -- Return early if no embedding found
  IF source_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.bio,
    u.rating,
    1 - (u.embedding <=> source_embedding) AS similarity
  FROM users u
  WHERE
    u.id != contractor_id
    AND u.role = 'contractor'
    AND u.embedding IS NOT NULL
    AND (1 - (u.embedding <=> source_embedding)) >= similarity_threshold
  ORDER BY u.embedding <=> source_embedding
  LIMIT match_limit;
END;
$$;

-- ============================================================================
-- EMBEDDING GENERATION TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS embedding_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('job', 'contractor', 'bid', 'article')),
  entity_id UUID NOT NULL,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 0, -- Higher priority processed first

  -- Text content to embed
  content_text TEXT NOT NULL,

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for embedding generation queue
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status
  ON embedding_generation_queue(status, priority DESC, created_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_embedding_queue_entity
  ON embedding_generation_queue(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_embedding_queue_created
  ON embedding_generation_queue(created_at DESC);

-- ============================================================================
-- EMBEDDING STATISTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS embedding_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  entity_type VARCHAR(50) NOT NULL,

  -- Generation stats
  embeddings_generated INTEGER DEFAULT 0,
  embeddings_failed INTEGER DEFAULT 0,
  avg_generation_time_ms INTEGER,

  -- Search stats
  semantic_searches_performed INTEGER DEFAULT 0,
  avg_search_latency_ms INTEGER,
  avg_results_per_search NUMERIC,

  -- Quality metrics
  avg_similarity_score NUMERIC,
  zero_result_searches INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, entity_type)
);

-- Index for statistics
CREATE INDEX IF NOT EXISTS idx_embedding_statistics_date
  ON embedding_statistics(date DESC);

CREATE INDEX IF NOT EXISTS idx_embedding_statistics_entity_type
  ON embedding_statistics(entity_type);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE embedding_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_statistics ENABLE ROW LEVEL SECURITY;

-- Service role can manage embedding queue
CREATE POLICY "Service role can manage embedding queue"
  ON embedding_generation_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Service role can manage embedding statistics
CREATE POLICY "Service role can manage embedding statistics"
  ON embedding_statistics FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view statistics
CREATE POLICY "Admins can view embedding statistics"
  ON embedding_statistics FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to queue embedding generation for a job
CREATE OR REPLACE FUNCTION queue_job_embedding(
  p_job_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content TEXT;
  v_queue_id UUID;
BEGIN
  -- Get job content
  SELECT
    CONCAT_WS(' | ',
      title,
      description,
      COALESCE(category, ''),
      COALESCE(location, '')
    )
  INTO v_content
  FROM jobs
  WHERE id = p_job_id;

  IF v_content IS NULL THEN
    RAISE EXCEPTION 'Job not found: %', p_job_id;
  END IF;

  -- Queue for embedding generation
  INSERT INTO embedding_generation_queue (
    entity_type,
    entity_id,
    content_text,
    priority
  ) VALUES (
    'job',
    p_job_id,
    v_content,
    1
  )
  ON CONFLICT (entity_type, entity_id) WHERE status != 'completed'
  DO UPDATE SET
    content_text = EXCLUDED.content_text,
    status = 'pending',
    retry_count = 0,
    updated_at = NOW()
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Function to queue embedding generation for a contractor
CREATE OR REPLACE FUNCTION queue_contractor_embedding(
  p_contractor_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content TEXT;
  v_queue_id UUID;
  v_skills TEXT;
BEGIN
  -- Get contractor skills
  SELECT STRING_AGG(skill_name, ', ')
  INTO v_skills
  FROM contractor_skills
  WHERE contractor_id = p_contractor_id;

  -- Get contractor content
  SELECT
    CONCAT_WS(' | ',
      first_name,
      last_name,
      COALESCE(bio, ''),
      COALESCE(location, ''),
      COALESCE(v_skills, '')
    )
  INTO v_content
  FROM users
  WHERE id = p_contractor_id AND role = 'contractor';

  IF v_content IS NULL THEN
    RAISE EXCEPTION 'Contractor not found: %', p_contractor_id;
  END IF;

  -- Queue for embedding generation
  INSERT INTO embedding_generation_queue (
    entity_type,
    entity_id,
    content_text,
    priority
  ) VALUES (
    'contractor',
    p_contractor_id,
    v_content,
    1
  )
  ON CONFLICT (entity_type, entity_id) WHERE status != 'completed'
  DO UPDATE SET
    content_text = EXCLUDED.content_text,
    status = 'pending',
    retry_count = 0,
    updated_at = NOW()
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$;

-- Add unique constraint to prevent duplicate queue entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_embedding_queue_entity_unique
  ON embedding_generation_queue(entity_type, entity_id)
  WHERE status IN ('pending', 'processing');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN jobs.embedding IS 'Vector embedding of job title + description + category for semantic search using OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON COLUMN users.embedding IS 'Vector embedding of contractor profile (bio + skills + experience) for semantic search';

COMMENT ON TABLE embedding_generation_queue IS 'Queue for async embedding generation for jobs, contractors, and other entities';
COMMENT ON TABLE embedding_statistics IS 'Daily statistics about embedding generation and semantic search usage';

COMMENT ON FUNCTION search_jobs_semantic IS 'Semantic search for jobs using vector similarity. Returns jobs ordered by cosine similarity to query embedding.';
COMMENT ON FUNCTION search_contractors_semantic IS 'Semantic search for contractors using vector similarity. Returns contractors ordered by cosine similarity to query embedding.';
COMMENT ON FUNCTION find_similar_jobs IS 'Find similar jobs based on vector embedding similarity';
COMMENT ON FUNCTION find_similar_contractors IS 'Find similar contractors based on vector embedding similarity';
