-- Add job_views table to track contractors viewing jobs
CREATE TABLE IF NOT EXISTS public.job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, contractor_id) -- One view record per contractor per job
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_views_job_id ON public.job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_contractor_id ON public.job_views(contractor_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewed_at ON public.job_views(viewed_at DESC);

-- RLS Policies
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;

-- Homeowners can view who viewed their jobs
CREATE POLICY "Homeowners can view job views for their jobs"
  ON public.job_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_views.job_id
      AND jobs.homeowner_id = auth.uid()
    )
  );

-- Contractors can insert their own views
CREATE POLICY "Contractors can track their own job views"
  ON public.job_views
  FOR INSERT
  WITH CHECK (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
    )
  );

-- Contractors can update their own view timestamp
CREATE POLICY "Contractors can update their own view timestamp"
  ON public.job_views
  FOR UPDATE
  USING (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

COMMENT ON TABLE public.job_views IS 'Tracks which contractors have viewed which jobs for analytics and social proof';

