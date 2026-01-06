-- Migration: Add Enhanced Notification Engagement Tracking
-- Created: 2025-02-02
-- Description: Enhances notification_engagement table with additional metrics and creates engagement analytics

-- ============================================================================
-- ENHANCE EXISTING NOTIFICATION_ENGAGEMENT TABLE
-- ============================================================================

-- Add additional tracking columns if they don't exist
ALTER TABLE notification_engagement
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'push')) OR device_type IS NULL,
  ADD COLUMN IF NOT EXISTS channel VARCHAR(30) CHECK (channel IN ('in_app', 'email', 'sms', 'push', 'browser')) OR channel IS NULL,
  ADD COLUMN IF NOT EXISTS time_of_day_sent INTEGER CHECK (time_of_day_sent >= 0 AND time_of_day_sent <= 23), -- 0-23 hour
  ADD COLUMN IF NOT EXISTS day_of_week_sent INTEGER CHECK (day_of_week_sent >= 0 AND day_of_week_sent <= 6), -- 0=Sunday, 6=Saturday
  ADD COLUMN IF NOT EXISTS action_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS action_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS batch_id UUID; -- For grouped notifications

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_notification_engagement_device_type
  ON notification_engagement(device_type)
  WHERE device_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_engagement_channel
  ON notification_engagement(channel)
  WHERE channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_engagement_time_of_day
  ON notification_engagement(time_of_day_sent)
  WHERE time_of_day_sent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_engagement_day_of_week
  ON notification_engagement(day_of_week_sent)
  WHERE day_of_week_sent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_engagement_batch
  ON notification_engagement(batch_id)
  WHERE batch_id IS NOT NULL;

-- Add composite indexes for engagement analysis
CREATE INDEX IF NOT EXISTS idx_notification_engagement_type_time
  ON notification_engagement(notification_type, time_of_day_sent)
  WHERE time_of_day_sent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_engagement_user_time
  ON notification_engagement(user_id, time_of_day_sent)
  WHERE time_of_day_sent IS NOT NULL;

