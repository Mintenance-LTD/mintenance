-- Add admin_verified column to users table for contractor verification
-- This allows admins to verify contractors' company names and licenses

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS admin_verified BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.users.admin_verified IS 'Set to true when an admin verifies the contractor''s company name and license number. This enables the verification badge shown to homeowners.';

-- Add index for faster queries on verified contractors
CREATE INDEX IF NOT EXISTS idx_users_admin_verified ON public.users(admin_verified) WHERE admin_verified = TRUE;

