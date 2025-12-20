-- 000_service_areas.sql
-- Purpose: Bootstrap service-area module (tables, indexes, RLS) safely.
-- Notes:
-- - Idempotent: guarded with IF NOT EXISTS and conditional policy creation
-- - Triggers are omitted here; 004_updated_at_trigger.sql standardizes them

BEGIN;

-- Required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core tables
CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_name VARCHAR(255) NOT NULL,
  description TEXT,
  area_type VARCHAR(50) DEFAULT 'radius' CHECK (area_type IN ('radius','polygon','postal_codes','cities')),

  -- Geographical data
  center_latitude DECIMAL(10,8),
  center_longitude DECIMAL(11,8),
  radius_km DECIMAL(8,2),
  boundary_coordinates JSONB,
  postal_codes TEXT[],
  cities TEXT[],

  -- Pricing and availability
  base_travel_charge DECIMAL(10,2) DEFAULT 0.00,
  per_km_rate DECIMAL(8,2) DEFAULT 0.00,
  minimum_job_value DECIMAL(10,2) DEFAULT 0.00,
  priority_level INTEGER DEFAULT 1 CHECK (priority_level BETWEEN 1 AND 5),

  -- Service availability
  is_primary_area BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  max_distance_km DECIMAL(8,2),
  response_time_hours INTEGER DEFAULT 24,

  -- Business rules
  weekend_surcharge DECIMAL(5,2) DEFAULT 0.00,
  evening_surcharge DECIMAL(5,2) DEFAULT 0.00,
  emergency_available BOOLEAN DEFAULT FALSE,
  emergency_surcharge DECIMAL(5,2) DEFAULT 0.00,

  -- Scheduling preferences
  preferred_days TEXT[] DEFAULT '{"monday","tuesday","wednesday","thursday","friday"}',
  preferred_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00"}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_contractor_area_name UNIQUE(contractor_id, area_name)
);

