-- A submitted identity document and business registration or licence document
-- make an unverified profile ready for review. This does not grant a badge.
CREATE INDEX IF NOT EXISTS contractor_documents_latest_verification_idx
  ON public.contractor_documents (contractor_id, verification_type, created_at DESC, id DESC)
  WHERE verification_type IN ('identity', 'business_licence');

CREATE VIEW public.admin_verification_queue WITH (security_invoker = true) AS
SELECT p.id, p.email, p.first_name, p.last_name, p.phone, p.role,
       p.company_name, p.license_number, p.insurance_expiry_date,
       p.business_address, p.admin_verified, p.skills, p.rating,
       p.total_jobs_completed, p.city, p.created_at, p.updated_at,
       p.background_check_status,
       GREATEST(identity_doc.created_at, business_doc.created_at) AS latest_evidence_at,
       COALESCE(identity_doc.review_status IN ('pending','approved'), false) AS identity_submitted,
       COALESCE(business_doc.review_status IN ('pending','approved'), false) AS business_submitted,
       CASE
         WHEN p.admin_verified IS TRUE THEN 'verified'
         WHEN p.background_check_status = 'rejected' THEN 'rejected'
         WHEN identity_doc.review_status IN ('pending','approved')
          AND business_doc.review_status IN ('pending','approved') THEN 'ready'
         ELSE 'incomplete'
       END AS queue_status
FROM public.profiles p
LEFT JOIN LATERAL (
  SELECT d.review_status, d.created_at FROM public.contractor_documents d
  WHERE d.contractor_id = p.id AND d.verification_type = 'identity'
  ORDER BY d.created_at DESC, d.id DESC LIMIT 1
) identity_doc ON true
LEFT JOIN LATERAL (
  SELECT d.review_status, d.created_at FROM public.contractor_documents d
  WHERE d.contractor_id = p.id AND d.verification_type = 'business_licence'
  ORDER BY d.created_at DESC, d.id DESC LIMIT 1
) business_doc ON true
WHERE p.role = 'contractor' AND p.deleted_at IS NULL;

REVOKE ALL ON public.admin_verification_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_verification_queue TO service_role;

CREATE OR REPLACE FUNCTION public.assign_admin_verifications()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE candidate record; assignee uuid; assigned integer := 0;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin_verification_assignment'));

  UPDATE public.admin_verification_tasks t
  SET status = 'completed', completed_at = now()
  WHERE t.status = 'open' AND NOT EXISTS (
    SELECT 1 FROM public.admin_verification_queue q
    WHERE q.id = t.contractor_id AND q.queue_status NOT IN ('verified','rejected')
  );

  FOR candidate IN
    SELECT q.id FROM public.admin_verification_queue q
    LEFT JOIN public.admin_verification_tasks t ON t.contractor_id = q.id
    WHERE q.queue_status = 'ready' AND (t.id IS NULL OR (
      t.status = 'completed' AND t.email_status <> 'sending' AND q.latest_evidence_at > t.completed_at
    ))
    ORDER BY q.created_at, q.id LIMIT 100
  LOOP
    SELECT p.id INTO assignee FROM public.profiles p
    LEFT JOIN public.admin_verification_tasks t ON t.admin_id = p.id AND t.status = 'open'
    WHERE p.role = 'admin' AND p.deleted_at IS NULL AND p.is_available IS TRUE
    GROUP BY p.id ORDER BY count(t.id), max(t.created_at) NULLS FIRST, p.id LIMIT 1;
    EXIT WHEN assignee IS NULL;

    INSERT INTO public.admin_verification_tasks AS t (contractor_id, admin_id)
    VALUES (candidate.id, assignee)
    ON CONFLICT (contractor_id) DO UPDATE
    SET admin_id = excluded.admin_id, status = 'open', created_at = excluded.created_at,
        completed_at = NULL, email_status = 'pending'
    WHERE t.status = 'completed' AND t.email_status <> 'sending';
    IF FOUND THEN assigned := assigned + 1; END IF;
  END LOOP;
  RETURN assigned;
END $$;

REVOKE ALL ON FUNCTION public.assign_admin_verifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_admin_verifications() TO service_role;

