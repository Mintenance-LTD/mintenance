-- Add missing columns to bids table if they don't exist
-- Fixes: "column bids.message does not exist" error on GET /api/jobs/[id]/bids

DO $$ BEGIN
  -- The 'message' column is expected by the API but may be missing from the live DB
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS message TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column message already exists or cannot be added: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS estimated_duration_days INTEGER;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column estimated_duration_days already exists: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS materials_included BOOLEAN DEFAULT true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column materials_included already exists: %', SQLERRM;
END $$;

DO $$ BEGIN
  ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 12;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Column warranty_months already exists: %', SQLERRM;
END $$;
