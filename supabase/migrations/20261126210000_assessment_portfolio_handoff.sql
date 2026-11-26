-- Keep private source links separate from ticket rows, including legacy SELECT * consumers.
CREATE TABLE public.portfolio_assessment_sources (
  assessment_id uuid PRIMARY KEY REFERENCES public.building_assessments(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.maintenance_tickets(id) ON DELETE CASCADE
);
ALTER TABLE public.portfolio_assessment_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portfolio_assessment_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.portfolio_assessment_sources TO service_role;

CREATE FUNCTION public.create_assessment_portfolio_ticket(
  p_actor uuid, p_property uuid, p_assessment uuid, p_revision timestamptz,
  p_review uuid, p_image_ids uuid[], p_title text, p_description text, p_priority text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  prop public.properties%ROWTYPE;
  assessment public.building_assessments%ROWTYPE;
  ticket public.maintenance_tickets%ROWTYPE;
  current_images uuid[];
BEGIN
  SELECT * INTO prop FROM public.properties WHERE id = p_property FOR SHARE;
  IF NOT FOUND OR prop.org_id IS NULL THEN
    RAISE EXCEPTION 'Property is not linked to a workspace' USING ERRCODE='23514';
  END IF;
  PERFORM 1 FROM public.organization_memberships
  WHERE org_id=prop.org_id AND user_id=p_actor AND status='active'
    AND org_role IN ('owner','manager','maintenance_coordinator') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workspace staff access required' USING ERRCODE='42501';
  END IF;
  IF prop.owner_id IS DISTINCT FROM p_actor THEN
    PERFORM 1 FROM public.property_team_members
    WHERE property_id=p_property AND user_id=p_actor AND status='accepted'
      AND role IN ('admin','manager') FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Property edit access required' USING ERRCODE='42501';
    END IF;
  END IF;

  -- A row lock makes simultaneous retries converge without an orphan ticket.
  SELECT * INTO assessment FROM public.building_assessments
  WHERE id=p_assessment AND property_id=p_property AND user_id=p_actor FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assessment not found' USING ERRCODE='P0002';
  END IF;
  SELECT t.* INTO ticket FROM public.portfolio_assessment_sources s
    JOIN public.maintenance_tickets t ON t.id=s.ticket_id
    WHERE s.assessment_id=p_assessment;
  IF FOUND THEN
    IF ticket.org_id IS DISTINCT FROM prop.org_id OR ticket.property_id IS DISTINCT FROM p_property THEN
      RAISE EXCEPTION 'Existing task is not in this workspace' USING ERRCODE='42501';
    END IF;
    RETURN jsonb_build_object('created',false,'ticket',to_jsonb(ticket));
  END IF;

  IF assessment.updated_at IS DISTINCT FROM p_revision OR (
    (assessment.validation_status='validated' AND assessment.validated_by IS NOT NULL)
    OR (p_review IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.assessment_expert_reviews r
      WHERE r.id=p_review AND r.assessment_id=p_assessment AND r.property_id=p_property
    ))
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'Review the current assessment before creating a task' USING ERRCODE='23514';
  END IF;
  IF p_review IS NOT NULL THEN
    SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[]) INTO current_images
    FROM (
      SELECT id FROM public.assessment_images WHERE assessment_id=p_assessment FOR SHARE
    ) matching_images;
    IF current_images IS DISTINCT FROM p_image_ids THEN
      RAISE EXCEPTION 'Assessment photos changed after review' USING ERRCODE='23514';
    END IF;
  END IF;
  INSERT INTO public.maintenance_tickets
    (org_id,property_id,reported_by,title,description,category,priority,status)
    VALUES (prop.org_id,p_property,p_actor,p_title,p_description,'inspection',p_priority,'open')
    RETURNING * INTO ticket;
  INSERT INTO public.portfolio_assessment_sources(assessment_id,ticket_id) VALUES(p_assessment,ticket.id);
  RETURN jsonb_build_object('created',true,'ticket',to_jsonb(ticket));
END;
$$;
REVOKE ALL ON FUNCTION public.create_assessment_portfolio_ticket(uuid,uuid,uuid,timestamptz,uuid,uuid[],text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_assessment_portfolio_ticket(uuid,uuid,uuid,timestamptz,uuid,uuid[],text,text,text) TO service_role;
