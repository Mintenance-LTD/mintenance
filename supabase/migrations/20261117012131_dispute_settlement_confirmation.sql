-- The HTTP confirmation includes the principal, fee and recipients that were reviewed.
-- Reserve first under the existing job/payment locks, then compare inside the same
-- transaction. A stale confirmation rolls back the reservation before provider work.
CREATE FUNCTION public.reserve_confirmed_dispute_resolution(
 p_admin_id uuid,p_escrow_id uuid,p_decision text,p_reason text,p_fee_rate numeric,
 p_expected_principal integer,p_expected_fee_rate numeric,p_expected_payer uuid,p_expected_payee uuid
) RETURNS SETOF public.escrow_dispute_resolutions
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.escrow_dispute_resolutions; e public.escrow_transactions;
BEGIN
 SELECT * INTO r FROM public.reserve_dispute_resolution(p_admin_id,p_escrow_id,p_decision,p_reason,p_fee_rate);
 SELECT * INTO e FROM public.escrow_transactions WHERE id=p_escrow_id;
 IF r.id IS NULL OR r.principal_minor IS DISTINCT FROM p_expected_principal OR
    r.fee_rate IS DISTINCT FROM p_expected_fee_rate OR e.payer_id IS DISTINCT FROM p_expected_payer OR
    e.payee_id IS DISTINCT FROM p_expected_payee THEN
  RAISE EXCEPTION 'Settlement preview changed; review the current amounts and recipients' USING ERRCODE='23514';
 END IF;
 RETURN NEXT r;
END $$;
REVOKE ALL ON FUNCTION public.reserve_confirmed_dispute_resolution(uuid,uuid,text,text,numeric,integer,numeric,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_confirmed_dispute_resolution(uuid,uuid,text,text,numeric,integer,numeric,uuid,uuid) TO service_role;
