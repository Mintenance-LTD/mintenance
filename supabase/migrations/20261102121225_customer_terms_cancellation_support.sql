-- Consent is append-only, tied to the exact agreement and policy revision.
CREATE TABLE public.customer_policy_documents (
 version text PRIMARY KEY, body text NOT NULL, sha256 text NOT NULL CHECK(length(sha256)=64),
 published_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.contract_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES public.contracts(id),
 signer_id uuid NOT NULL REFERENCES public.profiles(id), signer_role text NOT NULL CHECK(signer_role IN ('homeowner','contractor')),
 contract_version integer NOT NULL, contract_snapshot jsonb NOT NULL,
 policy_version text NOT NULL REFERENCES public.customer_policy_documents(version),
 early_start_requested boolean NOT NULL DEFAULT false, full_performance_acknowledged boolean NOT NULL DEFAULT false,
 early_start_wording text NOT NULL, full_performance_wording text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(), UNIQUE(contract_id,signer_role),
 CHECK(NOT full_performance_acknowledged OR early_start_requested)
);
CREATE TABLE public.account_terms_acceptances (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, policy_version text NOT NULL REFERENCES public.customer_policy_documents(version),
 accepted_at timestamptz NOT NULL DEFAULT now(), source text NOT NULL DEFAULT 'signup_declaration', UNIQUE(user_id,policy_version)
);
ALTER TABLE public.account_terms_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_terms_acceptances FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.account_terms_acceptances TO service_role;
CREATE FUNCTION public.record_signup_terms_declaration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 -- Initial signup metadata is evidence of the submitted declaration, never authority.
 -- Later changes to user_metadata cannot rewrite the immutable acceptance record.
 IF NEW.raw_user_meta_data->>'terms_version'='2026-11-03' AND NEW.raw_user_meta_data->'terms_accepted'='true'::jsonb THEN
  INSERT INTO public.account_terms_acceptances(user_id,policy_version) VALUES(NEW.id,'2026-11-03');
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_signup_terms_declaration() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_signup_terms_declaration AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.record_signup_terms_declaration();
ALTER TABLE public.contracts ADD COLUMN agreement_formed_at timestamptz;
ALTER TABLE public.contracts ADD COLUMN cancellation_deadline timestamptz;
ALTER TABLE public.contracts ADD COLUMN cancellation_requested_at timestamptz;
CREATE TABLE public.customer_communication_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_key text NOT NULL UNIQUE,
 recipient_id uuid REFERENCES public.profiles(id), recipient_email text,
 channel text NOT NULL CHECK(channel IN ('email','in_app','push')),
 subject text NOT NULL, body text NOT NULL, action_url text NOT NULL DEFAULT '/support',
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted','delivered','failed','needs_review')),
 provider_id text, attempts integer NOT NULL DEFAULT 0, claimed_at timestamptz,
 last_checked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, last_error text,
 CHECK((channel='email' AND recipient_email IS NOT NULL) OR (channel<>'email' AND recipient_id IS NOT NULL))
);
CREATE INDEX customer_outbox_pending ON public.customer_communication_outbox(status,created_at);
CREATE TABLE public.customer_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL REFERENCES public.profiles(id),
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 200), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),
 audience text NOT NULL CHECK(audience IN ('all','homeowners','contractors','individual')),
 recipient_ids uuid[] NOT NULL, channels text[] NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 CHECK(cardinality(channels)>0 AND channels <@ ARRAY['email','in_app','push']::text[])
);
ALTER TABLE public.support_tickets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.support_tickets ADD COLUMN guest_email text;
ALTER TABLE public.support_tickets ADD COLUMN assigned_to uuid REFERENCES public.profiles(id);
ALTER TABLE public.support_tickets ADD COLUMN category text NOT NULL DEFAULT 'general' CHECK(category IN ('general','account','payment','safety','cancellation'));
ALTER TABLE public.support_tickets ADD COLUMN job_id uuid REFERENCES public.jobs(id);
ALTER TABLE public.support_tickets ADD COLUMN first_response_at timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN waiting_on_customer boolean NOT NULL DEFAULT false;
ALTER TABLE public.support_tickets ADD COLUMN response_due_at timestamptz NOT NULL DEFAULT(now()+interval '1 day');
ALTER TABLE public.support_tickets ADD COLUMN escalated_at timestamptz;
ALTER TABLE public.support_tickets ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_contact_required CHECK(user_id IS NOT NULL OR guest_email IS NOT NULL);
CREATE INDEX support_owner_queue ON public.support_tickets(assigned_to,status,response_due_at);
CREATE TABLE public.support_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
 author_id uuid REFERENCES public.profiles(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 5000),
 internal boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 request_id uuid NOT NULL UNIQUE
);
CREATE INDEX support_messages_thread ON public.support_messages(ticket_id,created_at);
INSERT INTO public.support_messages(ticket_id,author_id,body,created_at,request_id)
 SELECT id,user_id,left(coalesce(nullif(message,''),'Existing support request'),5000),created_at,gen_random_uuid() FROM public.support_tickets;
