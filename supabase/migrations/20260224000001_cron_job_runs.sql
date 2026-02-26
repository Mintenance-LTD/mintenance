-- =============================================================================
-- Migration: cron_job_runs table
-- Purpose: Track execution of all scheduled cron jobs for monitoring/alerting
-- Phase 0.6 of remediation plan
-- =============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS cron_job_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  records_processed INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries: "latest runs per job"
CREATE INDEX idx_cron_job_runs_name_started
  ON cron_job_runs (job_name, started_at DESC);

-- Index for cleanup: "delete runs older than 90 days"
CREATE INDEX idx_cron_job_runs_created
  ON cron_job_runs (created_at);

-- Index for monitoring: "find failed jobs"
CREATE INDEX idx_cron_job_runs_status
  ON cron_job_runs (status)
  WHERE status = 'failed';

-- ── RLS ──────────────────────────────────────────────────────────────

ALTER TABLE cron_job_runs ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert/update (cron handlers run server-side)
CREATE POLICY "service_role_full_access"
  ON cron_job_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin users can read (for the dashboard)
CREATE POLICY "admin_read_cron_runs"
  ON cron_job_runs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.deleted_at IS NULL
    )
  );

-- Grant access
GRANT SELECT ON cron_job_runs TO authenticated;
GRANT ALL ON cron_job_runs TO service_role;

-- ── Cleanup function ─────────────────────────────────────────────────

-- Automatically clean up runs older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_cron_runs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM cron_job_runs
  WHERE created_at < now() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON TABLE cron_job_runs IS 'Execution log for all scheduled cron jobs. Used for monitoring, alerting, and debugging.';
COMMENT ON FUNCTION cleanup_old_cron_runs IS 'Deletes cron run records older than 90 days. Call from retention-cleanup cron.';
