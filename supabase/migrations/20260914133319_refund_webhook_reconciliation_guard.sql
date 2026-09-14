-- Freeze ledger-backed funds when an external provider refund has no local operation.
CREATE FUNCTION public.flag_escrow_refund_review(p_escrow_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_job uuid;
BEGIN
 SELECT job_id INTO v_job FROM public.escrow_transactions WHERE id=p_escrow_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Escrow not found' USING ERRCODE='23514'; END IF;
 PERFORM 1 FROM public.jobs WHERE id=v_job FOR UPDATE;
 PERFORM 1 FROM public.escrow_transactions WHERE id=p_escrow_id FOR UPDATE;
 UPDATE public.escrow_refund_balances SET needs_review=true WHERE escrow_id=p_escrow_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Refund balance not found' USING ERRCODE='23514'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.flag_escrow_refund_review(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.flag_escrow_refund_review(uuid) TO service_role;
