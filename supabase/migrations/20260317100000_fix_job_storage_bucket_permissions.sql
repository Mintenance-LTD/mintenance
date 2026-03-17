-- ============================================================
-- Fix Job-storage bucket INSERT policy (too permissive)
-- ============================================================
-- BEFORE: Any authenticated user can upload to any folder in Job-storage
-- AFTER:  Only job participants (homeowner or contractor) can upload
--
-- The upload path follows the pattern: {job_id}/{photo_type}/{filename}
-- We verify the user is the homeowner or assigned contractor for that job.
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload job photos" ON storage.objects;

-- Create a restrictive policy: user must be the job's homeowner or contractor
-- The storage path pattern is: Job-storage/{job_id}/...
-- We extract the job_id from the first folder in the path
CREATE POLICY "Job participants can upload job photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Job-storage' AND
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id::text = (storage.foldername(name))[1]
    AND (
      jobs.homeowner_id = auth.uid()
      OR jobs.contractor_id = auth.uid()
    )
  )
);

-- Also add service_role policy for API uploads via server
DROP POLICY IF EXISTS "Service role can manage job storage" ON storage.objects;
CREATE POLICY "Service role can manage job storage"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'Job-storage')
WITH CHECK (bucket_id = 'Job-storage');
