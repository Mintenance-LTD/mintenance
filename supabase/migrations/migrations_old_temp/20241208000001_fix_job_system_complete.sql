-- =====================================================
-- FIX JOB SYSTEM - COMPREHENSIVE MIGRATION
-- =====================================================
-- This migration fixes all identified issues with the job system:
-- 1. Creates missing job_attachments table
-- 2. Adds missing columns to jobs table
-- 3. Fixes data integrity issues
-- 4. Adds proper indexes and constraints
-- 5. Creates helper functions for geolocation
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE JOB_ATTACHMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.job_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'image',
    file_name TEXT,
    file_size INTEGER,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Constraints
    CONSTRAINT valid_file_type CHECK (file_type IN ('image', 'pdf', 'document', 'video')),
    CONSTRAINT valid_file_size CHECK (file_size IS NULL OR file_size > 0)
);

-- Create indexes for job_attachments
CREATE INDEX IF NOT EXISTS idx_job_attachments_job_id ON public.job_attachments(job_id);
CREATE INDEX IF NOT EXISTS idx_job_attachments_uploaded_by ON public.job_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_job_attachments_file_type ON public.job_attachments(file_type);

-- Enable RLS
ALTER TABLE public.job_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_attachments
CREATE POLICY "Users can view attachments for visible jobs" ON public.job_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_attachments.job_id
            AND (
                jobs.homeowner_id = auth.uid() OR
                jobs.contractor_id = auth.uid() OR
                jobs.status = 'posted'
            )
        )
    );

CREATE POLICY "Job owners can upload attachments" ON public.job_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_attachments.job_id
            AND jobs.homeowner_id = auth.uid()
        )
    );

CREATE POLICY "Job owners can update attachments" ON public.job_attachments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_attachments.job_id
            AND jobs.homeowner_id = auth.uid()
        )
    );

CREATE POLICY "Uploaders can delete their attachments" ON public.job_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.jobs
            WHERE jobs.id = job_attachments.job_id
            AND jobs.homeowner_id = auth.uid()
        )
    );

-- =====================================================
-- 2. ADD MISSING COLUMNS TO JOBS TABLE
-- =====================================================

-- Add property_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'property_id'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

        CREATE INDEX idx_jobs_property_id ON public.jobs(property_id);
    END IF;
END $$;

-- Add geolocation columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN latitude DECIMAL(10, 8),
        ADD COLUMN longitude DECIMAL(11, 8);

        -- Create spatial index for geo queries
        CREATE INDEX idx_jobs_location ON public.jobs(latitude, longitude)
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    END IF;
END $$;

-- Add city and postcode columns for better filtering
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'city'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN city VARCHAR(100),
        ADD COLUMN postcode VARCHAR(20);

        CREATE INDEX idx_jobs_city ON public.jobs(city);
        CREATE INDEX idx_jobs_postcode ON public.jobs(postcode);
    END IF;
END $$;

-- Add serious_buyer_score
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'serious_buyer_score'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN serious_buyer_score INTEGER DEFAULT 50
        CHECK (serious_buyer_score >= 0 AND serious_buyer_score <= 100);

        CREATE INDEX idx_jobs_serious_buyer_score ON public.jobs(serious_buyer_score DESC);
    END IF;
END $$;

-- Add required_skills as JSONB array
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'required_skills'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN required_skills JSONB DEFAULT '[]'::jsonb;

        CREATE INDEX idx_jobs_required_skills ON public.jobs USING GIN(required_skills);
    END IF;
END $$;

-- Add budget_min and budget_max for range-based budgets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'budget_min'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN budget_min DECIMAL(10, 2),
        ADD COLUMN budget_max DECIMAL(10, 2);

        -- Migrate existing budget to budget_max
        UPDATE public.jobs
        SET budget_max = budget,
            budget_min = budget * 0.8
        WHERE budget IS NOT NULL
        AND budget_max IS NULL;
    END IF;
END $$;

-- Add requirements as JSONB for flexible requirements
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'requirements'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN requirements JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add priority/urgency columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'urgency'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN urgency VARCHAR(20) DEFAULT 'medium'
        CHECK (urgency IN ('low', 'medium', 'high', 'emergency'));

        CREATE INDEX idx_jobs_urgency ON public.jobs(urgency);
    END IF;
