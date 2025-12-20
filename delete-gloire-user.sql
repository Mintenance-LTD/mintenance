-- Delete the specific user that's causing registration issues
-- Run this in your Supabase SQL Editor

-- First, check if the user exists
SELECT id, email, first_name, last_name, created_at 
FROM public.users 
WHERE email = 'gloire@mintenance.co.uk';

-- Delete the user (uncomment the line below after verifying)
-- DELETE FROM public.users WHERE email = 'gloire@mintenance.co.uk';

-- Verify deletion
-- SELECT COUNT(*) FROM public.users WHERE email = 'gloire@mintenance.co.uk';

