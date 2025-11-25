-- Migration: Allow NULL user_id for Shadow Mode Assessments
-- Created: 2025-12-02
-- Description: Allows building_assessments.user_id to be NULL when shadow_mode is true, enabling batch training data collection without user context

-- ============================================================================
-- MODIFY USER_ID CONSTRAINT
-- ============================================================================
-- Drop the NOT NULL constraint on user_id
ALTER TABLE building_assessments
  ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure user_id is NOT NULL when shadow_mode is false
ALTER TABLE building_assessments
  ADD CONSTRAINT check_user_id_when_not_shadow_mode
  CHECK (
    (shadow_mode = true AND user_id IS NULL) OR
    (shadow_mode = false AND user_id IS NOT NULL)
  );

-- ============================================================================
-- UPDATE RLS POLICIES
-- ============================================================================
-- Drop existing policies that assume user_id is always present
DROP POLICY IF EXISTS "Users can view own assessments" ON building_assessments;
DROP POLICY IF EXISTS "Users can create own assessments" ON building_assessments;
DROP POLICY IF EXISTS "Users can view own assessment images" ON assessment_images;
DROP POLICY IF EXISTS "Users can create own assessment images" ON assessment_images;

-- Recreate policies to handle NULL user_id for shadow mode
CREATE POLICY "Users can view own assessments"
  ON building_assessments
  FOR SELECT
  USING (
    user_id IS NULL OR -- Shadow mode assessments (admin only)
    auth.uid() = user_id -- User's own assessments
  );

CREATE POLICY "Users can create own assessments"
  ON building_assessments
  FOR INSERT
  WITH CHECK (
    (shadow_mode = true AND user_id IS NULL) OR -- Shadow mode: no user required
    (shadow_mode = false AND auth.uid() = user_id) -- Regular mode: must be own user
  );

CREATE POLICY "Users can view own assessment images"
  ON assessment_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM building_assessments
      WHERE building_assessments.id = assessment_images.assessment_id
      AND (
        building_assessments.user_id IS NULL OR -- Shadow mode (admin only)
        building_assessments.user_id = auth.uid() -- User's own assessments
      )
    )
  );

CREATE POLICY "Users can create own assessment images"
  ON assessment_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM building_assessments
      WHERE building_assessments.id = assessment_images.assessment_id
      AND (
        (building_assessments.shadow_mode = true AND building_assessments.user_id IS NULL) OR
        (building_assessments.shadow_mode = false AND building_assessments.user_id = auth.uid())
      )
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON CONSTRAINT check_user_id_when_not_shadow_mode ON building_assessments IS 
  'Ensures user_id is NULL for shadow mode assessments and NOT NULL for regular assessments';

