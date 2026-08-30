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
  'AES-256-GCM encrypted JSON blob (see lib/mfa encryptField). Server-role access only — no client grants, ever.';;
