-- Migration: Mint AI Rebuild Phase 1 - Damage Taxonomy and Assessment Evidence
-- Description: Adds damage_taxonomy table, assessment_evidence table, and extends building_assessments.
-- Plan: Rebuild Mint AI as Agentic Building Damage Assessment VLM

-- ============================================================================
-- DAMAGE TAXONOMY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.damage_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL CHECK (domain IN ('building', 'rail', 'infrastructure', 'general')),
  material TEXT,
  damage_family TEXT NOT NULL,
  damage_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  severity_mapping JSONB DEFAULT '{}',
  can_progress_from TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(domain, damage_type)
);

COMMENT ON TABLE public.damage_taxonomy IS 'Hierarchical damage taxonomy for Mint AI; extensible to rail/steel later';
COMMENT ON COLUMN public.damage_taxonomy.domain IS 'Inspection domain: building, rail, infrastructure, general';
COMMENT ON COLUMN public.damage_taxonomy.damage_family IS 'Family: crack, moisture, biological, structural, thermal, etc.';
COMMENT ON COLUMN public.damage_taxonomy.can_progress_from IS 'Damage types this can progress from (e.g. expansion_crack -> structural_crack)';

CREATE INDEX IF NOT EXISTS idx_damage_taxonomy_domain ON public.damage_taxonomy(domain);
CREATE INDEX IF NOT EXISTS idx_damage_taxonomy_damage_family ON public.damage_taxonomy(damage_family);

-- ============================================================================
-- SEED BUILDING DOMAIN (15 target classes from class_mapping.json)
-- ============================================================================
INSERT INTO public.damage_taxonomy (domain, material, damage_family, damage_type, display_name, description)
VALUES
  ('building', NULL, 'moisture', 'pipe_leak', 'Pipe leak', 'Leaking pipes, radiators, or plumbing'),
  ('building', NULL, 'moisture', 'water_damage', 'Water damage', 'Water intrusion, staining, or moisture damage'),
  ('building', NULL, 'crack', 'wall_crack', 'Wall crack', 'Cracks in walls including minor, stepped, expansion'),
  ('building', NULL, 'structural', 'roof_damage', 'Roof damage', 'Damaged roof, loose coping, defective paving'),
  ('building', NULL, 'electrical', 'electrical_fault', 'Electrical fault', 'Bare wires, dangerous sockets, electrical issues'),
  ('building', NULL, 'biological', 'mold_damp', 'Mold and damp', 'Mold, mould, damp, damp damage'),
  ('building', NULL, 'fire', 'fire_damage', 'Fire damage', 'Fire-related damage'),
  ('building', NULL, 'structural', 'window_broken', 'Broken window', 'Broken or damaged windows'),
  ('building', NULL, 'structural', 'door_damaged', 'Door damaged', 'Damaged doors'),
  ('building', NULL, 'structural', 'floor_damage', 'Floor damage', 'Damaged floor, timber floor, defective paving'),
  ('building', NULL, 'structural', 'ceiling_damage', 'Ceiling damage', 'Damaged ceiling, plaster board'),
  ('building', NULL, 'crack', 'foundation_crack', 'Foundation crack', 'Foundation cracks, sunken block, unstable'),
  ('building', NULL, 'mechanical', 'hvac_issue', 'HVAC issue', 'HVAC, radiator, heating issues'),
  ('building', NULL, 'moisture', 'gutter_blocked', 'Gutter blocked', 'Blocked gutters'),
  ('building', NULL, 'structural', 'general_damage', 'General damage', 'General building damage, deterioration, corrosion')
ON CONFLICT (domain, damage_type) DO NOTHING;

-- ============================================================================
-- ASSESSMENT EVIDENCE TABLE (agent tool trace)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assessment_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  input_refs JSONB DEFAULT '{}',
  output_summary JSONB DEFAULT '{}',
  output_raw_ref TEXT,
  confidence_aggregate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.assessment_evidence IS 'Per-tool-run evidence for Mint AI agent; one row per tool step per assessment';
COMMENT ON COLUMN public.assessment_evidence.tool_name IS 'detect, segment, vision_labels, retrieve_memory';

CREATE INDEX IF NOT EXISTS idx_assessment_evidence_assessment_step
  ON public.assessment_evidence(assessment_id, step_index);

-- FK to building_assessments only if table exists (avoid hard dependency on migration order)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'building_assessments') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'assessment_evidence_assessment_id_fkey'
      AND table_schema = 'public' AND table_name = 'assessment_evidence'
    ) THEN
      ALTER TABLE public.assessment_evidence
        ADD CONSTRAINT assessment_evidence_assessment_id_fkey
        FOREIGN KEY (assessment_id) REFERENCES public.building_assessments(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- EXTEND BUILDING_ASSESSMENTS (nullable columns for backward compatibility)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'building_assessments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'building_assessments' AND column_name = 'damage_taxonomy_id') THEN
      ALTER TABLE public.building_assessments ADD COLUMN damage_taxonomy_id UUID REFERENCES public.damage_taxonomy(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'building_assessments' AND column_name = 'domain') THEN
      ALTER TABLE public.building_assessments ADD COLUMN domain TEXT DEFAULT 'building';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'building_assessments' AND column_name = 'material') THEN
      ALTER TABLE public.building_assessments ADD COLUMN material TEXT;
    END IF;
    UPDATE public.building_assessments SET domain = 'building' WHERE domain IS NULL;
  END IF;
END $$;

-- ============================================================================
-- OPTIONAL: EXTEND BUILDING_ASSESSMENT_OUTCOMES
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'building_assessment_outcomes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'building_assessment_outcomes' AND column_name = 'actual_damage_taxonomy_id') THEN
      ALTER TABLE public.building_assessment_outcomes ADD COLUMN actual_damage_taxonomy_id UUID REFERENCES public.damage_taxonomy(id);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.damage_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "damage_taxonomy_read_all"
  ON public.damage_taxonomy FOR SELECT USING (true);

CREATE POLICY "assessment_evidence_select_via_assessment"
  ON public.assessment_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.building_assessments ba
      WHERE ba.id = assessment_evidence.assessment_id
      AND (ba.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    )
  );

CREATE POLICY "assessment_evidence_insert_service"
  ON public.assessment_evidence FOR INSERT WITH CHECK (true);

CREATE POLICY "assessment_evidence_admin_all"
  ON public.assessment_evidence FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
