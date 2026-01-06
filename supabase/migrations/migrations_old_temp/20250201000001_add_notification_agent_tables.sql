-- Migration: Add Notification Agent Tables
-- Created: 2025-02-01
-- Description: Creates tables for Smart Notification Agent - engagement tracking and preferences

-- ============================================================================
-- UPDATE AUTOMATION PREFERENCES TABLE
-- ============================================================================
ALTER TABLE automation_preferences 
ADD COLUMN IF NOT EXISTS notification_learning_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

COMMENT ON COLUMN automation_preferences.notification_learning_enabled IS 'Allow notification agent to learn from user engagement patterns';
COMMENT ON COLUMN automation_preferences.quiet_hours_start IS 'Start time for quiet hours (no non-urgent notifications)';
COMMENT ON COLUMN automation_preferences.quiet_hours_end IS 'End time for quiet hours';

-- ============================================================================
-- NOTIFICATION ENGAGEMENT TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  
  -- Engagement tracking
  opened BOOLEAN DEFAULT FALSE,
  clicked BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  engagement_delay_seconds INTEGER, -- Time from sent to opened/clicked
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notification_engagement
CREATE INDEX IF NOT EXISTS idx_notification_engagement_user_id ON notification_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_engagement_type ON notification_engagement(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_engagement_opened ON notification_engagement(opened, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_engagement_user_type ON notification_engagement(user_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_engagement_sent_at ON notification_engagement(sent_at DESC);

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Learned preferences (from engagement analysis)
  preferred_notification_times JSONB DEFAULT '{}', -- Best times for each notification type
  engagement_rate_by_type JSONB DEFAULT '{}', -- Engagement rate per notification type
  optimal_frequency_by_type JSONB DEFAULT '{}', -- Optimal frequency per type
  
  -- Engagement statistics
  avg_open_rate DECIMAL(5,2) DEFAULT 0, -- Average open rate percentage
  avg_click_rate DECIMAL(5,2) DEFAULT 0, -- Average click rate percentage
  total_notifications_sent INTEGER DEFAULT 0,
  total_notifications_opened INTEGER DEFAULT 0,
  total_notifications_clicked INTEGER DEFAULT 0,
  
  -- Learning metadata
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  learning_confidence DECIMAL(5,2) DEFAULT 0, -- Confidence in learned patterns (0-100)
  data_points_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Index for notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_last_analyzed ON notification_preferences(last_analyzed_at);

-- ============================================================================
-- NOTIFICATION PRIORITY QUEUE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  
  -- Notification data
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Batching
  batch_id UUID, -- For grouping low-priority notifications
  batch_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  
  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notification_queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_batch_id ON notification_queue(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled_for ON notification_queue(scheduled_for) WHERE status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE notification_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Notification engagement policies
CREATE POLICY "Users can view their own notification engagement"
  ON notification_engagement FOR SELECT
  USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Notification queue policies (users can view their own queued notifications)
CREATE POLICY "Users can view their own queued notifications"
  ON notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE notification_engagement IS 'Tracks user engagement with notifications for learning optimal timing and frequency';
COMMENT ON TABLE notification_preferences IS 'Learned notification preferences and engagement statistics per user';
COMMENT ON TABLE notification_queue IS 'Priority queue for notifications with intelligent scheduling and batching';

COMMENT ON COLUMN notification_engagement.engagement_delay_seconds IS 'Time in seconds from when notification was sent to when user engaged';
COMMENT ON COLUMN notification_preferences.preferred_notification_times IS 'JSON object mapping notification types to preferred send times';
COMMENT ON COLUMN notification_preferences.engagement_rate_by_type IS 'JSON object mapping notification types to engagement rates';
COMMENT ON COLUMN notification_queue.priority IS 'Notification priority: urgent (immediate), high (within hour), medium (batched), low (daily digest)';
COMMENT ON COLUMN notification_queue.batch_id IS 'UUID for grouping low-priority notifications into batches';

