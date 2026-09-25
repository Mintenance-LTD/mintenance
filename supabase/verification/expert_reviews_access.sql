-- Run with psql after the expert-review migration. Transactional, no persistent test data.
begin;
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.assessment_expert_reviews'::regclass) then
    raise exception 'Expert review RLS must be enabled';
  end if;
  if has_table_privilege('anon', 'public.assessment_expert_reviews', 'SELECT')
    or has_table_privilege('authenticated', 'public.assessment_expert_reviews', 'SELECT')
    or has_table_privilege('authenticated', 'public.assessment_expert_reviews', 'INSERT')
    or has_table_privilege('authenticated', 'public.assessment_expert_reviews', 'UPDATE')
    or has_table_privilege('authenticated', 'public.assessment_expert_reviews', 'DELETE') then
    raise exception 'Client roles must not access expert reference labels';
  end if;
  if not has_table_privilege('service_role', 'public.assessment_expert_reviews', 'SELECT')
    or not has_table_privilege('service_role', 'public.assessment_expert_reviews', 'INSERT')
    or has_table_privilege('service_role', 'public.assessment_expert_reviews', 'UPDATE')
    or has_table_privilege('service_role', 'public.assessment_expert_reviews', 'DELETE') then
    raise exception 'Server role should only append and read review revisions';
  end if;
end $$;
set local role authenticated;
do $$
begin
  begin
    perform * from public.assessment_expert_reviews;
    raise exception 'Unexpected client access';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
