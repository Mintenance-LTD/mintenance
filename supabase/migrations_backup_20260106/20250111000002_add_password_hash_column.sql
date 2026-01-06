-- Add password_hash column to users table
-- This enables custom authentication with bcrypt

-- Add password_hash column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add index for faster authentication queries
CREATE INDEX IF NOT EXISTS idx_users_email_password
ON public.users(email, password_hash);

-- Add comment
COMMENT ON COLUMN public.users.password_hash IS 'Bcrypt hashed password for custom authentication';

