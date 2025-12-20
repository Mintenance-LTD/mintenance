-- =====================================================
-- Maintenance AI System - Database Adaptation
-- =====================================================
-- Adapts existing Building Surveyor tables for maintenance app
-- Reuses 95% of existing infrastructure

-- =====================================================
-- 1. Create maintenance_assessments from building_assessments
-- =====================================================

-- Create the maintenance assessments table (adapted from building_assessments)
CREATE TABLE IF NOT EXISTS maintenance_assessments (
  -- Core fields (reused)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  cache_key VARCHAR(64),

  -- Maintenance-specific issue classification
  issue_type VARCHAR(100) CHECK (issue_type IN (
    'pipe_leak', 'faucet_drip', 'toilet_issue', 'water_heater', 'drain_blocked',
    'outlet_damage', 'light_fixture', 'circuit_breaker',
    'wall_crack', 'ceiling_stain', 'window_broken', 'door_issue',
    'ac_not_cooling', 'heating_issue', 'vent_blocked',
    'general', 'unknown'
  )),

  -- Severity (simplified for maintenance)
  severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'major', 'critical')),

  -- Confidence and scoring (reused)
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),

  -- Urgency (reused)
  urgency VARCHAR(20) CHECK (urgency IN ('immediate', 'urgent', 'soon', 'planned', 'monitor')),

  -- Maintenance-specific fields
  issue_category VARCHAR(50) CHECK (issue_category IN (
    'plumbing', 'electrical', 'hvac', 'structural', 'appliance', 'cosmetic', 'other'
  )),
  contractor_type VARCHAR(50),
  estimated_duration VARCHAR(20), -- "30min", "1-2h", "half-day", "full-day"
  materials_needed JSONB, -- Array of materials
  tools_required JSONB, -- Array of tools
  homeowner_tips TEXT[], -- Immediate action tips
  cost_estimate_range JSONB, -- {min: 50, max: 150, currency: "USD"}

  -- Assessment data (reused structure)
  assessment_data JSONB, -- Complete assessment details

  -- Enhanced with SAM3 data
  segmentation_masks JSONB, -- SAM3 output
  affected_area_percentage FLOAT, -- From SAM3 analysis
  precise_boundaries JSONB, -- Exact damage boundaries

  -- Validation and feedback (reused)
  validation_status VARCHAR(20) DEFAULT 'pending' CHECK (
    validation_status IN ('pending', 'validated', 'rejected', 'needs_review')
  ),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,

  -- Contractor feedback
  contractor_found_helpful BOOLEAN,
  actual_issue VARCHAR(100),
  actual_time_hours FLOAT,
  actual_materials_used JSONB,
  contractor_notes TEXT,

  -- Model versioning (reused)
  model_version VARCHAR(50),
  model_type VARCHAR(20) DEFAULT 'maintenance_yolo',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_user_id ON maintenance_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_job_id ON maintenance_assessments(job_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_issue_type ON maintenance_assessments(issue_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_severity ON maintenance_assessments(severity);
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_urgency ON maintenance_assessments(urgency);
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_contractor_type ON maintenance_assessments(contractor_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_created_at ON maintenance_assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_assessments_validation_status ON maintenance_assessments(validation_status);

-- =====================================================
-- 2. Adapt training data tables
-- =====================================================

-- Maintenance training labels (adapted from gpt4_training_labels)
CREATE TABLE IF NOT EXISTS maintenance_training_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES maintenance_assessments(id) ON DELETE CASCADE,
  image_urls TEXT[],

  -- GPT-4 response for maintenance
  gpt4_response JSONB,
  issue_type TEXT,
  severity VARCHAR(20),
  confidence FLOAT,

  -- Maintenance-specific extracted data
  materials_identified JSONB,
  tools_identified JSONB,
  safety_hazards JSONB,
  time_estimate_minutes INTEGER,

  -- Training metadata (reused)
  used_in_training BOOLEAN DEFAULT FALSE,
  training_version TEXT,
  training_job_id TEXT,
  response_quality VARCHAR(20) CHECK (response_quality IN ('high', 'medium', 'low', 'uncertain')),

  -- Human verification (reused)
  human_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_training_labels_assessment ON maintenance_training_labels(assessment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_training_labels_training ON maintenance_training_labels(used_in_training);
CREATE INDEX IF NOT EXISTS idx_maintenance_training_labels_verified ON maintenance_training_labels(human_verified);

-- Maintenance corrections (adapted from yolo_corrections)
CREATE TABLE IF NOT EXISTS maintenance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES maintenance_assessments(id) ON DELETE CASCADE,
  image_url TEXT,
  image_index INTEGER DEFAULT 0,

  -- Original and corrected data
  original_detections JSONB,
  corrected_labels TEXT, -- YOLO format
  corrections_made JSONB,

  -- Who made the correction
  corrected_by UUID REFERENCES auth.users(id),
  corrected_at TIMESTAMPTZ DEFAULT NOW(),

  -- Quality scoring (reused)
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  correction_quality VARCHAR(20) CHECK (
    correction_quality IN ('expert', 'verified', 'contractor', 'user', 'bootstrap')
  ),

  -- Review process (reused)
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'needs_review')
  ),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Training usage (reused)
  used_in_training BOOLEAN DEFAULT FALSE,
  training_version VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_corrections_assessment ON maintenance_corrections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_corrections_status ON maintenance_corrections(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_corrections_quality ON maintenance_corrections(correction_quality);
CREATE INDEX IF NOT EXISTS idx_maintenance_corrections_training ON maintenance_corrections(used_in_training);

-- =====================================================
-- 3. Maintenance-specific knowledge base
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type VARCHAR(100) UNIQUE NOT NULL,
  issue_category VARCHAR(50),

  -- Contractor routing
  contractor_types TEXT[], -- Can need multiple types
  primary_contractor VARCHAR(50),

  -- Time and cost estimates
  time_estimate_min INTEGER, -- minutes
  time_estimate_max INTEGER,
  cost_estimate_min DECIMAL(10,2),
  cost_estimate_max DECIMAL(10,2),
  cost_factors JSONB, -- Factors affecting cost

  -- Materials and tools
  common_materials JSONB,
  common_tools JSONB,
  specialized_equipment JSONB,

  -- Instructions and safety
  homeowner_immediate_actions TEXT[],
  safety_precautions TEXT[],
  when_to_call_emergency TEXT[],

  -- DIY information
  diy_difficulty VARCHAR(20) CHECK (
    diy_difficulty IN ('easy', 'medium', 'hard', 'professional_only')
  ),
  diy_instructions TEXT,
  diy_video_urls TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate with initial data
INSERT INTO maintenance_knowledge_base (
  issue_type, issue_category, contractor_types, primary_contractor,
  time_estimate_min, time_estimate_max, cost_estimate_min, cost_estimate_max,
  common_materials, common_tools, homeowner_immediate_actions, safety_precautions,
  diy_difficulty
) VALUES
  ('pipe_leak', 'plumbing', ARRAY['plumber'], 'plumber',
   30, 120, 75, 200,
   '["Replacement fitting", "PTFE tape", "Pipe sealant"]'::jsonb,
   '["Adjustable wrench", "Pipe cutter", "Bucket"]'::jsonb,
   ARRAY['Turn off water supply', 'Place bucket under leak', 'Move valuables away'],
   ARRAY['Ensure water is off', 'Check for electrical hazards near water'],
   'medium'),

  ('outlet_damage', 'electrical', ARRAY['electrician'], 'electrician',
   30, 60, 100, 250,
   '["Replacement outlet", "Wire nuts", "Electrical tape"]'::jsonb,
   '["Voltage tester", "Screwdrivers", "Wire strippers"]'::jsonb,
   ARRAY['Turn off circuit breaker', 'Do not use outlet', 'Keep area clear'],
   ARRAY['Never work on live circuits', 'Test with voltage tester first'],
   'professional_only'),

  ('wall_crack', 'structural', ARRAY['general_contractor', 'handyman'], 'general_contractor',
   120, 240, 150, 400,
   '["Spackling compound", "Mesh tape", "Primer", "Paint"]'::jsonb,
   '["Putty knife", "Sandpaper", "Paint brush"]'::jsonb,
   ARRAY['Monitor crack growth', 'Take photos for reference'],
   ARRAY['Large cracks may indicate structural issues'],
   'easy')
ON CONFLICT (issue_type) DO NOTHING;

-- =====================================================
-- 4. Contractor contribution tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS contractor_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contribution details
  images_contributed INTEGER DEFAULT 0,
  images_verified INTEGER DEFAULT 0,
  corrections_made INTEGER DEFAULT 0,

  -- Quality metrics
  average_quality_score FLOAT,
  expert_verifications INTEGER DEFAULT 0,

  -- Rewards
  credits_earned DECIMAL(10,2) DEFAULT 0,
  premium_months_earned INTEGER DEFAULT 0,
  last_reward_date DATE,

  -- Status
  contributor_level VARCHAR(20) DEFAULT 'bronze' CHECK (
    contributor_level IN ('bronze', 'silver', 'gold', 'expert')
  ),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contractor_contributions_contractor ON contractor_contributions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_contributions_level ON contractor_contributions(contributor_level);

-- =====================================================
-- 5. Performance tracking specific to maintenance
-- =====================================================

CREATE TABLE IF NOT EXISTS maintenance_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,

  -- Detection metrics
  total_assessments INTEGER DEFAULT 0,
  successful_detections INTEGER DEFAULT 0,
  no_detection_cases INTEGER DEFAULT 0,
  average_confidence FLOAT,

  -- Category breakdown
  issues_by_category JSONB, -- {plumbing: 45, electrical: 23, ...}
  accuracy_by_category JSONB, -- {plumbing: 0.87, electrical: 0.92, ...}

  -- Performance metrics
  average_latency_ms FLOAT,
  p95_latency_ms FLOAT,
  p99_latency_ms FLOAT,

  -- Contractor metrics
  contractor_satisfaction_rate FLOAT,
  helpful_rate FLOAT,
  feedback_collection_rate FLOAT,

  -- Cost tracking
  local_inference_count INTEGER DEFAULT 0,
  gpt4_fallback_count INTEGER DEFAULT 0,
  estimated_daily_cost DECIMAL(10,2),
  estimated_savings DECIMAL(10,2),

  -- Model metrics
  current_model_version VARCHAR(50),
  model_accuracy FLOAT,
  model_precision FLOAT,
  model_recall FLOAT,
  model_f1_score FLOAT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_performance_date ON maintenance_performance_metrics(date DESC);

-- =====================================================
-- 6. Create views for analytics
-- =====================================================

-- Daily maintenance statistics
CREATE OR REPLACE VIEW maintenance_daily_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_assessments,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT job_id) as unique_jobs,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN contractor_found_helpful = true THEN 1 END) as helpful_count,
  COUNT(CASE WHEN contractor_found_helpful IS NOT NULL THEN 1 END) as feedback_count,
  ROUND(AVG(CASE WHEN contractor_found_helpful = true THEN 1 ELSE 0 END)::numeric * 100, 2) as helpful_percentage,
  array_agg(DISTINCT issue_type) FILTER (WHERE issue_type IS NOT NULL) as issues_detected,
  array_agg(DISTINCT contractor_type) FILTER (WHERE contractor_type IS NOT NULL) as contractors_needed
FROM maintenance_assessments
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Contractor feedback summary
CREATE OR REPLACE VIEW contractor_feedback_summary AS
SELECT
  ma.issue_type,
  COUNT(*) as total_cases,
  COUNT(CASE WHEN contractor_found_helpful = true THEN 1 END) as helpful_cases,
  ROUND(AVG(CASE WHEN contractor_found_helpful = true THEN 1 ELSE 0 END)::numeric * 100, 2) as helpful_rate,
  AVG(actual_time_hours) as avg_actual_hours,
  array_agg(DISTINCT actual_issue) FILTER (WHERE actual_issue != ma.issue_type) as misclassifications,
  COUNT(contractor_notes) as notes_count
FROM maintenance_assessments ma
WHERE contractor_found_helpful IS NOT NULL
GROUP BY ma.issue_type
ORDER BY total_cases DESC;

-- Training data readiness
CREATE OR REPLACE VIEW training_data_status AS
SELECT
  'corrections' as data_source,
  COUNT(*) as total_samples,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_samples,
  COUNT(CASE WHEN used_in_training = false AND status = 'approved' THEN 1 END) as ready_for_training,
  MAX(created_at) as latest_sample
FROM maintenance_corrections
UNION ALL
SELECT
  'training_labels' as data_source,
  COUNT(*) as total_samples,
  COUNT(CASE WHEN human_verified = true THEN 1 END) as approved_samples,
  COUNT(CASE WHEN used_in_training = false AND human_verified = true THEN 1 END) as ready_for_training,
  MAX(created_at) as latest_sample
FROM maintenance_training_labels;

-- =====================================================
-- 7. Enable Row Level Security (RLS)
-- =====================================================

-- Maintenance assessments RLS
ALTER TABLE maintenance_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own maintenance assessments" ON maintenance_assessments;
CREATE POLICY "Users can view own maintenance assessments"
  ON maintenance_assessments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create maintenance assessments" ON maintenance_assessments;
CREATE POLICY "Users can create maintenance assessments"
  ON maintenance_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own maintenance assessments" ON maintenance_assessments;
CREATE POLICY "Users can update own maintenance assessments"
  ON maintenance_assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- Contractors can view assessments for their jobs
DROP POLICY IF EXISTS "Contractors can view job assessments" ON maintenance_assessments;
CREATE POLICY "Contractors can view job assessments"
  ON maintenance_assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      WHERE j.id = maintenance_assessments.job_id
      AND j.contractor_id = auth.uid()
    )
  );

