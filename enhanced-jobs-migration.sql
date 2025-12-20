-- Enhanced Jobs Migration
-- Run this after the main database setup

-- Add enhanced fields to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- Create service_categories table for better organization
CREATE TABLE IF NOT EXISTS public.service_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create service_subcategories table
CREATE TABLE IF NOT EXISTS public.service_subcategories (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES public.service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert service categories
INSERT INTO public.service_categories (id, name, icon, color, display_order) VALUES
  ('plumbing', 'Plumbing', 'water-outline', '#007AFF', 1),
  ('electrical', 'Electrical', 'flash-outline', '#FF9500', 2),
  ('hvac', 'HVAC', 'thermometer-outline', '#4CD964', 3),
  ('general', 'General Maintenance', 'hammer-outline', '#5856D6', 4),
  ('appliance', 'Appliance Repair', 'home-outline', '#FF3B30', 5),
  ('landscaping', 'Landscaping', 'leaf-outline', '#34C759', 6)
ON CONFLICT (id) DO NOTHING;

-- Insert service subcategories
INSERT INTO public.service_subcategories (id, category_id, name, display_order) VALUES
  -- Plumbing
  ('plumbing_leaking', 'plumbing', 'Leaking', 1),
  ('plumbing_blocked', 'plumbing', 'Blocked Drain', 2),
  ('plumbing_install', 'plumbing', 'Installation', 3),
  ('plumbing_repair', 'plumbing', 'Repair', 4),
  ('plumbing_emergency', 'plumbing', 'Emergency', 5),
  
  -- Electrical
  ('electrical_wiring', 'electrical', 'Wiring', 1),
  ('electrical_outlet', 'electrical', 'Outlet Installation', 2),
  ('electrical_lighting', 'electrical', 'Lighting', 3),
  ('electrical_panel', 'electrical', 'Panel Upgrade', 4),
  ('electrical_emergency', 'electrical', 'Emergency', 5),
  
  -- HVAC
  ('hvac_ac_repair', 'hvac', 'AC Repair', 1),
  ('hvac_heating', 'hvac', 'Heating', 2),
  ('hvac_installation', 'hvac', 'Installation', 3),
  ('hvac_maintenance', 'hvac', 'Maintenance', 4),
  ('hvac_duct_cleaning', 'hvac', 'Duct Cleaning', 5),
  
  -- General Maintenance
  ('general_painting', 'general', 'Painting', 1),
  ('general_carpentry', 'general', 'Carpentry', 2),
  ('general_tiling', 'general', 'Tiling', 3),
  ('general_flooring', 'general', 'Flooring', 4),
  ('general_repairs', 'general', 'General Repairs', 5),
  
  -- Appliance Repair
  ('appliance_washing', 'appliance', 'Washing Machine', 1),
  ('appliance_refrigerator', 'appliance', 'Refrigerator', 2),
  ('appliance_dishwasher', 'appliance', 'Dishwasher', 3),
  ('appliance_oven', 'appliance', 'Oven', 4),
  ('appliance_other', 'appliance', 'Other', 5),
  
  -- Landscaping
  ('landscaping_lawn', 'landscaping', 'Lawn Care', 1),
  ('landscaping_tree', 'landscaping', 'Tree Service', 2),
  ('landscaping_garden', 'landscaping', 'Garden Design', 3),
  ('landscaping_irrigation', 'landscaping', 'Irrigation', 4),
  ('landscaping_cleanup', 'landscaping', 'Cleanup', 5)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_subcategory ON public.jobs(subcategory);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs(priority);
CREATE INDEX IF NOT EXISTS idx_jobs_category_status ON public.jobs(category, status);

-- Create jobs_photos table for better photo management (future enhancement)
CREATE TABLE IF NOT EXISTS public.jobs_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_categories (public read access)
CREATE POLICY "Anyone can view service categories" ON public.service_categories
  FOR SELECT USING (TRUE);

-- RLS Policies for service_subcategories (public read access)
CREATE POLICY "Anyone can view service subcategories" ON public.service_subcategories
  FOR SELECT USING (TRUE);

-- RLS Policies for jobs_photos
CREATE POLICY "Job owners can manage their job photos" ON public.jobs_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = job_id 
      AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can view job photos for visible jobs" ON public.jobs_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = job_id 
      AND (
        jobs.status = 'posted' OR 
        jobs.homeowner_id = auth.uid() OR 
        jobs.contractor_id = auth.uid()
      )
    )
  );

-- Update some sample jobs with new fields
UPDATE public.jobs 
SET 
  category = 'plumbing',
  subcategory = 'Leaking',
  priority = 'medium'
WHERE title LIKE '%Sink%' AND category IS NULL;

UPDATE public.jobs 
SET 
  category = 'general',
  subcategory = 'Tiling',
  priority = 'low'
WHERE title LIKE '%Tile%' AND category IS NULL;