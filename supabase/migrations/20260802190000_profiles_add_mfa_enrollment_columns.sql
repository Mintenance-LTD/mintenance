-- profiles: add the MFA enrollment-state columns the MFA service was
-- always written against but which were never migrated.
--
-- Discovery (2026-08-02, select-schema audit): lib/mfa/service/*,
-- api/auth/login and lib/payments/high-risk-checks all read/write
-- profiles.mfa_enabled / mfa_method / mfa_enrolled_at / totp_secret —
-- none of which existed. Every MFA select failed at PostgREST, so:
--   - enrollment could never store a secret (mfa-totp.ts:70 update failed),
--   - getMFAStatus always threw,
--   - and at login the failed select nulled userData, silently making
--     mfaEnabled=false AND isAdmin=false — the "admin accounts MUST have
--     MFA" gate (login/route.ts:111) has never fired.
--
-- The support tables (mfa_backup_codes, mfa_attempts,
-- mfa_pending_verifications, pre_mfa_sessions) and even
-- profiles.totp_secret_needs_rotation all landed; two migrations
-- (20260318000002, 20260508100303) explicitly guard on "totp_secret may
-- not exist". Only the ADD COLUMN itself was missing.
--
-- Client access: NONE granted. profiles is column-grant locked
-- (20260508100543): table-level privileges are revoked and re-granted
-- per column, so new columns are invisible to authenticated/anon by
-- default. That is the correct state — every MFA read/write goes through
-- server-role API routes, and totp_secret especially must never reach a
-- client. The explicit REVOKEs below are belt-and-braces re-assertion of
-- 20260508100303's intent (which skipped because the column didn't
-- exist); REVOKE of an absent grant is a harmless no-op.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_method text,
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at timestamptz,
  ADD COLUMN IF NOT EXISTS totp_secret text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_mfa_method_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_mfa_method_check
      CHECK (mfa_method IS NULL OR mfa_method IN ('totp', 'sms'));
  END IF;
END $$;

REVOKE SELECT (totp_secret), UPDATE (totp_secret), INSERT (totp_secret)
  ON public.profiles FROM authenticated, anon;
REVOKE SELECT (mfa_enabled), UPDATE (mfa_enabled), INSERT (mfa_enabled)
  ON public.profiles FROM authenticated, anon;
REVOKE SELECT (mfa_method), UPDATE (mfa_method), INSERT (mfa_method)
  ON public.profiles FROM authenticated, anon;
REVOKE SELECT (mfa_enrolled_at), UPDATE (mfa_enrolled_at), INSERT (mfa_enrolled_at)
  ON public.profiles FROM authenticated, anon;

COMMENT ON COLUMN public.profiles.totp_secret IS
  'AES-256-GCM encrypted JSON blob (see lib/mfa encryptField). Server-role access only — no client grants, ever.';
