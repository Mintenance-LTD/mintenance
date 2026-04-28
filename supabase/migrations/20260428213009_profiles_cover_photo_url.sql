-- Add cover photo support for contractor profile hero.
--
-- Live audit (2026-04-28) caught the contractor profile cover-photo
-- picker dropping selections on the floor — there was no destination
-- column and the mobile/web upload paths showed a "coming soon"
-- toast. This migration adds the column so the new
-- POST /api/users/cover-photo endpoint can persist the URL alongside
-- the existing profile_image_url (avatar) field.
--
-- Nullable + no default — existing 10 prod rows stay as NULL until
-- the user explicitly uploads a cover.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

COMMENT ON COLUMN public.profiles.cover_photo_url IS
  'URL of the contractor profile hero/cover photo. Distinct from profile_image_url (avatar). Populated by /api/users/cover-photo POST.';
