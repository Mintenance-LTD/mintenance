-- Audit acceptance snapshot. Read-only: no customer rows, mutations or RPC execution.
-- Client-access flags should be false for trusted-server-only state;
-- service_execute should remain true for the intended server callers.
SELECT json_build_object(
  'profile_role_update', has_column_privilege('authenticated','public.profiles','role','UPDATE'),
  'client_escrow_status_insert', has_column_privilege('authenticated','public.escrow_transactions','status','INSERT'),
  'client_escrow_amount_insert', has_column_privilege('authenticated','public.escrow_transactions','amount','INSERT'),
  'client_contract_signature_insert', has_column_privilege('authenticated','public.contracts','contractor_signed_at','INSERT'),
  'sensitive_rpcs', (
    SELECT json_agg(json_build_object(
      'signature', p.oid::regprocedure::text,
      'anon_execute', has_function_privilege('anon',p.oid,'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'service_execute', has_function_privilege('service_role',p.oid,'EXECUTE')
    ))
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'delete_user_data','accept_bid_atomic','try_claim_idempotency_key',
      'increment_contractor_contribution_stats','claim_contractor_contribution_milestone',
      'spend_user_credit','restore_user_credit','credit_payout_balance','create_dispute_atomic'
    )
  ),
  'postgres_default_grants', (
    SELECT json_agg(json_build_object('schema',n.nspname,'kind',d.defaclobjtype,'acl',d.defaclacl))
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
    WHERE pg_get_userbyid(d.defaclrole)='postgres' AND n.nspname='public'
  )
) AS authority_snapshot;

-- This snapshot complements, not replaces, behavioral tests. A future design
-- using constrained client RPCs must explicitly justify and test their grants.
-- Safe bid editing requires state-dependent tests rather than blanket revocation.
