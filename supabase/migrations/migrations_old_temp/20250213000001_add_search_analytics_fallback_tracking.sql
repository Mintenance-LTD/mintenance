-- Migration: Add fallback tracking to search analytics
-- Created: 2025-02-13
-- Description: Adds columns to track when semantic search falls back to full-text search

-- Add columns to search_analytics table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_analytics' AND column_name = 'used_fallback'
  ) THEN
    ALTER TABLE search_analytics ADD COLUMN used_fallback BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'search_analytics' AND column_name = 'search_method'
  ) THEN
    ALTER TABLE search_analytics ADD COLUMN search_method VARCHAR(20) DEFAULT 'semantic';
  END IF;
END $$;

-- Add constraint to ensure search_method has valid values
ALTER TABLE search_analytics
  DROP CONSTRAINT IF EXISTS search_analytics_search_method_check;

ALTER TABLE search_analytics
  ADD CONSTRAINT search_analytics_search_method_check
  CHECK (search_method IN ('semantic', 'full-text'));

-- Create index for analyzing fallback usage
CREATE INDEX IF NOT EXISTS idx_search_analytics_fallback
  ON search_analytics(used_fallback, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_method
  ON search_analytics(search_method, created_at DESC);

-- Add comments
COMMENT ON COLUMN search_analytics.used_fallback IS 'Whether the search fell back to full-text search due to timeout or embedding failure';
COMMENT ON COLUMN search_analytics.search_method IS 'Search method used: semantic (vector) or full-text (SQL ILIKE)';
