-- Settlement and its durable in-app notifications/audit record commit together.
CREATE OR REPLACE FUNCTION public.notify_admin_refund_settlement() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE e public.escrow_transactions;
BEGIN
 IF NEW.initiated_by IS NULL OR NEW.state<>'succeeded' OR OLD.state='succeeded' THEN RETURN NEW; END IF;
 SELECT * INTO STRICT e FROM public.escrow_transactions WHERE id=NEW.escrow_id;
 INSERT INTO public.notifications(user_id,title,message,type,action_url,metadata)
 SELECT recipient,'Refund confirmed',
  'An administrator confirmed a refund of GBP '||(NEW.gross_minor/100.0)::numeric(10,2)::text||
  '. Card refund: GBP '||(NEW.cash_minor/100.0)::numeric(10,2)::text||
  '; account credit returned: GBP '||(NEW.credit_minor/100.0)::numeric(10,2)::text||'.',
  'payment','/payments/'||e.id::text,
  jsonb_build_object('escrowTransactionId',e.id,'refundOperationId',NEW.id,'jobId',e.job_id)
 FROM (SELECT DISTINCT unnest(ARRAY[e.payer_id,e.payee_id]) AS recipient) recipients
 WHERE recipient IS NOT NULL;
 INSERT INTO public.audit_logs(user_id,action,table_name,record_id,new_values)
 VALUES(NEW.initiated_by,'UPDATE','escrow_transactions',e.id,
  jsonb_build_object('event','ADMIN_ESCROW_REFUND','operation_id',NEW.id,'payer_id',NEW.actor_id,'refund_amount',NEW.gross_minor/100.0,
   'cash_amount',NEW.cash_minor/100.0,'credit_returned',NEW.credit_minor/100.0,'reason',NEW.reason));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_admin_refund_settlement() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER notify_admin_refund_settlement AFTER UPDATE OF state ON public.escrow_refund_operations
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_refund_settlement();