END $$;

-- Add timeline fields
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'start_date'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN start_date DATE,
        ADD COLUMN end_date DATE,
        ADD COLUMN flexible_timeline BOOLEAN DEFAULT false;

        CREATE INDEX idx_jobs_start_date ON public.jobs(start_date);
    END IF;
END $$;

-- Add access_info for contractor access instructions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = 'access_info'
    ) THEN
        ALTER TABLE public.jobs
        ADD COLUMN access_info TEXT;
    END IF;
END $$;

-- =====================================================
-- 3. FIX DATA INTEGRITY ISSUES
-- =====================================================

-- Remove orphaned jobs (homeowner doesn't exist)
DELETE FROM public.jobs
WHERE homeowner_id IS NOT NULL
AND homeowner_id NOT IN (SELECT id FROM public.users);

-- Clear invalid contractor assignments
UPDATE public.jobs
SET contractor_id = NULL
WHERE contractor_id IS NOT NULL
AND contractor_id NOT IN (SELECT id FROM public.users WHERE role = 'contractor');

-- Set default status for jobs without status
UPDATE public.jobs
SET status = 'posted'
WHERE status IS NULL OR status = '';

-- Link jobs to homeowner's primary property if not set
UPDATE public.jobs j
SET property_id = (
    SELECT id FROM public.properties p
    WHERE p.owner_id = j.homeowner_id
    AND p.is_primary = true
    LIMIT 1
)
WHERE j.property_id IS NULL
AND EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.owner_id = j.homeowner_id
);