-- Maintenance corrections RLS
ALTER TABLE maintenance_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own corrections" ON maintenance_corrections;
CREATE POLICY "Users can view own corrections"
  ON maintenance_corrections FOR SELECT
  USING (auth.uid() = corrected_by);

DROP POLICY IF EXISTS "Users can create corrections" ON maintenance_corrections;
CREATE POLICY "Users can create corrections"
  ON maintenance_corrections FOR INSERT
  WITH CHECK (auth.uid() = corrected_by);

-- Contractors can view all approved corrections (for learning)
DROP POLICY IF EXISTS "Contractors view approved corrections" ON maintenance_corrections;
CREATE POLICY "Contractors view approved corrections"
  ON maintenance_corrections FOR SELECT
  USING (
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'contractor'
    )
  );

-- =====================================================
-- 8. Create triggers for automated updates
-- =====================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_maintenance_assessments_updated_at ON maintenance_assessments;
CREATE TRIGGER update_maintenance_assessments_updated_at
  BEFORE UPDATE ON maintenance_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_maintenance_corrections_updated_at ON maintenance_corrections;
CREATE TRIGGER update_maintenance_corrections_updated_at
  BEFORE UPDATE ON maintenance_corrections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_maintenance_training_labels_updated_at ON maintenance_training_labels;
