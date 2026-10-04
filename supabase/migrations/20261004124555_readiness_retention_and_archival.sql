BEGIN;

ALTER TABLE public.profiles ADD COLUMN contact_anonymized_at timestamptz;
COMMENT ON COLUMN public.profiles.contact_anonymized_at IS
  'Contact/profile presentation fields cleared after the recovery period. Not a claim that financial, identity or legal evidence has been erased.';
CREATE INDEX profiles_contact_retention_due_idx ON public.profiles(deleted_at, id)
  WHERE deleted_at IS NOT NULL AND contact_anonymized_at IS NULL;

-- No SECURITY DEFINER: only the backend service role can execute these jobs,
-- using its existing privileges. Never grant cleanup execution to app users.
CREATE FUNCTION public.profile_retention_blocked(actor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jobs j WHERE actor IN (j.homeowner_id, j.contractor_id, j.payer_user_id)
      AND j.status NOT IN ('completed', 'cancelled')
  ) OR EXISTS (
    SELECT 1 FROM public.escrow_transactions e WHERE actor IN (e.payer_id, e.payee_id)
      AND (e.status NOT IN ('released', 'refunded', 'completed', 'cancelled')
        OR coalesce(e.admin_hold_status, 'none') NOT IN ('none', 'released'))
  ) OR EXISTS (
    SELECT 1 FROM public.payments p WHERE actor IN (p.payer_id, p.payee_id)
      AND p.status NOT IN ('completed', 'refunded', 'cancelled')
  ) OR EXISTS (
    SELECT 1 FROM public.disputes d WHERE actor IN (d.raised_by, d.against)
      AND d.status NOT IN ('resolved', 'closed')
  ) OR EXISTS (
    -- Current signed contracts may still render identity from profiles. Defer
    -- those accounts to evidence review instead of destroying that identity.
    SELECT 1 FROM public.contracts c WHERE actor IN (c.homeowner_id, c.contractor_id)
      AND (c.status = 'accepted' OR c.homeowner_signed_at IS NOT NULL OR c.contractor_signed_at IS NOT NULL)
  );
