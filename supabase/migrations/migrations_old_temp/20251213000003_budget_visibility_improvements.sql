-- Migration: Budget Visibility & Itemization Improvements
-- Date: 2024-12-13
-- Purpose: Eliminate budget anchoring bias and enforce bid transparency

-- ============================================================================
-- PART 1: Jobs Table Enhancements
-- ============================================================================

-- Add budget range fields (for showing range instead of exact budget)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS budget_min DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS budget_max DECIMAL(10, 2);

-- Add budget visibility control
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS show_budget_to_contractors BOOLEAN DEFAULT false;

-- Add itemization requirement flag
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS require_itemized_bids BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN jobs.budget_min IS 'Minimum budget shown to contractors (creates range)';
COMMENT ON COLUMN jobs.budget_max IS 'Maximum budget shown to contractors (creates range)';
COMMENT ON COLUMN jobs.show_budget_to_contractors IS 'Whether to show exact budget to contractors (default: false for blind bidding)';
COMMENT ON COLUMN jobs.require_itemized_bids IS 'Whether contractors must provide itemized cost breakdown (default: true for jobs > £500)';

-- ============================================================================
-- PART 2: Bids Table Enhancements
-- ============================================================================

-- Add itemization tracking fields
ALTER TABLE bids
ADD COLUMN IF NOT EXISTS has_itemization BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS itemization_quality_score INTEGER CHECK (itemization_quality_score BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS materials_breakdown JSONB,
ADD COLUMN IF NOT EXISTS labor_breakdown JSONB,
ADD COLUMN IF NOT EXISTS other_costs_breakdown JSONB;

-- Add bid validation metadata
ALTER TABLE bids
ADD COLUMN IF NOT EXISTS bid_to_budget_ratio DECIMAL(5, 4), -- e.g., 0.95 = 95% of budget
ADD COLUMN IF NOT EXISTS within_typical_range BOOLEAN;

-- Add comments
COMMENT ON COLUMN bids.has_itemization IS 'Whether bid includes detailed cost breakdown';
COMMENT ON COLUMN bids.itemization_quality_score IS 'Quality score of itemization (0-100): completeness, detail, clarity';
COMMENT ON COLUMN bids.materials_breakdown IS 'Detailed materials costs as JSON array: [{item, quantity, unit_price, total}]';
COMMENT ON COLUMN bids.labor_breakdown IS 'Detailed labor costs as JSON: [{description, hours, hourly_rate, total}]';
COMMENT ON COLUMN bids.other_costs_breakdown IS 'Other costs (equipment, travel, permits) as JSON array';
COMMENT ON COLUMN bids.bid_to_budget_ratio IS 'Ratio of bid amount to job budget (for analytics)';
COMMENT ON COLUMN bids.within_typical_range IS 'Whether bid is within typical range for job category/location';

-- ============================================================================
-- PART 3: Update Existing Data (Safe Defaults)
-- ============================================================================

-- Set budget_min and budget_max based on existing budget (10% range)
UPDATE jobs
SET
  budget_min = ROUND(budget * 0.90, 2),
  budget_max = ROUND(budget * 1.10, 2)
WHERE budget IS NOT NULL
  AND budget_min IS NULL
  AND budget_max IS NULL;

-- Set show_budget_to_contractors based on job age
-- New jobs (created in last 30 days): hide budget
-- Old jobs: keep showing budget (don't break existing workflows)
UPDATE jobs
SET show_budget_to_contractors = CASE
  WHEN created_at > NOW() - INTERVAL '30 days' THEN false
  ELSE true
END
WHERE show_budget_to_contractors IS NULL;

-- Set require_itemized_bids based on budget amount
-- High-value jobs (> £500): require itemization
-- Low-value jobs (<= £500): optional
UPDATE jobs
SET require_itemized_bids = CASE
  WHEN budget > 500 THEN true
  ELSE false
END
WHERE require_itemized_bids IS NULL;

-- ============================================================================
-- PART 4: Create Helper Functions
-- ============================================================================

-- Function: Calculate bid quality score
CREATE OR REPLACE FUNCTION calculate_bid_quality_score(
  p_bid_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_bid RECORD;
  v_materials_count INTEGER;
  v_labor_count INTEGER;
  v_other_count INTEGER;
BEGIN
  -- Get bid details
  SELECT * INTO v_bid FROM bids WHERE id = p_bid_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base score: Has any itemization (20 points)
  IF v_bid.has_itemization THEN
    v_score := v_score + 20;
  END IF;

  -- Materials breakdown provided (25 points)
  IF v_bid.materials_breakdown IS NOT NULL THEN
    v_materials_count := jsonb_array_length(v_bid.materials_breakdown);
    IF v_materials_count > 0 THEN
      v_score := v_score + 25;
    END IF;
  END IF;

  -- Labor breakdown provided (25 points)
  IF v_bid.labor_breakdown IS NOT NULL THEN
    v_labor_count := jsonb_array_length(v_bid.labor_breakdown);
    IF v_labor_count > 0 THEN
      v_score := v_score + 25;
    END IF;
  END IF;

  -- Other costs breakdown (10 points)
  IF v_bid.other_costs_breakdown IS NOT NULL THEN
    v_other_count := jsonb_array_length(v_bid.other_costs_breakdown);
    IF v_other_count > 0 THEN
      v_score := v_score + 10;
    END IF;
  END IF;

  -- Detailed line items (5 points per item, max 20)
  IF v_materials_count >= 3 THEN
    v_score := v_score + LEAST(v_materials_count * 5, 20);
  END IF;

  -- Ensure score is between 0-100
  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- Function: Check if bid is within typical range
CREATE OR REPLACE FUNCTION check_bid_within_typical_range(
  p_job_id UUID,
  p_bid_amount DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
  v_job RECORD;
  v_avg_bid DECIMAL;
  v_min_typical DECIMAL;
  v_max_typical DECIMAL;
BEGIN
  -- Get job details
  SELECT category, location INTO v_job FROM jobs WHERE id = p_job_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calculate average accepted bid for similar jobs (same category, last 6 months)
  SELECT AVG(b.bid_amount) INTO v_avg_bid
  FROM bids b
  JOIN jobs j ON b.job_id = j.id
  WHERE j.category = v_job.category
    AND b.status = 'accepted'
    AND b.created_at > NOW() - INTERVAL '6 months';

  -- If no historical data, assume bid is valid
  IF v_avg_bid IS NULL THEN
    RETURN true;
  END IF;

  -- Typical range: 70% to 130% of average
  v_min_typical := v_avg_bid * 0.70;
  v_max_typical := v_avg_bid * 1.30;

  -- Check if bid falls within range
  RETURN p_bid_amount BETWEEN v_min_typical AND v_max_typical;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Triggers for Automatic Updates
-- ============================================================================

-- Trigger: Auto-calculate bid quality score when itemization changes
CREATE OR REPLACE FUNCTION update_bid_quality_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.itemization_quality_score := calculate_bid_quality_score(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bid_quality_score
  BEFORE INSERT OR UPDATE ON bids
  FOR EACH ROW
  WHEN (NEW.has_itemization = true)
  EXECUTE FUNCTION update_bid_quality_score();

-- Trigger: Auto-calculate bid-to-budget ratio
CREATE OR REPLACE FUNCTION calculate_bid_to_budget_ratio()
RETURNS TRIGGER AS $$
DECLARE
  v_budget DECIMAL;
BEGIN
  -- Get job budget
  SELECT budget INTO v_budget FROM jobs WHERE id = NEW.job_id;

  IF v_budget IS NOT NULL AND v_budget > 0 THEN
    NEW.bid_to_budget_ratio := ROUND(NEW.bid_amount / v_budget, 4);
  ELSE
    NEW.bid_to_budget_ratio := NULL;
  END IF;

  -- Check if within typical range
  NEW.within_typical_range := check_bid_within_typical_range(NEW.job_id, NEW.bid_amount);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bid_to_budget_ratio
  BEFORE INSERT OR UPDATE ON bids
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bid_to_budget_ratio();

-- ============================================================================
-- PART 6: Update RLS Policies (Security)
-- ============================================================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Contractors can view jobs without exact budget" ON jobs;

-- Create policy: Contractors see budget range, not exact budget (unless explicitly shown)
CREATE POLICY "Contractors can view jobs with controlled budget visibility" ON jobs
  FOR SELECT
  USING (
    -- Homeowners see everything
    auth.uid() = homeowner_id
    OR
    -- Contractors see jobs but with budget control
    (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND user_type = 'contractor')
      -- Note: Budget visibility is handled at application layer
      -- RLS ensures they can see the job, but API filters budget field
    )
  );

-- ============================================================================
-- PART 7: Create Indexes for Performance
-- ============================================================================

-- Index for budget range queries
CREATE INDEX IF NOT EXISTS idx_jobs_budget_range ON jobs(budget_min, budget_max) WHERE budget_min IS NOT NULL;

-- Index for itemization tracking
CREATE INDEX IF NOT EXISTS idx_bids_has_itemization ON bids(has_itemization) WHERE has_itemization = true;

-- Index for quality scores
CREATE INDEX IF NOT EXISTS idx_bids_quality_score ON bids(itemization_quality_score) WHERE itemization_quality_score IS NOT NULL;

-- Index for budget ratio analytics
CREATE INDEX IF NOT EXISTS idx_bids_budget_ratio ON bids(bid_to_budget_ratio) WHERE bid_to_budget_ratio IS NOT NULL;

-- ============================================================================
-- PART 8: Create Analytics View
-- ============================================================================

-- View: Budget anchoring analytics
CREATE OR REPLACE VIEW budget_anchoring_analytics AS
SELECT
  j.category,
  j.show_budget_to_contractors,
  COUNT(b.id) as total_bids,
  AVG(b.bid_to_budget_ratio) as avg_bid_to_budget_ratio,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY b.bid_to_budget_ratio) as median_bid_to_budget_ratio,
  COUNT(CASE WHEN b.bid_to_budget_ratio > 0.95 THEN 1 END) as bids_near_budget_count,
  COUNT(CASE WHEN b.has_itemization THEN 1 END) as itemized_bids_count,
  AVG(CASE WHEN b.has_itemization THEN b.itemization_quality_score END) as avg_itemization_quality
FROM jobs j
LEFT JOIN bids b ON j.id = b.job_id
WHERE j.created_at > NOW() - INTERVAL '6 months'
GROUP BY j.category, j.show_budget_to_contractors;

COMMENT ON VIEW budget_anchoring_analytics IS 'Analytics view for A/B testing budget visibility impact';

-- ============================================================================
-- PART 9: Sample Data Backfill (Update Existing Bids)
-- ============================================================================

-- Mark existing bids without itemization
UPDATE bids
SET has_itemization = false
WHERE has_itemization IS NULL
  AND materials_cost IS NULL
  AND labor_cost IS NULL
  AND quote_id IS NULL;

-- Mark existing bids WITH itemization (have quote_id)
UPDATE bids
SET has_itemization = true
WHERE has_itemization IS NULL
  AND quote_id IS NOT NULL;

-- ============================================================================
-- PART 10: Validation Constraints
-- ============================================================================

-- Ensure budget_min <= budget <= budget_max
ALTER TABLE jobs
ADD CONSTRAINT check_budget_range
CHECK (
  (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max)
  AND (budget IS NULL OR budget_min IS NULL OR budget >= budget_min)
  AND (budget IS NULL OR budget_max IS NULL OR budget <= budget_max)
);

-- Ensure bid quality score is valid
ALTER TABLE bids
ADD CONSTRAINT check_quality_score_range
CHECK (itemization_quality_score IS NULL OR itemization_quality_score BETWEEN 0 AND 100);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Budget visibility improvements migration completed successfully';
  RAISE NOTICE 'Added fields: budget_min, budget_max, show_budget_to_contractors, require_itemized_bids';
  RAISE NOTICE 'Created functions: calculate_bid_quality_score, check_bid_within_typical_range';
  RAISE NOTICE 'Created triggers: Auto quality scoring, bid-to-budget ratio calculation';
  RAISE NOTICE 'Created analytics view: budget_anchoring_analytics';
END $$;
