-- AUDIT_PUNCH_LIST P2 #33 (D-P2-1) — `payments` had 12 RLS policies
-- with massive overlap. Audit flagged 9 (close). Consolidating
-- 2026-05-09 to keep only the canonical snake_case policies + the
-- service_role bypass. The dropped policies are functional
-- duplicates of the kept ones — every `auth.uid() = payer_id` /
-- `payee_id` and admin-bypass branch is preserved by
-- `payments_*_policy`.
--
-- Mapping (drop → covered by):
--   "Admins full access to payments" (ALL)        → payments_select_policy + _update_policy + _insert_policy (admin in each USING/CHECK)
--   "Users create payments as payer" (INSERT)     → payments_insert_policy (CHECK has same auth.uid() = payer_id)
--   "Contractors view earnings" (SELECT)          → payments_select_policy (USING has payee_id = auth.uid())
--   "Homeowners view spending" (SELECT)           → payments_select_policy (USING has payer_id = auth.uid())
--   "Users can view own payments" (SELECT)        → payments_select_policy (same logic, snake_case naming)
--   "payments_select_own" (SELECT)                → payments_select_policy (same is_admin() expansion)
--   "Admins can update payments" (UPDATE)         → payments_update_policy (USING/CHECK both have is_admin())
--   "Users update own payments" (UPDATE)          → payments_update_policy (USING/CHECK both have auth.uid() = payer_id)
--
-- Kept policies (5):
--   payments_service_role  (FOR ALL — service_role bypass)
--   payments_insert_policy (FOR INSERT — payer or admin)
--   payments_select_policy (FOR SELECT — payer or payee or admin)
--   payments_update_policy (FOR UPDATE — payer or admin)
--   (no DELETE policy intentionally — finance immutability)
--
-- Reduces PostgREST WHERE-OR expansion on every payments query;
-- net effect is faster reads + cleaner audit surface.

BEGIN;

DROP POLICY IF EXISTS "Admins full access to payments" ON public.payments;
DROP POLICY IF EXISTS "Users create payments as payer" ON public.payments;
DROP POLICY IF EXISTS "Contractors view earnings" ON public.payments;
DROP POLICY IF EXISTS "Homeowners view spending" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS payments_select_own ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Users update own payments" ON public.payments;

COMMIT;