-- ============================================================================
-- NOTIFICATION ENGAGEMENT ANALYTICS MATERIALIZED VIEW
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS notification_engagement_analytics AS
SELECT
  notification_type,
  channel,
  time_of_day_sent,
  day_of_week_sent,
  device_type,

  -- Volume metrics
  COUNT(*) as total_sent,
  COUNT(DISTINCT user_id) as unique_users,

  -- Engagement rates
  SUM(CASE WHEN opened THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as open_rate,
  SUM(CASE WHEN clicked THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as click_rate,
  SUM(CASE WHEN dismissed THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as dismiss_rate,
  SUM(CASE WHEN action_completed THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as action_completion_rate,

  -- Timing metrics
  AVG(engagement_delay_seconds) as avg_engagement_delay_seconds,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY engagement_delay_seconds) as median_engagement_delay_seconds,
  MIN(engagement_delay_seconds) as min_engagement_delay_seconds,
  MAX(engagement_delay_seconds) as max_engagement_delay_seconds,

  -- Time window
  MIN(sent_at) as period_start,
  MAX(sent_at) as period_end,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '7 days') as last_7_days_count,
  COUNT(*) FILTER (WHERE sent_at >= NOW() - INTERVAL '30 days') as last_30_days_count

FROM notification_engagement
WHERE sent_at >= NOW() - INTERVAL '90 days' -- Only analyze last 90 days
GROUP BY notification_type, channel, time_of_day_sent, day_of_week_sent, device_type;

-- Indexes for analytics view
CREATE INDEX IF NOT EXISTS idx_notification_engagement_analytics_type
  ON notification_engagement_analytics(notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_engagement_analytics_channel
  ON notification_engagement_analytics(channel)
  WHERE channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_engagement_analytics_open_rate
  ON notification_engagement_analytics(open_rate DESC);

CREATE INDEX IF NOT EXISTS idx_notification_engagement_analytics_volume
  ON notification_engagement_analytics(total_sent DESC);

-- ============================================================================
-- USER NOTIFICATION ENGAGEMENT PROFILE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notification_engagement_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Optimal timing
  best_send_hour INTEGER, -- Best hour to send notifications (0-23)
  best_send_days INTEGER[], -- Best days of week (0-6)
  worst_send_hour INTEGER, -- Hour with lowest engagement

  -- Channel preferences (learned)
  preferred_channel VARCHAR(30),
  channel_engagement_rates JSONB DEFAULT '{}', -- {channel: engagement_rate}

  -- Device preferences
  primary_device VARCHAR(20),
  device_engagement_rates JSONB DEFAULT '{}', -- {device_type: engagement_rate}

  -- Engagement patterns
  avg_open_rate DECIMAL(5,2),
  avg_click_rate DECIMAL(5,2),
  avg_dismiss_rate DECIMAL(5,2),
  avg_action_completion_rate DECIMAL(5,2),
  avg_engagement_delay_seconds INTEGER,

  -- Notification preferences by type
  type_preferences JSONB DEFAULT '{}', -- {notification_type: {open_rate, best_time, ...}}

  -- Engagement trends
  engagement_trend VARCHAR(20) CHECK (engagement_trend IN ('increasing', 'stable', 'decreasing')) OR engagement_trend IS NULL,
  last_engagement_at TIMESTAMP WITH TIME ZONE,

  -- Learning metadata
  total_notifications_analyzed INTEGER DEFAULT 0,
  profile_confidence DECIMAL(5,2) DEFAULT 0, -- 0-100
  last_analyzed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user engagement profile
CREATE INDEX IF NOT EXISTS idx_user_notification_profile_best_hour
  ON user_notification_engagement_profile(best_send_hour)
  WHERE best_send_hour IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notification_profile_channel
  ON user_notification_engagement_profile(preferred_channel)
  WHERE preferred_channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notification_profile_open_rate
  ON user_notification_engagement_profile(avg_open_rate DESC);

CREATE INDEX IF NOT EXISTS idx_user_notification_profile_last_analyzed
  ON user_notification_engagement_profile(last_analyzed_at DESC);

-- ============================================================================
-- NOTIFICATION A/B TEST TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name VARCHAR(100) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,

  -- Test variants
  variant_a JSONB NOT NULL, -- {subject, message, send_time_offset, channel, ...}
  variant_b JSONB NOT NULL,

  -- Test parameters
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  target_sample_size INTEGER DEFAULT 1000,

  -- Results
  variant_a_sent INTEGER DEFAULT 0,
  variant_b_sent INTEGER DEFAULT 0,
  variant_a_opened INTEGER DEFAULT 0,
  variant_b_opened INTEGER DEFAULT 0,
  variant_a_clicked INTEGER DEFAULT 0,
  variant_b_clicked INTEGER DEFAULT 0,

  -- Statistical significance
  is_statistically_significant BOOLEAN DEFAULT FALSE,
  confidence_level DECIMAL(5,2),
  winning_variant VARCHAR(10) CHECK (winning_variant IN ('A', 'B', 'tie')) OR winning_variant IS NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(test_name)
);

-- Indexes for A/B tests
CREATE INDEX IF NOT EXISTS idx_notification_ab_tests_status
  ON notification_ab_tests(status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_notification_ab_tests_type
  ON notification_ab_tests(notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_ab_tests_dates
  ON notification_ab_tests(start_date, end_date);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_notification_engagement_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_ab_tests ENABLE ROW LEVEL SECURITY;

-- User engagement profile policies
CREATE POLICY "Users can view their own engagement profile"
  ON user_notification_engagement_profile FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage engagement profiles"
  ON user_notification_engagement_profile FOR ALL
  USING (auth.role() = 'service_role');

-- A/B test policies (admin only)
CREATE POLICY "Admins can view A/B tests"
  ON notification_ab_tests FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can manage A/B tests"
  ON notification_ab_tests FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to refresh engagement analytics
CREATE OR REPLACE FUNCTION refresh_notification_engagement_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY notification_engagement_analytics;
END;
$$;

-- Function to analyze and update user engagement profile
CREATE OR REPLACE FUNCTION analyze_user_notification_engagement(
  p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count INTEGER;
  v_best_hour INTEGER;
  v_best_days INTEGER[];
  v_worst_hour INTEGER;
  v_preferred_channel VARCHAR(30);
  v_primary_device VARCHAR(20);
  v_avg_open_rate DECIMAL(5,2);
  v_avg_click_rate DECIMAL(5,2);
  v_avg_dismiss_rate DECIMAL(5,2);
  v_avg_action_rate DECIMAL(5,2);
  v_avg_delay INTEGER;
  v_channel_rates JSONB;
  v_device_rates JSONB;
  v_type_prefs JSONB;
  v_confidence DECIMAL(5,2);
BEGIN
  -- Get total notification count for confidence calculation
  SELECT COUNT(*)
  INTO v_total_count
  FROM notification_engagement
  WHERE user_id = p_user_id;

  -- Need at least 10 notifications for meaningful analysis
  IF v_total_count < 10 THEN
    RETURN;
  END IF;

  -- Find best send hour (highest open rate)
  SELECT time_of_day_sent
  INTO v_best_hour
  FROM notification_engagement
  WHERE user_id = p_user_id AND time_of_day_sent IS NOT NULL AND opened = TRUE
  GROUP BY time_of_day_sent
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Find best days of week
  SELECT ARRAY_AGG(day_of_week_sent ORDER BY engagement_count DESC)
  INTO v_best_days
  FROM (
    SELECT day_of_week_sent, COUNT(*) as engagement_count
    FROM notification_engagement
    WHERE user_id = p_user_id AND day_of_week_sent IS NOT NULL AND opened = TRUE
    GROUP BY day_of_week_sent
    ORDER BY engagement_count DESC
    LIMIT 3
  ) best_days;

  -- Find worst send hour (lowest open rate)
  SELECT time_of_day_sent
  INTO v_worst_hour
  FROM (
    SELECT time_of_day_sent, COUNT(*) as total, SUM(CASE WHEN opened THEN 1 ELSE 0 END) as opened_count
    FROM notification_engagement
    WHERE user_id = p_user_id AND time_of_day_sent IS NOT NULL
    GROUP BY time_of_day_sent
    HAVING COUNT(*) >= 3
    ORDER BY SUM(CASE WHEN opened THEN 1 ELSE 0 END)::FLOAT / COUNT(*) ASC
    LIMIT 1
  ) worst;

  -- Preferred channel
  SELECT channel
  INTO v_preferred_channel
  FROM notification_engagement
  WHERE user_id = p_user_id AND channel IS NOT NULL AND opened = TRUE
  GROUP BY channel
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Primary device
  SELECT device_type
  INTO v_primary_device
  FROM notification_engagement
  WHERE user_id = p_user_id AND device_type IS NOT NULL
  GROUP BY device_type
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Calculate engagement rates
  SELECT
    (SUM(CASE WHEN opened THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::DECIMAL(5,2),
    (SUM(CASE WHEN clicked THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::DECIMAL(5,2),
    (SUM(CASE WHEN dismissed THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::DECIMAL(5,2),
    (SUM(CASE WHEN action_completed THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100)::DECIMAL(5,2),
    AVG(engagement_delay_seconds)::INTEGER
  INTO v_avg_open_rate, v_avg_click_rate, v_avg_dismiss_rate, v_avg_action_rate, v_avg_delay
  FROM notification_engagement
  WHERE user_id = p_user_id;

  -- Channel engagement rates as JSON
  SELECT jsonb_object_agg(
    channel,
    ROUND((opened_count::FLOAT / total_count * 100)::NUMERIC, 2)
  )
  INTO v_channel_rates
  FROM (
    SELECT
      channel,
      COUNT(*) as total_count,
      SUM(CASE WHEN opened THEN 1 ELSE 0 END) as opened_count
    FROM notification_engagement
    WHERE user_id = p_user_id AND channel IS NOT NULL
    GROUP BY channel
  ) channel_stats;

  -- Device engagement rates as JSON
  SELECT jsonb_object_agg(
    device_type,
    ROUND((opened_count::FLOAT / total_count * 100)::NUMERIC, 2)
  )
  INTO v_device_rates
  FROM (
    SELECT
      device_type,
      COUNT(*) as total_count,
      SUM(CASE WHEN opened THEN 1 ELSE 0 END) as opened_count
    FROM notification_engagement
    WHERE user_id = p_user_id AND device_type IS NOT NULL
    GROUP BY device_type
  ) device_stats;

  -- Type preferences as JSON
  SELECT jsonb_object_agg(
    notification_type,
    jsonb_build_object(
      'open_rate', ROUND((opened_count::FLOAT / total_count * 100)::NUMERIC, 2),
      'click_rate', ROUND((clicked_count::FLOAT / total_count * 100)::NUMERIC, 2),
      'total_sent', total_count
    )
  )
  INTO v_type_prefs
  FROM (
    SELECT
      notification_type,
      COUNT(*) as total_count,
      SUM(CASE WHEN opened THEN 1 ELSE 0 END) as opened_count,
      SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicked_count
    FROM notification_engagement
    WHERE user_id = p_user_id
    GROUP BY notification_type
  ) type_stats;

  -- Calculate confidence (0-100 based on sample size)
  v_confidence := LEAST(100, (v_total_count::FLOAT / 100 * 100)::DECIMAL(5,2));

  -- Insert or update profile
  INSERT INTO user_notification_engagement_profile (
    user_id,
    best_send_hour,
    best_send_days,
    worst_send_hour,
    preferred_channel,
    channel_engagement_rates,
    primary_device,
    device_engagement_rates,
    avg_open_rate,
    avg_click_rate,
    avg_dismiss_rate,
    avg_action_completion_rate,
    avg_engagement_delay_seconds,
    type_preferences,
    total_notifications_analyzed,
    profile_confidence,
    last_analyzed_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_best_hour,
    v_best_days,
    v_worst_hour,
    v_preferred_channel,
    v_channel_rates,
    v_primary_device,
    v_device_rates,
    v_avg_open_rate,
    v_avg_click_rate,
    v_avg_dismiss_rate,
    v_avg_action_rate,
    v_avg_delay,
    v_type_prefs,
    v_total_count,
    v_confidence,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    best_send_hour = EXCLUDED.best_send_hour,
    best_send_days = EXCLUDED.best_send_days,
    worst_send_hour = EXCLUDED.worst_send_hour,
    preferred_channel = EXCLUDED.preferred_channel,
    channel_engagement_rates = EXCLUDED.channel_engagement_rates,
    primary_device = EXCLUDED.primary_device,
    device_engagement_rates = EXCLUDED.device_engagement_rates,
    avg_open_rate = EXCLUDED.avg_open_rate,
    avg_click_rate = EXCLUDED.avg_click_rate,
    avg_dismiss_rate = EXCLUDED.avg_dismiss_rate,
    avg_action_completion_rate = EXCLUDED.avg_action_completion_rate,
    avg_engagement_delay_seconds = EXCLUDED.avg_engagement_delay_seconds,
    type_preferences = EXCLUDED.type_preferences,
    total_notifications_analyzed = EXCLUDED.total_notifications_analyzed,
    profile_confidence = EXCLUDED.profile_confidence,
    last_analyzed_at = NOW(),
    updated_at = NOW();
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-populate time_of_day_sent and day_of_week_sent
CREATE OR REPLACE FUNCTION populate_notification_engagement_time_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sent_at IS NOT NULL THEN
    NEW.time_of_day_sent := EXTRACT(HOUR FROM NEW.sent_at AT TIME ZONE 'UTC');
    NEW.day_of_week_sent := EXTRACT(DOW FROM NEW.sent_at AT TIME ZONE 'UTC');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notification_engagement_time_fields
  BEFORE INSERT OR UPDATE ON notification_engagement
  FOR EACH ROW
  EXECUTE FUNCTION populate_notification_engagement_time_fields();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN notification_engagement.device_type IS 'Device type where notification was received';
COMMENT ON COLUMN notification_engagement.channel IS 'Notification channel: in_app, email, sms, push, browser';
COMMENT ON COLUMN notification_engagement.time_of_day_sent IS 'Hour of day when notification was sent (0-23 UTC)';
COMMENT ON COLUMN notification_engagement.day_of_week_sent IS 'Day of week when notification was sent (0=Sunday, 6=Saturday)';
COMMENT ON COLUMN notification_engagement.action_completed IS 'Whether the user completed the intended action from the notification';

COMMENT ON TABLE user_notification_engagement_profile IS 'Learned engagement patterns and preferences for each user to optimize notification delivery';
COMMENT ON TABLE notification_ab_tests IS 'A/B tests for notification messaging, timing, and channels';
COMMENT ON MATERIALIZED VIEW notification_engagement_analytics IS 'Aggregated engagement metrics by type, channel, time, and device';

COMMENT ON FUNCTION analyze_user_notification_engagement IS 'Analyzes user notification engagement history and updates their engagement profile';