CREATE TABLE IF NOT EXISTS public.service_area_coverage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_area_id UUID NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  client_location_lat DECIMAL(10,8),
  client_location_lng DECIMAL(11,8),
  calculated_distance DECIMAL(8,2),
  travel_time_minutes INTEGER,
  travel_charge DECIMAL(10,2),
  was_accepted BOOLEAN DEFAULT FALSE,
  decline_reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.area_landmarks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_area_id UUID NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,
  landmark_name VARCHAR(255) NOT NULL,
  landmark_type VARCHAR(50) DEFAULT 'reference' CHECK (landmark_type IN ('reference','boundary','exclusion')),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  radius_meters INTEGER DEFAULT 1000,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_routes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_name VARCHAR(255) NOT NULL,
  route_date DATE NOT NULL,
  estimated_duration_minutes INTEGER,
  total_distance_km DECIMAL(8,2),
  total_travel_cost DECIMAL(10,2),
  jobs JSONB DEFAULT '[]',
  waypoints JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned','active','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.area_performance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_area_id UUID NOT NULL REFERENCES public.service_areas(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_jobs INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  total_travel_time_hours DECIMAL(8,2) DEFAULT 0.00,
  average_travel_distance DECIMAL(8,2) DEFAULT 0.00,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  customer_satisfaction DECIMAL(3,2) DEFAULT 0.00,
  profitability_score DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_areas_contractor ON public.service_areas(contractor_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_active ON public.service_areas(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_areas_primary ON public.service_areas(is_primary_area) WHERE is_primary_area = TRUE;
CREATE INDEX IF NOT EXISTS idx_service_areas_location ON public.service_areas(center_latitude, center_longitude);

CREATE INDEX IF NOT EXISTS idx_coverage_service_area ON public.service_area_coverage(service_area_id);
CREATE INDEX IF NOT EXISTS idx_coverage_location ON public.service_area_coverage(client_location_lat, client_location_lng);
CREATE INDEX IF NOT EXISTS idx_coverage_accepted ON public.service_area_coverage(was_accepted);

CREATE INDEX IF NOT EXISTS idx_routes_contractor ON public.service_routes(contractor_id);
CREATE INDEX IF NOT EXISTS idx_routes_date ON public.service_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON public.service_routes(status);

CREATE INDEX IF NOT EXISTS idx_performance_area_period ON public.area_performance(service_area_id, period_start, period_end);

-- RLS enablement
ALTER TABLE IF EXISTS public.service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_area_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.area_landmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.service_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.area_performance ENABLE ROW LEVEL SECURITY;

-- RLS policies (create if table exists)
DO $$
BEGIN
  IF to_regclass('public.service_areas') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "sa_select_own" ON public.service_areas';
    EXECUTE 'DROP POLICY IF EXISTS "sa_modify_own" ON public.service_areas';
    EXECUTE 'CREATE POLICY "sa_select_own" ON public.service_areas
             FOR SELECT TO authenticated
             USING (contractor_id = auth.uid())';
    EXECUTE 'CREATE POLICY "sa_modify_own" ON public.service_areas
             FOR INSERT TO authenticated
             WITH CHECK (contractor_id = auth.uid())';
    EXECUTE 'CREATE POLICY "sa_update_own" ON public.service_areas
             FOR UPDATE TO authenticated
             USING (contractor_id = auth.uid())
             WITH CHECK (contractor_id = auth.uid())';
    EXECUTE 'CREATE POLICY "sa_delete_own" ON public.service_areas
             FOR DELETE TO authenticated
             USING (contractor_id = auth.uid())';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.service_area_coverage') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "sac_access" ON public.service_area_coverage';
    EXECUTE 'CREATE POLICY "sac_access" ON public.service_area_coverage
             FOR ALL TO authenticated
             USING (service_area_id IN (SELECT id FROM public.service_areas WHERE contractor_id = auth.uid()))
             WITH CHECK (service_area_id IN (SELECT id FROM public.service_areas WHERE contractor_id = auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.area_landmarks') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "al_access" ON public.area_landmarks';
    EXECUTE 'CREATE POLICY "al_access" ON public.area_landmarks
             FOR ALL TO authenticated
             USING (service_area_id IN (SELECT id FROM public.service_areas WHERE contractor_id = auth.uid()))
             WITH CHECK (service_area_id IN (SELECT id FROM public.service_areas WHERE contractor_id = auth.uid()))';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.service_routes') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "sr_select_own" ON public.service_routes';
    EXECUTE 'DROP POLICY IF EXISTS "sr_modify_own" ON public.service_routes';
    EXECUTE 'CREATE POLICY "sr_select_own" ON public.service_routes
             FOR SELECT TO authenticated
             USING (contractor_id = auth.uid())';
    EXECUTE 'CREATE POLICY "sr_insert_own" ON public.service_routes
             FOR INSERT TO authenticated
             WITH CHECK (contractor_id = auth.uid())';
    EXECUTE 'CREATE POLICY "sr_update_own" ON public.service_routes
             FOR UPDATE TO authenticated
             USING (contractor_id = auth.uid())
             WITH CHECK (contractor_id = auth.uid())';
    EXECUTE 'CREATE POLICY "sr_delete_own" ON public.service_routes
             FOR DELETE TO authenticated
             USING (contractor_id = auth.uid())';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.area_performance') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "ap_access" ON public.area_performance';
    EXECUTE 'CREATE POLICY "ap_access" ON public.area_performance
             FOR ALL TO authenticated
             USING (service_area_id IN (SELECT id FROM public.service_areas WHERE contractor_id = auth.uid()))
             WITH CHECK (service_area_id IN (SELECT id FROM public.service_areas WHERE contractor_id = auth.uid()))';
  END IF;
END $$;

-- Grants (safe to repeat)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_area_coverage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.area_landmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_routes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.area_performance TO authenticated;

-- Comments
COMMENT ON TABLE public.service_areas IS 'Geographical service coverage areas for contractors with pricing rules';
COMMENT ON TABLE public.service_area_coverage IS 'Historical tracking of service area usage and performance';
COMMENT ON TABLE public.area_landmarks IS 'Reference points and boundaries within service areas';
COMMENT ON TABLE public.service_routes IS 'Optimized travel routes for multi-job days';
COMMENT ON TABLE public.area_performance IS 'Analytics and performance metrics per service area';

COMMIT;

-- Notices
DO $$
BEGIN
  RAISE NOTICE '000_service_areas: base service-area module ensured';
END $$;
