-- Add GDPR compliance tables and functions

-- Data Subject Rights Requests table
CREATE TABLE IF NOT EXISTS public.dsr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'portability', 'rectification', 'erasure', 'restriction', 'objection')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  requested_by UUID REFERENCES public.users(id),
  notes TEXT,
  data_export_path TEXT, -- Path to exported data file
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data retention policies
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,
  deletion_strategy TEXT DEFAULT 'soft_delete' CHECK (deletion_strategy IN ('soft_delete', 'hard_delete', 'anonymize')),
  last_cleanup TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log for GDPR activities
CREATE TABLE IF NOT EXISTS public.gdpr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES public.users(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dsr_requests_user_id ON public.dsr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_requests_status ON public.dsr_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsr_requests_request_type ON public.dsr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_user_id ON public.gdpr_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_action ON public.gdpr_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_gdpr_audit_log_created_at ON public.gdpr_audit_log(created_at);

-- RLS policies
ALTER TABLE public.dsr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_audit_log ENABLE ROW LEVEL SECURITY;

-- DSR requests policies
CREATE POLICY dsr_requests_select_policy
ON public.dsr_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY dsr_requests_insert_policy
ON public.dsr_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY dsr_requests_update_policy
ON public.dsr_requests
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- GDPR audit log policies (admin only)
CREATE POLICY gdpr_audit_log_select_policy
ON public.gdpr_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY gdpr_audit_log_insert_policy
ON public.gdpr_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Data retention policies (admin only)
CREATE POLICY data_retention_policies_select_policy
ON public.data_retention_policies
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY data_retention_policies_insert_policy
ON public.data_retention_policies
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Function to log GDPR activities
CREATE OR REPLACE FUNCTION public.log_gdpr_activity(
  p_user_id UUID,
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.gdpr_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    performed_by
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent,
    auth.uid()
  );
END;
$$;

-- Function to export user data
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id UUID)
RETURNS TABLE(
  table_name TEXT,
  data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data RECORD;
  jobs_data RECORD;
  bids_data RECORD;
  messages_data RECORD;
BEGIN
  -- Log the export request
  PERFORM public.log_gdpr_activity(p_user_id, 'data_export', 'users', p_user_id);
  
  -- Export user profile data
  SELECT row_to_json(u.*) INTO user_data
  FROM public.users u
  WHERE u.id = p_user_id;
  
  RETURN QUERY SELECT 'users'::TEXT, user_data.row_to_json;
  
  -- Export user's jobs
  FOR jobs_data IN
    SELECT row_to_json(j.*) as job_data
    FROM public.jobs j
    WHERE j.homeowner_id = p_user_id OR j.contractor_id = p_user_id
  LOOP
    RETURN QUERY SELECT 'jobs'::TEXT, jobs_data.job_data;
  END LOOP;
  
  -- Export user's bids
  FOR bids_data IN
    SELECT row_to_json(b.*) as bid_data
    FROM public.bids b
    WHERE b.contractor_id = p_user_id
  LOOP
    RETURN QUERY SELECT 'bids'::TEXT, bids_data.bid_data;
  END LOOP;
  
  -- Export user's messages
  FOR messages_data IN
    SELECT row_to_json(m.*) as message_data
    FROM public.messages m
    WHERE m.sender_id = p_user_id OR m.receiver_id = p_user_id
  LOOP
    RETURN QUERY SELECT 'messages'::TEXT, messages_data.message_data;
  END LOOP;
END;
$$;

-- Function to anonymize user data
CREATE OR REPLACE FUNCTION public.anonymize_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the anonymization request
  PERFORM public.log_gdpr_activity(p_user_id, 'data_anonymization', 'users', p_user_id);
  
  -- Anonymize user profile
  UPDATE public.users
  SET 
    email = 'anonymized_' || id || '@deleted.local',
    first_name = 'Anonymized',
    last_name = 'User',
    phone = NULL,
    profile_image_url = NULL,
    bio = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Anonymize job descriptions (keep structure but remove personal info)
  UPDATE public.jobs
  SET 
    description = '[Content anonymized for privacy]',
    updated_at = NOW()
  WHERE homeowner_id = p_user_id;
  
  -- Anonymize bid descriptions
  UPDATE public.bids
  SET 
    description = '[Content anonymized for privacy]',
    updated_at = NOW()
  WHERE contractor_id = p_user_id;
  
  -- Anonymize messages
  UPDATE public.messages
  SET 
    content = '[Message content anonymized for privacy]',
    updated_at = NOW()
  WHERE sender_id = p_user_id OR receiver_id = p_user_id;
END;
$$;

-- Function to delete user data (right to be forgotten)
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log the deletion request
  PERFORM public.log_gdpr_activity(p_user_id, 'data_deletion', 'users', p_user_id);
  
  -- Delete related data first (respecting foreign key constraints)
  DELETE FROM public.messages WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  DELETE FROM public.bids WHERE contractor_id = p_user_id;
  DELETE FROM public.jobs WHERE homeowner_id = p_user_id OR contractor_id = p_user_id;
  DELETE FROM public.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM public.dsr_requests WHERE user_id = p_user_id;
  
  -- Finally delete the user
  DELETE FROM public.users WHERE id = p_user_id;
END;
$$;

-- Function to clean up expired data based on retention policies
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy RECORD;
BEGIN
  FOR policy IN
    SELECT * FROM public.data_retention_policies
  LOOP
    CASE policy.deletion_strategy
      WHEN 'soft_delete' THEN
        -- Mark records as deleted (requires deleted_at column)
        EXECUTE format('
          UPDATE %I 
          SET deleted_at = NOW() 
          WHERE deleted_at IS NULL 
          AND created_at < NOW() - INTERVAL ''%s days''',
          policy.table_name, policy.retention_period_days
        );
      WHEN 'hard_delete' THEN
        -- Permanently delete records
        EXECUTE format('
          DELETE FROM %I 
          WHERE created_at < NOW() - INTERVAL ''%s days''',
          policy.table_name, policy.retention_period_days
        );
      WHEN 'anonymize' THEN
        -- Anonymize records (requires specific implementation per table)
        -- This would need to be customized for each table
        NULL;
    END CASE;
    
    -- Update last cleanup timestamp
    UPDATE public.data_retention_policies
    SET last_cleanup = NOW()
    WHERE id = policy.id;
  END LOOP;
END;
$$;

-- Insert default retention policies
INSERT INTO public.data_retention_policies (table_name, retention_period_days, deletion_strategy) VALUES
('webhook_events', 30, 'hard_delete'),
('gdpr_audit_log', 2555, 'soft_delete'), -- 7 years for audit logs
('dsr_requests', 365, 'soft_delete'), -- 1 year for DSR requests
('refresh_tokens', 7, 'hard_delete'); -- 7 days for refresh tokens

-- Add comments for documentation
COMMENT ON TABLE public.dsr_requests IS 'Data Subject Rights requests under GDPR';
COMMENT ON TABLE public.data_retention_policies IS 'Data retention policies for GDPR compliance';
COMMENT ON TABLE public.gdpr_audit_log IS 'Audit log for GDPR-related activities';
COMMENT ON FUNCTION public.export_user_data IS 'Exports all user data for GDPR data portability';
COMMENT ON FUNCTION public.anonymize_user_data IS 'Anonymizes user data while preserving structure';
COMMENT ON FUNCTION public.delete_user_data IS 'Deletes all user data (right to be forgotten)';
COMMENT ON FUNCTION public.cleanup_expired_data IS 'Cleans up expired data based on retention policies';
