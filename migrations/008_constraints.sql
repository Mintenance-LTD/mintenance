-- 008_constraints.sql
-- Purpose: Add unique/business constraints to prevent duplicates.

BEGIN;

-- service_routes: unique per contractor/date/name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='service_routes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname='uq_routes_contractor_date_name'
    ) THEN
      EXECUTE 'ALTER TABLE public.service_routes
               ADD CONSTRAINT uq_routes_contractor_date_name
               UNIQUE (contractor_id, route_date, route_name)';
    END IF;
  END IF;
END $$;

COMMIT;

