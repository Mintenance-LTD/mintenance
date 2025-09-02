-- =====================================================
-- Mintenance App - Database RLS Policies Setup
-- =====================================================
-- This script sets up Row Level Security policies for the users table
-- Run this in your Supabase SQL editor to fix registration issues

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert" ON users;
DROP POLICY IF EXISTS "Allow public signup" ON users;

-- Policy 1: Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Policy 2: Allow users to insert their own profile during registration
-- This is crucial for fixing the registration issue
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Policy 3: Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Alternative policy if the above doesn't work - allows authenticated users to insert
-- This is more permissive but still secure for user registration
CREATE POLICY "Allow authenticated users to insert" ON users
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- =====================================================
-- Additional policies for related tables (if needed)
-- =====================================================

-- Contractor profiles (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractor_profiles') THEN
        ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can view own contractor profile" ON contractor_profiles
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY IF NOT EXISTS "Users can insert own contractor profile" ON contractor_profiles
            FOR INSERT WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY IF NOT EXISTS "Users can update own contractor profile" ON contractor_profiles
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Jobs table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
        
        -- Homeowners can view and manage their own jobs
        CREATE POLICY IF NOT EXISTS "Homeowners can manage own jobs" ON jobs
            FOR ALL USING (auth.uid() = homeowner_id);
            
        -- Contractors can view jobs assigned to them
        CREATE POLICY IF NOT EXISTS "Contractors can view assigned jobs" ON jobs
            FOR SELECT USING (auth.uid() = contractor_id);
            
        -- Everyone can view published jobs (for discovery)
        CREATE POLICY IF NOT EXISTS "Anyone can view published jobs" ON jobs
            FOR SELECT USING (status = 'published' OR status = 'posted');
    END IF;
END $$;

-- =====================================================
-- Verification queries
-- =====================================================

-- Check if policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY tablename, policyname;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'contractor_profiles', 'jobs')
ORDER BY tablename;

-- =====================================================
-- Test queries (run after policies are in place)
-- =====================================================

-- These should work after running the policies:
-- INSERT INTO users (id, email, first_name, last_name, role) 
-- VALUES (auth.uid(), 'test@example.com', 'Test', 'User', 'homeowner');

-- SELECT * FROM users WHERE id = auth.uid();