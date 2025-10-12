-- Ensure contractors remain discoverable on homeowner map
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_visible_on_map BOOLEAN DEFAULT TRUE;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_location_visibility_at TIMESTAMPTZ;

UPDATE public.users
SET is_visible_on_map = TRUE
WHERE is_visible_on_map IS NULL;
