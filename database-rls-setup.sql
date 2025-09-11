-- ==========================================================
-- Mintenance App – Database RLS Policies Setup
-- ==========================================================
-- This script sets up Row‑Level Security policies for the
--   `users` table and a few optional related tables.
-- Run it in the Supabase SQL editor to fix registration
--   issues.
-- ==========================================================

-----------------------------------------------------------------
-- 1️⃣  Users table
-----------------------------------------------------------------
-- Enable RLS on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can view own profile"          ON users;
DROP POLICY IF EXISTS "Users can insert own profile"       ON users;
DROP POLICY IF EXISTS "Users can update own profile"       ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert"ON users;
DROP POLICY IF EXISTS "Allow public signup"                ON users;

-- Policy 1 – Authenticated users can view *their own* profile
CREATE POLICY "Users can view own profile"
    ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy 2 – Users can insert their own profile during registration
CREATE POLICY "Users can insert own profile"
    ON users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Policy 3 – Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Alternative (more permissive) insert policy – still limited to authenticated users
CREATE POLICY "Allow authenticated users to insert"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (true);


-----------------------------------------------------------------
-- 2️⃣  Contractor profiles (optional)
-----------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'contractor_profiles'
    ) THEN
        ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view own contractor profile" ON contractor_profiles;
        DROP POLICY IF EXISTS "Users can insert own contractor profile" ON contractor_profiles;
        DROP POLICY IF EXISTS "Users can update own contractor profile" ON contractor_profiles;

        CREATE POLICY "Users can view own contractor profile"
            ON contractor_profiles
            FOR SELECT
            USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own contractor profile"
            ON contractor_profiles
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own contractor profile"
            ON contractor_profiles
            FOR UPDATE
            USING (auth.uid() = user_id);
    END IF;
END $$;


-----------------------------------------------------------------
-- 3️⃣  Jobs table (optional)
-----------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'jobs'
    ) THEN
        ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Homeowners can manage own jobs" ON jobs;
        DROP POLICY IF EXISTS "Contractors can view assigned jobs" ON jobs;
        DROP POLICY IF EXISTS "Anyone can view published jobs" ON jobs;

        -- Homeowners manage their own jobs (SELECT/INSERT/UPDATE/DELETE)
        CREATE POLICY "Homeowners can manage own jobs"
            ON jobs
            FOR ALL
            TO authenticated
            USING (auth.uid() = homeowner_id);

        -- Contractors can see jobs assigned to them
        CREATE POLICY "Contractors can view assigned jobs"
            ON jobs
            FOR SELECT
            TO authenticated
            USING (auth.uid() = contractor_id);

        -- Everyone (public) can browse published jobs
        CREATE POLICY "Anyone can view published jobs"
            ON jobs
            FOR SELECT
            TO public
            USING (status = 'published' OR status = 'posted');
    END IF;
END $$;