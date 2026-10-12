-- Existing bytes remain stored; public downloads are no longer permitted.
UPDATE storage.buckets SET public = false WHERE id = 'training-images';

DROP POLICY IF EXISTS "Authenticated users can upload job attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload job attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-attachments'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id::text = (storage.foldername(objects.name))[1]
        AND (j.homeowner_id = (SELECT auth.uid())
          OR j.contractor_id = (SELECT auth.uid())
          OR j.payer_user_id = (SELECT auth.uid()))
    )
  )
);

-- An uploader must not move an existing object into a different user's/job's
-- namespace via UPDATE. Existing restrictive dispute-evidence policies remain.
DROP POLICY IF EXISTS "Users can update their own job attachments" ON storage.objects;
CREATE POLICY "Users can update their own job attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-attachments' AND owner = (SELECT auth.uid()))
WITH CHECK (
  bucket_id = 'job-attachments' AND owner = (SELECT auth.uid())
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id::text = (storage.foldername(objects.name))[1]
        AND (j.homeowner_id = (SELECT auth.uid())
          OR j.contractor_id = (SELECT auth.uid())
          OR j.payer_user_id = (SELECT auth.uid()))
    )
  )
);
