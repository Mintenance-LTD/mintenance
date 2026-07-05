-- get_contractor_recommendations declared distance_km numeric but returned
-- ST_Distance()/1000 (double precision) — 42804 at runtime on every call.
-- Pre-existing bug (identical expression in the original function body),
-- surfaced by the 2026-07-04 runtime verification; the function had never
-- been executable. Cast to numeric.
--
-- Applied live 2026-07-04 via MCP (recorded as this version); this file
-- keeps the repo in sync for other environments.
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
        (ST_Distance(
          ST_Point(u.longitude, u.latitude)::geography,
          ST_Point(job_record.longitude, job_record.latitude)::geography
        ) / 1000)::numeric
      ELSE NULL::numeric
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
