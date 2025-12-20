-- Simplified Test User Creation Script
-- This script creates test users without directly inserting into auth.users
-- Run this in your Supabase SQL Editor

-- Method 1: Create profiles for test users that might already exist
-- (You would create these users through the app registration or Supabase dashboard first)

-- If test users don't exist in auth.users, create them manually in Supabase Dashboard:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click "Invite User" or "Add User"
-- 3. Add: test@homeowner.com with password: password123
-- 4. Add: test@contractor.com with password: password123

-- Then run this script to create the profiles:

-- First, let's check if users exist
DO $$
DECLARE
    homeowner_id uuid;
    contractor_id uuid;
BEGIN
    -- Try to find existing auth users by email
    SELECT id INTO homeowner_id FROM auth.users WHERE email = 'test@homeowner.com' LIMIT 1;
    SELECT id INTO contractor_id FROM auth.users WHERE email = 'test@contractor.com' LIMIT 1;
    
    -- Create profiles if auth users exist
    IF homeowner_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, first_name, last_name, role, created_at, updated_at) 
        VALUES (homeowner_id, 'test@homeowner.com', 'John', 'Doe', 'homeowner', now(), now())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            updated_at = now();
        
        RAISE NOTICE 'Homeowner profile created/updated for user ID: %', homeowner_id;
    ELSE
        RAISE NOTICE 'Auth user test@homeowner.com not found. Please create via Supabase Dashboard first.';
    END IF;
    
    IF contractor_id IS NOT NULL THEN
        INSERT INTO public.users (id, email, first_name, last_name, role, created_at, updated_at) 
        VALUES (contractor_id, 'test@contractor.com', 'Jane', 'Smith', 'contractor', now(), now())
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            updated_at = now();
        
        RAISE NOTICE 'Contractor profile created/updated for user ID: %', contractor_id;
    ELSE
        RAISE NOTICE 'Auth user test@contractor.com not found. Please create via Supabase Dashboard first.';
    END IF;
END $$;

-- Verify the setup
SELECT 
    'Setup verification:' as status,
    au.email as auth_email,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    pu.first_name,
    pu.last_name,
    pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email IN ('test@homeowner.com', 'test@contractor.com');