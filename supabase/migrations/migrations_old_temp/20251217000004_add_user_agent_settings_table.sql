-- Migration: Add User Agent Settings Table
-- Created: 2025-12-17
-- Description: Creates user_agent_settings table for managing per-agent automation preferences

-- ============================================================================
-- USER AGENT SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_agent_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Global automation settings
  enable_automation BOOLEAN DEFAULT FALSE,
  automation_level VARCHAR(20) DEFAULT 'none' CHECK (automation_level IN ('none', 'minimal', 'moderate', 'full')),

  -- Per-agent configuration (JSONB for flexibility)
  agents JSONB DEFAULT '{}',
  /* Example agents structure:
  {
    "BidAcceptanceAgent": {
      "enabled": true,
      "confidence": 0.85,
      "lastAction": "auto-accepted bid #123",
      "lastActionTime": "2025-12-17T10:30:00Z",
      "settings": {
        "minConfidenceThreshold": 0.8,
        "maxAutoAcceptAmount": 5000
      }
    },
    "PricingAgent": {
      "enabled": false,
      "confidence": 0.90
    }
  }
  */

  -- Tracking
  total_automated_actions INTEGER DEFAULT 0,
  successful_automations INTEGER DEFAULT 0,
  failed_automations INTEGER DEFAULT 0,
  last_automation_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_agent_settings_user_id ON user_agent_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agent_settings_automation_level ON user_agent_settings(automation_level);

-- ============================================================================
-- UPDATE AGENT_DECISIONS TABLE (only if table exists)
-- ============================================================================
-- Add missing columns to agent_decisions if they don't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_decisions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agent_decisions'
                   AND column_name = 'context') THEN
      ALTER TABLE agent_decisions ADD COLUMN context JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agent_decisions'
                   AND column_name = 'decision') THEN
      ALTER TABLE agent_decisions ADD COLUMN decision VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'agent_decisions'
                   AND column_name = 'action') THEN
      ALTER TABLE agent_decisions ADD COLUMN action VARCHAR(255);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE user_agent_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own agent settings" ON user_agent_settings;
DROP POLICY IF EXISTS "Users can update their own agent settings" ON user_agent_settings;
DROP POLICY IF EXISTS "Users can insert their own agent settings" ON user_agent_settings;
DROP POLICY IF EXISTS "Users can delete their own agent settings" ON user_agent_settings;

-- User agent settings policies
CREATE POLICY "Users can view their own agent settings"
  ON user_agent_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent settings"
  ON user_agent_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent settings"
  ON user_agent_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent settings"
  ON user_agent_settings FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_agent_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS user_agent_settings_updated_at ON user_agent_settings;

-- Trigger to automatically update updated_at
CREATE TRIGGER user_agent_settings_updated_at
  BEFORE UPDATE ON user_agent_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_agent_settings_updated_at();

-- Function to track automation metrics
CREATE OR REPLACE FUNCTION track_automation_action(
  p_user_id UUID,
  p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_agent_settings
  SET
    total_automated_actions = COALESCE(total_automated_actions, 0) + 1,
    successful_automations = CASE
      WHEN p_success THEN COALESCE(successful_automations, 0) + 1
      ELSE successful_automations
    END,
    failed_automations = CASE
      WHEN NOT p_success THEN COALESCE(failed_automations, 0) + 1
      ELSE failed_automations
    END,
    last_automation_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE user_agent_settings IS 'Per-user configuration for AI agent automation features';
COMMENT ON COLUMN user_agent_settings.enable_automation IS 'Master switch for all automation features';
COMMENT ON COLUMN user_agent_settings.automation_level IS 'Global automation aggressiveness level';
COMMENT ON COLUMN user_agent_settings.agents IS 'Per-agent configuration including enabled state and settings';
COMMENT ON FUNCTION track_automation_action IS 'Updates automation metrics when an agent takes an action';