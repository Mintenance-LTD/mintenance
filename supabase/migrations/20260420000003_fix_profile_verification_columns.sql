-- Fix the silent-schema-drift bug in the mobile ContractorVerificationScreen.
--
-- The screen (apps/mobile/src/screens/contractor-verification/
-- ContractorVerificationScreen.tsx) has been writing to three columns
-- that don't exist on the live profiles table:
--   - license_type
--   - license_expiry
--   - verification_status
--
-- Every submit returned PostgREST error 42703 and was swallowed as a
-- generic "Failed to submit verification" Alert. Every mount's SELECT
-- also errored but was silently ignored by a `catch {}` block.
--
-- Consequence: zero contractors have ever successfully verified through
-- mobile self-service. Prior investigation confirmed the 2 admin_verified
-- contractors in prod were set directly by admins via the web admin UI.
--
-- This migration is the PHASE 1 UNBLOCKER (Option A in the investigation
-- writeup). The PHASE 2.5 contractor Tier 1 restructure moves this data
-- to the purpose-built `credential_verifications` table (R4) and makes
-- `license_expiry` a proper DATE. For now we match what the screen sends.

BEGIN;

-- 1. license_type — constrained to the four enum values the radio-group
--    in the screen offers (trade / gas_safe / electrical / other).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_type TEXT
    CHECK (
      license_type IS NULL
      OR license_type IN ('trade', 'gas_safe', 'electrical', 'other')
    );

-- 2. license_expiry — TEXT, not DATE, matching the free-text "DD/MM/YYYY"
--    the mobile input accepts today. Phase 2.5 moves this to
--    credential_verifications.expires_at (DATE) with a proper date
--    picker. TEXT here avoids rejecting every existing user submission.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS license_expiry TEXT;

-- 3. verification_status — enum-style text. 'none' is the default so
--    existing rows remain in a well-defined state.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'none'
    CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));

-- 4. Backfill existing admin_verified = true contractors.
--    Today's live data: 2 rows with admin_verified = true. Both should
--    start life with verification_status = 'verified' so the screen
--    displays the correct banner on mount.
UPDATE public.profiles
   SET verification_status = 'verified'
 WHERE admin_verified = true
   AND verification_status = 'none';

-- 5. Keep admin_verified and verification_status in sync going forward.
--    If an admin flips admin_verified via the web admin UI (the only
--    path today), verification_status follows. Reverse direction stays
--    manual to avoid accidental overrides.
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
      -- Admin can revoke; we mark rejected rather than 'none' so the
      -- user sees an explicit state, not a blank form.
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

-- 6. Index for the admin queue query ("show me all pending verifications").
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status_pending
  ON public.profiles (created_at DESC)
  WHERE verification_status = 'pending';

COMMIT;
