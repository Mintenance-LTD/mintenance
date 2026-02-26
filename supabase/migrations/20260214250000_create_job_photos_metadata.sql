-- Migration: Create job_photos_metadata table
-- Date: 2026-02-14 (inserted before 20260215000002 which references this table)
--
-- This table is the canonical photo storage for job evidence (before/after photos).
-- It was referenced by 20+ API routes and services but never had a CREATE TABLE migration.
-- The deprecate_jobs_photos migration (20260215000002) inserts into this table,
-- and the geolocation migration (20260218000001) alters it.
-- This migration MUST run before both.

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_photos_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  geolocation JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  quality_score NUMERIC(5,2),
  angle_type TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_job_id
  ON public.job_photos_metadata(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_job_id_photo_type
  ON public.job_photos_metadata(job_id, photo_type);
CREATE INDEX IF NOT EXISTS idx_job_photos_metadata_created_by
  ON public.job_photos_metadata(created_by);

-- Enable RLS
ALTER TABLE public.job_photos_metadata ENABLE ROW LEVEL SECURITY;

-- Homeowner can view photos for their own jobs
CREATE POLICY "Homeowners can view photos for their jobs"
  ON public.job_photos_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos_metadata.job_id
        AND j.homeowner_id = auth.uid()
    )
  );

-- Contractor can view photos for jobs they are assigned to
CREATE POLICY "Contractors can view photos for assigned jobs"
  ON public.job_photos_metadata FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos_metadata.job_id
        AND j.contractor_id = auth.uid()
    )
  );

-- Contractor can insert photos for jobs they are assigned to
CREATE POLICY "Contractors can upload photos for assigned jobs"
  ON public.job_photos_metadata FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos_metadata.job_id
        AND j.contractor_id = auth.uid()
    )
  );

-- Service role has full access (for API server-side operations)
CREATE POLICY "Service role full access on job_photos_metadata"
  ON public.job_photos_metadata FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
