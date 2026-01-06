-- ==========================================================
-- Add required_skills column to jobs table
-- ==========================================================
-- This migration adds the required_skills column to the jobs table
-- to enable skill-based job matching for contractors.

BEGIN;

-- Add required_skills column as TEXT[] array (nullable for backward compatibility)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT NULL;

-- Add index for efficient skill matching queries using array overlap operator
CREATE INDEX IF NOT EXISTS idx_jobs_required_skills 
ON public.jobs USING GIN (required_skills);

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.required_skills IS 
'Array of required contractor skills for this job. Used for matching jobs to contractors with matching skills.';

COMMIT;

