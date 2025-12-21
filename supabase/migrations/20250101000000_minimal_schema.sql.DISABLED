-- ==========================================================
-- MINIMAL DATABASE SCHEMA FOR TESTING
-- Mintenance UK - Essential Tables Only
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. CORE TABLES ONLY
-- ==========================================================

-- Users table (essential fields only)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'homeowner' CHECK (role IN ('homeowner', 'contractor', 'admin')),
    phone TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table (essential fields only)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contractor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'assigned', 'in_progress', 'completed', 'cancelled')),
    budget DECIMAL(10,2) NOT NULL CHECK (budget > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================================
-- 2. BASIC INDEXES
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner ON public.jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor ON public.jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

-- ==========================================================
-- 3. BASIC RLS
-- ==========================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view jobs they're involved in" ON public.jobs
    FOR SELECT USING (
        auth.uid() = homeowner_id OR 
        auth.uid() = contractor_id
    );

CREATE POLICY "Homeowners can create jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = homeowner_id);

CREATE POLICY "Homeowners can update their own jobs" ON public.jobs
    FOR UPDATE USING (auth.uid() = homeowner_id);

-- ==========================================================
-- 4. UPDATE TRIGGER
-- ==========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
