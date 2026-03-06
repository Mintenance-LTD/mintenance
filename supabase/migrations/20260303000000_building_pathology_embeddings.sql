-- Migration: Add pgvector semantic search to building_pathology_knowledge
-- Enables cosine-similarity retrieval of defect knowledge for RAG injection.
-- text-embedding-3-small (1536 dims) used for consistency with the rest of the codebase.
--
-- After running this migration, call:
--   POST /api/admin/rag/generate-embeddings
-- to seed embeddings for all existing knowledge base entries.

-- Enable pgvector extension (idempotent — no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns
ALTER TABLE building_pathology_knowledge
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- HNSW index for fast approximate nearest-neighbour cosine search
-- Partial index: only rows where embedding IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_bpk_embedding_hnsw
  ON building_pathology_knowledge
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- RPC: semantic similarity search
-- Returns top N entries whose embedding cosine similarity exceeds match_threshold.
-- Called from BuildingPathologyRAGService.queryBySemantic().
CREATE OR REPLACE FUNCTION search_pathology_semantic(
  query_embedding  vector(1536),
  match_threshold  float   DEFAULT 0.70,
  match_count      integer DEFAULT 5
)
RETURNS TABLE (
  id                    UUID,
  defect_slug           TEXT,
  category              TEXT,
  name                  TEXT,
  aka                   TEXT[],
  description           TEXT,
  why_it_happens        TEXT,
  visual_indicators     TEXT[],
  photo_detection_cues  TEXT[],
  common_misdiagnosis   TEXT[],
  differential_diagnosis TEXT,
  rics_condition_rating SMALLINT,
  urgency               TEXT,
  remediation_summary   TEXT,
  remediation_steps     TEXT[],
  cost_range_gbp_min    INTEGER,
  cost_range_gbp_max    INTEGER,
  regulatory_reference  TEXT[],
  property_age_risk     TEXT[],
  construction_type_risk TEXT[],
  specialist_required   BOOLEAN,
  further_investigation TEXT,
  source_authority      TEXT,
  similarity            float
)
LANGUAGE sql STABLE PARALLEL SAFE
AS $$
  SELECT
    id, defect_slug, category, name, aka,
    description, why_it_happens, visual_indicators,
    photo_detection_cues, common_misdiagnosis, differential_diagnosis,
    rics_condition_rating, urgency, remediation_summary, remediation_steps,
    cost_range_gbp_min, cost_range_gbp_max, regulatory_reference,
    property_age_risk, construction_type_risk, specialist_required,
    further_investigation, source_authority,
    1 - (embedding <=> query_embedding) AS similarity
  FROM building_pathology_knowledge
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Grant access: same pattern as existing building_pathology_knowledge policies
GRANT EXECUTE ON FUNCTION search_pathology_semantic TO authenticated, service_role;
