-- assessment-photos: flip the bucket private and tighten the client-write policies.
--
-- Why: the bucket was created public=true (20260611220000) and both mobile
-- upload paths read back getPublicUrl(), so any leaked URL exposed a
-- home-interior damage photo to the open internet with no expiry.
--
-- Why it is safe to flip today: the bucket holds ZERO objects. Client-side
-- direct-to-storage uploads from React Native never landed bytes -- documented
-- in apps/web/app/api/assessments/walkthrough/route.ts ("0 objects ever in the
-- bucket") and confirmed against storage.objects -- which is exactly why it is
-- empty. Nothing stored depends on public URLs.
--
-- ORDERING MATTERS: the bucket must go private BEFORE the mobile upload path
-- starts working. Fixing the upload first would begin streaming damage photos
-- into a world-readable bucket. Uploads now run server-side with the service
-- role and reads are short-TTL signed URLs (apps/web/lib/api/assessment-storage.ts).

UPDATE storage.buckets SET public = false WHERE id = 'assessment-photos';

-- Uploads are server-mediated (service role bypasses RLS), so these policies
-- are defence-in-depth for any future client write. Two changes:
--   1. auth.uid() -> (select auth.uid()): storage.objects was not covered by
--      the platform-wide initplan rewrite, so these were still re-evaluated
--      per row.
--   2. quick-ai/ is scoped to the caller's own folder. It previously allowed
--      any authenticated user to write anywhere under quick-ai/.
DROP POLICY IF EXISTS assessment_photos_insert_own ON storage.objects;
DROP POLICY IF EXISTS assessment_photos_update_own ON storage.objects;

CREATE POLICY assessment_photos_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND (
      (
        (storage.foldername(name))[1] = 'quick-ai'
        AND (storage.foldername(name))[2] = ((select auth.uid()))::text
      )
      OR (
        (storage.foldername(name))[1] = 'assessments'
        AND EXISTS (
          SELECT 1
          FROM public.building_assessments ba
          WHERE ba.id::text = (storage.foldername(name))[2]
            AND ba.user_id = (select auth.uid())
        )
      )
    )
  );

CREATE POLICY assessment_photos_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assessment-photos'
    AND (
      (
        (storage.foldername(name))[1] = 'quick-ai'
        AND (storage.foldername(name))[2] = ((select auth.uid()))::text
      )
      OR (
        (storage.foldername(name))[1] = 'assessments'
        AND EXISTS (
          SELECT 1
          FROM public.building_assessments ba
          WHERE ba.id::text = (storage.foldername(name))[2]
            AND ba.user_id = (select auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND (
      (
        (storage.foldername(name))[1] = 'quick-ai'
        AND (storage.foldername(name))[2] = ((select auth.uid()))::text
      )
      OR (
        (storage.foldername(name))[1] = 'assessments'
        AND EXISTS (
          SELECT 1
          FROM public.building_assessments ba
          WHERE ba.id::text = (storage.foldername(name))[2]
            AND ba.user_id = (select auth.uid())
        )
      )
    )
  );
