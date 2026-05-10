-- Close role-drift / privilege-escalation gap on public.profiles.
-- Mirrors the SELECT pattern from 20260406132954_restrict_profiles_sensitive_columns.
-- service_role is unaffected. Idempotent.

BEGIN;

REVOKE UPDATE (role)                       ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (admin_verified)             ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (verified)                   ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (background_check_status)    ON public.profiles FROM authenticated, anon;

REVOKE INSERT (role)                       ON public.profiles FROM authenticated, anon;
REVOKE INSERT (admin_verified)             ON public.profiles FROM authenticated, anon;
REVOKE INSERT (verified)                   ON public.profiles FROM authenticated, anon;
REVOKE INSERT (background_check_status)    ON public.profiles FROM authenticated, anon;

REVOKE UPDATE (stripe_connect_account_id)  ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (stripe_charges_enabled)     ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (stripe_payouts_enabled)     ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (stripe_details_submitted)   ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (subscription_status)        ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (trial_started_at)           ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (trial_ends_at)              ON public.profiles FROM authenticated, anon;

REVOKE INSERT (stripe_connect_account_id)  ON public.profiles FROM authenticated, anon;
REVOKE INSERT (stripe_charges_enabled)     ON public.profiles FROM authenticated, anon;
REVOKE INSERT (stripe_payouts_enabled)     ON public.profiles FROM authenticated, anon;
REVOKE INSERT (stripe_details_submitted)   ON public.profiles FROM authenticated, anon;
REVOKE INSERT (subscription_status)        ON public.profiles FROM authenticated, anon;
REVOKE INSERT (trial_started_at)           ON public.profiles FROM authenticated, anon;
REVOKE INSERT (trial_ends_at)              ON public.profiles FROM authenticated, anon;

REVOKE UPDATE (deleted_at)                 ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (totp_secret_needs_rotation) ON public.profiles FROM authenticated, anon;

REVOKE INSERT (deleted_at)                 ON public.profiles FROM authenticated, anon;
REVOKE INSERT (totp_secret_needs_rotation) ON public.profiles FROM authenticated, anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'totp_secret'
  ) THEN
    EXECUTE 'REVOKE UPDATE (totp_secret) ON public.profiles FROM authenticated, anon';
    EXECUTE 'REVOKE INSERT (totp_secret) ON public.profiles FROM authenticated, anon';
  END IF;
END $$;

COMMIT;
