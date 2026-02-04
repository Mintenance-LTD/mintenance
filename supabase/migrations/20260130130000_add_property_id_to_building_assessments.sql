-- Migration: Phase 5 - Add property_id to building_assessments for RAG / long-term memory
-- Description: Enables retrieve_memory to fetch past assessments by property.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'building_assessments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'building_assessments' AND column_name = 'property_id') THEN
      ALTER TABLE public.building_assessments
        ADD COLUMN property_id UUID;
      COMMENT ON COLUMN public.building_assessments.property_id IS 'Links assessment to property for past-assessments RAG (Phase 5)';
      CREATE INDEX IF NOT EXISTS idx_building_assessments_property_id
        ON public.building_assessments(property_id)
        WHERE property_id IS NOT NULL;
    END IF;
  END IF;
END $$;
