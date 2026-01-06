-- Add stripe_connect_account_id column to users table
-- This column stores the Stripe Connect account ID for contractors
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_stripe_connect_account_id
ON public.users(stripe_connect_account_id)
WHERE stripe_connect_account_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.stripe_connect_account_id IS 'Stripe Connect account ID for contractor payouts';
