-- Migration: Consolidate reviewed_id → reviewee_id on reviews table.
-- The canonical column is reviewee_id (defined in migrations 009 and 20260209100000).
-- The legacy reviewed_id column has been removed from all app code.
-- mv_user_activity materialized view depends on reviewed_id; recreated below.

-- Step 1: Backfill reviewee_id from reviewed_id where reviewee_id is null
UPDATE public.reviews
SET reviewee_id = reviewed_id
WHERE reviewee_id IS NULL AND reviewed_id IS NOT NULL;

-- Step 2: Create index on reviewee_id if not exists
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);

-- Step 3: Drop dependent materialized view so we can drop the column
DROP MATERIALIZED VIEW IF EXISTS public.mv_user_activity;

-- Step 4: Drop the legacy column and its index
DROP INDEX IF EXISTS public.idx_reviews_reviewed_id;
ALTER TABLE public.reviews DROP COLUMN IF EXISTS reviewed_id;

-- Step 5: Recreate mv_user_activity using reviewee_id
CREATE MATERIALIZED VIEW public.mv_user_activity AS
SELECT u.id AS user_id,
    u.role,
    u.is_available,
    count(DISTINCT j.id) AS total_jobs,
    count(DISTINCT
        CASE
            WHEN (j.status = 'completed'::text) THEN j.id
            ELSE NULL::uuid
        END) AS completed_jobs,
    count(DISTINCT b.id) AS total_bids,
    count(DISTINCT
        CASE
            WHEN (b.status = 'accepted'::text) THEN b.id
            ELSE NULL::uuid
        END) AS accepted_bids,
    avg(r.rating) AS avg_rating,
    count(DISTINCT r.id) AS total_reviews,
    max(j.created_at) AS last_job_activity,
    max(b.created_at) AS last_bid_activity
   FROM (((public.profiles u
     LEFT JOIN public.jobs j ON ((u.id = j.homeowner_id)))
     LEFT JOIN public.bids b ON ((u.id = b.contractor_id)))
     LEFT JOIN public.reviews r ON ((u.id = r.reviewee_id)))
  WHERE (u.created_at >= (CURRENT_DATE - '90 days'::interval))
  GROUP BY u.id, u.role, u.is_available;

CREATE INDEX IF NOT EXISTS idx_mv_user_activity_user_id ON public.mv_user_activity(user_id);

-- Step 6: Restrict matview access to service_role only (not exposed via PostgREST)
REVOKE ALL ON public.mv_user_activity FROM anon, authenticated;
