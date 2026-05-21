-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.
-- Original applied version. A second version (20260420000003) also ran with
-- the same name; both tracker rows are real. Schema unchanged because of
-- IF NOT EXISTS guards in the second run.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_type TEXT
    CHECK (
      license_type IS NULL
      OR license_type IN ('trade', 'gas_safe', 'electrical', 'other')
    );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_expiry TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'none'
    CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));

UPDATE public.profiles
   SET verification_status = 'verified'
 WHERE admin_verified = true
   AND verification_status = 'none';

CREATE OR REPLACE FUNCTION public.sync_profile_verification_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admin_verified IS DISTINCT FROM OLD.admin_verified THEN
    IF NEW.admin_verified = true THEN
      NEW.verification_status := 'verified';
    ELSE
      NEW.verification_status := 'rejected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_admin_verified_sync_verification_status
  ON public.profiles;

CREATE TRIGGER profile_admin_verified_sync_verification_status
  BEFORE UPDATE OF admin_verified ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_verification_status();

CREATE INDEX IF NOT EXISTS idx_profiles_verification_status_pending
  ON public.profiles (created_at DESC)
  WHERE verification_status = 'pending';

COMMIT;