-- =====================================================
-- 4. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN 6371 * acos(
        cos(radians(lat1)) * cos(radians(lat2)) *
        cos(radians(lon2) - radians(lon1)) +
        sin(radians(lat1)) * sin(radians(lat2))
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get jobs near a location
CREATE OR REPLACE FUNCTION get_jobs_near_location(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_km INTEGER DEFAULT 25
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    budget DECIMAL,
    urgency VARCHAR,
    distance_km DECIMAL,
    homeowner_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.id,
        j.title,
        j.description,
        j.category,
        j.budget,
        j.urgency,
        ROUND(calculate_distance(p_latitude, p_longitude, j.latitude, j.longitude)::DECIMAL, 2) as distance_km,
        j.homeowner_id,
        j.created_at
    FROM public.jobs j
    WHERE
        j.status = 'posted'
        AND j.latitude IS NOT NULL
        AND j.longitude IS NOT NULL
        AND calculate_distance(p_latitude, p_longitude, j.latitude, j.longitude) <= p_radius_km
    ORDER BY distance_km ASC, j.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find contractors near a job
CREATE OR REPLACE FUNCTION get_contractors_near_job(
    p_job_id UUID,
    p_radius_km INTEGER DEFAULT 25
)
RETURNS TABLE (
    contractor_id UUID,
    contractor_name TEXT,
    distance_km DECIMAL,
    skills JSONB
) AS $$
DECLARE
    job_lat DECIMAL;
    job_lon DECIMAL;
    job_skills JSONB;
BEGIN
    -- Get job location and required skills
    SELECT latitude, longitude, required_skills
    INTO job_lat, job_lon, job_skills
    FROM public.jobs
    WHERE id = p_job_id;

    IF job_lat IS NULL OR job_lon IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        u.id as contractor_id,
        u.full_name as contractor_name,
        ROUND(calculate_distance(job_lat, job_lon, u.latitude, u.longitude)::DECIMAL, 2) as distance_km,
        cs.skills
    FROM public.users u
    LEFT JOIN public.contractor_skills cs ON cs.user_id = u.id
    WHERE
        u.role = 'contractor'
        AND u.latitude IS NOT NULL
        AND u.longitude IS NOT NULL
        AND calculate_distance(job_lat, job_lon, u.latitude, u.longitude) <= p_radius_km
        AND (
            job_skills IS NULL
            OR job_skills = '[]'::jsonb
            OR cs.skills ?| array(SELECT jsonb_array_elements_text(job_skills))
        )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. CREATE MISSING INDEXES
-- =====================================================

-- Jobs table comprehensive indexes
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON public.jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_status ON public.jobs(homeowner_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_status ON public.jobs(contractor_id, status)
WHERE contractor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_budget_range ON public.jobs(budget_min, budget_max);

-- =====================================================
-- 6. MIGRATE EXISTING DATA
-- =====================================================

-- Migrate photo URLs from jobs table to job_attachments (if photos column exists)
DO $$
DECLARE
    job_record RECORD;
    photo_url TEXT;
    photo_array TEXT[];
BEGIN
    -- Check if photos or photo_urls column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name IN ('photos', 'photo_urls')
    ) THEN
        -- Handle JSONB array format
        FOR job_record IN
            SELECT id, photos, homeowner_id
            FROM public.jobs
            WHERE photos IS NOT NULL
            AND photos::text != '[]'
            AND photos::text != 'null'
        LOOP
            BEGIN
                -- Try to parse as JSONB array
                FOR photo_url IN
                    SELECT jsonb_array_elements_text(job_record.photos::jsonb)
                LOOP
                    INSERT INTO public.job_attachments (
                        job_id,
                        file_url,
                        file_type,
                        uploaded_by
                    ) VALUES (
                        job_record.id,
                        photo_url,
                        'image',
                        job_record.homeowner_id
                    ) ON CONFLICT DO NOTHING;
                END LOOP;
            EXCEPTION WHEN OTHERS THEN
                -- Log error but continue
                RAISE NOTICE 'Failed to migrate photos for job %: %', job_record.id, SQLERRM;
            END;
        END LOOP;
    END IF;
END $$;

-- Extract city and postcode from location string
UPDATE public.jobs
SET city = SPLIT_PART(location, ',', 1),
    postcode = CASE
        WHEN location ~ '[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}'
        THEN (regexp_match(location, '[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}'))[1]
        ELSE NULL
    END
WHERE city IS NULL
AND location IS NOT NULL
AND location != '';

-- =====================================================
-- 7. ADD AUDIT LOGGING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.job_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES public.users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_audit_log_job_id ON public.job_audit_log(job_id);
CREATE INDEX IF NOT EXISTS idx_job_audit_log_changed_by ON public.job_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_job_audit_log_changed_at ON public.job_audit_log(changed_at DESC);

-- Audit trigger for jobs table
CREATE OR REPLACE FUNCTION audit_job_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if there are actual changes
    IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.job_audit_log (
        job_id,
        action,
        old_data,
        new_data,
        changed_by
    ) VALUES (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        auth.uid()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_jobs_trigger ON public.jobs;
CREATE TRIGGER audit_jobs_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION audit_job_changes();

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Ensure service role has full access
GRANT ALL ON public.job_attachments TO service_role;
GRANT ALL ON public.job_audit_log TO service_role;

-- Ensure authenticated users can use functions
GRANT EXECUTE ON FUNCTION calculate_distance TO authenticated;
GRANT EXECUTE ON FUNCTION get_jobs_near_location TO authenticated;
GRANT EXECUTE ON FUNCTION get_contractors_near_job TO authenticated;

-- =====================================================
-- 9. FINAL CLEANUP
-- =====================================================

-- Update statistics for query optimization
ANALYZE public.jobs;
ANALYZE public.job_attachments;
ANALYZE public.properties;
ANALYZE public.users;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run these after migration)
-- =====================================================

-- Check if all tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('jobs', 'job_attachments', 'job_audit_log');

-- Check job_attachments table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'job_attachments';

-- Check jobs table has all new columns
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'jobs'
-- AND column_name IN ('property_id', 'latitude', 'longitude', 'city', 'postcode',
--                     'serious_buyer_score', 'required_skills', 'budget_min',
--                     'budget_max', 'urgency', 'start_date', 'end_date');

-- Count orphaned records (should be 0)
-- SELECT COUNT(*) as orphaned_jobs
-- FROM public.jobs j
-- WHERE j.homeowner_id NOT IN (SELECT id FROM public.users);