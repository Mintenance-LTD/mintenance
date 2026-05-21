-- R7 #19 of docs/RETENTION_ROADMAP_2026.md — right-of-reply + 48h moderation.
--
-- reviews.response already exists (text). We add:
--   response_at              — when the contractor wrote the reply
--   response_published_at    — when the reply becomes public (48h after
--                              response_at, unless an admin intervenes)
--
-- The cron `publish-review-replies` promotes `response_at + 48h` replies
-- into `response_published_at`. Public SELECT only exposes `response`
-- when `response_published_at <= now()`.

BEGIN;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS response_at TIMESTAMPTZ NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS response_published_at TIMESTAMPTZ NULL;

-- Admin veto flag (defaults to false; set to true blocks publication).
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS response_blocked_by_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for the hourly cron that flips pending → published.
CREATE INDEX IF NOT EXISTS idx_reviews_response_pending
  ON public.reviews (response_at)
  WHERE response_at IS NOT NULL
    AND response_published_at IS NULL
    AND response_blocked_by_admin = FALSE;

COMMIT;
