-- Audit P1 (2026-04-23): the SELECT policy on `public.reviews` was
-- `USING (true)` with no documentation, named generically as
-- `reviews_select_policy`. The audit flagged this as ambiguous —
-- "likely intentional for marketplace trust but should be explicitly
-- confirmed". This migration replaces it with an identical-effect
-- policy under a clear name + a SQL COMMENT documenting intent.
--
-- Intent (locked in by this migration): reviews are PUBLICLY readable.
-- Mintenance is a contractor marketplace where review history is the
-- primary trust signal homeowners use to choose contractors — same
-- model as Yelp / Google / TrustPilot. Anonymous users browsing
-- /find-contractors must be able to see ratings + comments without
-- signing in.
--
-- What is NOT public despite this policy:
--   * Pending / blocked contractor RESPONSES (`response`,
--     `response_at`). These are filtered at the API layer
--     (apps/web/app/api/contractors/[id]/reviews/route.ts and
--     /api/reviews/[id]/reply/route.ts) before any row leaves
--     the server — only `response_published_at IS NOT NULL` rows
--     expose the reply. Direct Supabase access from a 3rd party
--     would still see the raw row; that's a known follow-up
--     (move to a SECURITY DEFINER view + revoke base-table grants
--     in a future hardening pass).
--   * Reviewer PII beyond `reviewer_id` (a UUID). The API joins
--     to profiles and only returns first_name / avatar / city.
--
-- Net effect: zero behaviour change. Just removes the audit-flagged
-- ambiguity by making the intent legible at the policy level.
DROP POLICY IF EXISTS reviews_select_policy ON public.reviews;

CREATE POLICY reviews_public_read
  ON public.reviews
  FOR SELECT
  USING (true);

COMMENT ON POLICY reviews_public_read ON public.reviews IS
  'Marketplace trust: reviews are publicly readable by anonymous '
  'users so /find-contractors can render ratings without auth. '
  'Pending / blocked contractor REPLIES are masked at the API '
  'layer (response_published_at filter) — not at this policy. '
  'Audit-confirmed 2026-04-23.';
