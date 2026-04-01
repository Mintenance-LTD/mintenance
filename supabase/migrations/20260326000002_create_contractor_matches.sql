-- Create contractor_matches table referenced by mobile ContractorMatchingService
CREATE TABLE IF NOT EXISTS public.contractor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  match_score NUMERIC(5,2),
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contractor_id, job_id)
);

ALTER TABLE public.contractor_matches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contractor_matches' AND policyname = 'contractors_view_own_matches') THEN
    CREATE POLICY "contractors_view_own_matches" ON public.contractor_matches
      FOR SELECT USING (contractor_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contractor_matches' AND policyname = 'service_role_full_access') THEN
    CREATE POLICY "service_role_full_access" ON public.contractor_matches
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contractor_matches_contractor ON public.contractor_matches(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_matches_job ON public.contractor_matches(job_id);
