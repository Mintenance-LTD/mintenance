-- Create Test Users for Development Login
-- Run this in your Supabase SQL Editor to create test accounts

-- First, disable email confirmation temporarily for development
UPDATE auth.users SET email_confirmed_at = now(), confirmed_at = now() WHERE email_confirmed_at IS NULL;

-- Create test users in auth.users (Supabase Auth)
-- Note: You need to run this in Supabase SQL Editor as it requires special permissions

-- Test Homeowner Account
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmed_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test-homeowner-uuid-1234567890',
  'authenticated',
  'authenticated',
  'test@homeowner.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "John", "last_name": "Doe", "role": "homeowner"}',
  false,
  now()
) ON CONFLICT (email) DO NOTHING;

-- Test Contractor Account  
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmed_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test-contractor-uuid-1234567890',
  'authenticated',
  'authenticated',
  'test@contractor.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '',
  '',
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Jane", "last_name": "Smith", "role": "contractor"}',
  false,
  now()
) ON CONFLICT (email) DO NOTHING;

-- Create corresponding profiles in public.users table
INSERT INTO public.users (id, email, first_name, last_name, role) VALUES
  ('test-homeowner-uuid-1234567890', 'test@homeowner.com', 'John', 'Doe', 'homeowner'),
  ('test-contractor-uuid-1234567890', 'test@contractor.com', 'Jane', 'Smith', 'contractor')
ON CONFLICT (id) DO NOTHING;

-- Verify the test users were created
SELECT 
  'Test users created successfully!' as message,
  count(*) as user_count 
FROM auth.users 
WHERE email IN ('test@homeowner.com', 'test@contractor.com');

SELECT 
  'Profiles created successfully!' as message,
  email, first_name, last_name, role 
FROM public.users 
WHERE email IN ('test@homeowner.com', 'test@contractor.com');