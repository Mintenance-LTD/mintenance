-- 2026-05-09 audit follow-up: the /jobs/[id]/review page collects a
-- thumbs-up/thumbs-down "would recommend" answer and the API route
-- accepts the field, but it was silently dropped because the reviews
-- table had no column for it. Add the column so the answer persists.

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN;

COMMENT ON COLUMN public.reviews.would_recommend IS
  'Reviewer''s thumbs-up/thumbs-down answer to "Would you recommend this contractor?". NULL = not answered (legacy reviews predating 2026-05-09).';