CREATE TABLE public.support_case_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
 actor_id uuid REFERENCES public.profiles(id), action text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.support_operator_settings (
 admin_id uuid PRIMARY KEY REFERENCES public.profiles(id), available boolean NOT NULL DEFAULT true,
 capacity integer NOT NULL DEFAULT 20 CHECK(capacity BETWEEN 1 AND 100),
 can_broadcast boolean NOT NULL DEFAULT false, can_manage_team boolean NOT NULL DEFAULT false
);
CREATE TABLE public.mobile_beta_access_grants (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, approved boolean NOT NULL,
 updated_by uuid NOT NULL REFERENCES public.profiles(id), reason text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mobile_beta_access_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_beta_access_grants FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.mobile_beta_access_grants TO service_role;
CREATE TABLE public.mobile_beta_access_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, approved boolean NOT NULL,
 actor_id uuid NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mobile_beta_access_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_beta_access_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.mobile_beta_access_events TO service_role;
CREATE FUNCTION public.audit_mobile_beta_access() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 INSERT INTO public.mobile_beta_access_events(user_id,approved,actor_id,reason) VALUES(NEW.user_id,NEW.approved,NEW.updated_by,NEW.reason);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.audit_mobile_beta_access() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER audit_mobile_beta_access AFTER INSERT OR UPDATE ON public.mobile_beta_access_grants FOR EACH ROW EXECUTE FUNCTION public.audit_mobile_beta_access();
CREATE FUNCTION public.mobile_beta_access() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT approved FROM public.mobile_beta_access_grants WHERE user_id=auth.uid() AND auth.uid() IS NOT NULL
$$;
REVOKE ALL ON FUNCTION public.mobile_beta_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mobile_beta_access() TO authenticated;
-- Existing administrators remain operators; financial privileges are not extended.
INSERT INTO public.support_operator_settings(admin_id,can_broadcast,can_manage_team)
 SELECT id,true,email='admin@mintenance.co.uk' FROM public.profiles WHERE role='admin' AND deleted_at IS NULL;

DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['customer_policy_documents','contract_consents','customer_communication_outbox','customer_campaigns','support_messages','support_case_events','support_operator_settings'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',n);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',n);
 END LOOP;
END $$;
REVOKE UPDATE,DELETE,TRUNCATE ON public.contract_consents,public.customer_policy_documents,public.support_messages,public.support_case_events FROM service_role;
-- The HTTP API checks owner/admin and filters internal notes; direct clients cannot mutate assignments.
REVOKE ALL ON public.support_tickets FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.support_tickets TO service_role;

CREATE FUNCTION public.update_support_case(p_ticket uuid,p_actor uuid,p_revision integer,p_status text,p_assigned uuid,p_priority text,p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.support_tickets%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin' AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 SELECT * INTO t FROM public.support_tickets WHERE id=p_ticket FOR UPDATE;
 IF t.id IS NULL OR t.revision<>p_revision THEN RAISE EXCEPTION 'Case changed' USING ERRCODE='40001'; END IF;
 IF p_status NOT IN ('open','in_progress','resolved','closed') OR p_priority NOT IN ('low','normal','high','urgent') OR length(trim(p_reason)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid update' USING ERRCODE='23514'; END IF;
 IF p_assigned IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.profiles p JOIN public.support_operator_settings s ON s.admin_id=p.id WHERE p.id=p_assigned AND p.role='admin' AND p.deleted_at IS NULL AND s.available) THEN RAISE EXCEPTION 'Assignee unavailable' USING ERRCODE='23514'; END IF;
 UPDATE public.support_tickets SET status=p_status,assigned_to=p_assigned,priority=p_priority,revision=revision+1,updated_at=now() WHERE id=p_ticket RETURNING * INTO t;
 INSERT INTO public.support_case_events(ticket_id,actor_id,action,details) VALUES(p_ticket,p_actor,'updated',jsonb_build_object('status',p_status,'assigned_to',p_assigned,'priority',p_priority,'reason',p_reason));
 RETURN to_jsonb(t);
END $$;
REVOKE ALL ON FUNCTION public.update_support_case(uuid,uuid,integer,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.update_support_case(uuid,uuid,integer,text,uuid,text,text) TO service_role;

CREATE FUNCTION public.publish_customer_campaign(p_campaign uuid,p_actor uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer_campaigns%ROWTYPE; p record; channel text; total integer:=0;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.support_operator_settings s JOIN public.profiles p ON p.id=s.admin_id WHERE s.admin_id=p_actor AND s.can_broadcast AND p.role='admin' AND p.deleted_at IS NULL) THEN RAISE EXCEPTION 'Broadcast permission required' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.customer_campaigns WHERE id=p_campaign FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Draft not found' USING ERRCODE='P0002'; END IF;
 IF c.published_at IS NOT NULL THEN RETURN 0; END IF;
 FOR p IN SELECT p.id,p.email FROM public.profiles p JOIN auth.users u ON u.id=p.id WHERE p.id=ANY(c.recipient_ids) AND p.deleted_at IS NULL AND u.deleted_at IS NULL AND u.email_confirmed_at IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until<=now()) LOOP
  FOREACH channel IN ARRAY c.channels LOOP
   IF channel='in_app' AND 'push'=ANY(c.channels) THEN CONTINUE; END IF;
   INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url) VALUES('campaign:'||c.id||':'||p.id||':'||channel,p.id,p.email,channel,c.title,c.body,'/support') ON CONFLICT(event_key) DO NOTHING;
   total:=total+1;
  END LOOP;
 END LOOP;
 UPDATE public.customer_campaigns SET published_at=now() WHERE id=c.id;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.publish_customer_campaign(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_customer_campaign(uuid,uuid) TO service_role;

CREATE FUNCTION public.escalate_support_cases() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t record; n integer:=0;
BEGIN
 FOR t IN UPDATE public.support_tickets SET escalated_at=now(),revision=revision+1 WHERE status IN ('open','in_progress') AND NOT waiting_on_customer AND response_due_at<now() AND escalated_at IS NULL RETURNING id LOOP
  INSERT INTO public.support_case_events(ticket_id,action) VALUES(t.id,'escalated');
  INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
   SELECT 'support-escalated:'||t.id||':'||p.id,p.id,p.email,'email','Support case needs attention','An overdue or unassigned case needs review in the support inbox.','/admin/support'
   FROM public.profiles p JOIN public.support_operator_settings s ON s.admin_id=p.id WHERE s.can_manage_team AND p.role='admin' AND p.deleted_at IS NULL ON CONFLICT(event_key) DO NOTHING;
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.escalate_support_cases() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_support_cases() TO service_role;

CREATE FUNCTION public.assign_support_cases() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t record; chosen uuid; n integer:=0;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('support_assignment'));
 FOR t IN SELECT id FROM public.support_tickets WHERE assigned_to IS NULL AND status IN ('open','in_progress') ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,created_at FOR UPDATE LOOP
  SELECT s.admin_id INTO chosen FROM public.support_operator_settings s JOIN public.profiles p ON p.id=s.admin_id
   WHERE s.available AND p.role='admin' AND p.deleted_at IS NULL AND
   (SELECT count(*) FROM public.support_tickets x WHERE x.assigned_to=s.admin_id AND x.status IN ('open','in_progress'))<s.capacity
   ORDER BY (SELECT count(*) FROM public.support_tickets x WHERE x.assigned_to=s.admin_id AND x.status IN ('open','in_progress')),
    (SELECT max(created_at) FROM public.support_case_events e WHERE e.details->>'assigned_to'=s.admin_id::text) NULLS FIRST,s.admin_id LIMIT 1;
  EXIT WHEN chosen IS NULL;
  UPDATE public.support_tickets SET assigned_to=chosen,revision=revision+1 WHERE id=t.id;
  INSERT INTO public.support_case_events(ticket_id,action,details) VALUES(t.id,'assigned',jsonb_build_object('assigned_to',chosen));
  INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
   SELECT 'support-assigned:'||t.id||':'||chosen,chosen,email,'email','Mintenance support case assigned','A support case needs your attention. Open the admin support inbox.','/admin/support' FROM public.profiles WHERE id=chosen ON CONFLICT(event_key) DO NOTHING;
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;

CREATE FUNCTION public.create_support_case(p_user uuid,p_email text,p_subject text,p_body text,p_category text,p_priority text,p_job uuid,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE existing uuid; ticket uuid; urgent boolean:=p_priority='urgent' OR p_category IN ('payment','safety','cancellation');
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(p_request::text));
 SELECT ticket_id INTO existing FROM public.support_messages WHERE request_id=p_request;
 IF existing IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.support_tickets WHERE id=existing AND user_id IS NOT DISTINCT FROM p_user AND guest_email IS NOT DISTINCT FROM p_email) THEN RAISE EXCEPTION 'Request already used' USING ERRCODE='42501'; END IF;
  RETURN existing;
 END IF;
 IF p_job IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.jobs WHERE id=p_job AND p_user IN (homeowner_id,contractor_id,payer_user_id)) THEN RAISE EXCEPTION 'Job access denied' USING ERRCODE='42501'; END IF;
 INSERT INTO public.support_tickets(user_id,guest_email,subject,message,category,priority,job_id,response_due_at)
 VALUES(p_user,p_email,p_subject,p_body,p_category,CASE WHEN urgent THEN 'urgent' ELSE p_priority END,p_job,now()+CASE WHEN urgent THEN interval '1 hour' ELSE interval '1 day' END) RETURNING id INTO ticket;
 INSERT INTO public.support_messages(ticket_id,author_id,body,request_id) VALUES(ticket,p_user,p_body,p_request);
 INSERT INTO public.support_case_events(ticket_id,actor_id,action) VALUES(ticket,p_user,'created');
 PERFORM public.assign_support_cases();
 RETURN ticket;
