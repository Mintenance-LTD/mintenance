-- R7 #8 of docs/RETENTION_ROADMAP_2026.md — £20 neighbour referral.
--
-- Homeowner shares a code pinned to their postcode prefix; a neighbour
-- who signs up + books from the same postcode prefix unlocks £20 credit
-- for BOTH when the neighbour's first job completes.
--
-- Postcode prefix = UK outward code (e.g. 'M14', 'SW1A'), not the full
-- postcode. This keeps the geofence readable to the user while avoiding
-- individual-address identification in the landing URL.

BEGIN;

CREATE TABLE IF NOT EXISTS public.neighbourhood_referrals (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_email       TEXT        NULL,
  referred_user_id     UUID        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  postcode_prefix      TEXT        NOT NULL,
  -- Short, non-sequential share code; e.g. "M14-7F3K". Unique.
  code                 TEXT        NOT NULL UNIQUE,
  -- Lifecycle: 'issued' (default) → 'redeemed' (neighbour signed up) → 'rewarded' (first job completed, credit applied)
  status               TEXT        NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','redeemed','rewarded','expired','revoked')),
  first_job_id         UUID        NULL REFERENCES public.jobs(id) ON DELETE SET NULL,
  reward_applied_at    TIMESTAMPTZ NULL,
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neighbourhood_referrals_referrer
  ON public.neighbourhood_referrals (referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_neighbourhood_referrals_referred_email
  ON public.neighbourhood_referrals (lower(referred_email))
  WHERE referred_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_neighbourhood_referrals_redeemable
  ON public.neighbourhood_referrals (code)
  WHERE status IN ('issued','redeemed');

ALTER TABLE public.neighbourhood_referrals ENABLE ROW LEVEL SECURITY;

-- Referrer can see / create their own.
DROP POLICY IF EXISTS neighbourhood_referrals_referrer_manage
  ON public.neighbourhood_referrals;
CREATE POLICY neighbourhood_referrals_referrer_manage
  ON public.neighbourhood_referrals
  FOR ALL
  TO authenticated
  USING (referrer_user_id = auth.uid())
  WITH CHECK (referrer_user_id = auth.uid());

-- Referred user can see their own redeemed row (to display credit).
DROP POLICY IF EXISTS neighbourhood_referrals_referred_read
  ON public.neighbourhood_referrals;
CREATE POLICY neighbourhood_referrals_referred_read
  ON public.neighbourhood_referrals
  FOR SELECT
  TO authenticated
  USING (referred_user_id = auth.uid());

-- Service role full access (for cron + payment-intent credit application).
DROP POLICY IF EXISTS neighbourhood_referrals_service_role
  ON public.neighbourhood_referrals;
CREATE POLICY neighbourhood_referrals_service_role
  ON public.neighbourhood_referrals
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP TRIGGER IF EXISTS neighbourhood_referrals_set_updated_at
  ON public.neighbourhood_referrals;
CREATE TRIGGER neighbourhood_referrals_set_updated_at
  BEFORE UPDATE ON public.neighbourhood_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Add a simple credit ledger so the payment-intent route can atomically
-- debit per-user credit. Separate table keeps the write path narrow
-- (no schema change on profiles, RLS isolation).
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id              UUID        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_pence        INTEGER     NOT NULL DEFAULT 0 CHECK (balance_pence >= 0),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_credits_own_read
  ON public.user_credits;
CREATE POLICY user_credits_own_read
  ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_credits_service_role
  ON public.user_credits;
CREATE POLICY user_credits_service_role
  ON public.user_credits
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Audit log of every credit change (+ referral, - payment-use, etc.).
CREATE TABLE IF NOT EXISTS public.user_credit_ledger (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta_pence          INTEGER     NOT NULL,
  reason               TEXT        NOT NULL,
  reference_id         UUID        NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_user
  ON public.user_credit_ledger (user_id, created_at DESC);

ALTER TABLE public.user_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_credit_ledger_own_read
  ON public.user_credit_ledger;
CREATE POLICY user_credit_ledger_own_read
  ON public.user_credit_ledger
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_credit_ledger_service_role
  ON public.user_credit_ledger;
CREATE POLICY user_credit_ledger_service_role
  ON public.user_credit_ledger
  FOR ALL TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

COMMIT;
