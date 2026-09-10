-- Table-wide grants override narrower column grants. Remove both inherited
-- mutation grants and any explicit column grants, then restore the established
-- editable profile fields. Identity, verification, payments and role fields
-- must be changed by trusted server operations only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM PUBLIC, anon, authenticated;
DO $$
DECLARE column_list text;
BEGIN
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum)
    INTO column_list FROM pg_attribute
   WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped;
  EXECUTE format('REVOKE INSERT (%s), UPDATE (%s), REFERENCES (%s) ON public.profiles FROM PUBLIC, anon, authenticated', column_list, column_list, column_list);
END $$;
GRANT UPDATE ("first_name", "last_name", "phone", "address", "profile_image_url", "updated_at", "avatar_url", "bio", "company_name", "license_number", "insurance_expiry_date", "business_address", "is_available", "is_visible_on_map", "city", "country", "postcode", "latitude", "longitude", "location", "skills", "portfolio_images", "onboarding_completed", "onboarding_completed_at", "settings", "notification_preferences", "hourly_rate", "years_experience", "license_type", "license_expiry", "insurance_expiry", "dbs_expiry", "intro_swiper_dismissed_at", "cover_photo_url") ON public.profiles TO authenticated;
