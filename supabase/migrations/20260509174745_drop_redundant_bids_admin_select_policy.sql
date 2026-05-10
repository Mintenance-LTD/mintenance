-- AUDIT_PUNCH_LIST P2 #35 (D-P2-3) — `bids_admin_select` is fully
-- redundant: `bids_select_policy` already includes `OR is_admin()`
-- in its USING expression, so admin reads were never gated by the
-- separate policy. Dropping it removes the duplicate WHERE-OR
-- expansion PostgREST does on every SELECT.

DROP POLICY IF EXISTS bids_admin_select ON public.bids;