$$;
REVOKE ALL ON FUNCTION public.profile_retention_blocked(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.profile_retention_blocked(uuid) TO service_role;

CREATE FUNCTION public.run_retention_cleanup()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE
  email_count integer := 0; reset_count integer := 0; login_count integer := 0;
  webhook_count integer := 0; profile_count integer := 0; deferred_count bigint := 0;
BEGIN
  -- email_history is optional in the current schema. The established email
  -- purge uses sent_at; an absent legacy table is an explicit no-op.
  IF to_regclass('public.email_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.email_history WHERE ctid IN
      (SELECT ctid FROM public.email_history WHERE sent_at < now() - interval ''180 days''
       ORDER BY sent_at LIMIT 500 FOR UPDATE SKIP LOCKED)';
    GET DIAGNOSTICS email_count = ROW_COUNT;
  END IF;

  DELETE FROM public.password_reset_tokens WHERE id IN (
    SELECT id FROM public.password_reset_tokens WHERE expires_at < now() - interval '7 days'
    ORDER BY expires_at, id LIMIT 500 FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  DELETE FROM public.login_attempts WHERE id IN (
    SELECT id FROM public.login_attempts WHERE created_at < now() - interval '90 days'
    ORDER BY created_at, id LIMIT 500 FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS login_count = ROW_COUNT;

  -- Keep successful event IDs/status forever until a separate financial
  -- retention policy is approved: deleting them can make replay look new.
  -- Pending/failed events retain the payload required for recovery.
  UPDATE public.webhook_events SET payload = '{}'::jsonb, error_message = NULL
  WHERE id IN (
    SELECT id FROM public.webhook_events
    WHERE status = 'processed' AND processed_at < now() - interval '7 days'
      AND created_at < now() - interval '7 days'
      AND (payload <> '{}'::jsonb OR error_message IS NOT NULL)
    ORDER BY processed_at, id LIMIT 500 FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS webhook_count = ROW_COUNT;

  UPDATE public.profiles SET
    email = 'deleted_' || id::text || '@deleted.invalid', first_name = 'Deleted', last_name = 'User',
    phone = NULL, address = NULL, business_address = NULL, postcode = NULL,
    city = NULL, country = NULL, location = NULL, latitude = NULL, longitude = NULL,
    location_point = NULL, bio = NULL, company_name = NULL, profile_image_url = NULL,
    avatar_url = NULL, cover_photo_url = NULL, portfolio_images = '{}',
    settings = '{}'::jsonb, notification_preferences = '{}'::jsonb,
    is_available = false, is_visible_on_map = false, contact_anonymized_at = now()
  WHERE id IN (
    SELECT id FROM public.profiles
    WHERE deleted_at < now() - interval '90 days' AND contact_anonymized_at IS NULL
      AND NOT public.profile_retention_blocked(id)
    ORDER BY deleted_at, id LIMIT 500 FOR UPDATE SKIP LOCKED);
  GET DIAGNOSTICS profile_count = ROW_COUNT;
  SELECT count(*) INTO deferred_count FROM public.profiles
    WHERE deleted_at < now() - interval '90 days' AND contact_anonymized_at IS NULL
      AND public.profile_retention_blocked(id);

  RETURN jsonb_build_object('email_history_deleted', email_count,
    'reset_tokens_deleted', reset_count, 'login_attempts_deleted', login_count,
    'webhook_payloads_redacted', webhook_count, 'profile_contacts_anonymized', profile_count,
    'profiles_deferred_for_review', deferred_count,
    'processed', email_count + reset_count + login_count + webhook_count + profile_count);
END;
$$;
REVOKE ALL ON FUNCTION public.run_retention_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_retention_cleanup() TO service_role;

CREATE INDEX jobs_retention_archive_due_idx ON public.jobs(updated_at, id)
  WHERE archived_at IS NULL AND deleted_at IS NULL AND status IN ('completed', 'cancelled');
CREATE FUNCTION public.archive_old_records(months_threshold integer DEFAULT 12, batch_size integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE archived_count integer; cutoff timestamptz;
BEGIN
  IF months_threshold IS NULL OR months_threshold < 12 OR months_threshold > 120
    OR batch_size IS NULL OR batch_size < 1 OR batch_size > 500 THEN
    RAISE EXCEPTION 'Archival requires 12-120 months and a batch of 1-500' USING ERRCODE = '22023';
  END IF;
  cutoff := now() - make_interval(months => months_threshold);
  -- In-place archival preserves all foreign keys and evidence. It is not an
  -- erasure operation and never deletes jobs, payment ledgers or signed data.
  WITH candidates AS MATERIALIZED (
    SELECT j.id FROM public.jobs j
    WHERE j.status IN ('completed', 'cancelled') AND j.archived_at IS NULL AND j.deleted_at IS NULL
      AND j.created_at < cutoff AND j.updated_at < cutoff
      AND (j.completed_at IS NULL OR j.completed_at < cutoff)
      AND NOT EXISTS (SELECT 1 FROM public.disputes d WHERE d.job_id = j.id AND d.status NOT IN ('resolved', 'closed'))
      AND NOT EXISTS (SELECT 1 FROM public.escrow_transactions e WHERE e.job_id = j.id
        AND (e.status NOT IN ('released', 'refunded', 'completed', 'cancelled')
          OR coalesce(e.admin_hold_status, 'none') NOT IN ('none', 'released')))
      AND NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.job_id = j.id
        AND p.status NOT IN ('completed', 'refunded', 'cancelled'))
    ORDER BY j.updated_at, j.id LIMIT batch_size FOR UPDATE OF j SKIP LOCKED)
  UPDATE public.jobs j SET archived_at = now() FROM candidates c WHERE j.id = c.id;
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN jsonb_build_object('archived', archived_count, 'processed', archived_count,
    'method', 'in_place', 'months_threshold', months_threshold);
END;
$$;
REVOKE ALL ON FUNCTION public.archive_old_records(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_old_records(integer, integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
