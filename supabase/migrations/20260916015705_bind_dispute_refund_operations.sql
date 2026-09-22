CREATE FUNCTION public.guard_dispute_refund_reservation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_dispute_resolutions;
BEGIN
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE escrow_id=NEW.escrow_id;
 IF FOUND AND (r.state<>'processing' OR r.refund_minor<=0 OR r.refund_operation_id IS NOT NULL OR
    NEW.request_key IS DISTINCT FROM 'dispute-resolution:'||r.id::text OR
    NEW.gross_minor<>r.refund_minor OR NEW.reason IS DISTINCT FROM r.reason OR NEW.initiated_by IS NULL) THEN
  RAISE EXCEPTION 'Refund conflicts with reserved dispute resolution' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_dispute_refund_reservation() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_dispute_refund_reservation BEFORE INSERT ON public.escrow_refund_operations
FOR EACH ROW EXECUTE FUNCTION public.guard_dispute_refund_reservation();

CREATE FUNCTION public.guard_dispute_release_reservation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_dispute_resolutions;
BEGIN
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE escrow_id=NEW.escrow_id;
 IF FOUND AND (r.state<>'processing' OR r.release_minor<=0 OR r.release_operation_id IS NOT NULL OR
    NEW.reason IS DISTINCT FROM 'dispute-resolution:'||r.id::text OR NEW.principal_minor<>r.release_minor OR
    (r.refund_minor>0 AND NOT EXISTS(SELECT FROM public.escrow_refund_operations o
      WHERE o.id=r.refund_operation_id AND o.escrow_id=r.escrow_id AND o.gross_minor=r.refund_minor AND o.state='succeeded'))) THEN
  RAISE EXCEPTION 'Release conflicts with reserved dispute resolution' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_dispute_release_reservation() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER guard_dispute_release_reservation BEFORE INSERT ON public.escrow_admin_release_operations
FOR EACH ROW EXECUTE FUNCTION public.guard_dispute_release_reservation();

CREATE FUNCTION public.reserve_dispute_refund(p_admin_id uuid,p_resolution_id uuid)
RETURNS SETOF public.escrow_refund_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_dispute_resolutions; e public.escrow_transactions; o public.escrow_refund_operations;
 job_key uuid; escrow_key uuid;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current administrator required' USING ERRCODE='42501'; END IF;
 SELECT d.escrow_id,et.job_id INTO escrow_key,job_key FROM public.escrow_dispute_resolutions d
 JOIN public.escrow_transactions et ON et.id=d.escrow_id WHERE d.id=p_resolution_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Resolution missing' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=escrow_key FOR UPDATE;
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE id=p_resolution_id FOR UPDATE;
 IF r.refund_operation_id IS NOT NULL THEN
  SELECT * INTO o FROM public.escrow_refund_operations WHERE id=r.refund_operation_id;
  IF NOT FOUND OR o.escrow_id<>e.id OR o.gross_minor<>r.refund_minor THEN
   RAISE EXCEPTION 'Linked refund requires reconciliation' USING ERRCODE='23514'; END IF;
  RETURN NEXT o; RETURN;
 END IF;
 IF r.state<>'processing' OR r.refund_minor<=0 OR e.status<>'disputed' THEN
  RAISE EXCEPTION 'Resolution not available for refund' USING ERRCODE='23514'; END IF;
 -- This temporary state cannot be observed outside the transaction. Failure
 -- rolls it back together with the operation and its resolution association.
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 SELECT * INTO o FROM public.reserve_admin_escrow_refund(p_admin_id,job_key,e.id,
  'dispute-resolution:'||r.id::text,r.refund_minor,r.reason);
 UPDATE public.escrow_dispute_resolutions SET refund_operation_id=o.id WHERE id=r.id;
 RETURN NEXT o;
