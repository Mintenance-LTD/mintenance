
ALTER FUNCTION public.calculate_distance_km(numeric, numeric, numeric, numeric)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.find_contractors_for_location(numeric, numeric, numeric)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.find_nearby_assessments(double precision, double precision, integer, integer)
  SET search_path = public, extensions, pg_temp;

ALTER FUNCTION public.is_location_in_service_area(uuid, numeric, numeric)
  SET search_path = public, extensions, pg_temp;
;
