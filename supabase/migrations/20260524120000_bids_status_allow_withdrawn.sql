-- 2026-05-24 audit-29 P1: bids_status_check only allowed pending/
-- accepted/rejected, but two production routes write status='withdrawn'
-- (the pending-bid withdraw at /api/jobs/:id/bids/:bidId/withdraw and
-- the accepted-job contractor-withdraw at /api/jobs/:id/contractor-
-- withdraw). Both currently 23514 at the DB layer — mobile bid
-- withdrawal silently fails and accepted-job withdrawal leaves a
-- stale accepted bid (since the route demoted that update to a
-- non-fatal warn). Add 'withdrawn' to the allowed set so the
-- canonical status value the application has been writing actually
-- persists. Applied live via MCP 2026-05-24.

ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_status_check;

ALTER TABLE public.bids
  ADD CONSTRAINT bids_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'withdrawn'::text]));
