-- Gate 1 / audit-reports/BETA_READINESS.md — storage bucket hardening
-- Phase 1 of 2: tighten Job-storage SELECT policy to participant-scoped.
-- Does NOT flip buckets.public (would break getPublicUrl() in 7 API routes).
-- Phase 2 will convert routes to createSignedUrl() and flip bucket private.

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

DROP POLICY IF EXISTS "Service role full access job storage" ON storage.objects;
CREATE POLICY "Service role full access job storage"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'Job-storage')
WITH CHECK (bucket_id = 'Job-storage');;
