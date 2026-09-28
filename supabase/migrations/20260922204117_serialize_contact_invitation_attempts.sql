CREATE UNIQUE INDEX property_tenants_active_email_unique ON public.property_tenants(property_id,lower(btrim(email)))
 WHERE is_active=true AND email IS NOT NULL AND btrim(email)<>'';
CREATE TABLE public.property_invitation_attempts (
 tenant_id uuid PRIMARY KEY REFERENCES public.property_tenants(id) ON DELETE CASCADE,
 attempt_id uuid NOT NULL, attempted_at timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN ('sending','sent','unknown')),
 finished_at timestamptz
);
ALTER TABLE public.property_invitation_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_invitation_attempts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.property_invitation_attempts TO service_role;
CREATE FUNCTION public.claim_property_invitation(p_tenant_id uuid,p_property_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE claimed uuid:=gen_random_uuid();
BEGIN
 PERFORM 1 FROM public.property_tenants WHERE id=p_tenant_id AND property_id=p_property_id
  AND is_active=true AND user_id IS NULL AND invitation_accepted_at IS NULL
  AND email IS NOT NULL AND invitation_token IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.property_invitation_attempts WHERE tenant_id=p_tenant_id
  AND attempted_at>clock_timestamp()-interval '15 minutes') THEN RETURN NULL; END IF;
 INSERT INTO public.property_invitation_attempts(tenant_id,attempt_id,attempted_at,status)
 VALUES(p_tenant_id,claimed,clock_timestamp(),'sending')
 ON CONFLICT(tenant_id) DO UPDATE SET attempt_id=excluded.attempt_id,attempted_at=excluded.attempted_at,status='sending',finished_at=NULL;
 RETURN claimed;
END $$;
CREATE FUNCTION public.finish_property_invitation(p_tenant_id uuid,p_attempt_id uuid,p_sent boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.property_invitation_attempts SET status=CASE WHEN p_sent THEN 'sent' ELSE 'unknown' END,finished_at=clock_timestamp()
 WHERE tenant_id=p_tenant_id AND attempt_id=p_attempt_id AND status='sending';
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_sent THEN UPDATE public.property_tenants SET invitation_sent_at=clock_timestamp() WHERE id=p_tenant_id; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_property_invitation(uuid,uuid),public.finish_property_invitation(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_property_invitation(uuid,uuid),public.finish_property_invitation(uuid,uuid,boolean) TO service_role;
