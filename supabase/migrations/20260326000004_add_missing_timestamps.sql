-- Add missing updated_at columns to tables that need audit trails

-- job_milestones: status changes need tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_milestones' AND column_name = 'updated_at') THEN
    ALTER TABLE public.job_milestones ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- job_guarantees: terms JSONB can be mutated
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_guarantees' AND column_name = 'updated_at') THEN
    ALTER TABLE public.job_guarantees ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- hybrid_routing_decisions: routing decisions can be updated
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hybrid_routing_decisions' AND column_name = 'updated_at') THEN
    ALTER TABLE public.hybrid_routing_decisions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ai_analysis_results
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_analysis_results' AND column_name = 'updated_at') THEN
    ALTER TABLE public.ai_analysis_results ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- confidence_calibration_data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'confidence_calibration_data' AND column_name = 'updated_at') THEN
    ALTER TABLE public.confidence_calibration_data ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
