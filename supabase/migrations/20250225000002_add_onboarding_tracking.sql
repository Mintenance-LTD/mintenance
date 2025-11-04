-- Migration: Add Onboarding Tracking
-- Created: 2025-02-25
-- Description: Adds fields to track user onboarding completion status

-- ============================================================================
-- Add onboarding fields to users table
-- ============================================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed) WHERE onboarding_completed = FALSE;

-- Add comment explaining the fields
COMMENT ON COLUMN users.onboarding_completed IS 'Indicates if user has completed the onboarding tutorial. Tutorial will show every login until this is true.';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when user completed the onboarding tutorial.';

