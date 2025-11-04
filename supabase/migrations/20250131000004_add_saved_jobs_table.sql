-- Add saved_jobs table to allow contractors to bookmark jobs
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(contractor_id, job_id) -- One save per contractor per job
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_saved_jobs_contractor_id ON public.saved_jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_job_id ON public.saved_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_created_at ON public.saved_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own saved jobs
CREATE POLICY "Contractors can view their own saved jobs"
  ON public.saved_jobs
  FOR SELECT
  USING (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
    )
  );

-- Contractors can save jobs for themselves
CREATE POLICY "Contractors can save jobs"
  ON public.saved_jobs
  FOR INSERT
  WITH CHECK (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'contractor'
    )
  );

-- Contractors can unsave their own jobs
CREATE POLICY "Contractors can delete their own saved jobs"
  ON public.saved_jobs
  FOR DELETE
  USING (
    auth.uid() = contractor_id
  );

COMMENT ON TABLE public.saved_jobs IS 'Tracks jobs that contractors have saved/bookmarked for later review';

