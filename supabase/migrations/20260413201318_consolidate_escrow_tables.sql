-- Migration: Consolidate escrow tables
-- Drops legacy escrow_accounts table (only used in test files, not production code).
-- Primary escrow table is escrow_transactions (163 file references).

-- Step 1: Migrate any remaining data from escrow_accounts to escrow_transactions
INSERT INTO public.escrow_transactions (id, amount, status, released_at, metadata, created_at)
SELECT ea.id, ea.amount, ea.status, ea.released_at,
       jsonb_build_object('payment_id', ea.payment_id, 'release_conditions', ea.release_conditions, 'migrated_from', 'escrow_accounts'),
       ea.created_at
FROM public.escrow_accounts ea
WHERE NOT EXISTS (SELECT 1 FROM public.escrow_transactions et WHERE et.id = ea.id)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop RLS policies on escrow_accounts
DROP POLICY IF EXISTS "escrow_accounts_select_own" ON public.escrow_accounts;
DROP POLICY IF EXISTS "escrow_accounts_service_role" ON public.escrow_accounts;
DROP POLICY IF EXISTS "Users can view own escrow" ON public.escrow_accounts;
DROP POLICY IF EXISTS "Service role full access to escrow" ON public.escrow_accounts;

-- Step 3: Drop the legacy table
DROP TABLE IF EXISTS public.escrow_accounts;
