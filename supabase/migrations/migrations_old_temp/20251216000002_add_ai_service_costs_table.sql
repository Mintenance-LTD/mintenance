-- Create table for tracking AI service costs and usage
CREATE TABLE IF NOT EXISTS public.ai_service_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL, -- e.g., 'building-surveyor', 'image-analysis'
  model TEXT NOT NULL, -- e.g., 'gpt-4o', 'text-embedding-3-small'
  cost DECIMAL(10, 4) NOT NULL, -- Cost in USD
  tokens INTEGER DEFAULT 0, -- Total tokens used
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_ai_service_costs_timestamp ON public.ai_service_costs(timestamp);
CREATE INDEX idx_ai_service_costs_service ON public.ai_service_costs(service);
CREATE INDEX idx_ai_service_costs_user_id ON public.ai_service_costs(user_id);
CREATE INDEX idx_ai_service_costs_job_id ON public.ai_service_costs(job_id);

-- Create composite index for daily/monthly aggregations
CREATE INDEX idx_ai_service_costs_date_service
  ON public.ai_service_costs(DATE(timestamp), service);

-- Enable RLS
ALTER TABLE public.ai_service_costs ENABLE ROW LEVEL SECURITY;

-- Policy: Service accounts can insert records
CREATE POLICY "Service accounts can insert AI costs"
  ON public.ai_service_costs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all costs
CREATE POLICY "Admins can view all AI costs"
  ON public.ai_service_costs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Users can view costs for their own jobs
CREATE POLICY "Users can view AI costs for their jobs"
  ON public.ai_service_costs
  FOR SELECT
  USING (
    job_id IN (
      SELECT id FROM public.jobs
      WHERE homeowner_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

-- Add comment
COMMENT ON TABLE public.ai_service_costs IS 'Tracks AI service usage and costs for budget management';
COMMENT ON COLUMN public.ai_service_costs.service IS 'Name of the AI service (e.g., building-surveyor, image-analysis)';
COMMENT ON COLUMN public.ai_service_costs.model IS 'AI model used (e.g., gpt-4o, text-embedding-3-small)';
COMMENT ON COLUMN public.ai_service_costs.cost IS 'Cost in USD for this API call';
COMMENT ON COLUMN public.ai_service_costs.tokens IS 'Total tokens consumed (prompt + completion)';
COMMENT ON COLUMN public.ai_service_costs.success IS 'Whether the API call succeeded';
COMMENT ON COLUMN public.ai_service_costs.metadata IS 'Additional metadata about the API call';