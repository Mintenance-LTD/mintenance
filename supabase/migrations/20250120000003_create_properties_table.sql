-- ==========================================================
-- CREATE PROPERTIES TABLE
-- Mintenance UK - Property Management Feature
-- ==========================================================
-- This migration creates the properties table for homeowners
-- to manage their properties and link jobs to specific properties
-- ==========================================================

BEGIN;

-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_name TEXT NOT NULL,
  address TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('residential', 'commercial', 'rental')),
  is_primary BOOLEAN DEFAULT FALSE,
  photos JSONB DEFAULT '[]'::jsonb, -- Array of photo objects with category
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_primary ON public.properties(owner_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies for properties table
CREATE POLICY "Users can view their own properties"
ON public.properties
FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Users can create their own properties"
ON public.properties
FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = owner_id)
WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "Users can delete their own properties"
ON public.properties
FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = owner_id);

-- Create trigger for updated_at
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

