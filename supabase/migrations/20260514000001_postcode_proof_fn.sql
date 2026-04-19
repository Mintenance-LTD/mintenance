-- Deferred #8 from R7 — postcode-proof SQL DISTINCT.
--
-- Replaces the in-memory `Set<homeowner_id>` loop in
-- apps/web/app/api/contractors/[id]/route.ts with a SQL aggregation
-- that uses a proper DISTINCT in Postgres. Correct at any scale and
-- pushes the filter + aggregate into the index.
--
-- SECURITY DEFINER because jobs RLS will otherwise scope the count
-- to rows the caller can SELECT; we want the true public count of
-- distinct households a contractor has served in a given postcode
-- prefix. The function only returns a scalar int — no row leak.

BEGIN;

CREATE OR REPLACE FUNCTION public.contractor_postcode_proof_count(
  p_contractor_id uuid,
  p_postcode_prefix text
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT homeowner_id)::integer
  FROM public.jobs
  WHERE contractor_id = p_contractor_id
    AND status = 'completed'
    AND completed_at IS NOT NULL
    AND completed_at > (now() - interval '12 months')
    AND upper(regexp_replace(coalesce(postcode, ''), '\s+', '', 'g'))
          LIKE (upper(p_postcode_prefix) || '%')
$$;

-- Narrow execute grant — any authenticated user can call it (it's how
-- the contractor profile page computes the counter) and the
-- service-role + anon can too so the public profile route works
-- unauthenticated.
GRANT EXECUTE ON FUNCTION public.contractor_postcode_proof_count(uuid, text)
  TO authenticated, service_role, anon;

-- Supporting partial index — only "completed + recent + has postcode"
-- rows contribute to the count. Dramatically narrower than a full
-- jobs(contractor_id, postcode) index.
CREATE INDEX IF NOT EXISTS idx_jobs_completed_postcode_recent
  ON public.jobs (contractor_id, postcode, homeowner_id)
  WHERE status = 'completed'
    AND completed_at IS NOT NULL
    AND postcode IS NOT NULL;

COMMIT;
