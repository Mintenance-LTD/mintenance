-- Migration: Add ab_critic_fnr_tracking table for False Negative Rate tracking
-- Tracks FNR per stratum to enforce < 5% constraint

CREATE TABLE IF NOT EXISTS ab_critic_fnr_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stratum TEXT NOT NULL,
  total_automated INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,
  fnr DECIMAL(5,4) GENERATED ALWAYS AS (
    CASE WHEN total_automated > 0 
    THEN false_negatives::DECIMAL / total_automated 
    ELSE 0 END
  ) STORED,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(stratum)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ab_critic_fnr_tracking_stratum 
  ON ab_critic_fnr_tracking(stratum);

CREATE INDEX IF NOT EXISTS idx_ab_critic_fnr_tracking_updated 
  ON ab_critic_fnr_tracking(last_updated DESC);

-- RLS policies
ALTER TABLE ab_critic_fnr_tracking ENABLE ROW LEVEL SECURITY;

-- Service role can read/write
CREATE POLICY "Service role can manage FNR tracking"
  ON ab_critic_fnr_tracking
  FOR ALL
  USING (auth.role() = 'service_role');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ab_critic_fnr_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ab_critic_fnr_tracking_updated_at
  BEFORE UPDATE ON ab_critic_fnr_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_critic_fnr_tracking_updated_at();

COMMENT ON TABLE ab_critic_fnr_tracking IS 'Tracks False Negative Rate (FNR) per stratum for Safe-LUCB critic safety constraint enforcement';
COMMENT ON COLUMN ab_critic_fnr_tracking.stratum IS 'Mondrian stratum identifier (e.g., residential_modern_london_water_damage)';
COMMENT ON COLUMN ab_critic_fnr_tracking.total_automated IS 'Total number of automated decisions for this stratum';
COMMENT ON COLUMN ab_critic_fnr_tracking.false_negatives IS 'Number of false negatives (missed critical hazards) for this stratum';
COMMENT ON COLUMN ab_critic_fnr_tracking.fnr IS 'Computed FNR: false_negatives / total_automated (stored as generated column)';

