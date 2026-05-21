-- Adds the anti-fraud boolean flag flagged in AUDIT_PUNCH_LIST P2 #38
-- (B2-P2-1). The mobile `useSelfieCaptureGate` was gating on
-- `profile_image_url IS NULL`, but that field accepts any URL —
-- library-picked photos and live-capture selfies are
-- indistinguishable at the DB layer, defeating the
-- "live capture, not library" intent of §5.3 step 7 of the
-- 2026-04-19 mobile onboarding audit.
--
-- New behaviour:
--   - SelfieCaptureScreen (camera-only, no library) sets this to true
--     when uploading a fresh capture.
--   - /api/users/avatar (library-allowed path) explicitly clears it to
--     false on every upload — we can't verify the source from a
--     pre-existing URI, so we treat any avatar from this path as
--     unverified.
--   - useSelfieCaptureGate fires when this flag is false AND the
--     contractor has progressed past identity verification.
--
-- Default false: existing rows are treated as "unverified". The gate
-- has its own AsyncStorage dismissal mechanism so existing contractors
-- get one prompt + can dismiss; doesn't lock them out of the app.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_photo_is_selfie BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.profile_photo_is_selfie IS
  'True iff profile_image_url was set via the live-capture SelfieCaptureScreen. False for library uploads, photos uploaded via /api/users/avatar, or pre-existing rows. Drives useSelfieCaptureGate. Added 2026-05-10 for AUDIT_PUNCH_LIST P2 #38.';
