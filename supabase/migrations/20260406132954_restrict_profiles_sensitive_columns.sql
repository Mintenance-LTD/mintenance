-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Restrict SELECT on profiles table to prevent leaking Stripe, TOTP, and
-- internal columns via the anon/authenticated Supabase client.
--
-- Strategy: revoke table-level SELECT, then grant column-level SELECT on
-- all columns EXCEPT Stripe account details and internal security flags.
-- Service-role (used by web API routes) bypasses these restrictions.
--
-- Columns HIDDEN from authenticated role:
--   stripe_connect_account_id, stripe_customer_id, stripe_charges_enabled,
--   stripe_payouts_enabled, stripe_transfers_active, stripe_details_submitted,
--   stripe_onboarding_completed_at, stripe_requirements_pending,
--   totp_secret_needs_rotation, deleted_at
--
-- Columns KEPT accessible (needed for own-row reads + cross-user display):
--   All name/bio/location/rating/skills fields, email, phone, settings,
--   notification_preferences, subscription_status, etc.

-- Step 1: Revoke table-level SELECT (keeps INSERT/UPDATE/DELETE intact)
REVOKE SELECT ON public.profiles FROM authenticated;
REVOKE SELECT ON public.profiles FROM anon;

-- Step 2: Grant column-level SELECT on safe columns
GRANT SELECT (
  id, email, role, first_name, last_name, phone, address,
  profile_image_url, created_at, updated_at, avatar_url, bio,
  verified, company_name, license_number, insurance_expiry_date,
  business_address, background_check_status, admin_verified,
  is_available, is_visible_on_map, rating, total_jobs_completed,
  city, country, postcode, latitude, longitude, location,
  skills, portfolio_images, phone_verified, phone_verified_at,
  onboarding_completed, onboarding_completed_at,
  trial_started_at, trial_ends_at, subscription_status,
  settings, notification_preferences, hourly_rate, years_experience
) ON public.profiles TO authenticated;

-- Anon role gets even less (no email/phone/address for unauthenticated)
GRANT SELECT (
  id, role, first_name, last_name, profile_image_url, avatar_url,
  bio, verified, company_name, admin_verified, is_available,
  is_visible_on_map, rating, total_jobs_completed, city, country,
  skills, portfolio_images, hourly_rate, years_experience, created_at
) ON public.profiles TO anon;
