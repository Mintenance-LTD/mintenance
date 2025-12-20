-- Migration: Extend building_assessments with auto-validation metrics
-- Created: 2025-02-12

ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS auto_validated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_validated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auto_validation_reason TEXT,
  ADD COLUMN IF NOT EXISTS auto_validation_confidence INTEGER CHECK (auto_validation_confidence IS NULL OR (auto_validation_confidence >= 0 AND auto_validation_confidence <= 100)),
  ADD COLUMN IF NOT EXISTS auto_validation_review_status VARCHAR(20) NOT NULL DEFAULT 'not_applicable' CHECK (
    auto_validation_review_status IN ('not_applicable', 'pending_review', 'confirmed', 'overturned')
  );

COMMENT ON COLUMN building_assessments.auto_validated IS 'Indicates whether the assessment was auto-validated by the system';
COMMENT ON COLUMN building_assessments.auto_validated_at IS 'Timestamp when auto-validation was applied';
COMMENT ON COLUMN building_assessments.auto_validation_reason IS 'Reason captured when auto-validation was approved';
COMMENT ON COLUMN building_assessments.auto_validation_confidence IS 'Assessment confidence at the time of auto-validation (0-100)';
COMMENT ON COLUMN building_assessments.auto_validation_review_status IS 'Lifecycle state of auto-validation review (pending_review, confirmed, overturned)';

-- Backfill review status for historical records
UPDATE building_assessments
SET auto_validation_review_status = CASE
  WHEN auto_validated = TRUE AND validation_status = 'validated' AND validated_by IS NULL THEN 'pending_review'
  WHEN auto_validated = TRUE AND validation_status = 'validated' AND validated_by IS NOT NULL THEN 'confirmed'
  WHEN auto_validated = TRUE AND validation_status = 'rejected' THEN 'overturned'
  ELSE auto_validation_review_status
END;

