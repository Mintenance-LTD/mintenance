-- Migration: Add Image Analysis Metadata Column
-- Created: 2025-11-05
-- Description: Stores Google Vision API analysis results for job images to enable caching and improve recommendations

-- ============================================================================
-- Add image_analysis_metadata column to jobs table
-- ============================================================================
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS image_analysis_metadata JSONB;

-- ============================================================================
-- Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN public.jobs.image_analysis_metadata IS 
  'Stores Google Vision API analysis results including labels, objects, detected features, property type, condition, complexity, and suggested categories. Used for caching analysis results to reduce API calls and improve recommendations.';

-- ============================================================================
-- Create index for querying jobs with image analysis
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_jobs_image_analysis_metadata 
ON public.jobs USING GIN (image_analysis_metadata);

