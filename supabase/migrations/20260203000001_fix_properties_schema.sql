-- Migration: Fix properties schema and add property-job link
-- Date: 2026-02-03
-- Purpose: Add missing fields to properties table and link jobs to properties

BEGIN;

-- Add missing columns to properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD COLUMN IF NOT EXISTS bedrooms INTEGER CHECK (bedrooms >= 0),
  ADD COLUMN IF NOT EXISTS bathrooms INTEGER CHECK (bathrooms >= 0),
  ADD COLUMN IF NOT EXISTS square_footage INTEGER CHECK (square_footage > 0),
  ADD COLUMN IF NOT EXISTS year_built INTEGER CHECK (year_built >= 1800 AND year_built <= EXTRACT(YEAR FROM CURRENT_DATE) + 1);

-- Add property_id foreign key to jobs table (CRITICAL FIX)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_property_id ON public.jobs(property_id);

-- Add comment for documentation
COMMENT ON COLUMN public.properties.city IS 'City where the property is located';
COMMENT ON COLUMN public.properties.postcode IS 'UK postcode for the property';
COMMENT ON COLUMN public.properties.bedrooms IS 'Number of bedrooms in the property';
COMMENT ON COLUMN public.properties.bathrooms IS 'Number of bathrooms in the property';
COMMENT ON COLUMN public.properties.square_footage IS 'Total square footage of the property';
COMMENT ON COLUMN public.properties.year_built IS 'Year the property was built';
COMMENT ON COLUMN public.jobs.property_id IS 'Foreign key linking job to a specific property';

COMMIT;

-- Note: Existing jobs will have NULL property_id
-- Homeowners will need to assign properties to jobs via the UI
