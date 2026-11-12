-- Replace weekly availability atomically; serialize simultaneous edits per contractor.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '20s';
CREATE OR REPLACE FUNCTION public.replace_contractor_availability(p_contractor_id uuid, p_slots jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF (auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM p_contractor_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_contractor_id AND role = 'contractor') THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_slots IS NULL OR jsonb_typeof(p_slots) <> 'array' OR jsonb_array_length(p_slots) > 21 THEN
    RAISE EXCEPTION 'Invalid availability' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_slots) AS s(day_of_week integer, start_time text, end_time text, is_available boolean)
    WHERE day_of_week IS NULL OR day_of_week NOT BETWEEN 0 AND 6
       OR start_time IS NULL OR start_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
       OR end_time IS NULL OR end_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
       OR is_available IS DISTINCT FROM true
  ) THEN RAISE EXCEPTION 'Invalid availability' USING ERRCODE = '22023'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_slots) AS s(start_time time, end_time time)
    WHERE end_time <= start_time
  ) THEN RAISE EXCEPTION 'End time must follow start time' USING ERRCODE = '22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_contractor_id::text, 17031));
  DELETE FROM public.contractor_availability WHERE contractor_id = p_contractor_id;
  INSERT INTO public.contractor_availability(contractor_id, day_of_week, start_time, end_time, is_available)
  SELECT p_contractor_id, day_of_week, start_time, end_time, true
  FROM jsonb_to_recordset(p_slots) AS s(day_of_week integer, start_time time, end_time time);
END;
$$;
REVOKE ALL ON FUNCTION public.replace_contractor_availability(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_contractor_availability(uuid,jsonb) TO authenticated, service_role;
