BEGIN;
-- Owner-confirmed tests retain their ledger history and have no customer exception alerts.
CREATE OR REPLACE FUNCTION public.claim_payment_reconciliation()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE selected_id uuid; selected_source jsonb; token uuid:=gen_random_uuid();
BEGIN
 -- Lock order agrees with acknowledgement: escrow then work row. SKIP LOCKED allows parallel runs.
 SELECT e.id INTO selected_id FROM public.escrow_transactions e
 LEFT JOIN public.payment_reconciliation_work w ON w.escrow_id=e.id
 WHERE e.payment_intent_id IS NOT NULL
 AND coalesce(e.metadata->>'reconciliation_exclusion','') <> 'confirmed_owner_test'
 AND (w.next_check_at IS NULL OR w.next_check_at<=clock_timestamp())
 AND (w.lease_until IS NULL OR w.lease_until<=clock_timestamp())
 ORDER BY w.last_checked_at ASC NULLS FIRST,e.created_at,e.id
 LIMIT 1 FOR UPDATE OF e SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 -- Recheck after the escrow lock: another claim may have committed after the SELECT snapshot.
 IF EXISTS(SELECT 1 FROM public.payment_reconciliation_work WHERE escrow_id=selected_id
 AND (lease_until>clock_timestamp() OR next_check_at>clock_timestamp())) THEN RETURN NULL; END IF;
 selected_source:=public.payment_reconciliation_source(selected_id);
 INSERT INTO public.payment_reconciliation_work(escrow_id,claim_token,lease_until,source)
 VALUES(selected_id,token,clock_timestamp()+interval '2 minutes',selected_source)
 ON CONFLICT(escrow_id) DO UPDATE SET claim_token=excluded.claim_token,
 lease_until=excluded.lease_until,source=excluded.source;
 RETURN jsonb_build_object('escrow_id',selected_id,'token',token,'source',selected_source);
END $function$
;
CREATE OR REPLACE FUNCTION public.finish_payment_reconciliation(p_escrow_id uuid, p_token uuid, p_outcome text, p_evidence jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE w public.payment_reconciliation_work%ROWTYPE; current_source jsonb; effective_outcome text;
BEGIN
 IF p_outcome IS NULL OR p_outcome NOT IN('matched','mismatch','missing','error')
 OR p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR octet_length(p_evidence::text)>4096 THEN
 RAISE EXCEPTION 'Invalid reconciliation result' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.escrow_transactions WHERE id=p_escrow_id
   AND metadata->>'reconciliation_exclusion'='confirmed_owner_test') THEN
   UPDATE public.payment_reconciliation_work SET claim_token=NULL,lease_until=NULL
     WHERE escrow_id=p_escrow_id AND claim_token=p_token;
   RETURN false;
 END IF;
 SELECT * INTO w FROM public.payment_reconciliation_work WHERE escrow_id=p_escrow_id FOR UPDATE;
 IF NOT FOUND OR w.claim_token IS DISTINCT FROM p_token OR p_token IS NULL
 OR w.lease_until<=clock_timestamp() THEN RETURN false; END IF;
 current_source:=public.payment_reconciliation_source(p_escrow_id);
 effective_outcome:=CASE WHEN current_source IS DISTINCT FROM w.source THEN 'stale' ELSE p_outcome END;
 UPDATE public.payment_reconciliation_work SET claim_token=NULL,lease_until=NULL,
 last_checked_at=clock_timestamp(),outcome=effective_outcome,evidence=p_evidence,
 next_check_at=clock_timestamp()+CASE WHEN effective_outcome='stale' THEN interval '1 minute'
 WHEN effective_outcome='error' THEN interval '15 minutes' ELSE interval '1 day' END
 WHERE escrow_id=p_escrow_id;
 IF effective_outcome IN('matched','mismatch','missing') THEN
 UPDATE public.escrow_transactions SET metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
 'reconciliation_flag',effective_outcome<>'matched','reconciliation_date',clock_timestamp(),
 'stripe_status',p_evidence->>'stripe_status','stripe_amount',p_evidence->'stripe_amount',
 'mismatch_type',CASE WHEN effective_outcome='missing' THEN 'missing' ELSE p_evidence->>'mismatch_type' END)
 WHERE id=p_escrow_id;
 END IF;
 -- A stale source must not be reported to callers as a confirmed financial result.
 RETURN effective_outcome<>'stale';
END $function$
;
COMMIT;
