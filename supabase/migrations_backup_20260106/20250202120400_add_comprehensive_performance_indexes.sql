-- Migration: Add Comprehensive Performance Indexes
-- Created: 2025-02-02
-- Description: Adds comprehensive indexes for AI agent queries and high-traffic operations

-- ============================================================================
-- AGENT DECISIONS INDEXES (Enhanced)
-- ============================================================================

-- Already exists: idx_agent_decisions_job_id, idx_agent_decisions_user_id, idx_agent_decisions_agent_name, idx_agent_decisions_created_at

-- Composite index for agent performance analytics
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_outcome
  ON agent_decisions(agent_name, outcome_success, created_at DESC)
  WHERE outcome_success IS NOT NULL;

-- Index for learning queries (successful decisions)
CREATE INDEX IF NOT EXISTS idx_agent_decisions_learning
  ON agent_decisions(agent_name, confidence, outcome_success)
  WHERE outcome_success = TRUE;

-- Index for user feedback analysis
CREATE INDEX IF NOT EXISTS idx_agent_decisions_feedback
  ON agent_decisions(agent_name, user_feedback, created_at DESC)
  WHERE user_feedback IS NOT NULL;

-- Composite index for decision type analysis
CREATE INDEX IF NOT EXISTS idx_agent_decisions_type_confidence
  ON agent_decisions(decision_type, confidence DESC, created_at DESC);

-- GIN index for metadata queries
CREATE INDEX IF NOT EXISTS idx_agent_decisions_metadata_gin
  ON agent_decisions USING GIN (metadata);

-- ============================================================================
-- JOBS TABLE INDEXES (Enhanced for AI queries)
-- ============================================================================

-- Composite index for job matching queries
CREATE INDEX IF NOT EXISTS idx_jobs_status_category_budget
  ON jobs(status, category, budget)
  WHERE status IN ('posted', 'assigned');

-- Index for location-based queries (using trigram for fuzzy matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm
  ON jobs USING GIN (location gin_trgm_ops)
  WHERE location IS NOT NULL;

-- Index for job search with filters
CREATE INDEX IF NOT EXISTS idx_jobs_search_filters
  ON jobs(status, category, created_at DESC)
  WHERE status = 'posted';

-- Index for contractor job queries
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_status
  ON jobs(contractor_id, status, updated_at DESC)
  WHERE contractor_id IS NOT NULL;

-- Index for homeowner dashboard
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_status_date
  ON jobs(homeowner_id, status, created_at DESC);

-- Index for urgent jobs
CREATE INDEX IF NOT EXISTS idx_jobs_urgent
  ON jobs(created_at DESC)
  WHERE status = 'posted' AND budget > 1000;

-- Partial index for active jobs
CREATE INDEX IF NOT EXISTS idx_jobs_active
  ON jobs(id, status, updated_at DESC)
  WHERE status IN ('posted', 'assigned', 'in_progress');

-- ============================================================================
-- BIDS TABLE INDEXES (Enhanced)
-- ============================================================================

-- Composite index for bid analysis
CREATE INDEX IF NOT EXISTS idx_bids_job_status_amount
  ON bids(job_id, status, amount)
  WHERE status != 'withdrawn';

-- Index for contractor bid history
CREATE INDEX IF NOT EXISTS idx_bids_contractor_status_date
  ON bids(contractor_id, status, created_at DESC);

-- Index for pricing agent queries
CREATE INDEX IF NOT EXISTS idx_bids_pricing_recommendations
  ON bids(pricing_recommendation_id, was_price_recommended, status)
  WHERE pricing_recommendation_id IS NOT NULL;

-- Index for competitiveness analysis
CREATE INDEX IF NOT EXISTS idx_bids_competitiveness
  ON bids(job_id, competitiveness_score DESC, created_at DESC)
  WHERE competitiveness_score IS NOT NULL;

-- Index for accepted bids (for analytics)
CREATE INDEX IF NOT EXISTS idx_bids_accepted
  ON bids(job_id, contractor_id, amount, created_at DESC)
  WHERE status = 'accepted';

-- ============================================================================
-- USERS TABLE INDEXES (Enhanced for contractor search)
-- ============================================================================

-- Composite index for contractor search
CREATE INDEX IF NOT EXISTS idx_users_contractor_verified_rating
  ON users(role, is_verified, rating DESC)
  WHERE role = 'contractor';

-- Index for location-based contractor search
CREATE INDEX IF NOT EXISTS idx_users_contractor_location_trgm
  ON users USING GIN (location gin_trgm_ops)
  WHERE role = 'contractor' AND location IS NOT NULL;

-- Index for contractor availability
CREATE INDEX IF NOT EXISTS idx_users_contractor_active
  ON users(role, is_verified, total_jobs DESC, rating DESC)
  WHERE role = 'contractor' AND is_verified = TRUE;

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_users_role_created
  ON users(role, created_at DESC);

-- Index for email verification status
CREATE INDEX IF NOT EXISTS idx_users_email_verified
  ON users(email_verified, created_at DESC)
  WHERE email_verified = FALSE;

-- ============================================================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================================================

-- Composite index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, read, created_at DESC);