END $$;
REVOKE ALL ON FUNCTION public.reserve_dispute_refund(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_dispute_refund(uuid,uuid) TO service_role;

CREATE FUNCTION public.reserve_dispute_release(p_admin_id uuid,p_resolution_id uuid)
RETURNS SETOF public.escrow_admin_release_operations LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_dispute_resolutions; e public.escrow_transactions; o public.escrow_admin_release_operations;
 job_key uuid; escrow_key uuid;
BEGIN
 PERFORM 1 FROM public.profiles WHERE id=p_admin_id AND role='admin' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current administrator required' USING ERRCODE='42501'; END IF;
 SELECT d.escrow_id,et.job_id INTO escrow_key,job_key FROM public.escrow_dispute_resolutions d
 JOIN public.escrow_transactions et ON et.id=d.escrow_id WHERE d.id=p_resolution_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Resolution missing' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=escrow_key FOR UPDATE;
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE id=p_resolution_id FOR UPDATE;
 IF r.release_operation_id IS NOT NULL THEN
  SELECT * INTO o FROM public.escrow_admin_release_operations WHERE id=r.release_operation_id;
  IF NOT FOUND OR o.escrow_id<>e.id OR o.principal_minor<>r.release_minor THEN
   RAISE EXCEPTION 'Linked release requires reconciliation' USING ERRCODE='23514'; END IF;
  RETURN NEXT o; RETURN;
 END IF;
 IF r.state<>'processing' OR r.release_minor<=0 OR
    (r.refund_minor=0 AND e.status<>'disputed') OR
    (r.refund_minor>0 AND (e.status<>'held' OR NOT EXISTS(
      SELECT FROM public.escrow_refund_operations f WHERE f.id=r.refund_operation_id
      AND f.escrow_id=e.id AND f.gross_minor=r.refund_minor AND f.state='succeeded'))) THEN
  RAISE EXCEPTION 'Resolution not available for release' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_transactions SET status='held' WHERE id=e.id;
 SELECT * INTO o FROM public.reserve_admin_escrow_release(p_admin_id,e.id,'dispute-resolution:'||r.id::text,r.fee_rate);
 IF o.id IS NULL OR o.principal_minor<>r.release_minor THEN
  RAISE EXCEPTION 'Release amount no longer matches resolution' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_dispute_resolutions SET release_operation_id=o.id WHERE id=r.id;
 RETURN NEXT o;
END $$;
REVOKE ALL ON FUNCTION public.reserve_dispute_release(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_dispute_release(uuid,uuid) TO service_role;

CREATE FUNCTION public.finalize_dispute_resolution(p_resolution_id uuid)
RETURNS SETOF public.escrow_dispute_resolutions LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_dispute_resolutions; e public.escrow_transactions; job_key uuid; escrow_key uuid;
BEGIN
 SELECT d.escrow_id,et.job_id INTO escrow_key,job_key FROM public.escrow_dispute_resolutions d
 JOIN public.escrow_transactions et ON et.id=d.escrow_id WHERE d.id=p_resolution_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Resolution missing' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.jobs WHERE id=job_key FOR UPDATE;
 SELECT * INTO e FROM public.escrow_transactions WHERE id=escrow_key FOR UPDATE;
 SELECT * INTO r FROM public.escrow_dispute_resolutions WHERE id=p_resolution_id FOR UPDATE;
 IF r.state='completed' THEN RETURN NEXT r; RETURN; END IF;
 IF (r.refund_minor>0 AND NOT EXISTS(SELECT FROM public.escrow_refund_operations f
      WHERE f.id=r.refund_operation_id AND f.escrow_id=e.id AND f.gross_minor=r.refund_minor AND f.state='succeeded')) OR
    (r.release_minor>0 AND NOT EXISTS(SELECT FROM public.escrow_admin_release_operations o
      WHERE o.id=r.release_operation_id AND o.escrow_id=e.id AND o.principal_minor=r.release_minor AND o.state='completed')) OR
    (r.release_minor>0 AND e.status<>'completed') OR (r.release_minor=0 AND e.status<>'refunded') OR
    EXISTS(SELECT FROM public.escrow_refund_balances WHERE escrow_id=e.id AND needs_review) THEN
  RAISE EXCEPTION 'Resolution settlement is not confirmed' USING ERRCODE='23514'; END IF;
 UPDATE public.disputes SET status='resolved',resolution=r.reason,resolved_at=now(),updated_at=now()
 WHERE id=r.dispute_id AND job_id=job_key AND status IN('open','under_review','escalated')
 AND EXISTS(SELECT FROM public.dispute_escrow_links l WHERE l.dispute_id=r.dispute_id AND l.escrow_id=e.id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Dispute changed; resolution requires reconciliation' USING ERRCODE='23514'; END IF;
 UPDATE public.escrow_dispute_resolutions SET state='completed',completed_at=now() WHERE id=r.id RETURNING * INTO r;
 UPDATE public.escrow_transactions SET admin_hold_status='released',release_blocked_reason=NULL,updated_at=now() WHERE id=e.id;
 INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
 SELECT recipient,'Dispute resolution confirmed','The administrator decision has completed. View the payment details for the confirmed refund and payout.',
 'payment','/disputes/'||e.id::text,jsonb_build_object('resolutionId',r.id,'escrowTransactionId',e.id,'jobId',job_key,
 'refundMinor',r.refund_minor,'releasePrincipalMinor',r.release_minor)
 FROM (SELECT DISTINCT unnest(ARRAY[e.payer_id,e.payee_id]) AS recipient) recipients WHERE recipient IS NOT NULL;
 INSERT INTO public.audit_logs(user_id,table_name,record_id,action,new_values)
 VALUES(r.initiated_by,'disputes',r.dispute_id,'UPDATE',jsonb_build_object('event','DISPUTE_RESOLUTION_CONFIRMED',
 'resolution_id',r.id,'decision',r.decision,'refund_minor',r.refund_minor,'release_principal_minor',r.release_minor));
 RETURN NEXT r;
END $$;
REVOKE ALL ON FUNCTION public.finalize_dispute_resolution(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_dispute_resolution(uuid) TO service_role;
