-- Corrective migration: the prior column-level REVOKE was overridden by the
-- existing table-level UPDATE/INSERT GRANT to authenticated/anon.
-- Switch to the same pattern restrict_profiles_sensitive_columns used for SELECT:
-- REVOKE table-level, then GRANT column-level on safe fields only.

BEGIN;

REVOKE UPDATE ON public.profiles FROM authenticated, anon;
REVOKE INSERT ON public.profiles FROM authenticated, anon;

GRANT UPDATE (
  first_name, last_name, phone, address,
  updated_at,
  avatar_url, profile_image_url, cover_photo_url,
  bio,
  company_name, license_number, insurance_expiry_date, business_address,
  license_type, license_expiry, insurance_expiry, dbs_expiry,
  is_available, is_visible_on_map,
  city, country, postcode, latitude, longitude, location,
  skills, portfolio_images,
  onboarding_completed, onboarding_completed_at,
  settings, notification_preferences,
  hourly_rate, years_experience,
  intro_swiper_dismissed_at
) ON public.profiles TO authenticated;

COMMIT;
