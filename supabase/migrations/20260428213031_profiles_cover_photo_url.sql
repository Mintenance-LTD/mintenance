ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

COMMENT ON COLUMN public.profiles.cover_photo_url IS
  'URL of the contractor profile hero/cover photo. Distinct from profile_image_url (avatar). Populated by /api/users/cover-photo POST.';
