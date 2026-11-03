-- Freeze customer-visible signed bid scope, including warranty, materials and dates.
CREATE OR REPLACE FUNCTION public.freeze_signed_proposal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE changed boolean;
BEGIN
 changed:=TG_OP='DELETE';
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='contractor_quotes' THEN
   changed:=(to_jsonb(NEW)-ARRAY['updated_at','status','accepted_at','viewed_at','sent_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','status','accepted_at','viewed_at','sent_at']);
  ELSE
   changed:=(to_jsonb(NEW)-ARRAY['updated_at','status','rejection_reason','suggested_price_range','competitiveness_score','pricing_recommendation_id','was_price_recommended','itemization_quality_score','bid_to_budget_ratio','within_typical_range']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','status','rejection_reason','suggested_price_range','competitiveness_score','pricing_recommendation_id','was_price_recommended','itemization_quality_score','bid_to_budget_ratio','within_typical_range']);
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
