-- 003_jobs_photos_backfill.sql
-- Purpose: Consolidate job photos in relational table and offer a compatibility view.

BEGIN;

-- Ensure UUID extension (for uuid_generate_v4)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure jobs_photos exists (minimal structure if missing)
CREATE TABLE IF NOT EXISTS public.jobs_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill from jobs.photos JSONB array of strings
INSERT INTO public.jobs_photos (job_id, photo_url)
SELECT j.id, elem
FROM public.jobs j
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(j.photos, '[]'::jsonb)) AS elem
ON CONFLICT DO NOTHING;

-- Compatibility view aggregating photos by job
CREATE OR REPLACE VIEW public.v_job_photos AS
SELECT j.id AS job_id,
       ARRAY_AGG(jp.photo_url ORDER BY jp.display_order, jp.created_at) AS photo_urls
FROM public.jobs j
LEFT JOIN public.jobs_photos jp ON jp.job_id = j.id
GROUP BY j.id;

COMMIT;
