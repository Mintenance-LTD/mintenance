-- Migration: Add Intelligent Pricing Agent Tables
-- Created: 2025-02-01
-- Description: Creates tables for Intelligent Pricing Agent - market analytics and pricing recommendations

-- ============================================================================
-- PRICING ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  
  -- Job details for analysis
  category VARCHAR(100),
  location TEXT,
  budget DECIMAL(10,2),
  job_complexity VARCHAR(50), -- 'simple', 'moderate', 'complex'
  
  -- Pricing data
  accepted_bid_amount DECIMAL(10,2),
  rejected_bid_min DECIMAL(10,2),
  rejected_bid_max DECIMAL(10,2),
  total_bids_count INTEGER DEFAULT 0,
  accepted_bids_count INTEGER DEFAULT 0,
  
  -- Market statistics
  avg_accepted_price DECIMAL(10,2),
  median_accepted_price DECIMAL(10,2),
  min_accepted_price DECIMAL(10,2),
  max_accepted_price DECIMAL(10,2),
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  
  -- Regional/contextual data
  region VARCHAR(100), -- Extracted from location
  market_tier VARCHAR(50), -- 'budget', 'mid', 'premium'
  
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pricing_analytics
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_category_location ON pricing_analytics(category, location);
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_category ON pricing_analytics(category);
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_location ON pricing_analytics(location);
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_region ON pricing_analytics(region);
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_analyzed_at ON pricing_analytics(analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_job_id ON pricing_analytics(job_id) WHERE job_id IS NOT NULL;

-- ============================================================================
-- PRICING RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bid_id UUID REFERENCES bids(id) ON DELETE SET NULL,
  
  -- Recommended pricing
  recommended_min_price DECIMAL(10,2),
  recommended_max_price DECIMAL(10,2),
  recommended_optimal_price DECIMAL(10,2),
  
  -- Market analysis
  market_avg_price DECIMAL(10,2),
  market_median_price DECIMAL(10,2),
  market_range_min DECIMAL(10,2),
  market_range_max DECIMAL(10,2),
  
  -- Competitiveness scoring
  competitiveness_score INTEGER, -- 0-100 (higher = more competitive)
  competitiveness_level VARCHAR(20), -- 'too_low', 'competitive', 'premium', 'too_high'
  
  -- Pricing factors
  job_complexity_factor DECIMAL(3,2),
  location_factor DECIMAL(3,2),
  contractor_tier_factor DECIMAL(3,2),
  market_demand_factor DECIMAL(3,2),
  
  -- Confidence and reasoning
  confidence_score DECIMAL(3,2), -- 0-1 confidence in recommendation
  reasoning TEXT, -- Explanation for recommendation
  factors JSONB DEFAULT '{}', -- Detailed factor breakdown
  
  -- User interaction
  contractor_used_recommendation BOOLEAN DEFAULT FALSE,
  final_bid_amount DECIMAL(10,2), -- What contractor actually bid
  bid_was_accepted BOOLEAN, -- Whether the bid was accepted
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pricing_recommendations
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_job_id ON pricing_recommendations(job_id);
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_contractor_id ON pricing_recommendations(contractor_id) WHERE contractor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_bid_id ON pricing_recommendations(bid_id) WHERE bid_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_created_at ON pricing_recommendations(created_at DESC);

-- ============================================================================
-- CONTRACTOR PRICING PATTERNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_pricing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Pricing behavior
  avg_bid_amount DECIMAL(10,2),
  median_bid_amount DECIMAL(10,2),
  pricing_style VARCHAR(50), -- 'budget', 'competitive', 'premium', 'variable'
  
  -- Acceptance rates
  total_bids_count INTEGER DEFAULT 0,
  accepted_bids_count INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5,2), -- Percentage
  
  -- Category-specific patterns
  category_patterns JSONB DEFAULT '{}', -- {category: {avg_price, acceptance_rate, ...}}
  
  -- Performance metrics
  win_rate DECIMAL(5,2), -- Acceptance rate
  avg_competitiveness_score DECIMAL(3,2),
  
  -- Learning data
  patterns_learned_from_bids INTEGER DEFAULT 0,
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(contractor_id)
);

-- Indexes for contractor_pricing_patterns
CREATE INDEX IF NOT EXISTS idx_contractor_pricing_patterns_contractor_id ON contractor_pricing_patterns(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_pricing_patterns_last_analyzed ON contractor_pricing_patterns(last_analyzed_at);

-- ============================================================================
-- UPDATE BIDS TABLE
-- ============================================================================
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS suggested_price_range JSONB,
ADD COLUMN IF NOT EXISTS competitiveness_score INTEGER,
ADD COLUMN IF NOT EXISTS pricing_recommendation_id UUID REFERENCES pricing_recommendations(id),
ADD COLUMN IF NOT EXISTS was_price_recommended BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN bids.suggested_price_range IS 'JSON object with min/max/optimal suggested prices';
COMMENT ON COLUMN bids.competitiveness_score IS 'Score 0-100 indicating how competitive the bid price is';
COMMENT ON COLUMN bids.pricing_recommendation_id IS 'Reference to pricing recommendation used';
COMMENT ON COLUMN bids.was_price_recommended IS 'Whether contractor used recommended price';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Pricing analytics (read-only for contractors, admin can manage)
ALTER TABLE pricing_analytics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pricing_analytics' AND policyname = 'Everyone can view pricing analytics'
  ) THEN
    CREATE POLICY "Everyone can view pricing analytics"
      ON pricing_analytics FOR SELECT
      USING (TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pricing_analytics' AND policyname = 'Only agents can insert pricing analytics'
  ) THEN
    CREATE POLICY "Only agents can insert pricing analytics"
      ON pricing_analytics FOR INSERT
      WITH CHECK (TRUE); -- Agents will insert via service role
  END IF;
END $$;

-- Pricing recommendations (users can view their own)
ALTER TABLE pricing_recommendations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pricing_recommendations' AND policyname = 'Users can view their own pricing recommendations'
  ) THEN
    CREATE POLICY "Users can view their own pricing recommendations"
      ON pricing_recommendations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM jobs j WHERE j.id = pricing_recommendations.job_id 
          AND (j.contractor_id = auth.uid() OR j.homeowner_id = auth.uid())
        )
        OR contractor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END $$;

-- Contractor pricing patterns (users can view their own)
ALTER TABLE contractor_pricing_patterns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contractor_pricing_patterns' AND policyname = 'Contractors can view their own pricing patterns'
  ) THEN
    CREATE POLICY "Contractors can view their own pricing patterns"
      ON contractor_pricing_patterns FOR SELECT
      USING (contractor_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE pricing_analytics IS 'Market pricing analytics for jobs by category, location, and other factors';
COMMENT ON TABLE pricing_recommendations IS 'Pricing recommendations generated by the Intelligent Pricing Agent';
COMMENT ON TABLE contractor_pricing_patterns IS 'Learned pricing patterns and behavior for individual contractors';

COMMENT ON COLUMN pricing_recommendations.competitiveness_score IS 'Score 0-100: 0-30=too_low, 31-60=competitive, 61-80=premium, 81-100=too_high';
COMMENT ON COLUMN contractor_pricing_patterns.pricing_style IS 'Inferred pricing strategy: budget (below market), competitive (at market), premium (above market), variable (inconsistent)';

