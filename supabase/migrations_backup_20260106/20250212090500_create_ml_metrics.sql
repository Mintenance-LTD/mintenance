-- Migration: create ml_metrics table for AI agent observability
-- Created: 2025-02-12

CREATE TABLE IF NOT EXISTS ml_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS ml_metrics_metric_idx ON ml_metrics (metric);
CREATE INDEX IF NOT EXISTS ml_metrics_created_at_idx ON ml_metrics (created_at DESC);

