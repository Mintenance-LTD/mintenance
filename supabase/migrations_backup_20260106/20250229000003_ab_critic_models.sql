-- Migration: Add ab_critic_models table for Safe-LUCB critic
-- Stores reward (θ) and safety (φ) model parameters

CREATE TABLE IF NOT EXISTS ab_critic_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL DEFAULT 'safe_lucb',
  parameters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_type)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ab_critic_models_type_updated 
  ON ab_critic_models(model_type, updated_at DESC);

-- RLS policies
ALTER TABLE ab_critic_models ENABLE ROW LEVEL SECURITY;

-- Service role can read/write
CREATE POLICY "Service role can manage critic models"
  ON ab_critic_models
  FOR ALL
  USING (auth.role() = 'service_role');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_ab_critic_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ab_critic_models_updated_at
  BEFORE UPDATE ON ab_critic_models
  FOR EACH ROW
  EXECUTE FUNCTION update_ab_critic_models_updated_at();

COMMENT ON TABLE ab_critic_models IS 'Stores Safe-LUCB critic model parameters (θ, φ, covariance matrices)';
COMMENT ON COLUMN ab_critic_models.model_type IS 'Type of model (e.g., safe_lucb)';
COMMENT ON COLUMN ab_critic_models.parameters IS 'JSONB containing theta, phi, A, B, beta, gamma, n';

