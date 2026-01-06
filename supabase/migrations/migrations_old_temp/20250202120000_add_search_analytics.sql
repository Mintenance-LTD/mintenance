-- Migration: Add Search Analytics Table
-- Created: 2025-02-02
-- Description: Creates search_analytics table for tracking user searches, trending queries, and search optimization

-- ============================================================================
-- SEARCH ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Search query data
  search_query TEXT NOT NULL,
  search_type VARCHAR(50) DEFAULT 'general' CHECK (search_type IN ('general', 'jobs', 'contractors', 'semantic', 'filters')),

  -- Filters applied
  filters JSONB DEFAULT '{}',
  category_filter TEXT,
  location_filter TEXT,
  price_min NUMERIC,
  price_max NUMERIC,

  -- Results and engagement
  results_count INTEGER DEFAULT 0,
  clicked_results TEXT[], -- Array of result IDs that were clicked
  first_click_position INTEGER, -- Position of first clicked result (1-indexed)
  time_to_first_click_ms INTEGER, -- Time from search to first click

  -- Session tracking
  session_id TEXT,
  device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop')) OR device_type IS NULL,

  -- Search quality metrics
  zero_results BOOLEAN DEFAULT FALSE,
  refined_search BOOLEAN DEFAULT FALSE, -- User refined/changed search
  previous_search_id UUID REFERENCES search_analytics(id), -- Link to previous search in refinement chain

  -- AI/ML features
  search_intent VARCHAR(50), -- 'browse', 'specific', 'compare', 'urgent'
  embedding vector(1536), -- For semantic search analysis (optional)

  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id
  ON search_analytics(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp
  ON search_analytics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_session
  ON search_analytics(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_search_analytics_search_type
  ON search_analytics(search_type);

-- Trending searches index
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_timestamp
  ON search_analytics(search_query, timestamp DESC);

-- Zero results tracking
CREATE INDEX IF NOT EXISTS idx_search_analytics_zero_results
  ON search_analytics(zero_results, timestamp DESC)
  WHERE zero_results = TRUE;

-- Category and location filters
CREATE INDEX IF NOT EXISTS idx_search_analytics_category
  ON search_analytics(category_filter)
  WHERE category_filter IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_search_analytics_location
  ON search_analytics(location_filter)
  WHERE location_filter IS NOT NULL;

-- Composite index for trending by category
CREATE INDEX IF NOT EXISTS idx_search_analytics_category_timestamp
  ON search_analytics(category_filter, timestamp DESC)
  WHERE category_filter IS NOT NULL;

-- GIN index for JSONB filters
CREATE INDEX IF NOT EXISTS idx_search_analytics_filters_gin
  ON search_analytics USING GIN (filters);

-- ============================================================================
-- TRENDING SEARCHES MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS trending_searches AS
SELECT
  search_query,
  search_type,
  category_filter,
  location_filter,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(results_count) as avg_results,
  SUM(CASE WHEN zero_results THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as zero_results_rate,
  SUM(CASE WHEN clicked_results IS NOT NULL AND array_length(clicked_results, 1) > 0 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as click_through_rate,
  MAX(timestamp) as last_searched_at
FROM search_analytics
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY search_query, search_type, category_filter, location_filter
HAVING COUNT(*) >= 3 -- Minimum 3 searches to be considered trending
ORDER BY search_count DESC, last_searched_at DESC;

-- Index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_searches_unique
  ON trending_searches(search_query, search_type, COALESCE(category_filter, ''), COALESCE(location_filter, ''));

CREATE INDEX IF NOT EXISTS idx_trending_searches_count
  ON trending_searches(search_count DESC);

CREATE INDEX IF NOT EXISTS idx_trending_searches_category
  ON trending_searches(category_filter)
  WHERE category_filter IS NOT NULL;

-- ============================================================================
-- SEARCH SUGGESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_text TEXT NOT NULL,
  suggestion_type VARCHAR(50) DEFAULT 'query' CHECK (suggestion_type IN ('query', 'category', 'location', 'contractor', 'service')),

  -- Popularity metrics
  usage_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN usage_count > 0
    THEN (click_count::DECIMAL / usage_count) * 100
    ELSE 0 END
  ) STORED,

  -- Context
  category TEXT,
  location TEXT,

  -- Quality
  is_active BOOLEAN DEFAULT TRUE,
  is_auto_generated BOOLEAN DEFAULT FALSE,

  -- Timestamps
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(suggestion_text, suggestion_type)
);

-- Indexes for search suggestions
CREATE INDEX IF NOT EXISTS idx_search_suggestions_type
  ON search_suggestions(suggestion_type);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_active
  ON search_suggestions(is_active)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_search_suggestions_usage
  ON search_suggestions(usage_count DESC, acceptance_rate DESC);

CREATE INDEX IF NOT EXISTS idx_search_suggestions_category
  ON search_suggestions(category)
  WHERE category IS NOT NULL;

-- Text search index
CREATE INDEX IF NOT EXISTS idx_search_suggestions_text
  ON search_suggestions USING GIN (to_tsvector('english', suggestion_text));

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

-- Search analytics policies
CREATE POLICY "Users can view their own search analytics"
  ON search_analytics FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can insert search analytics"
  ON search_analytics FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role can manage search analytics"
  ON search_analytics FOR ALL
  USING (auth.role() = 'service_role');

-- Search suggestions policies (read-only for users, admin can manage)
CREATE POLICY "Everyone can view active search suggestions"
  ON search_suggestions FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Service role can manage search suggestions"
  ON search_suggestions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to refresh trending searches materialized view
CREATE OR REPLACE FUNCTION refresh_trending_searches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_searches;
END;
$$;

-- Function to get trending searches by category
CREATE OR REPLACE FUNCTION get_trending_searches_by_category(
  p_category TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  search_query TEXT,
  search_count BIGINT,
  unique_users BIGINT,
  avg_results NUMERIC,
  click_through_rate NUMERIC,
  last_searched_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ts.search_query,
    ts.search_count,
    ts.unique_users,
    ts.avg_results,
    ts.click_through_rate,
    ts.last_searched_at
  FROM trending_searches ts
  WHERE
    (p_category IS NULL OR ts.category_filter = p_category)
    AND (p_location IS NULL OR ts.location_filter = p_location)
  ORDER BY ts.search_count DESC
  LIMIT p_limit;
END;
$$;

-- Function to log search and update suggestions
CREATE OR REPLACE FUNCTION log_search_and_update_suggestions(
  p_search_query TEXT,
  p_user_id UUID DEFAULT NULL,
  p_search_type VARCHAR(50) DEFAULT 'general',
  p_filters JSONB DEFAULT '{}'::jsonb,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_id UUID;
BEGIN
  -- Insert search analytics
  INSERT INTO search_analytics (
    user_id,
    search_query,
    search_type,
    filters,
    session_id
  ) VALUES (
    p_user_id,
    p_search_query,
    p_search_type,
    p_filters,
    p_session_id
  )
  RETURNING id INTO v_search_id;

  -- Update or create search suggestion
  INSERT INTO search_suggestions (
    suggestion_text,
    suggestion_type,
    usage_count,
    is_auto_generated,
    last_used_at
  ) VALUES (
    p_search_query,
    p_search_type,
    1,
    TRUE,
    NOW()
  )
  ON CONFLICT (suggestion_text, suggestion_type)
  DO UPDATE SET
    usage_count = search_suggestions.usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW();

  RETURN v_search_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for search_suggestions
CREATE TRIGGER update_search_suggestions_updated_at
  BEFORE UPDATE ON search_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE search_analytics IS 'Tracks all user searches for analytics, trending queries, and search optimization';
COMMENT ON TABLE search_suggestions IS 'Auto-generated and curated search suggestions based on usage patterns';
COMMENT ON MATERIALIZED VIEW trending_searches IS 'Aggregated trending searches from the last 7 days, refreshed periodically';

COMMENT ON COLUMN search_analytics.search_query IS 'The actual search query entered by the user';
COMMENT ON COLUMN search_analytics.clicked_results IS 'Array of result IDs (job IDs, contractor IDs, etc.) that were clicked';
COMMENT ON COLUMN search_analytics.first_click_position IS 'Position of the first result clicked (1 = first result)';
COMMENT ON COLUMN search_analytics.zero_results IS 'Whether the search returned no results';
COMMENT ON COLUMN search_analytics.refined_search IS 'Whether this search is a refinement of a previous search';
COMMENT ON COLUMN search_analytics.search_intent IS 'Inferred or detected user intent: browse, specific, compare, urgent';

COMMENT ON COLUMN search_suggestions.acceptance_rate IS 'Percentage of times the suggestion was clicked when shown';
COMMENT ON COLUMN search_suggestions.is_auto_generated IS 'Whether suggestion was auto-generated from search analytics vs manually curated';
