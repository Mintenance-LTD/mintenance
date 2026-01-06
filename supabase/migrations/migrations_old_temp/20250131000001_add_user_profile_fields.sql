-- Add profile_image_url and location columns to users table
-- These fields are needed for the user profile page

-- Add profile_image_url column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'profile_image_url'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN profile_image_url TEXT;
        
        COMMENT ON COLUMN public.users.profile_image_url IS 'URL to the user profile image stored in Supabase Storage';
    END IF;
END $$;

-- Add location column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'location'
    ) THEN
        ALTER TABLE public.users 
        ADD COLUMN location TEXT;
        
        COMMENT ON COLUMN public.users.location IS 'User location/address for geolocation purposes';
    END IF;
END $$;

-- Create index on location for potential geolocation queries
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(location) WHERE location IS NOT NULL;

