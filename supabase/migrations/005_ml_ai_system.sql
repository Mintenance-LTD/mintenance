-- Consolidated ML/AI System Tables
-- Single source for all AI/ML related infrastructure

-- YOLO models (MERGED VERSION)
CREATE TABLE IF NOT EXISTS public.yolo_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  model_type TEXT CHECK (model_type IN ('detection', 'segmentation', 'classification')),
  file_path TEXT,
  accuracy DECIMAL(5,2),
  parameters JSONB,
  training_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Confidence calibration data (MERGED VERSION)
CREATE TABLE IF NOT EXISTS public.confidence_calibration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.yolo_models(id) ON DELETE CASCADE,
  confidence_threshold DECIMAL(3,2),
  precision_score DECIMAL(5,2),
  recall_score DECIMAL(5,2),
  f1_score DECIMAL(5,2),
  sample_size INTEGER,
  calibration_date TIMESTAMPTZ DEFAULT NOW()
);

-- Hybrid routing decisions (MERGED VERSION)
CREATE TABLE IF NOT EXISTS public.hybrid_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.profiles(id),
  routing_score DECIMAL(5,2),
  factors JSONB,
  decision TEXT CHECK (decision IN ('auto_assigned', 'suggested', 'rejected')),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analysis results
CREATE TABLE IF NOT EXISTS public.ai_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.yolo_models(id),
  analysis_type TEXT NOT NULL,
  results JSONB NOT NULL,
  confidence DECIMAL(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_yolo_models_name ON public.yolo_models(name);
CREATE INDEX IF NOT EXISTS idx_calibration_model ON public.confidence_calibration_data(model_id);
CREATE INDEX IF NOT EXISTS idx_routing_job ON public.hybrid_routing_decisions(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_job ON public.ai_analysis_results(job_id);

-- Enable RLS
ALTER TABLE public.yolo_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_calibration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hybrid_routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_results ENABLE ROW LEVEL SECURITY;
