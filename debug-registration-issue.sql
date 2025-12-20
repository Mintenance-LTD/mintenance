-- Debug registration issue
-- Run each query separately to identify the problem

-- 1. Check current users in both auth and users tables
SELECT 'Auth Users' as source, id, email, created_at FROM auth.users
UNION ALL
SELECT 'Users Table' as source, id::text, email, created_at FROM public.users
ORDER BY created_at DESC;

-- 2. Check if there's an orphaned user profile
SELECT u.id, u.email, 'Orphaned Profile' as status
FROM public.users u
LEFT JOIN auth.users a ON u.id = a.id
WHERE a.id IS NULL;

-- 3. Check RLS policies on users table
SELECT * FROM pg_policies WHERE tablename = 'users';

-- 4. Test if you can insert manually (replace with actual values)
-- This will help identify if it's an RLS or constraint issue
INSERT INTO public.users (id, email, first_name, last_name, role)
VALUES (
  'test-uuid-123',  -- Use a test UUID
  'test@example.com',
  'Test',
  'User',
  'homeowner'
);

-- If the above fails, check what's blocking it:
-- 5. Check for unique constraints
SELECT conname, contype, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass;

-- 6. Check the trigger function
SELECT * FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';