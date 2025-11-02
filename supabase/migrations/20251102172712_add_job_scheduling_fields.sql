-- Migration: Add Job Scheduling Fields
-- Created: 2025-11-02
-- Description: Adds scheduling fields to jobs table if they don't exist

-- ============================================================================
-- ADD SCHEDULING FIELDS TO JOBS TABLE
-- ============================================================================

-- Add scheduled_start_date if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'scheduled_start_date'
    ) THEN
        ALTER TABLE public.jobs 
        ADD COLUMN scheduled_start_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add scheduled_end_date if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'scheduled_end_date'
    ) THEN
        ALTER TABLE public.jobs 
        ADD COLUMN scheduled_end_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add scheduled_duration_hours if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'scheduled_duration_hours'
    ) THEN
        ALTER TABLE public.jobs 
        ADD COLUMN scheduled_duration_hours INTEGER;
    END IF;
END $$;

-- Add index for scheduled jobs queries
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_start_date ON public.jobs(scheduled_start_date) 
WHERE scheduled_start_date IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.jobs.scheduled_start_date IS 'Scheduled start date/time for the job - appears on both contractor and homeowner calendars';
COMMENT ON COLUMN public.jobs.scheduled_end_date IS 'Scheduled end date/time for the job';
COMMENT ON COLUMN public.jobs.scheduled_duration_hours IS 'Estimated duration of the job in hours';

