-- Gate 1 / audit-reports/BETA_READINESS.md — storage bucket hardening
--
-- Problem: Job-storage SELECT policy is `USING (bucket_id = 'Job-storage')`,
-- which lets ANY authenticated user list or read ANY job's photos as long as
-- they can find the path. Supabase advisor flagged this as the last
-- unresolved `public_bucket_allows_listing` warning after Sprint 6.
--
-- Fix: replace the blanket SELECT with a participant-scoped policy that
-- verifies the caller is the homeowner or assigned contractor on the job the
-- photo belongs to. Admins retain read access for dispute resolution.
--
-- Path conventions in use (verified across api/jobs/** on 2026-04-15):
--   A. `{jobId}/{file}`                            (upload-photos with job_id)
--   B. `job-photos/{jobId}/{kind}/{file}`          (photos/before|after|video)
--   C. `job-photos/{file}`                         (legacy, no jobId) — admin only
--
-- Pattern A puts jobId at foldername[1]; pattern B puts it at foldername[2].
-- Pattern C has length 1 and cannot be attributed to a job — restrict to admin.

-- Phase 1 of 2: this migration tightens the SELECT policy so that
-- authenticated list() / RLS-scoped reads only return rows the caller owns.
-- It deliberately does NOT flip `buckets.public` to false, because every API
-- route still calls getPublicUrl(); a flip here would break photo rendering
-- in prod. Phase 2 (tracked in Gate 1 of audit-reports/BETA_READINESS.md)
-- converts the 7 upload routes to createSignedUrl() and then flips the
-- bucket private in a follow-up migration.
--
-- Net effect of Phase 1: the advisor warning about authenticated listing
-- is closed; direct public URL access continues to work. URL secrecy
-- (path contains user IDs + random tokens) remains the only defence against
-- unauthenticated third parties until Phase 2 lands.

DROP POLICY IF EXISTS "Authenticated users can view job photos" ON storage.objects;
DROP POLICY IF EXISTS "Job participants can view job photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all job photos" ON storage.objects;

CREATE POLICY "Job participants can view job photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'Job-storage'
  AND (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
        AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
    OR (
      (storage.foldername(name))[1] = 'job-photos'
      AND array_length(storage.foldername(name), 1) >= 2
      AND EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id::text = (storage.foldername(name))[2]
          AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
      )
    )
  )
);

CREATE POLICY "Admins can view all job photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'Job-storage'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- service_role retains full access (was already present, keep for clarity)
DROP POLICY IF EXISTS "Service role full access job storage" ON storage.objects;
CREATE POLICY "Service role full access job storage"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'Job-storage')
WITH CHECK (bucket_id = 'Job-storage');
