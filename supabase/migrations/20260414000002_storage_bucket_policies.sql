-- Sprint 6.1 / XC-P1 storage bucket policy hardening (audit 2026-04-13)
--
-- Closes the `public_bucket_allows_listing` advisor warnings for buckets
-- that should NOT be world-readable:
--
--   1. contractor-documents  — was publicly readable; now contractor+admin
--   2. training-images       — was publicly readable; now admin+service_role
--   3. job-attachments       — was publicly readable; now job participants
--
-- Intentionally left public (profile-surface buckets):
--   - avatars
--   - contractor-portfolio
--   - profile-images
-- These are the user's public-facing profile pictures / work showcase.
-- The advisor will still flag them; that is by design. Track in
-- docs/SUPABASE_DASHBOARD_CHECKLIST.md as "intentional public buckets".
--
-- Not touched by this migration (complex path conventions — follow-up):
--   - Job-storage (legacy bucket with mixed `job-photos/...` vs
--     `job-photos/{job_id}/...` paths; needs a per-row owner check or a
--     backfill of the bucket path to normalize).

-- ============================================================
-- 1. contractor-documents — restrict to owner + admin
-- ============================================================

DROP POLICY IF EXISTS "Public read contractor documents" ON storage.objects;

-- "Contractors read own documents" already exists (scoped by foldername[1] = auth.uid())
-- Add an admin-read policy so compliance can review submitted docs.
DROP POLICY IF EXISTS "Admins read contractor documents" ON storage.objects;
CREATE POLICY "Admins read contractor documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'contractor-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 2. training-images — admin + service_role only
-- ============================================================

DROP POLICY IF EXISTS "Public can view training images" ON storage.objects;

DROP POLICY IF EXISTS "Admins read training images" ON storage.objects;
CREATE POLICY "Admins read training images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'training-images'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 3. job-attachments — scope SELECT to job participants
-- ============================================================
-- Paths follow `{job_id}/filename.ext` so we can extract the job_id
-- from (storage.foldername(name))[1] and check ownership.

DROP POLICY IF EXISTS "Anyone can view job attachments" ON storage.objects;

DROP POLICY IF EXISTS "Job participants can view job attachments" ON storage.objects;
CREATE POLICY "Job participants can view job attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
        AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
  );

-- Admin read for dispute resolution / support.
DROP POLICY IF EXISTS "Admins read job attachments" ON storage.objects;
CREATE POLICY "Admins read job attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-attachments'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
