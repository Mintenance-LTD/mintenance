-- 2026-05-23 audit P1: jobs / contracts / escrow_transactions UPDATE
-- policies were RLS-only — any authenticated user with their own JWT
-- could mutate the whole row directly via supabase-js, bypassing API
-- state machines:
--   * a contractor could PATCH jobs.status='completed' from the client
--     without going through /api/jobs/[id]/photos/after
--   * a homeowner could flip jobs.contractor_id arbitrarily
--   * either escrow party could change escrow_transactions.status to
--     'released' / 'refunded' without going through the escrow service
--
-- The RLS policies (jobs_update_policy, contracts_update_party,
-- escrow_update_policy) stay in place as a defense-in-depth row gate.
-- This migration adds the column-level / privilege-level gate the audit
-- recommended.
--
-- Scan completed 2026-05-23: there is zero `supabase.from('jobs|contracts|
-- escrow_transactions').update(...)` in apps/web client code or
-- apps/mobile/src. Every mutation goes through an API route that uses
-- serverSupabase (service-role key, RLS+grants bypassed). So tightening
-- direct grants does not break any existing flow.
--
-- Policy:
--   jobs                  → REVOKE UPDATE, GRANT UPDATE on a small set
--                           of safe cosmetic columns (description,
--                           location, urgency, etc.) so future "edit
--                           job details" flows that go direct to the
--                           DB don't need a code-side revert. Status
--                           machine columns (status, contractor_id,
--                           completion_confirmed_*) stay locked.
--   contracts             → REVOKE UPDATE entirely. Signing flows go
--                           through /api/contracts/[id]/accept|sign.
--   escrow_transactions   → REVOKE UPDATE entirely. Funding / release /
--                           refund flows go through escrow services.
--
-- DELETE is also revoked on contracts + escrow_transactions for
-- symmetry. Jobs DELETE stays granted because the homeowner-cancels
-- flow still does direct DELETE in some legacy paths.

-- ── jobs ──────────────────────────────────────────────────────────
REVOKE UPDATE ON public.jobs FROM authenticated;

-- Safe edit surface. If any of these columns get renamed/dropped the
-- GRANT silently no-ops; intentional — we'd rather lose an entry than
-- break the migration on a missing column.
GRANT UPDATE (
  description,
  location,
  latitude,
  longitude,
  urgency,
  priority,
  category,
  requirements,
  budget,
  budget_min,
  budget_max,
  show_budget_to_contractors,
  require_itemized_bids,
  updated_at
) ON public.jobs TO authenticated;

-- ── contracts ─────────────────────────────────────────────────────
REVOKE UPDATE, DELETE ON public.contracts FROM authenticated;

-- ── escrow_transactions ───────────────────────────────────────────
REVOKE UPDATE, DELETE ON public.escrow_transactions FROM authenticated;

COMMENT ON TABLE public.jobs IS
  'Job marketplace rows. Direct client UPDATE limited to cosmetic columns; status / contractor_id / completion flags require API route mediation (revoked 2026-05-23).';
COMMENT ON TABLE public.contracts IS
  'Direct client UPDATE is fully revoked; mutations must go through /api/contracts/* (revoked 2026-05-23).';
COMMENT ON TABLE public.escrow_transactions IS
  'Direct client UPDATE is fully revoked; mutations must go through escrow services (revoked 2026-05-23).';
