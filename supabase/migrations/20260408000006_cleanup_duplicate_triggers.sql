-- Migration: Cleanup duplicate and redundant triggers
-- Removes triggers that fire twice on the same event doing the same work.

-- ============================================================
-- 1. EXACT DUPLICATE TRIGGERS (same function fires 2x on same event)
-- ============================================================

-- service_areas: two UPDATE triggers both call updated_at functions
DROP TRIGGER IF EXISTS set_updated_at ON public.service_areas;

-- service_routes: same issue
DROP TRIGGER IF EXISTS set_updated_at ON public.service_routes;

-- yolo_models: two different triggers for updated_at
DROP TRIGGER IF EXISTS update_yolo_models_updated_at_trigger ON public.yolo_models;

-- ============================================================
-- 2. REDUNDANT UPDATED_AT TRIGGERS (different functions, same effect)
-- Keep the generic update_updated_at_column() trigger, drop the table-specific one.
-- ============================================================

-- appointments: trigger_update_appointments_updated_at + update_appointments_updated_at
DROP TRIGGER IF EXISTS trigger_update_appointments_updated_at ON public.appointments;

-- contractor_availability: trigger_update_contractor_availability_updated_at + update_contractor_availability_updated_at
DROP TRIGGER IF EXISTS trigger_update_contractor_availability_updated_at ON public.contractor_availability;

-- contractor_quotes: set_updated_at (update_updated_at) + update_contractor_quotes_updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.contractor_quotes;

-- maintenance_assessments: trigger_update + update
DROP TRIGGER IF EXISTS trigger_update_maintenance_assessments_updated_at ON public.maintenance_assessments;

-- maintenance_corrections: trigger_update + update
DROP TRIGGER IF EXISTS trigger_update_maintenance_corrections_updated_at ON public.maintenance_corrections;

-- maintenance_training_labels: trigger_update + update
DROP TRIGGER IF EXISTS trigger_update_maintenance_training_labels_updated_at ON public.maintenance_training_labels;

-- messages: messages_updated_at (handle_updated_at) + update_messages_updated_at
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;

-- ============================================================
-- 3. FIX COMPANY_TEAM_MEMBERS SELF-REFERENCING POLICY
-- Current policy queries company_team_members from within its own RLS,
-- creating recursion risk. Fix by using a SECURITY DEFINER helper function.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_company_admin(p_company_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_team_members
    WHERE company_id = p_company_id
      AND user_id = p_user_id
      AND role = 'admin'
      AND can_manage_team = true
  );
$$;

DROP POLICY IF EXISTS "Company admins can manage team" ON public.company_team_members;

CREATE POLICY "Company admins can manage team" ON public.company_team_members
  FOR ALL TO authenticated
  USING (is_company_admin(company_id, auth.uid()))
  WITH CHECK (is_company_admin(company_id, auth.uid()));
