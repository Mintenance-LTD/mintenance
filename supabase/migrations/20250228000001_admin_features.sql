-- ==========================================================
-- ADMIN FEATURES MIGRATION
-- Adds: Admin Activity Log, IP Blocking, Platform Settings, Admin Communications
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. ADMIN ACTIVITY LOG
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL, -- 'user_management', 'verification', 'security', 'settings', 'revenue', 'communication'
  target_type VARCHAR(50), -- 'user', 'verification', 'ip_address', 'setting', etc.
  target_id UUID, -- ID of the target entity
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON public.admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action_type ON public.admin_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action_category ON public.admin_activity_log(action_category);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON public.admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_target ON public.admin_activity_log(target_type, target_id);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_activity_log_select_policy ON public.admin_activity_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY admin_activity_log_insert_policy ON public.admin_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ==========================================================
-- 2. BLOCKED IP ADDRESSES
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  ip_range CIDR, -- For blocking IP ranges
  reason TEXT NOT NULL,
  blocked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent block
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB, -- Additional context (security event IDs, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON public.blocked_ips USING gist(ip_address inet_ops);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON public.blocked_ips(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires_at ON public.blocked_ips(expires_at);

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY blocked_ips_select_policy ON public.blocked_ips
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY blocked_ips_insert_policy ON public.blocked_ips
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY blocked_ips_update_policy ON public.blocked_ips
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_blocked BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.blocked_ips
    WHERE ip_address = p_ip_address
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_blocked;
  
  RETURN v_blocked;
END;
$$;

-- ==========================================================
-- 3. PLATFORM SETTINGS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'json', 'array'
  category VARCHAR(50) NOT NULL, -- 'general', 'email', 'security', 'features', 'payment', 'notifications'
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by non-admins
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON public.platform_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_platform_settings_category ON public.platform_settings(category);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read/write all settings
CREATE POLICY platform_settings_select_policy ON public.platform_settings
  FOR SELECT TO authenticated
  USING (public.is_admin() OR is_public = TRUE);

CREATE POLICY platform_settings_insert_policy ON public.platform_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY platform_settings_update_policy ON public.platform_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==========================================================
-- 4. ADMIN COMMUNICATIONS / ANNOUNCEMENTS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50) NOT NULL DEFAULT 'general', -- 'general', 'feature', 'maintenance', 'security', 'feedback_request'
  target_audience VARCHAR(50) NOT NULL DEFAULT 'all', -- 'all', 'contractors', 'homeowners', 'verified_contractors'
  priority VARCHAR(20) NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.admin_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_announcements_type ON public.admin_announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_target ON public.admin_announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_admin_announcements_published ON public.admin_announcements(is_published, published_at) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_announcement_reads_user ON public.admin_announcement_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_announcement_reads_announcement ON public.admin_announcement_reads(announcement_id);

ALTER TABLE public.admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_announcement_reads ENABLE ROW LEVEL SECURITY;

-- Admins can manage announcements
CREATE POLICY admin_announcements_select_policy ON public.admin_announcements
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    (is_published = TRUE AND (expires_at IS NULL OR expires_at > NOW()))
  );

CREATE POLICY admin_announcements_insert_policy ON public.admin_announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY admin_announcements_update_policy ON public.admin_announcements
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can read their own read status
CREATE POLICY admin_announcement_reads_select_policy ON public.admin_announcement_reads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY admin_announcement_reads_insert_policy ON public.admin_announcement_reads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ==========================================================
-- 5. PENDING VERIFICATION NOTIFICATIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.pending_verification_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  notification_type VARCHAR(50) NOT NULL DEFAULT 'pending_verification', -- 'pending_verification', 'verification_approved', 'verification_rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_verification_notifications_contractor ON public.pending_verification_notifications(contractor_id);
CREATE INDEX IF NOT EXISTS idx_pending_verification_notifications_sent ON public.pending_verification_notifications(email_sent, notification_sent_at);

ALTER TABLE public.pending_verification_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY pending_verification_notifications_select_policy ON public.pending_verification_notifications
  FOR SELECT TO authenticated
  USING (public.is_admin() OR auth.uid() = contractor_id);

CREATE POLICY pending_verification_notifications_insert_policy ON public.pending_verification_notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ==========================================================
-- 6. INSERT DEFAULT PLATFORM SETTINGS
-- ==========================================================
INSERT INTO public.platform_settings (setting_key, setting_value, setting_type, category, description) VALUES
  ('email_notifications_enabled', 'true', 'boolean', 'notifications', 'Enable email notifications for platform events'),
  ('pending_verification_email_enabled', 'true', 'boolean', 'notifications', 'Send email notifications when contractors submit verification'),
  ('admin_email', 'admin@mintenance.com', 'string', 'general', 'Primary admin contact email'),
  ('platform_name', 'Mintenance', 'string', 'general', 'Platform name'),
  ('maintenance_mode', 'false', 'boolean', 'general', 'Enable maintenance mode'),
  ('max_verification_attempts', '3', 'number', 'security', 'Maximum verification attempts before requiring manual review'),
  ('verification_auto_approve_threshold', '90', 'number', 'security', 'Verification score threshold for auto-approval'),
  ('ip_blocking_enabled', 'true', 'boolean', 'security', 'Enable IP blocking functionality')
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;

