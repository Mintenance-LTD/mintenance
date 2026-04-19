-- Extension schema migration — Phase 2 (vector)
-- Audit: PR-10, runbook docs/RUNBOOK_extensions_schema_migration.md
--
-- Moves the `vector` extension out of `public` into the `extensions` schema
-- to clear the `extension_in_public` advisor lint for vector. The runbook's
-- earlier worst-case plan (drop columns + recreate with embeddings.vector(N))
-- proved unnecessary after live pre-flight on 2026-04-19:
--
--   * vector(1536) columns exist on 3 tables: building_pathology_knowledge,
--     jobs, search_analytics.
--   * Embedding row counts are TINY: 30 in building_pathology_knowledge,
--     0 in jobs and search_analytics.
--   * 2 HNSW indexes use vector_cosine_ops:
--       - idx_bpk_embedding_hnsw  ON building_pathology_knowledge
--       - idx_jobs_embedding_hnsw ON jobs
--   * DB-wide search_path is already `"$user", public, extensions` so unqualified
--     `vector` references will continue to resolve after the move.
--
-- Postgres tracks type usage by OID (not by schema-qualified name), so existing
-- columns referencing the `vector` type stay bound across the schema move.
-- Same pattern that made pg_trgm safe (migration 20260419000003).
--
-- Safety: a snapshot of the 30 embeddings is captured to a private archive table
-- BEFORE the move, so worst case we can restore from it. The archive table lives
-- in the `private` schema if it exists; otherwise it's created locally.
--
-- Rollback: ALTER EXTENSION vector SET SCHEMA public;
--          (restore from archive_vector_embeddings_pre_2026_04_19 if columns broke).

-- 1. Defensive snapshot of the 30 known embeddings.
CREATE TABLE IF NOT EXISTS public.archive_vector_embeddings_pre_2026_04_19 (
  source_table text NOT NULL,
  source_id    text NOT NULL,
  embedding    vector(1536),
  snapshot_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_table, source_id)
);

-- Lock the snapshot table against accidental SELECT by anon. service_role only.
ALTER TABLE public.archive_vector_embeddings_pre_2026_04_19 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.archive_vector_embeddings_pre_2026_04_19;
CREATE POLICY "service_role_only" ON public.archive_vector_embeddings_pre_2026_04_19
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.archive_vector_embeddings_pre_2026_04_19 (source_table, source_id, embedding)
SELECT 'building_pathology_knowledge', id::text, embedding
FROM public.building_pathology_knowledge
WHERE embedding IS NOT NULL
ON CONFLICT (source_table, source_id) DO NOTHING;

-- jobs and search_analytics have 0 embeddings as of 2026-04-19; future-proof
-- the snapshot in case rows appear before this migration is applied.
INSERT INTO public.archive_vector_embeddings_pre_2026_04_19 (source_table, source_id, embedding)
SELECT 'jobs', id::text, embedding
FROM public.jobs
WHERE embedding IS NOT NULL
ON CONFLICT (source_table, source_id) DO NOTHING;

INSERT INTO public.archive_vector_embeddings_pre_2026_04_19 (source_table, source_id, embedding)
SELECT 'search_analytics', id::text, embedding
FROM public.search_analytics
WHERE embedding IS NOT NULL
ON CONFLICT (source_table, source_id) DO NOTHING;

-- 2. The actual move. Postgres re-stamps the namespace OID on the vector
-- type and all its operator classes / functions. Existing columns continue
-- to resolve via OID; new SQL resolves via search_path (already includes
-- 'extensions').
ALTER EXTENSION vector SET SCHEMA extensions;

-- Sanity verification (run manually after apply):
--   SELECT extname, n.nspname AS schema, e.extversion
--   FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid
--   WHERE extname = 'vector';
--   Expected: schema = 'extensions'.
--
--   SELECT count(*) FROM building_pathology_knowledge WHERE embedding IS NOT NULL;
--   Expected: 30 (unchanged from pre-move count).
--
--   SELECT indexname FROM pg_indexes
--   WHERE indexname IN ('idx_bpk_embedding_hnsw','idx_jobs_embedding_hnsw');
--   Expected: both still listed.
--
--   -- Smoke test that vector ops still work via search_path:
--   SELECT 1 - (embedding <=> embedding) AS self_cosine
--   FROM building_pathology_knowledge WHERE embedding IS NOT NULL LIMIT 1;
--   Expected: 1 (a vector compared with itself has cosine distance 0).
--
-- Once live & verified for >= 24 hours, drop the snapshot table:
--   DROP TABLE public.archive_vector_embeddings_pre_2026_04_19;
