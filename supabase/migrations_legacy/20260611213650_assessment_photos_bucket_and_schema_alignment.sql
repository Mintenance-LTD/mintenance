-- 2026-06-11 property-assessment audit remediation (see local migration
-- 20260611220000_assessment_photos_bucket_and_schema_alignment.sql for the
-- full rationale).

-- 1. video_url
ALTER TABLE public.building_assessments
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.building_assessments.video_url IS
  'Signed Job-storage URL of the assessment walkthrough video. Written by POST /api/assessments/videos/upload.';

-- 2. validation_status widened to the vocabulary the routes/mobile/UI use
ALTER TABLE public.building_assessments
  DROP CONSTRAINT IF EXISTS building_assessments_validation_status_check;
ALTER TABLE public.building_assessments
  ADD CONSTRAINT building_assessments_validation_status_check
  CHECK ((validation_status)::text = ANY (ARRAY[
    'pending', 'validated', 'rejected', 'needs_review',
    'processing', 'completed', 'failed',
    'ai_analysis_failed', 'ai_analysis_skipped_no_auth'
  ]::text[]));

-- 3. urgency widened to the union of web + mobile vocabularies
ALTER TABLE public.building_assessments
  DROP CONSTRAINT IF EXISTS building_assessments_urgency_check;
ALTER TABLE public.building_assessments
  ADD CONSTRAINT building_assessments_urgency_check
  CHECK ((urgency)::text = ANY (ARRAY[
    'immediate', 'urgent', 'soon', 'planned', 'monitor',
    'needs_attention', 'emergency'
  ]::text[]));

-- 4. assessment-photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assessment-photos', 'assessment-photos', true, 10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "assessment_photos_insert_own" ON storage.objects;
CREATE POLICY "assessment_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND (
      (storage.foldername(name))[1] = 'quick-ai'
      OR (
        (storage.foldername(name))[1] = 'assessments'
        AND EXISTS (
          SELECT 1 FROM public.building_assessments ba
          WHERE ba.id::text = (storage.foldername(name))[2]
            AND ba.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "assessment_photos_update_own" ON storage.objects;
CREATE POLICY "assessment_photos_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assessment-photos'
    AND (
      (storage.foldername(name))[1] = 'quick-ai'
      OR (
        (storage.foldername(name))[1] = 'assessments'
        AND EXISTS (
          SELECT 1 FROM public.building_assessments ba
          WHERE ba.id::text = (storage.foldername(name))[2]
            AND ba.user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'assessment-photos'
    AND (
      (storage.foldername(name))[1] = 'quick-ai'
      OR (
        (storage.foldername(name))[1] = 'assessments'
        AND EXISTS (
          SELECT 1 FROM public.building_assessments ba
          WHERE ba.id::text = (storage.foldername(name))[2]
            AND ba.user_id = auth.uid()
        )
      )
    )
  );;
