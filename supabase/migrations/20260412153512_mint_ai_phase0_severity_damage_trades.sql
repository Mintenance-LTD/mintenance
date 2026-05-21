-- Phase 0: Mint AI Foundation Improvements
-- 1. Migrate severity from 3-tier to 4-tier (early/developing/significant/dangerous)
-- 2. Add canonical damage type column (normalized from 48 free-text variants)
-- 3. Add recommended contractor trades column
-- 4. Backfill existing data

-- ============================================================================
-- STEP 1: Migrate severity to 4-tier
-- ============================================================================

-- Drop the old CHECK constraint if it exists (safe — ignores if missing)
ALTER TABLE building_assessments DROP CONSTRAINT IF EXISTS building_assessments_severity_check;

-- Map existing values: early→early, midway→developing, full→dangerous
UPDATE building_assessments SET severity = 'developing' WHERE severity = 'midway';
UPDATE building_assessments SET severity = 'dangerous' WHERE severity = 'full';

-- Add new CHECK constraint with 4-tier severity
ALTER TABLE building_assessments
  ADD CONSTRAINT building_assessments_severity_check
  CHECK (severity IN ('early', 'developing', 'significant', 'dangerous'));

-- Also migrate predicted_severity column
UPDATE building_assessments SET predicted_severity = 'developing' WHERE predicted_severity = 'midway';
UPDATE building_assessments SET predicted_severity = 'dangerous' WHERE predicted_severity = 'full';

-- ============================================================================
-- STEP 2: Add canonical damage type column
-- ============================================================================

-- The 15 canonical damage types from damage-type-mapping.ts
ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS damage_type_canonical TEXT;

-- Add CHECK constraint for canonical types
ALTER TABLE building_assessments
  ADD CONSTRAINT building_assessments_damage_type_canonical_check
  CHECK (damage_type_canonical IS NULL OR damage_type_canonical IN (
    'pipe_leak', 'water_damage', 'wall_crack', 'roof_damage', 'electrical_fault',
    'mold_damp', 'fire_damage', 'window_broken', 'door_damaged', 'floor_damage',
    'ceiling_damage', 'foundation_crack', 'hvac_issue', 'gutter_blocked',
    'general_damage', 'none'
  ));

-- Backfill canonical damage types from free-text damage_type
UPDATE building_assessments SET damage_type_canonical = CASE
  -- Water-related
  WHEN lower(damage_type) IN ('water leak', 'water leakage', 'pipe leak', 'pipe leakage',
    'leaking faucet', 'pipe rupture', 'burst pipe', 'cracked pipe', 'cracked drainage pipe',
    'potential plumbing issue', 'pipe installation issue', 'improper pipe support',
    'corroded pipe') THEN 'pipe_leak'
  WHEN lower(damage_type) IN ('water damage', 'water_damage') THEN 'water_damage'
  -- Structural
  WHEN lower(damage_type) IN ('structural crack', 'wall_crack', 'wall crack',
    'plaster damage', 'exterior wall damage') THEN 'wall_crack'
  WHEN lower(damage_type) IN ('structural damage', 'structural collapse') THEN 'foundation_crack'
  -- Roof
  WHEN lower(damage_type) IN ('roof damage', 'roof_damage', 'missing shingles',
    'missing roof shingles', 'roof shingle damage', 'shingle damage',
    'broken roof tiles', 'dislodged roof tiles', 'roof tile damage',
    'roof tile displacement') THEN 'roof_damage'
  -- Mold/damp
  WHEN lower(damage_type) IN ('mold growth', 'mold_damp', 'damp', 'mold',
    'brickwork discoloration', 'discoloration') THEN 'mold_damp'
  -- Corrosion/general
  WHEN lower(damage_type) IN ('corrosion', 'rust and corrosion') THEN 'general_damage'
  -- Fire
  WHEN lower(damage_type) IN ('fire damage', 'fire_damage') THEN 'fire_damage'
  -- Electrical
  WHEN lower(damage_type) IN ('electrical_fault', 'electrical fault') THEN 'electrical_fault'
  -- Cosmetic
  WHEN lower(damage_type) IN ('paint deterioration', 'cosmetic wall repair',
    'cosmetic blemishes', 'cosmetic staining', 'cosmetic wear') THEN 'general_damage'
  -- Other
  WHEN lower(damage_type) IN ('none', 'unknown') THEN 'none'
  WHEN lower(damage_type) IN ('uneven paving') THEN 'floor_damage'
  WHEN lower(damage_type) IN ('mechanical component inspection') THEN 'hvac_issue'
  WHEN lower(damage_type) = 'general_damage' THEN 'general_damage'
  -- Default: try to match known canonical types directly
  WHEN lower(damage_type) IN ('pipe_leak', 'water_damage', 'wall_crack', 'roof_damage',
    'electrical_fault', 'mold_damp', 'fire_damage', 'window_broken', 'door_damaged',
    'floor_damage', 'ceiling_damage', 'foundation_crack', 'hvac_issue',
    'gutter_blocked', 'general_damage') THEN lower(damage_type)
  ELSE 'general_damage'