-- Both evidence sources use their current review deadline, then kind and ID
-- as stable tie-breakers. The response never needs the archive evidence body.
CREATE OR REPLACE VIEW public.admin_evidence_review_queue WITH (security_invoker = true) AS
SELECT 'contract'::text AS kind, a.contract_id AS id, a.archived_at,
       COALESCE(r.review_due_at, a.review_due_at) AS review_due_at,
       COALESCE(r.revision, 0) AS revision, COALESCE(r.legal_hold, false) AS legal_hold,
       COALESCE(r.reason, '') AS reason,
       COALESCE(NULLIF(btrim(a.evidence #>> '{contract,title}'), ''), 'Retained contract') AS title
FROM public.retained_contract_records a
LEFT JOIN public.evidence_retention_reviews r ON r.record_kind = 'contract' AND r.record_id = a.contract_id
UNION ALL
SELECT 'dispute', a.dispute_id, a.archived_at,
       COALESCE(r.review_due_at, a.review_due_at), COALESCE(r.revision, 0),
       COALESCE(r.legal_hold, false), COALESCE(r.reason, ''),
       COALESCE(NULLIF(btrim(j.title), ''), NULLIF(btrim(a.evidence ->> 'dispute_reason'), ''), 'Retained dispute')
FROM public.retained_dispute_records a
LEFT JOIN public.evidence_retention_reviews r ON r.record_kind = 'dispute' AND r.record_id = a.dispute_id
LEFT JOIN public.jobs j ON j.id = a.job_id;

REVOKE ALL ON public.admin_evidence_review_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_evidence_review_queue TO service_role;

-- Preview the same active, verified audience used by the existing campaign
-- publisher. It returns IDs only, and caps the result above the queue limit.
CREATE FUNCTION public.preview_customer_campaign_recipients(p_actor uuid,p_audience text,p_email text)
RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.support_operator_settings s
    JOIN public.profiles admin ON admin.id = s.admin_id
    WHERE s.admin_id = p_actor AND s.can_broadcast AND admin.role = 'admin' AND admin.deleted_at IS NULL
  )
  AND p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL
  AND (u.banned_until IS NULL OR u.banned_until <= now())
  AND p.role IN ('homeowner','contractor')
  AND CASE p_audience
    WHEN 'all' THEN true
    WHEN 'homeowners' THEN p.role = 'homeowner'
    WHEN 'contractors' THEN p.role = 'contractor'
    WHEN 'individual' THEN lower(p.email) = lower(btrim(p_email))
    ELSE false
  END
  ORDER BY p.id LIMIT 1001
$$;

REVOKE ALL ON FUNCTION public.preview_customer_campaign_recipients(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.preview_customer_campaign_recipients(uuid,text,text) TO service_role;


CREATE INDEX IF NOT EXISTS customer_communication_outbox_created_id_idx
  ON public.customer_communication_outbox (created_at DESC, id DESC);

CREATE VIEW public.admin_communication_delivery_log WITH (security_invoker = true) AS
SELECT o.id, o.subject, o.channel, o.status, o.created_at, o.completed_at,
       o.last_checked_at, o.attempts, o.provider_id, o.last_error,
       COALESCE(o.recipient_email, p.email) AS recipient_email,
       o.recipient_id,
       COALESCE(m.ticket_id::text, substring(o.event_key FROM '^support-(?:assigned|escalated):([0-9a-f-]{36}):')) AS case_reference,
       substring(o.action_url FROM '^/(?:contractor/)?jobs/([0-9a-f-]{36})(?:[/?#]|$)') AS job_reference,
       substring(o.action_url FROM '^/(?:admin/)?disputes/([0-9a-f-]{36})(?:[/?#]|$)') AS dispute_reference
FROM public.customer_communication_outbox o
LEFT JOIN public.profiles p ON p.id = o.recipient_id
LEFT JOIN public.support_messages m ON m.id = (
  substring(o.event_key FROM '^support-(?:reply|inbox):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$')
)::uuid;

REVOKE ALL ON public.admin_communication_delivery_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_communication_delivery_log TO service_role;


-- Recheck eligibility from the frozen preview before queuing any message.
CREATE OR REPLACE FUNCTION public.publish_customer_campaign(p_campaign uuid,p_actor uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer_campaigns%ROWTYPE; recipient record; channel text; total integer:=0;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.support_operator_settings s JOIN public.profiles p ON p.id=s.admin_id WHERE s.admin_id=p_actor AND s.can_broadcast AND p.role='admin' AND p.deleted_at IS NULL) THEN RAISE EXCEPTION 'Broadcast permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.customer_campaigns WHERE id=p_campaign FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Draft not found' USING ERRCODE='P0002'; END IF;
 IF c.published_at IS NOT NULL THEN RETURN 0; END IF;
 FOR recipient IN SELECT p.id,p.email FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.id=ANY(c.recipient_ids) AND p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<=now())
  AND p.role IN ('homeowner','contractor')
  AND (c.audience NOT IN ('homeowners','contractors') OR (c.audience='homeowners' AND p.role='homeowner')
       OR (c.audience='contractors' AND p.role='contractor')) LOOP
  FOREACH channel IN ARRAY c.channels LOOP
   IF channel='in_app' AND 'push'=ANY(c.channels) THEN CONTINUE; END IF;
   INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url) VALUES('campaign:'||c.id||':'||recipient.id||':'||channel,recipient.id,recipient.email,channel,c.title,c.body,'/support') ON CONFLICT(event_key) DO NOTHING;
   total:=total+1;
  END LOOP;
 END LOOP;
 UPDATE public.customer_campaigns SET published_at=now() WHERE id=c.id;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.publish_customer_campaign(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_customer_campaign(uuid,uuid) TO service_role;
