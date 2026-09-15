-- Deploy together with request-local claim-token callers.
-- Internal owner calls remain available to the fenced acquisition wrapper.
REVOKE ALL ON FUNCTION public.try_claim_idempotency_key(text,text,uuid,jsonb,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.try_claim_idempotency_key(text,text,uuid,jsonb,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.try_claim_bound_idempotency_key(text,text,uuid,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.complete_idempotency_claim(text,text,jsonb,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.release_idempotency_claim(text,text) FROM PUBLIC,anon,authenticated,service_role;