CREATE TRIGGER update_maintenance_training_labels_updated_at
  BEFORE UPDATE ON maintenance_training_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-calculate performance metrics
CREATE OR REPLACE FUNCTION calculate_maintenance_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO maintenance_performance_metrics (
    date,
    total_assessments,
    successful_detections,
    no_detection_cases,
    average_confidence,
    average_latency_ms,
    contractor_satisfaction_rate,
    helpful_rate,
    local_inference_count,
    gpt4_fallback_count
  )
  SELECT
    CURRENT_DATE,
    COUNT(*),
    COUNT(CASE WHEN issue_type != 'unknown' THEN 1 END),
    COUNT(CASE WHEN issue_type = 'unknown' THEN 1 END),
    AVG(confidence),
    AVG((assessment_data->>'processing_time_ms')::float),
    AVG(CASE WHEN contractor_found_helpful = true THEN 1.0 ELSE 0.0 END),
    AVG(CASE WHEN contractor_found_helpful = true THEN 1.0 ELSE 0.0 END),
    COUNT(CASE WHEN model_type = 'maintenance_yolo' THEN 1 END),
    COUNT(CASE WHEN model_type = 'gpt4_fallback' THEN 1 END)
  FROM maintenance_assessments
  WHERE DATE(created_at) = CURRENT_DATE
  ON CONFLICT (date) DO UPDATE SET
    total_assessments = EXCLUDED.total_assessments,
    successful_detections = EXCLUDED.successful_detections,
    no_detection_cases = EXCLUDED.no_detection_cases,
    average_confidence = EXCLUDED.average_confidence,
    average_latency_ms = EXCLUDED.average_latency_ms,
    contractor_satisfaction_rate = EXCLUDED.contractor_satisfaction_rate,
    helpful_rate = EXCLUDED.helpful_rate,
    local_inference_count = EXCLUDED.local_inference_count,
    gpt4_fallback_count = EXCLUDED.gpt4_fallback_count,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. Create helper functions