END;

-- Index for faster querying by canonical type
CREATE INDEX IF NOT EXISTS idx_building_assessments_damage_type_canonical
  ON building_assessments (damage_type_canonical);

-- ============================================================================
-- STEP 3: Add recommended contractor trades column
-- ============================================================================

ALTER TABLE building_assessments
  ADD COLUMN IF NOT EXISTS recommended_trades TEXT[];

-- Backfill based on canonical damage type
UPDATE building_assessments SET recommended_trades = CASE damage_type_canonical
  WHEN 'pipe_leak' THEN ARRAY['plumber']
  WHEN 'water_damage' THEN ARRAY['plumber', 'damp_specialist']
  WHEN 'wall_crack' THEN ARRAY['plasterer', 'structural_engineer']
  WHEN 'roof_damage' THEN ARRAY['roofer']
  WHEN 'electrical_fault' THEN ARRAY['electrician']
  WHEN 'mold_damp' THEN ARRAY['damp_specialist']
  WHEN 'fire_damage' THEN ARRAY['general_builder']
  WHEN 'window_broken' THEN ARRAY['glazier']
  WHEN 'door_damaged' THEN ARRAY['general_builder', 'locksmith']
  WHEN 'floor_damage' THEN ARRAY['general_builder']
  WHEN 'ceiling_damage' THEN ARRAY['plasterer']
  WHEN 'foundation_crack' THEN ARRAY['structural_engineer']
  WHEN 'hvac_issue' THEN ARRAY['gas_engineer']
  WHEN 'gutter_blocked' THEN ARRAY['roofer']
  WHEN 'general_damage' THEN ARRAY['general_builder']
  ELSE ARRAY['general_builder']
END
WHERE recommended_trades IS NULL;

-- ============================================================================
-- STEP 4: Also update vlm_training_buffer severity values
-- ============================================================================

UPDATE vlm_training_buffer SET severity = 'developing' WHERE severity = 'midway';
UPDATE vlm_training_buffer SET severity = 'dangerous' WHERE severity = 'full';

-- ============================================================================
-- STEP 5: Update vlm_student_calibration categories to canonical forms
-- ============================================================================

-- Merge duplicate categories (e.g. "water leak" and "water damage" are both water-related)
-- This is informational only — calibration data is small (19 rows) and will be recalculated

-- Add comment for documentation
COMMENT ON COLUMN building_assessments.severity IS 'Damage severity: early (cosmetic/minor), developing (progressing, needs attention), significant (serious, risk of spread), dangerous (structural/safety risk, urgent repair)';
COMMENT ON COLUMN building_assessments.damage_type_canonical IS 'Normalized damage type from 15 canonical categories. See damage-type-mapping.ts';
COMMENT ON COLUMN building_assessments.recommended_trades IS 'Recommended contractor trades for this damage type (plumber, electrician, roofer, etc.)';
