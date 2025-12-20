-- Clean up orphaned user profiles
-- Run this in your Supabase SQL Editor when you have registration issues

-- Check for users that exist in your users table but not in auth.users
SELECT u.id, u.email, u.first_name, u.last_name 
FROM public.users u
LEFT JOIN auth.users a ON u.id = a.id
WHERE a.id IS NULL;

-- Delete orphaned user profiles (run this if you see orphaned records above)
-- CAUTION: This will permanently delete user data
DELETE FROM public.users 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Alternative: If you want to keep the data but allow re-registration,
-- you can update the email to add a suffix
UPDATE public.users 
SET email = email || '_deleted_' || extract(epoch from now())::text
WHERE id NOT IN (SELECT id FROM auth.users);

-- Verify cleanup
SELECT COUNT(*) as remaining_users FROM public.users;