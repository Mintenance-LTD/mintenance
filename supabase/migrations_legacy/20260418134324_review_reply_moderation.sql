BEGIN;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS response_published_at TIMESTAMPTZ NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS response_blocked_by_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reviews_response_pending
  ON public.reviews (response_at)
  WHERE response_at IS NOT NULL
    AND response_published_at IS NULL
    AND response_blocked_by_admin = FALSE;

COMMIT;;
