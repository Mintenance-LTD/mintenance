-- Add missing columns to profiles table
-- These columns are referenced throughout the codebase but were never added
-- to the initial profiles schema in 001_core_tables.sql
--
-- This denormalizes some data from companies/addresses tables onto profiles
-- for simpler querying patterns used across the application.

-- Contractor business fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS insurance_expiry_date DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_check_status TEXT;

-- Profile image (code uses profile_image_url, schema had avatar_url)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Verification and status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_visible_on_map BOOLEAN DEFAULT true;

-- Stats (denormalized for performance)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;

-- Location (denormalized from addresses table)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;

-- Skills and portfolio (denormalized arrays)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_images TEXT[];

-- Phone verification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Onboarding tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Soft delete support
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_admin_verified ON public.profiles(admin_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_is_available ON public.profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON public.profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_latitude_longitude ON public.profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comment on denormalization rationale
COMMENT ON COLUMN public.profiles.company_name IS 'Denormalized from companies.name for simpler contractor queries';
COMMENT ON COLUMN public.profiles.city IS 'Denormalized from addresses.city for location-based search';
COMMENT ON COLUMN public.profiles.rating IS 'Denormalized aggregate rating, updated via trigger or application logic';
COMMENT ON COLUMN public.profiles.total_jobs_completed IS 'Denormalized count, updated via trigger or application logic';
COMMENT ON COLUMN public.profiles.profile_image_url IS 'Profile image URL (legacy name, avatar_url also exists)';