END $$;

CREATE FUNCTION public.reply_support_case(p_ticket uuid,p_actor uuid,p_body text,p_internal boolean,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.support_tickets%ROWTYPE; is_admin boolean; msg uuid; recipient uuid; address text;
BEGIN
 SELECT * INTO t FROM public.support_tickets WHERE id=p_ticket FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Case not found' USING ERRCODE='P0002'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_actor AND role='admin' AND deleted_at IS NULL) INTO is_admin;
 IF NOT is_admin AND (t.user_id IS DISTINCT FROM p_actor OR p_internal) THEN RAISE EXCEPTION 'Case access denied' USING ERRCODE='42501'; END IF;
 IF t.status IN ('closed','resolved') AND is_admin THEN RAISE EXCEPTION 'Reopen the case before replying' USING ERRCODE='23514'; END IF;
 SELECT id INTO msg FROM public.support_messages WHERE request_id=p_request AND ticket_id=p_ticket AND author_id=p_actor AND body=p_body AND internal=p_internal;
 IF msg IS NOT NULL THEN RETURN msg; END IF;
 INSERT INTO public.support_messages(ticket_id,author_id,body,internal,request_id) VALUES(p_ticket,p_actor,p_body,p_internal,p_request) RETURNING id INTO msg;
 UPDATE public.support_tickets SET updated_at=now(),revision=revision+1,
  first_response_at=CASE WHEN is_admin AND NOT p_internal THEN coalesce(first_response_at,now()) ELSE first_response_at END,
  status=CASE WHEN NOT is_admin THEN 'open' ELSE status END,
  waiting_on_customer=CASE WHEN NOT p_internal THEN is_admin ELSE waiting_on_customer END,
  escalated_at=CASE WHEN NOT is_admin THEN NULL ELSE escalated_at END,
  response_due_at=CASE WHEN NOT is_admin THEN now()+interval '1 day' ELSE response_due_at END
  WHERE id=p_ticket;
 IF NOT p_internal THEN
  recipient:=CASE WHEN is_admin THEN t.user_id ELSE t.assigned_to END;
  SELECT email INTO address FROM public.profiles WHERE id=recipient AND deleted_at IS NULL;
  IF is_admin AND t.user_id IS NULL THEN address:=t.guest_email; END IF;
  IF address IS NOT NULL THEN
   INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
   VALUES('support-reply:'||msg,recipient,address,'email','Mintenance support — '||t.subject,
    CASE WHEN is_admin THEN p_body||E'\n\nCase reference: '||p_ticket||E'\nReply to admin@mintenance.co.uk quoting this reference, or continue in the support inbox.' ELSE 'A customer replied to their support case. Open the admin support inbox.' END,
    CASE WHEN is_admin THEN '/support' ELSE '/admin/support' END);
  END IF;
  IF recipient IS NOT NULL THEN
   INSERT INTO public.customer_communication_outbox(event_key,recipient_id,channel,subject,body,action_url)
   VALUES('support-inbox:'||msg,recipient,'in_app','Support case updated','There is a new reply to your support case.',CASE WHEN is_admin THEN '/support' ELSE '/admin/support' END);
  END IF;
 END IF;
 RETURN msg;
END $$;

-- Read and sign the same quote and bid revision, including legacy bid-linked quotes.
CREATE FUNCTION public.contract_review_snapshot(p_contract uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('contract',to_jsonb(c),'quote',to_jsonb(q),'bid',to_jsonb(b))
 FROM public.contracts c LEFT JOIN public.bids b ON b.id::text=c.terms->>'bid_id' AND b.job_id=c.job_id AND b.contractor_id=c.contractor_id
 LEFT JOIN public.contractor_quotes q ON q.id=coalesce(c.quote_id,b.quote_id) WHERE c.id=p_contract
$$;
REVOKE ALL ON FUNCTION public.contract_review_snapshot(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.contract_reviews(p_ids uuid[]) RETURNS TABLE(id uuid,snapshot jsonb,review_token text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT v.id,s.value,md5(s.value::text) FROM unnest(p_ids) v(id) CROSS JOIN LATERAL (SELECT public.contract_review_snapshot(v.id) value) s
$$;
REVOKE ALL ON FUNCTION public.contract_reviews(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.contract_reviews(uuid[]) TO service_role;

CREATE FUNCTION public.record_contract_consent(p_contract uuid,p_signer uuid,p_legal jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE; r text; payer uuid; doc public.customer_policy_documents%ROWTYPE; snapshot jsonb;
BEGIN
 SELECT * INTO c FROM public.contracts WHERE id=p_contract FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found' USING ERRCODE='P0002'; END IF;
 SELECT payer_user_id INTO payer FROM public.jobs WHERE id=c.job_id;
 IF c.contractor_id=p_signer THEN r:='contractor'; ELSIF p_signer=c.homeowner_id OR p_signer=payer THEN r:='homeowner'; ELSE RAISE EXCEPTION 'Not a contract party' USING ERRCODE='42501'; END IF;
 IF p_legal->>'termsVersion' IS DISTINCT FROM '2026-11-03' OR p_legal->'termsAccepted' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Review and accept the current customer terms' USING ERRCODE='23514'; END IF;
 IF (p_legal->>'expectedUpdatedAt')::timestamptz IS DISTINCT FROM c.updated_at THEN RAISE EXCEPTION 'Contract changed; refresh before signing' USING ERRCODE='23514'; END IF;
 IF jsonb_typeof(p_legal->'earlyStartRequested') IS DISTINCT FROM 'boolean' OR jsonb_typeof(p_legal->'fullPerformanceAcknowledged') IS DISTINCT FROM 'boolean' OR
  (p_legal->>'fullPerformanceAcknowledged')::boolean AND NOT (p_legal->>'earlyStartRequested')::boolean OR
  r='contractor' AND ((p_legal->>'earlyStartRequested')::boolean OR (p_legal->>'fullPerformanceAcknowledged')::boolean) THEN RAISE EXCEPTION 'Invalid consent choices' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.bids WHERE id::text=c.terms->>'bid_id' AND job_id=c.job_id AND contractor_id=c.contractor_id FOR SHARE;
 PERFORM 1 FROM public.contractor_quotes WHERE id=coalesce(c.quote_id,(SELECT quote_id FROM public.bids WHERE id::text=c.terms->>'bid_id' AND job_id=c.job_id AND contractor_id=c.contractor_id)) FOR SHARE;
 snapshot:=public.contract_review_snapshot(c.id);
 IF p_legal->>'expectedReviewToken' IS DISTINCT FROM md5(snapshot::text) THEN RAISE EXCEPTION 'Agreement or quote changed; refresh before signing' USING ERRCODE='23514'; END IF;
 SELECT * INTO STRICT doc FROM public.customer_policy_documents WHERE version='2026-11-03';
 INSERT INTO public.contract_consents(contract_id,signer_id,signer_role,contract_version,contract_snapshot,policy_version,early_start_requested,full_performance_acknowledged,early_start_wording,full_performance_wording)
 VALUES(c.id,p_signer,r,coalesce(c.contract_version,1),snapshot,doc.version,(p_legal->>'earlyStartRequested')::boolean,(p_legal->>'fullPerformanceAcknowledged')::boolean,
 'I expressly request that the contractor starts the agreed service before the end of my 14-day cancellation period. If I cancel after it starts, I understand that I may have to pay a proportionate amount for the service supplied before cancellation, where the law allows.',
 'I understand that, once the service has been fully performed following my express request, I will lose the cancellation right where the legal conditions for this are met.');
 INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
 SELECT 'contract-consent:'||c.id||':'||p_signer,p_signer,email,'email','Your Mintenance agreement and choices',
  'Contract reference: '||c.id||E'\nAccepted at: '||now()||E'\nEarly start requested: '||(p_legal->>'earlyStartRequested')||E'\nFull-performance acknowledgement: '||(p_legal->>'fullPerformanceAcknowledged')||E'\n\nAgreement snapshot:\n'||jsonb_pretty(snapshot)||E'\n\n'||doc.body,'/jobs/'||c.job_id
 FROM public.profiles WHERE id=p_signer;
END $$;
CREATE FUNCTION public.sign_contract_with_consent(p_contract_id uuid,p_signer_id uuid,p_signature jsonb,p_ip text,p_user_agent text,p_legal jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM public.record_contract_consent(p_contract_id,p_signer_id,p_legal);
 RETURN public.sign_contract_atomic(p_contract_id,p_signer_id,p_signature,p_ip,p_user_agent);
END $$;
-- Remove the old service entry point. Only the checked wrapper can call it.
REVOKE EXECUTE ON FUNCTION public.sign_contract_atomic(uuid,uuid,jsonb,text,text) FROM service_role;

CREATE FUNCTION public.guard_contract_consent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.homeowner_signed_at IS DISTINCT FROM OLD.homeowner_signed_at AND NEW.homeowner_signed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contract_consents WHERE contract_id=NEW.id AND signer_role='homeowner') THEN RAISE EXCEPTION 'Customer consent is required' USING ERRCODE='23514'; END IF;
 IF NEW.contractor_signed_at IS DISTINCT FROM OLD.contractor_signed_at AND NEW.contractor_signed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.contract_consents WHERE contract_id=NEW.id AND signer_role='contractor') THEN RAISE EXCEPTION 'Terms acceptance is required' USING ERRCODE='23514'; END IF;
 IF NEW.status='accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
  NEW.agreement_formed_at:=now();
  NEW.cancellation_deadline:=((now() AT TIME ZONE 'Europe/London')::date+15)::timestamp AT TIME ZONE 'Europe/London';
 END IF;
 IF OLD.agreement_formed_at IS NOT NULL AND (NEW.agreement_formed_at IS DISTINCT FROM OLD.agreement_formed_at OR NEW.cancellation_deadline IS DISTINCT FROM OLD.cancellation_deadline) THEN RAISE EXCEPTION 'Agreement dates are immutable' USING ERRCODE='23514'; END IF;
 IF OLD.cancellation_requested_at IS NOT NULL AND NEW.cancellation_requested_at IS DISTINCT FROM OLD.cancellation_requested_at THEN RAISE EXCEPTION 'Cancellation notice is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_contract_consent BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.guard_contract_consent();
CREATE FUNCTION public.guard_customer_work_start() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE;
BEGIN
 IF NEW.status='in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
  SELECT * INTO c FROM public.contracts WHERE job_id=NEW.id AND status='accepted' ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF c.id IS NULL OR c.cancellation_requested_at IS NOT NULL THEN RAISE EXCEPTION 'An accepted agreement without a pending cancellation is required' USING ERRCODE='23514'; END IF;
  IF c.cancellation_deadline IS NULL THEN RAISE EXCEPTION 'Legacy agreement requires cancellation-information review before starting' USING ERRCODE='23514'; END IF;
  IF now()<c.cancellation_deadline AND NOT EXISTS(SELECT 1 FROM public.contract_consents WHERE contract_id=c.id AND signer_role='homeowner' AND early_start_requested) THEN RAISE EXCEPTION 'Wait until the cancellation deadline or obtain the customer early-start request' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_customer_work_start BEFORE UPDATE OF status ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.guard_customer_work_start();

CREATE FUNCTION public.request_contract_cancellation(p_contract uuid,p_customer uuid,p_message text,p_request uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.contracts%ROWTYPE; ticket uuid; payer uuid;
BEGIN
 -- Share the job lock used by payment-release claims. A release already
 -- claimed may complete; a cancellation never fabricates a refund.
 PERFORM 1 FROM public.jobs WHERE id=(SELECT job_id FROM public.contracts WHERE id=p_contract) FOR UPDATE;
 SELECT * INTO c FROM public.contracts WHERE id=p_contract FOR UPDATE;
 SELECT payer_user_id INTO payer FROM public.jobs WHERE id=c.job_id;
 IF c.id IS NULL OR (p_customer IS DISTINCT FROM c.homeowner_id AND p_customer IS DISTINCT FROM payer) THEN RAISE EXCEPTION 'Contract access denied' USING ERRCODE='42501'; END IF;
 ticket:=public.create_support_case(p_customer,NULL,'Cancellation notice: '||coalesce(c.title,c.id::text),p_message,'cancellation','urgent',c.job_id,p_request);
 UPDATE public.contracts SET cancellation_requested_at=coalesce(cancellation_requested_at,now()) WHERE id=c.id;
 UPDATE public.escrow_transactions SET admin_hold_status='pending_review',updated_at=now() WHERE job_id=c.job_id AND status='held';
 INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
 SELECT 'cancellation:'||c.id||':'||p.id,p.id,p.email,'email','Cancellation notice received',
  'Contract: '||c.id||E'\nReceived at: '||now()||E'\n\n'||p_message||E'\n\nThis acknowledges the notice. Any payment adjustment will be reviewed separately; this is not confirmation of a refund. Case: '||ticket,'/support'
 FROM public.profiles p WHERE p.id IN (c.contractor_id,p_customer) ON CONFLICT(event_key) DO NOTHING;
 RETURN ticket;
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('assign_support_cases','create_support_case','reply_support_case','record_contract_consent','sign_contract_with_consent','guard_contract_consent','guard_customer_work_start','request_contract_cancellation','guard_cancellation_payment_release') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  IF f.signature::text NOT LIKE '%guard_%' AND f.signature::text NOT LIKE '%record_contract_consent%' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature); END IF;
 END LOOP;
END $$;


CREATE FUNCTION public.send_formed_agreement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE doc text; choices text;
BEGIN
 IF NEW.status='accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
  SELECT body INTO STRICT doc FROM public.customer_policy_documents WHERE version='2026-11-03';
  SELECT jsonb_pretty(jsonb_agg(to_jsonb(c))) INTO choices FROM public.contract_consents c WHERE contract_id=NEW.id;
  INSERT INTO public.customer_communication_outbox(event_key,recipient_id,recipient_email,channel,subject,body,action_url)
   SELECT 'agreement-formed:'||NEW.id||':'||p.id,p.id,p.email,'email','Your signed Mintenance agreement and cancellation information',
    'Agreement formed: '||NEW.agreement_formed_at||E'\nCancellation deadline (exclusive): '||NEW.cancellation_deadline||E'\n\nSigned agreement:\n'||jsonb_pretty(public.contract_review_snapshot(NEW.id))||E'\n\nRecorded choices:\n'||coalesce(choices,'[]')||E'\n\n'||doc,'/jobs/'||NEW.job_id
   FROM public.profiles p WHERE p.id IN (NEW.homeowner_id,NEW.contractor_id,(SELECT payer_user_id FROM public.jobs WHERE id=NEW.job_id)) ON CONFLICT(event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.send_formed_agreement() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER send_formed_agreement AFTER UPDATE OF status ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.send_formed_agreement();

-- Prevent a linked proposal from silently rewriting an already signed agreement.
CREATE FUNCTION public.freeze_signed_proposal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE changed boolean;
BEGIN
 changed:=TG_OP='DELETE';
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='contractor_quotes' THEN
   changed:=(to_jsonb(NEW)-ARRAY['updated_at','status','accepted_at','viewed_at','sent_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','status','accepted_at','viewed_at','sent_at']);
  ELSE
   changed:=ROW(NEW.quote_id,NEW.message,NEW.description,NEW.amount) IS DISTINCT FROM ROW(OLD.quote_id,OLD.message,OLD.description,OLD.amount);
  END IF;
 END IF;
 IF changed AND EXISTS(SELECT 1 FROM public.contracts c LEFT JOIN public.bids b ON b.id::text=c.terms->>'bid_id' AND b.job_id=c.job_id AND b.contractor_id=c.contractor_id
   WHERE (c.homeowner_signed_at IS NOT NULL OR c.contractor_signed_at IS NOT NULL) AND
   CASE WHEN TG_TABLE_NAME='contractor_quotes' THEN coalesce(c.quote_id,b.quote_id)=OLD.id ELSE b.id=OLD.id END) THEN
  RAISE EXCEPTION 'Signed proposal is immutable; agree a new contract revision' USING ERRCODE='23514';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.freeze_signed_proposal() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER freeze_signed_quote BEFORE UPDATE OR DELETE ON public.contractor_quotes FOR EACH ROW EXECUTE FUNCTION public.freeze_signed_proposal();
CREATE TRIGGER freeze_signed_bid BEFORE UPDATE OR DELETE ON public.bids FOR EACH ROW EXECUTE FUNCTION public.freeze_signed_proposal();

INSERT INTO public.customer_policy_documents(version,body,sha256) VALUES('2026-11-03','Mintenance customer terms
Version 2026-11-03
Effective 3 November 2026

1. Who we are
Mintenance is operated by MINTENANCE LTD, company number 16542104, registered in England and Wales. Our registered office is Suite 2 J2 Business Park, Bridge Hall Lane, Bury, England, BL9 7NY. Contact us at admin@mintenance.co.uk. These terms cover our website and mobile apps.

2. Our service and your work agreement
Mintenance connects homeowners and other property customers with independent contractors and provides tools for quotes, job agreements, messages, payments and reviews. The contractor identified in your job agreement is responsible for carrying out the work. Mintenance is responsible for the platform services it provides.

Before agreeing to work, check the contractor''s identity, the scope, materials, total price including applicable taxes, payment stages, start date and completion arrangements. The job agreement should record those details and any cancellation information. Changes to the work or price must be agreed by both parties before the changed work is undertaken. A contractor''s independent status does not remove our responsibility for our own acts or promises.

Accepting a bid selects a contractor and starts preparation of the job agreement. The platform records the job agreement as accepted when the required parties have signed it. You can review the scope, total price and cancellation information before signing.

3. Accounts and safe use
You must be at least 18 and authorised to arrange the work. Provide accurate details, protect your sign-in information and tell us promptly about suspected misuse. Do not upload unlawful material, harass others, manipulate reviews, impersonate another person or interfere with the platform. We may restrict access for a proportionate security, safety or legal reason and explain the reason where it is lawful and safe to do so.

Customers must have authority to grant access and should tell the contractor about relevant hazards and access restrictions. Contractors must maintain the qualifications, registrations, permissions and insurance required for the work they undertake.

4. Prices and fees
There is no homeowner job-listing fee. The price and payment stages for the work are shown in the job agreement and payment screen. Any optional paid platform service must be separately selected and priced before purchase.

The current contractor platform commission is 12% for Free/Basic, 8% for Professional and 5% for Business/Enterprise, subject to any expressly agreed and displayed founding-member arrangement. Each payment has a minimum commission of 50p, capped at the payment amount, with no general maximum commission. The commission is deducted from the contractor''s payment; the reviewed settlement flow does not additionally deduct Stripe processing fees from the contractor. For example, a £100 payment leaves £88, £92 or £95 after the corresponding platform commission. Confirm the applicable total, tax treatment and tier before accepting a job.

A subscription, where offered, is a separate purchase with its own price, billing frequency, renewal and cancellation information. These job-payment terms do not authorise an undisclosed recurring charge.

5. Payments, release and bank payouts
Payments are processed through Stripe. Contractors receiving payments must complete the applicable Stripe connected-account onboarding and terms. A payment may require bank authentication such as 3D Secure. We do not treat a failed, cancelled or unfinished authentication as a successful payment.

A successful payment and a payment released to a contractor are different stages. The platform records the payment and applies the job''s release conditions before instructing a transfer. Contractor bank arrival then depends on Stripe''s payout process and the receiving bank. A release confirmation is not a promise of immediate bank receipt.

Normally, homeowner approval is followed by a 48-hour platform release hold. Where offered, the owning homeowner can expressly choose to approve and release immediately, waiving that platform hold. This does not waive statutory cancellation rights or rights relating to defective work.

Where automatic release is enabled for a job, it depends on the displayed eligibility date and applicable completion, evidence, dispute and risk checks. The seven-day automatic-approval timer is an eligibility condition, not an unconditional promise of a bank payout. An active dispute, security review, payment-provider restriction or other unresolved release condition can delay release. Raise concerns through the job and contact us promptly so we can investigate the payment status.

This process does not provide an independent guarantee of workmanship, insurance cover or a guarantee that every loss can be refunded. Your statutory and card-provider rights remain available.

6. Cancellation rights
If you enter a qualifying distance or off-premises service contract as a consumer, you will generally have 14 days after the day the contract is made to cancel without giving a reason. Tell the contractor clearly before the deadline and copy Mintenance so the payment can be reviewed. You can use the form below, but you do not have to use it.

If you expressly request a service to start during that period and the required information has been supplied, you may have to pay a proportionate amount for the service supplied before you cancel. Starting work does not by itself remove the cancellation right. The right may end on full performance only where the required prior request/consent and acknowledgement have been obtained. An urgent repair specifically requested by you can have a limited exception; additional services or goods outside the requested repair may still have cancellation rights.

Separate rules can apply to goods, bespoke materials and mixed work-and-material contracts. The contractor must explain applicable arrangements before you agree. Outside statutory cancellation rights, any cancellation charge must have been fairly and clearly agreed and must not remove your legal rights.

7. Problems, refunds and complaints
Contact the contractor through the job if work is late, incomplete, unsafe or not as agreed. Contact Mintenance at admin@mintenance.co.uk with the job reference, the problem and your requested outcome if you need help. Do not include full card details or account passwords.

We can review the available records, seek information from both parties, and administer payment holds, releases or refunds within our role and applicable rules. Our internal decision does not prevent you using a court, an applicable independent dispute process or your payment provider. An internal reporting or review deadline does not shorten statutory rights.

Where a refund is agreed or required, we will explain the amount and whether it has been submitted, is pending, has succeeded or has failed. An accepted refund request is not proof that the money has reached your bank. Processing and bank times vary; any statutory deadline still applies. Where money has already been transferred or a card dispute is open, recovery may require additional review. We will not issue duplicate refunds for the same amount.

Consumers retain their rights to services carried out with reasonable care and skill, and applicable remedies such as repeat performance or a price reduction. We will provide an update on your complaint and explain the next step; any published response target will reflect the support coverage we actually provide.

8. Checks, reviews and AI tools
A verification badge describes only the checks identified for that badge, at the recorded time. It is not a guarantee of future conduct or workmanship. Check suitability for your specific work and ask the contractor for relevant current evidence. Reviews must reflect genuine experience; disclose any incentive or relationship that could affect them.

Any AI-generated estimate or image-based suggestion is indicative and may be wrong. It is not a professional survey, safety certification or emergency service. Get an appropriately qualified professional''s assessment before relying on a diagnosis or undertaking safety-critical work. Do not use the app to delay contacting the emergency services where there is immediate danger.

9. Your content and personal information
You retain rights in the content you upload. You permit us to store, display and process it as needed to provide the requested platform service, administer the job, protect users and meet applicable obligations. This clause does not grant an unrestricted right to use private job photographs in advertising. Marketing or model-training use needs its own appropriate permission and legal basis.

Our privacy notice explains the personal information we use, recipients, retention and your rights. Privacy and deletion requests can be sent to admin@mintenance.co.uk. Some records may need to be retained for a stated lawful reason; we will assess a request individually and explain the outcome. Keeping a financial record does not justify keeping every item of account data indefinitely.

10. Our responsibility to you
We are responsible for foreseeable loss or damage caused by our breach of these terms or failure to use reasonable care and skill in providing our services. We do not exclude liability for death or personal injury caused by our negligence, fraud, fraudulent misrepresentation or any liability that cannot lawfully be limited. The contractor remains responsible for the work it supplies. Nothing here removes a consumer''s statutory rights.

These consumer terms do not impose a blanket customer indemnity or cap our liability at fees paid. Business-customer and contractor-specific liability provisions, if needed, should be agreed separately and must be lawful and fair.

11. Ending use and changes
You may stop using Mintenance and request account closure. Existing work, payments, complaints and lawful recordkeeping will need to be dealt with appropriately. Account closure and a request to erase personal information are separate processes. We will not treat an unresolved payment as an automatic reason to refuse every privacy request.

We will give reasonable notice of material changes to these terms and obtain agreement where required. A later change will not retrospectively alter an already agreed job price or remove accrued rights. During beta, access is limited to invited users; being invited does not mean the service is available to the general public.

12. Law and resolving disagreements
These terms use the law of England and Wales, subject to any mandatory consumer protections that apply where you live. They do not deprive a consumer of the right to bring a claim in a competent court in their home part of the United Kingdom. Please contact us first if you want us to try to resolve a complaint.

Early-start choices (optional and separate)
I expressly request that the contractor starts the agreed service before the end of my 14-day cancellation period. If I cancel after it starts, I understand that I may have to pay a proportionate amount for the service supplied before cancellation, where the law allows.

I understand that, once the service has been fully performed following my express request, I will lose the cancellation right where the legal conditions for this are met.

Cancellation notice (optional form)
To: [contractor name and contact], copied to admin@mintenance.co.uk
I give notice that I cancel my contract for the following service: [service]
Job/contract reference: [reference]
Date agreed: [date]
Customer name: [name]
Address: [address]
Date: [date]
Signature (only if sent on paper): [signature]
','34eeb746e0c0cf162ee19c21288a424eac32225c30e827fa05b6ba65cd09e210');
