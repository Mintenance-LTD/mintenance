-- Titans effectiveness reporting artifacts

CREATE TABLE IF NOT EXISTS public.titans_effectiveness_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL,
  recommendations TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_titans_effectiveness_agent ON public.titans_effectiveness_reports(agent_name);
CREATE INDEX IF NOT EXISTS idx_titans_effectiveness_period ON public.titans_effectiveness_reports(period_end);

COMMENT ON TABLE public.titans_effectiveness_reports IS 'Stores persisted Titans effectiveness metrics per analysis run.';

-- Materialized view that surfaces latest projection delta and accuracy stats per agent
CREATE MATERIALIZED VIEW IF NOT EXISTS public.titans_effectiveness_latest_mv AS
SELECT DISTINCT ON (agent_name)
  agent_name,
  metrics,
  COALESCE((metrics->>'projectionChangeMagnitude')::numeric, 0) AS projection_change_magnitude,
  COALESCE((metrics->>'accuracyImprovement')::numeric, 0)        AS accuracy_improvement,
  created_at
FROM public.titans_effectiveness_reports
ORDER BY agent_name, created_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_titans_effectiveness_latest_agent
  ON public.titans_effectiveness_latest_mv(agent_name);

COMMENT ON MATERIALIZED VIEW public.titans_effectiveness_latest_mv IS 'Latest Titans projection delta + accuracy metrics for dashboards.';

-- Helper to refresh MV from Supabase RPC
CREATE OR REPLACE FUNCTION public.refresh_titans_effectiveness_latest_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.titans_effectiveness_latest_mv;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_titans_effectiveness_latest_mv() TO anon, authenticated, service_role;