-- Index for unread notifications count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE read = FALSE;

-- Index for notification type analytics
CREATE INDEX IF NOT EXISTS idx_notifications_type_created
  ON notifications(type, created_at DESC);

-- Partial index for recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recent
  ON notifications(user_id, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- MESSAGES TABLE INDEXES
-- ============================================================================

-- Composite index for conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_job_created
  ON messages(job_id, created_at DESC);

-- Index for user messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON messages(sender_id, created_at DESC);

-- Full-text search index for message content
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
  ON messages USING GIN (to_tsvector('english', content));

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_job_read
  ON messages(job_id, read, created_at DESC)
  WHERE read = FALSE;

-- ============================================================================
-- ESCROW PAYMENTS INDEXES
-- ============================================================================

-- Index for escrow status queries
CREATE INDEX IF NOT EXISTS idx_escrow_payments_status_created
  ON escrow_payments(status, created_at DESC);

-- Index for auto-release queries
CREATE INDEX IF NOT EXISTS idx_escrow_payments_auto_release
  ON escrow_payments(auto_release_enabled, auto_release_date)
  WHERE auto_release_enabled = TRUE AND status = 'held';

-- Index for contractor payouts
CREATE INDEX IF NOT EXISTS idx_escrow_payments_contractor_status
  ON escrow_payments(contractor_id, status, created_at DESC)
  WHERE contractor_id IS NOT NULL;

-- Index for homeowner escrows
CREATE INDEX IF NOT EXISTS idx_escrow_payments_homeowner_status
  ON escrow_payments(homeowner_id, status, created_at DESC)
  WHERE homeowner_id IS NOT NULL;

-- Index for photo verification status
CREATE INDEX IF NOT EXISTS idx_escrow_payments_photo_verification
  ON escrow_payments(photo_verification_status, created_at DESC)
  WHERE photo_verification_status IS NOT NULL;

-- ============================================================================
-- PRICING ANALYTICS INDEXES (Enhanced)
-- ============================================================================

-- Composite index for category/location pricing queries
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_category_location_date
  ON pricing_analytics(category, location, analyzed_at DESC)
  WHERE category IS NOT NULL;

-- Index for region-based pricing
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_region_category
  ON pricing_analytics(region, category, analyzed_at DESC)
  WHERE region IS NOT NULL;

-- Index for market tier analysis
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_market_tier
  ON pricing_analytics(market_tier, category, analyzed_at DESC)
  WHERE market_tier IS NOT NULL;

-- Index for recent pricing data
CREATE INDEX IF NOT EXISTS idx_pricing_analytics_recent
  ON pricing_analytics(analyzed_at DESC)
  WHERE analyzed_at > NOW() - INTERVAL '90 days';

-- ============================================================================
-- CONTRACTOR SKILLS INDEXES
-- ============================================================================

-- Index for skill-based contractor search
CREATE INDEX IF NOT EXISTS idx_contractor_skills_skill_contractor
  ON contractor_skills(skill_name, contractor_id)
  WHERE skill_name IS NOT NULL;

-- Index for contractor skill lookup
CREATE INDEX IF NOT EXISTS idx_contractor_skills_contractor
  ON contractor_skills(contractor_id);

-- Index for experience level filtering
CREATE INDEX IF NOT EXISTS idx_contractor_skills_experience
  ON contractor_skills(skill_name, experience_level)
  WHERE experience_level IS NOT NULL;

-- ============================================================================
-- RISK PREDICTIONS INDEXES
-- ============================================================================

-- Composite index for risk analysis
CREATE INDEX IF NOT EXISTS idx_risk_predictions_job_type_severity
  ON risk_predictions(job_id, risk_type, severity, created_at DESC);

-- Index for high-risk jobs
CREATE INDEX IF NOT EXISTS idx_risk_predictions_high_risk
  ON risk_predictions(risk_type, probability DESC, created_at DESC)
  WHERE severity IN ('high', 'critical');

-- Index for applied preventive actions
CREATE INDEX IF NOT EXISTS idx_risk_predictions_applied
  ON risk_predictions(applied, outcome_occurred, created_at DESC)
  WHERE applied = TRUE;

-- ============================================================================
-- AUTOMATION PREFERENCES INDEXES
-- ============================================================================

-- Index for learning-enabled users
CREATE INDEX IF NOT EXISTS idx_automation_preferences_learning
  ON automation_preferences(learning_enabled, updated_at DESC)
  WHERE learning_enabled = TRUE;

-- Index for auto-complete enabled users
CREATE INDEX IF NOT EXISTS idx_automation_preferences_auto_complete
  ON automation_preferences(auto_complete_jobs, updated_at DESC)
  WHERE auto_complete_jobs = TRUE;

-- ============================================================================
-- LEARNING MODEL VERSIONS INDEXES
-- ============================================================================

-- Index for active models
CREATE INDEX IF NOT EXISTS idx_learning_model_versions_active_type
  ON learning_model_versions(model_type, is_active, deployed_at DESC)
  WHERE is_active = TRUE;

-- GIN index for performance metrics
CREATE INDEX IF NOT EXISTS idx_learning_model_versions_metrics_gin
  ON learning_model_versions USING GIN (performance_metrics);

-- ============================================================================
-- CONTINUUM MEMORY INDEXES (if table exists)
-- ============================================================================

-- Index for memory retrieval by entity
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'continuum_memory') THEN
    CREATE INDEX IF NOT EXISTS idx_continuum_memory_entity
      ON continuum_memory(entity_type, entity_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_continuum_memory_importance
      ON continuum_memory(importance_score DESC, created_at DESC)
      WHERE importance_score > 0.7;

    CREATE INDEX IF NOT EXISTS idx_continuum_memory_recent
      ON continuum_memory(created_at DESC)
      WHERE created_at > NOW() - INTERVAL '30 days';

    -- GIN index for memory content (if it's JSONB)
    CREATE INDEX IF NOT EXISTS idx_continuum_memory_content_gin
      ON continuum_memory USING GIN (memory_content)
      WHERE memory_content IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- AB TEST TABLES INDEXES
-- ============================================================================

-- Index for active AB tests
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_test_assignments') THEN
    CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_experiment
      ON ab_test_assignments(user_id, experiment_id, assigned_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_variant
      ON ab_test_assignments(experiment_id, variant, assigned_at DESC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ab_test_metrics') THEN
    CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_experiment_variant
      ON ab_test_metrics(experiment_id, variant, recorded_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_metric_type
      ON ab_test_metrics(metric_type, recorded_at DESC);
  END IF;
END $$;

-- ============================================================================
-- BUILDING SURVEYOR INDEXES (Enhanced)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'building_assessments') THEN
    -- Index for assessment status
    CREATE INDEX IF NOT EXISTS idx_building_assessments_status_created
      ON building_assessments(assessment_status, created_at DESC);

    -- Index for job assessments
    CREATE INDEX IF NOT EXISTS idx_building_assessments_job
      ON building_assessments(job_id, created_at DESC)
      WHERE job_id IS NOT NULL;

    -- Index for confidence scores
    CREATE INDEX IF NOT EXISTS idx_building_assessments_confidence
      ON building_assessments(confidence_score DESC, created_at DESC)
      WHERE confidence_score IS NOT NULL;

    -- GIN index for detected issues
    CREATE INDEX IF NOT EXISTS idx_building_assessments_issues_gin
      ON building_assessments USING GIN (detected_issues)
      WHERE detected_issues IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yolo_corrections') THEN
    -- Index for correction status
    CREATE INDEX IF NOT EXISTS idx_yolo_corrections_status
      ON yolo_corrections(correction_status, created_at DESC);

    -- Index for model version
    CREATE INDEX IF NOT EXISTS idx_yolo_corrections_model_version
      ON yolo_corrections(model_version, created_at DESC);

    -- Index for approved corrections (for retraining)
    CREATE INDEX IF NOT EXISTS idx_yolo_corrections_approved
      ON yolo_corrections(is_approved, created_at DESC)
      WHERE is_approved = TRUE;
  END IF;
END $$;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Dashboard query: Recent jobs with bids
CREATE INDEX IF NOT EXISTS idx_jobs_dashboard_query
  ON jobs(homeowner_id, status, created_at DESC)
  WHERE status IN ('posted', 'assigned', 'in_progress');

-- Contractor discovery: Active contractors with skills
CREATE INDEX IF NOT EXISTS idx_users_contractor_discovery
  ON users(role, is_verified, rating DESC, total_jobs DESC)
  WHERE role = 'contractor' AND is_verified = TRUE;

-- Agent decision analytics
CREATE INDEX IF NOT EXISTS idx_agent_decisions_analytics
  ON agent_decisions(agent_name, decision_type, outcome_success, created_at DESC)
  WHERE created_at > NOW() - INTERVAL '90 days';

-- Pricing recommendation effectiveness
CREATE INDEX IF NOT EXISTS idx_pricing_recommendations_effectiveness
  ON pricing_recommendations(contractor_used_recommendation, bid_was_accepted, created_at DESC)
  WHERE contractor_used_recommendation IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_agent_decisions_agent_outcome IS 'Composite index for agent performance analytics queries';
COMMENT ON INDEX idx_jobs_location_trgm IS 'Trigram index for fuzzy location matching in job searches';
COMMENT ON INDEX idx_bids_competitiveness IS 'Index for pricing competitiveness analysis';
COMMENT ON INDEX idx_notifications_user_unread IS 'Partial index for fast unread notification counts';
COMMENT ON INDEX idx_escrow_payments_auto_release IS 'Index for auto-release agent queries';
COMMENT ON INDEX idx_risk_predictions_high_risk IS 'Index for identifying high-risk jobs requiring intervention';
