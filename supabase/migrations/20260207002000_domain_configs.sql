-- Phase 3: Domain Abstraction
-- Stores per-domain configuration for multi-domain support (residential, industrial, rail).
-- Allows runtime override of domain settings without redeployment.

CREATE TABLE IF NOT EXISTS domain_configs (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  damage_types TEXT[] NOT NULL,
  class_names TEXT[] NOT NULL,
  fusion_weights JSONB NOT NULL DEFAULT '{"sam3": 0.40, "gpt4": 0.35, "sceneGraph": 0.25}',
  confidence_thresholds JSONB NOT NULL DEFAULT '{"high": 0.75, "medium": 0.55, "low": 0.35}',
  agreement_threshold FLOAT NOT NULL DEFAULT 0.80,
  safety_hazard_classes TEXT[] DEFAULT '{}',
  node_types TEXT[] DEFAULT '{}',
  edge_types TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track which domain each YOLO model serves
ALTER TABLE yolo_models ADD COLUMN IF NOT EXISTS domain_id TEXT DEFAULT 'residential';

-- Index for quick domain lookups
CREATE INDEX IF NOT EXISTS idx_yolo_models_domain ON yolo_models (domain_id);
