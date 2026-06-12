-- 2026-06-11 property-assessment audit remediation.
--
-- The mobile PropertyAssessmentScreen flow has been broken end-to-end in
-- production since launch, with every failure swallowed client-side:
--
--   1. `assessment-photos` storage bucket was referenced by mobile
--      uploadPhotos.ts + analyzeWithMintAI.ts but never created — every
--      photo upload failed, so triggerAIAnalysis() always skipped and no
--      mobile assessment ever got AI analysis (0 mobile rows live).
--   2. `building_assessments.video_url` was written by
--      POST /api/assessments/videos/upload and selected by
--      GET /api/assessments/[id]/status but never existed — the video
--      route 500'd on every call and the status poll 404'd on every call.
--   3. The validation_status / urgency CHECK constraints only allowed the
--      original enum while the routes, the PATCH Zod schema, mobile
--      triggerAIAnalysis and the web PropertyAssessments.tsx UI all use a
--      wider vocabulary ('processing', 'ai_analysis_failed',
--      'needs_attention', 'emergency', ...). Code is coherent across 5+
--      files; the constraint is the outlier — widen it (union, additive,
--      no existing row violates).

-- 1. video_url ---------------------------------------------------------------
ALTER TABLE public.building_assessments
  ADD COLUMN IF NOT EXISTS video_url TEXT;

COMMENT ON COLUMN public.building_assessments.video_url IS
  'Signed Job-storage URL of the assessment walkthrough video. Written by POST /api/assessments/videos/upload.';

-- 2. validation_status: original enum + processing/completed/failed +
--    the two mobile AI-failure markers (see triggerAIAnalysis.ts and the
--    PATCH /api/assessments/[id]/status Zod schema).
ALTER TABLE public.building_assessments
  DROP CONSTRAINT IF EXISTS building_assessments_validation_status_check;
ALTER TABLE public.building_assessments
  ADD CONSTRAINT building_assessments_validation_status_check
  CHECK ((validation_status)::text = ANY (ARRAY[
    'pending', 'validated', 'rejected', 'needs_review',
    'processing', 'completed', 'failed',
    'ai_analysis_failed', 'ai_analysis_skipped_no_auth'
  ]::text[]));

-- 3. urgency: union of the original web vocabulary
--    (immediate/urgent/soon/planned/monitor) and the mobile + PATCH-route
--    vocabulary (monitor/needs_attention/urgent/emergency). Consolidating
--    to a single scale is a follow-up; this stops the 500s.
ALTER TABLE public.building_assessments
  DROP CONSTRAINT IF EXISTS building_assessments_urgency_check;
ALTER TABLE public.building_assessments
  ADD CONSTRAINT building_assessments_urgency_check
  CHECK ((urgency)::text = ANY (ARRAY[
    'immediate', 'urgent', 'soon', 'planned', 'monitor',
    'needs_attention', 'emergency'
  ]::text[]));

-- 4. assessment-photos bucket ------------------------------------------------
-- Public (mobile builds public URLs via getPublicUrl and the
-- building-surveyor pipeline fetches them); object paths embed an
-- unguessable assessment UUID. 'image/jpg' is included because
-- uploadPhotos.ts derives the content type from the file extension and
-- ships the non-standard 'image/jpg' for .jpg files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assessment-photos', 'assessment-photos', true, 10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Uploads: authenticated users only, scoped to
--   assessments/<assessment-id-they-own>/...  (PropertyAssessmentScreen)
--   quick-ai/...                              (AIAssessmentScreen single-shot)
-- No broad SELECT policy: public-bucket CDN reads do not require one and
-- omitting it blocks SDK listing (matches 20260417001856 hardening).
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

-- uploadPhotos.ts uses upsert:true (retry-safe re-upload of index N) which
-- needs UPDATE as well as INSERT.
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
  );
