-- Migration: Cleanup duplicate and redundant triggers
-- Removes triggers that fire twice on the same event doing the same work.

DROP TRIGGER IF EXISTS set_updated_at ON public.service_areas;
DROP TRIGGER IF EXISTS set_updated_at ON public.service_routes;
DROP TRIGGER IF EXISTS update_yolo_models_updated_at_trigger ON public.yolo_models;

DROP TRIGGER IF EXISTS trigger_update_appointments_updated_at ON public.appointments;
DROP TRIGGER IF EXISTS trigger_update_contractor_availability_updated_at ON public.contractor_availability;
DROP TRIGGER IF EXISTS set_updated_at ON public.contractor_quotes;
DROP TRIGGER IF EXISTS trigger_update_maintenance_assessments_updated_at ON public.maintenance_assessments;
DROP TRIGGER IF EXISTS trigger_update_maintenance_corrections_updated_at ON public.maintenance_corrections;
DROP TRIGGER IF EXISTS trigger_update_maintenance_training_labels_updated_at ON public.maintenance_training_labels;
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;

-- Fix company_team_members self-referencing RLS with SECURITY DEFINER helper
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
  WITH CHECK (is_company_admin(company_id, auth.uid()));;
