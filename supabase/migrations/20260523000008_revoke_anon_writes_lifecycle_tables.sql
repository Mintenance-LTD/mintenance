-- 2026-05-23 audit defense-in-depth: live DB shows the `anon` role
-- still has table-level INSERT/UPDATE/DELETE on the four lifecycle
-- tables (jobs, contracts, escrow_transactions, messages). RLS blocks
-- anon writes today — `auth.uid()` is NULL for anon, so every USING
-- check fails — but the grants are still present, which is dormant
-- privilege. The 20260523000006 + 20260523000007 migrations tightened
-- `authenticated` but did not touch `anon`.
--
-- Tighten `anon` to read-only across all four. If a future migration
-- accidentally relaxes RLS, or someone publishes a public form that
-- talks to PostgREST anonymously, the grant layer keeps writes blocked.
-- Belt-and-braces, matches the principle of least privilege.

REVOKE INSERT, UPDATE, DELETE ON public.jobs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.contracts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.escrow_transactions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.messages FROM anon;

-- Column-level grants would be implicitly dropped by the table-level
-- REVOKE above, but for the two tables where we *do* keep column
-- writes for authenticated (jobs editorial columns, messages.read),
-- restate that anon gets nothing. No-op if already revoked.
REVOKE UPDATE (
  budget, budget_max, budget_min, category, description, latitude,
  location, longitude, priority, require_itemized_bids, requirements,
  show_budget_to_contractors, updated_at, urgency
) ON public.jobs FROM anon;

REVOKE UPDATE (read, updated_at) ON public.messages FROM anon;

COMMENT ON TABLE public.jobs IS
  'Lifecycle table. authenticated has DELETE/INSERT at table level + UPDATE on 14 editorial columns (20260523000006). anon read-only (20260523000008). State-machine columns (status, contractor_id, payment_status, completion_confirmed_by_homeowner, completed_at) write-gated to service_role only.';

COMMENT ON TABLE public.contracts IS
  'Lifecycle table. authenticated has INSERT only (20260523000006). anon read-only (20260523000008). All UPDATE/DELETE goes through API + service_role.';

COMMENT ON TABLE public.escrow_transactions IS
  'Lifecycle table. authenticated has INSERT only (20260523000006). anon read-only (20260523000008). All status transitions go through API + service_role.';

-- messages COMMENT already set by 20260523000007; replace with the
-- updated wording that mentions the anon revoke.
COMMENT ON TABLE public.messages IS
  'Direct client UPDATE limited to (read, updated_at) for authenticated; only MessageReadTracker writes from the client (20260523000007). anon role read-only (20260523000008). All other mutations (composing, deleting attachments) go through API routes.';
