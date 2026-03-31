-- Add RLS policies for security_events and audit_logs tables
-- These tables had RLS enabled but no policies, blocking all non-service-role access

-- security_events: admins can read, service_role can write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_events' AND policyname = 'admins_read_security_events') THEN
    CREATE POLICY "admins_read_security_events" ON public.security_events
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'security_events' AND policyname = 'service_role_manage_security_events') THEN
    CREATE POLICY "service_role_manage_security_events" ON public.security_events
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- audit_logs: admins can read, service_role can write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'admins_read_audit_logs') THEN
    CREATE POLICY "admins_read_audit_logs" ON public.audit_logs
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit_logs' AND policyname = 'service_role_manage_audit_logs') THEN
    CREATE POLICY "service_role_manage_audit_logs" ON public.audit_logs
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
