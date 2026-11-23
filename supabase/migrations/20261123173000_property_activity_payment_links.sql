-- Keep the previous activity function available during the web rollout.
CREATE OR REPLACE FUNCTION public.read_property_record_activity_page(
  p_actor uuid, p_property uuid, p_before timestamptz, p_event_key text
) RETURNS TABLE(id text, title text, date timestamptz, href text, kind text)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
  -- Payment and message details are owner-scoped even for a shared property.
  IF NOT EXISTS (
    SELECT 1 FROM public.properties p JOIN public.profiles u ON u.id=p.owner_id
    WHERE p.id=p_property AND p.owner_id=p_actor AND u.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Property history unavailable' USING ERRCODE='42501';
  END IF;
  IF (p_before IS NULL) <> (p_event_key IS NULL) THEN
    RAISE EXCEPTION 'Incomplete history cursor' USING ERRCODE='22023';
  END IF;

  RETURN QUERY
  WITH property_jobs AS NOT MATERIALIZED (
    SELECT j.id,j.title,j.created_at,j.completed_at FROM public.jobs j WHERE j.property_id=p_property
  ), events AS (
    SELECT e.prefix||j.id AS event_id,e.label||j.title AS event_title,e.occurred_at,
      '/jobs/'||j.id AS event_href,'job' AS event_kind
    FROM property_jobs j CROSS JOIN LATERAL (VALUES
      ('job-','Job created: ',j.created_at),
      ('complete-','Work completed: ',j.completed_at)
    ) e(prefix,label,occurred_at)
    UNION ALL
    SELECT 'document-'||d.id,'Document added: '||d.name,d.created_at,
      '/properties/'||p_property||'/documents/'||d.id,'document'
    FROM public.property_document_files d WHERE d.property_id=p_property AND d.status='ready'
    UNION ALL
    SELECT 'inspection-'||r.id,'Inspection recorded: '||r.title,r.created_at,
      '/properties/'||p_property||'/inspections/'||r.id,'inspection'
    FROM public.property_inspection_reports r WHERE r.property_id=p_property
    UNION ALL
    SELECT e.prefix||ep.id,e.label,e.occurred_at,'/payments/'||ep.id,'payment'
    FROM public.escrow_transactions ep JOIN property_jobs j ON j.id=ep.job_id
    CROSS JOIN LATERAL (VALUES
      ('payment-','Payment record created',ep.created_at),
      ('funded-','Payment funded',ep.funded_at),
      ('released-','Payment released',ep.released_at)
    ) e(prefix,label,occurred_at)
    WHERE ep.payer_id=p_actor
    UNION ALL
    SELECT 'dispute-'||ep.id,'Dispute opened',coalesce(d.created_at,ep.disputed_at),
      '/disputes/'||ep.id,'dispute'
    FROM public.escrow_transactions ep JOIN property_jobs j ON j.id=ep.job_id
    LEFT JOIN LATERAL (
      SELECT dispute.created_at
      FROM public.dispute_escrow_links link
      JOIN public.disputes dispute ON dispute.id=link.dispute_id
      WHERE link.escrow_id=ep.id AND dispute.job_id=j.id
      ORDER BY dispute.created_at DESC NULLS LAST,dispute.id DESC
      LIMIT 1
    ) d ON true
    WHERE ep.payer_id=p_actor
    UNION ALL
    SELECT 'message-'||m.id,'Job message sent',m.created_at,'/messages?jobId='||m.job_id,'message'
    FROM public.messages m JOIN property_jobs j ON j.id=m.job_id
    WHERE m.sender_id=p_actor OR m.receiver_id=p_actor
  )
  SELECT e.event_id,e.event_title,e.occurred_at,e.event_href,e.event_kind
  FROM events e WHERE e.occurred_at IS NOT NULL
    AND (p_before IS NULL OR e.occurred_at<p_before
      OR (e.occurred_at=p_before AND e.event_id COLLATE "C">p_event_key COLLATE "C"))
  ORDER BY e.occurred_at DESC,e.event_id COLLATE "C"
  LIMIT 26;
END;
$$;

REVOKE ALL ON FUNCTION public.read_property_record_activity_page(uuid,uuid,timestamptz,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_property_record_activity_page(uuid,uuid,timestamptz,text) TO service_role;
