-- assessment_images: stop capping an assessment at four images.
--
-- assessment_images_image_index_check was CHECK (image_index >= 0 AND
-- image_index < 4) -- a limit inherited from the original photo assessment,
-- which took at most four photos.
--
-- The video walkthrough uploads up to 20 keyframes (MAX_FRAMES in
-- app/api/assessments/walkthrough/route.ts) and inserts them with
-- image_index 0..N-1. Every walkthrough with five or more frames therefore
-- violated the CHECK, and because the route inserts all rows in ONE statement
-- the whole batch failed atomically. The failure was invisible twice over: the
-- insert was wrapped in a "best-effort" try/catch, and supabase-js returns
-- `{ error }` rather than throwing, so the catch never even fired. Production
-- reached 53 frames in the assessment-photos bucket and ZERO assessment_images
-- rows for any walkthrough -- frames uploaded, analysed, then orphaned.
--
-- That is why a survey could not show the image a finding came from, and why
-- assessment history had no thumbnails.
--
-- The new bound is deliberately loose. The real limit is product policy and
-- belongs in the route (MAX_FRAMES); this constraint exists only to stop
-- something absurd reaching the table. Pinning the database to the exact UI
-- number is what caused this bug in the first place.

ALTER TABLE public.assessment_images
  DROP CONSTRAINT IF EXISTS assessment_images_image_index_check;

ALTER TABLE public.assessment_images
  ADD CONSTRAINT assessment_images_image_index_check
  CHECK (image_index >= 0 AND image_index < 64);
