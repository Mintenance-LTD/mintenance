-- Add stripe_connect_account_id to users table
-- This column stores the Stripe Connect account ID for contractor payouts
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect_account_id
ON users(stripe_connect_account_id);

-- Add comment for documentation
COMMENT ON COLUMN users.stripe_connect_account_id IS 'Stripe Connect account ID for contractor payouts (Express account)';

