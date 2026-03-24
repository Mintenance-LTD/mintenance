-- Migration: Flag plaintext TOTP secrets for server-side re-encryption
-- The application code in mfa-service.ts already encrypts new totp_secret values on write
-- using encryptField() (AES-256-GCM). This migration flags any pre-existing plaintext values
-- so the admin rotation route can re-encrypt them.
-- Encrypted values produced by the app start with '{"ciphertext"'.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS totp_secret_needs_rotation BOOLEAN NOT NULL DEFAULT FALSE;

-- Flag rows where totp_secret is set but is NOT an encrypted JSON blob
UPDATE public.profiles
SET    totp_secret_needs_rotation = TRUE
WHERE  totp_secret IS NOT NULL
  AND  totp_secret NOT LIKE '{"ciphertext"%';

-- Log count for migration verification
DO $$
DECLARE
  flagged_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO flagged_count
  FROM public.profiles
  WHERE totp_secret_needs_rotation = TRUE;

  RAISE NOTICE 'Flagged % profile(s) with plaintext totp_secret for rotation', flagged_count;
END $$;
