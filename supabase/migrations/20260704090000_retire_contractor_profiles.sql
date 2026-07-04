-- Retire the contractor_profiles shadow table (2026-07-04 tech-debt Phase 3).
--
-- Live-verified before drop: 0 rows in production; no inbound FKs, views,
-- or triggers. Every column has a canonical home:
--   stripe_* flags        -> profiles.stripe_connect_account_id / stripe_*
--   subscription_status   -> profiles.subscription_status
--   subscription_tier     -> contractor_subscriptions.plan_type (tier truth)
--   hourly_rate           -> profiles.hourly_rate
-- Stripe webhook handlers now sync contractor_subscriptions directly
-- (the old writes here filtered on a user_id column this table never had,
-- so they errored silently on every event).

-- 1. delete_user_data: drop the contractor_profiles DELETE. The row (when
--    one existed) was already covered by the PK's ON DELETE CASCADE from
--    profiles(id); after the table drop the explicit DELETE would error.
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_role TEXT;
  rec RECORD;
  v_owner_tables TEXT[] := ARRAY[
    'contracts',
    'contractor_payout_transfers',
    'job_tips',
    'leases',
    'maintenance_tickets',
    'organizations',
    'ticket_updates',
    'property_team_members',
    'property_tenants'
  ];
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;

  BEGIN
    PERFORM public.log_gdpr_activity(p_user_id, 'data_deletion', 'profiles', p_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  DELETE FROM public.messages
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  DELETE FROM public.refresh_tokens WHERE user_id = p_user_id;
  DELETE FROM public.dsr_requests WHERE user_id = p_user_id;

  IF v_role = 'contractor' THEN
    DELETE FROM public.bids WHERE contractor_id = p_user_id;
    UPDATE public.jobs
       SET contractor_id = NULL,
           status = CASE
             WHEN status IN ('assigned', 'in_progress') THEN 'posted'
             ELSE status
           END,
           assigned_at = CASE
             WHEN status IN ('assigned', 'in_progress') THEN NULL
             ELSE assigned_at
           END,
           started_at = CASE
             WHEN status IN ('assigned', 'in_progress') THEN NULL
             ELSE started_at
           END,
           updated_at = NOW()
     WHERE contractor_id = p_user_id;
    DELETE FROM public.contractor_payout_transfers WHERE contractor_id = p_user_id;
    DELETE FROM public.contracts WHERE contractor_id = p_user_id;
  ELSE
    DELETE FROM public.contracts
      WHERE job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = p_user_id);
    DELETE FROM public.refunds
      WHERE job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = p_user_id);
    DELETE FROM public.bids
      WHERE job_id IN (SELECT id FROM public.jobs WHERE homeowner_id = p_user_id);
    DELETE FROM public.jobs WHERE homeowner_id = p_user_id;
    DELETE FROM public.properties WHERE owner_id = p_user_id;

    DELETE FROM public.contracts WHERE homeowner_id = p_user_id;
    DELETE FROM public.leases WHERE tenant_user_id = p_user_id;
    DELETE FROM public.maintenance_tickets WHERE reported_by = p_user_id;
    DELETE FROM public.ticket_updates WHERE author_id = p_user_id;
    DELETE FROM public.organizations WHERE created_by = p_user_id;
    DELETE FROM public.property_team_members WHERE user_id = p_user_id;
    DELETE FROM public.property_tenants WHERE user_id = p_user_id;
    DELETE FROM public.job_tips WHERE payer_id = p_user_id OR payee_id = p_user_id;
  END IF;

  FOR rec IN
    SELECT
      n.nspname || '.' || c.relname AS qualified_table,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class c     ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class refc  ON refc.oid = con.confrelid
    JOIN pg_namespace refn ON refn.oid = refc.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND refn.nspname = 'public'
      AND refc.relname = 'profiles'
      AND n.nspname = 'public'
      AND con.confdeltype IN ('a', 'r')
      AND a.attnotnull = false
      AND NOT (c.relname = ANY (v_owner_tables))
  LOOP
    EXECUTE format(
      'UPDATE %s SET %I = NULL WHERE %I = $1',
      rec.qualified_table, rec.column_name, rec.column_name
    ) USING p_user_id;
  END LOOP;

  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$function$;

-- 2. get_contractor_recommendations: hourly_rate was hardcoded NULL with a
--    "would need contractor_profiles" comment; profiles.hourly_rate is the
--    canonical column, so surface it.
CREATE OR REPLACE FUNCTION public.get_contractor_recommendations(p_job_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(contractor_id uuid, contractor_name text, rating numeric, total_jobs integer, distance_km numeric, hourly_rate numeric, availability_score integer)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  job_record RECORD;
BEGIN
  -- Get job details
  SELECT * INTO job_record FROM public.jobs WHERE id = p_job_id;

  RETURN QUERY
  SELECT
    u.id as contractor_id,
    CONCAT(u.first_name, ' ', u.last_name) as contractor_name,
    u.rating,
    u.total_jobs_completed as total_jobs,
    CASE
      WHEN job_record.latitude IS NOT NULL AND job_record.longitude IS NOT NULL THEN
        ST_Distance(
          ST_Point(u.longitude, u.latitude)::geography,
          ST_Point(job_record.longitude, job_record.latitude)::geography
        ) / 1000
      ELSE NULL
    END as distance_km,
    u.hourly_rate,
    CASE
      WHEN u.is_available THEN 100
      ELSE 0
    END as availability_score
  FROM public.profiles u
  WHERE
    u.role = 'contractor'
    AND u.is_available = TRUE
    AND u.rating >= 3.0
    AND (
      job_record.latitude IS NULL OR job_record.longitude IS NULL OR
      ST_DWithin(
        ST_Point(u.longitude, u.latitude)::geography,
        ST_Point(job_record.longitude, job_record.latitude)::geography,
        50 * 1000 -- 50km radius
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.bids b
      WHERE b.job_id = p_job_id AND b.contractor_id = u.id
    )
  ORDER BY
    u.rating DESC,
    u.total_jobs_completed DESC,
    distance_km ASC
  LIMIT p_limit;
END;
$function$;

-- 3. Drop the table (0 rows; its 4 RLS policies drop with it).
DROP TABLE IF EXISTS public.contractor_profiles;