-- =====================================================

-- Check if retraining is needed
CREATE OR REPLACE FUNCTION check_retraining_threshold()
RETURNS BOOLEAN AS $$
DECLARE
  pending_count INTEGER;
  threshold INTEGER := 100; -- Configurable threshold
BEGIN
  SELECT COUNT(*)
  INTO pending_count
  FROM maintenance_corrections
  WHERE status = 'approved'
    AND used_in_training = false;

  RETURN pending_count >= threshold;
END;
$$ LANGUAGE plpgsql;

-- Get contractor contribution stats
CREATE OR REPLACE FUNCTION get_contractor_stats(contractor_uuid UUID)
RETURNS TABLE(
  total_contributions INTEGER,
  quality_score FLOAT,
  credits_earned DECIMAL,
  level VARCHAR,
  next_level_requirements TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.images_contributed + cc.corrections_made as total_contributions,
    cc.average_quality_score as quality_score,
    cc.credits_earned,
    cc.contributor_level as level,
    CASE
      WHEN cc.contributor_level = 'bronze' THEN 'Silver: 50 verified contributions'
      WHEN cc.contributor_level = 'silver' THEN 'Gold: 200 verified contributions'
      WHEN cc.contributor_level = 'gold' THEN 'Expert: 500 verified contributions with 90% quality'
      ELSE 'Maximum level reached'
    END as next_level_requirements
  FROM contractor_contributions cc
  WHERE cc.contractor_id = contractor_uuid;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. Grants for service role
-- =====================================================

-- Grant necessary permissions to service role
GRANT ALL ON maintenance_assessments TO service_role;
GRANT ALL ON maintenance_training_labels TO service_role;
GRANT ALL ON maintenance_corrections TO service_role;
GRANT ALL ON maintenance_knowledge_base TO service_role;
GRANT ALL ON contractor_contributions TO service_role;
GRANT ALL ON maintenance_performance_metrics TO service_role;

-- Grant read access to views
GRANT SELECT ON maintenance_daily_stats TO authenticated;
GRANT SELECT ON contractor_feedback_summary TO authenticated;
GRANT SELECT ON training_data_status TO service_role;

-- =====================================================
-- Migration complete!
-- =====================================================