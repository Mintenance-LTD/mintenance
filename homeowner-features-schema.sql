-- ==========================================================
-- Mintenance App – Homeowner Features Database Schema
-- ==========================================================
-- This migration adds database support for the new HomeScreen features:
-- 1. Job Progress & Milestones Tracking
-- 2. Home Investment & Expense Tracking  
-- 3. Enhanced Social Proof & Community Features
-- ==========================================================

-----------------------------------------------------------------
-- 1️⃣ JOB PROGRESS & MILESTONES TRACKING
-----------------------------------------------------------------

-- Job milestones table for detailed progress tracking
CREATE TABLE IF NOT EXISTS public.job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  sequence_order INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  target_date DATE,
  completed_date TIMESTAMPTZ,
  completion_notes TEXT,
  photo_urls JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job progress tracking with percentage completion
CREATE TABLE IF NOT EXISTS public.job_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  estimated_completion_date DATE,
  days_remaining INTEGER,
  last_activity_date TIMESTAMPTZ DEFAULT NOW(),
  contractor_notes TEXT,
  homeowner_notes TEXT,
  before_photos JSONB DEFAULT '[]',
  after_photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for job progress tracking
CREATE INDEX IF NOT EXISTS idx_job_milestones_job_id ON public.job_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_job_milestones_status ON public.job_milestones(status);
CREATE INDEX IF NOT EXISTS idx_job_progress_job_id ON public.job_progress(job_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_progress_unique_job ON public.job_progress(job_id);

-----------------------------------------------------------------
-- 2️⃣ HOME INVESTMENT & EXPENSE TRACKING  
-----------------------------------------------------------------

-- Home investment overview for homeowners
CREATE TABLE IF NOT EXISTS public.home_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_address TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(12,2),
  current_estimated_value DECIMAL(12,2),
  total_maintenance_spent DECIMAL(12,2) DEFAULT 0.00,
  total_improvement_spent DECIMAL(12,2) DEFAULT 0.00,
  annual_budget DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detailed expense tracking for homeowners
CREATE TABLE IF NOT EXISTS public.homeowner_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  home_investment_id UUID REFERENCES public.home_investments(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL, -- 'maintenance', 'improvement', 'emergency', 'preventive'
  subcategory VARCHAR(50), -- 'plumbing', 'electrical', 'hvac', etc.
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL,
  contractor_name VARCHAR(100),
  receipt_url TEXT,
  tax_deductible BOOLEAN DEFAULT FALSE,
  roi_impact DECIMAL(8,2), -- estimated property value increase
  money_saved_vs_big_company DECIMAL(8,2), -- comparison savings
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly budget tracking
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  budgeted_amount DECIMAL(10,2) NOT NULL,
  spent_amount DECIMAL(10,2) DEFAULT 0.00,
  category_breakdown JSONB DEFAULT '{}', -- JSON object with category spending
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for investment tracking
CREATE INDEX IF NOT EXISTS idx_home_investments_homeowner ON public.home_investments(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_expenses_homeowner ON public.homeowner_expenses(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_expenses_job ON public.homeowner_expenses(job_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_expenses_category ON public.homeowner_expenses(category);
CREATE INDEX IF NOT EXISTS idx_homeowner_expenses_date ON public.homeowner_expenses(expense_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_budgets_unique ON public.monthly_budgets(homeowner_id, year, month);

-----------------------------------------------------------------
-- 3️⃣ ENHANCED SOCIAL PROOF & COMMUNITY FEATURES
-----------------------------------------------------------------

-- Homeowner testimonials and success stories
CREATE TABLE IF NOT EXISTS public.homeowner_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  story_content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  cost_saved DECIMAL(8,2),
  project_photos JSONB DEFAULT '[]',
  is_featured BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  neighborhood VARCHAR(100),
  tags JSONB DEFAULT '[]', -- ['quick-response', 'budget-friendly', 'quality-work']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community recommendations and trending contractors
CREATE TABLE IF NOT EXISTS public.community_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(50) NOT NULL, -- 'trending', 'top_rated', 'most_responsive', 'budget_friendly'
  area VARCHAR(100), -- neighborhood or city area
  category VARCHAR(50), -- service category
  score DECIMAL(5,2) NOT NULL, -- algorithm-calculated score
  ranking_position INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metrics JSONB DEFAULT '{}', -- detailed metrics for ranking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Success story collections
CREATE TABLE IF NOT EXISTS public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  story_title VARCHAR(150) NOT NULL,
  challenge_description TEXT NOT NULL,
  solution_description TEXT NOT NULL,
  results_description TEXT NOT NULL,
  before_photos JSONB DEFAULT '[]',
  after_photos JSONB DEFAULT '[]',
  investment_amount DECIMAL(10,2),
  roi_achieved DECIMAL(8,2),
  project_duration_days INTEGER,
  is_featured BOOLEAN DEFAULT FALSE,
  category VARCHAR(50),
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for social proof features
CREATE INDEX IF NOT EXISTS idx_homeowner_testimonials_homeowner ON public.homeowner_testimonials(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_testimonials_contractor ON public.homeowner_testimonials(contractor_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_testimonials_featured ON public.homeowner_testimonials(is_featured, is_public);
CREATE INDEX IF NOT EXISTS idx_community_recommendations_contractor ON public.community_recommendations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_community_recommendations_area ON public.community_recommendations(area, category);
CREATE INDEX IF NOT EXISTS idx_success_stories_featured ON public.success_stories(is_featured, category);

-----------------------------------------------------------------
-- 4️⃣ ROW LEVEL SECURITY POLICIES
-----------------------------------------------------------------

-- Enable RLS on all new tables
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homeowner_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

-- Job milestones policies
CREATE POLICY "Job participants can view milestones" ON public.job_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = job_id 
      AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
  );

CREATE POLICY "Contractors can manage job milestones" ON public.job_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = job_id 
      AND jobs.contractor_id = auth.uid()
    )
  );

-- Job progress policies
CREATE POLICY "Job participants can view progress" ON public.job_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = job_id 
      AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
    )
  );

CREATE POLICY "Contractors can update job progress" ON public.job_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = job_id 
      AND jobs.contractor_id = auth.uid()
    )
  );

-- Home investment policies
CREATE POLICY "Homeowners can manage own investments" ON public.home_investments
  FOR ALL USING (homeowner_id = auth.uid());

CREATE POLICY "Homeowners can manage own expenses" ON public.homeowner_expenses
  FOR ALL USING (homeowner_id = auth.uid());

CREATE POLICY "Homeowners can manage own budgets" ON public.monthly_budgets
  FOR ALL USING (homeowner_id = auth.uid());

-- Social proof policies
CREATE POLICY "Users can view public testimonials" ON public.homeowner_testimonials
  FOR SELECT USING (is_public = TRUE OR homeowner_id = auth.uid());

CREATE POLICY "Homeowners can manage own testimonials" ON public.homeowner_testimonials
  FOR ALL USING (homeowner_id = auth.uid());

CREATE POLICY "Anyone can view community recommendations" ON public.community_recommendations
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can view public success stories" ON public.success_stories
  FOR SELECT USING (homeowner_id = auth.uid() OR contractor_id = auth.uid());

-----------------------------------------------------------------
-- 5️⃣ TRIGGERS & FUNCTIONS
-----------------------------------------------------------------

-- Function to auto-update progress percentage based on milestones
CREATE OR REPLACE FUNCTION update_job_progress_from_milestones()
RETURNS TRIGGER AS $$
DECLARE
  total_milestones INTEGER;
  completed_milestones INTEGER;
  new_percentage DECIMAL(5,2);
BEGIN
  -- Count total and completed milestones for this job
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_milestones, completed_milestones
  FROM public.job_milestones
  WHERE job_id = COALESCE(NEW.job_id, OLD.job_id);
  
  -- Calculate percentage
  new_percentage := CASE 
    WHEN total_milestones = 0 THEN 0 
    ELSE (completed_milestones::DECIMAL / total_milestones::DECIMAL) * 100 
  END;
  
  -- Update or insert job progress
  INSERT INTO public.job_progress (job_id, progress_percentage, last_activity_date)
  VALUES (COALESCE(NEW.job_id, OLD.job_id), new_percentage, NOW())
  ON CONFLICT (job_id) 
  DO UPDATE SET 
    progress_percentage = EXCLUDED.progress_percentage,
    last_activity_date = NOW(),
    updated_at = NOW();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job progress when milestones change
CREATE TRIGGER update_job_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.job_milestones
  FOR EACH ROW EXECUTE FUNCTION update_job_progress_from_milestones();

-- Function to update home investment totals
CREATE OR REPLACE FUNCTION update_home_investment_totals()
RETURNS TRIGGER AS $$
DECLARE
  maintenance_total DECIMAL(12,2);
  improvement_total DECIMAL(12,2);
BEGIN
  -- Calculate totals from expenses
  SELECT 
    COALESCE(SUM(CASE WHEN category IN ('maintenance', 'emergency') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'improvement' THEN amount ELSE 0 END), 0)
  INTO maintenance_total, improvement_total
  FROM public.homeowner_expenses
  WHERE home_investment_id = COALESCE(NEW.home_investment_id, OLD.home_investment_id);
  
  -- Update home investment totals
  UPDATE public.home_investments
  SET 
    total_maintenance_spent = maintenance_total,
    total_improvement_spent = improvement_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.home_investment_id, OLD.home_investment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update home investment totals when expenses change
CREATE TRIGGER update_home_investment_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.homeowner_expenses
  FOR EACH ROW EXECUTE FUNCTION update_home_investment_totals();

-- Update triggers for timestamps
CREATE TRIGGER update_job_milestones_updated_at BEFORE UPDATE ON public.job_milestones 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_progress_updated_at BEFORE UPDATE ON public.job_progress 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_home_investments_updated_at BEFORE UPDATE ON public.home_investments 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_homeowner_expenses_updated_at BEFORE UPDATE ON public.homeowner_expenses 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-----------------------------------------------------------------
-- 6️⃣ SAMPLE DATA FOR TESTING
-----------------------------------------------------------------

-- Insert sample job milestones for existing jobs
DO $$
DECLARE
  sample_job_id UUID;
BEGIN
  -- Get a sample job ID
  SELECT id INTO sample_job_id FROM public.jobs LIMIT 1;
  
  IF sample_job_id IS NOT NULL THEN
    -- Insert sample milestones
    INSERT INTO public.job_milestones (job_id, title, description, sequence_order, status, target_date) VALUES
    (sample_job_id, 'Planning', 'Initial planning and assessment', 1, 'completed', CURRENT_DATE - INTERVAL '5 days'),
    (sample_job_id, 'Materials', 'Source and order materials', 2, 'completed', CURRENT_DATE - INTERVAL '3 days'),
    (sample_job_id, 'Installation', 'Main installation work', 3, 'in_progress', CURRENT_DATE + INTERVAL '2 days'),
    (sample_job_id, 'Finishing', 'Final touches and cleanup', 4, 'pending', CURRENT_DATE + INTERVAL '5 days'),
    (sample_job_id, 'Inspection', 'Final inspection and handover', 5, 'pending', CURRENT_DATE + INTERVAL '7 days');
  END IF;
END $$;

-- Insert sample home investment data
DO $$
DECLARE
  sample_homeowner_id UUID;
  home_investment_id UUID;
BEGIN
  -- Get a sample homeowner ID
  SELECT id INTO sample_homeowner_id FROM public.users WHERE role = 'homeowner' LIMIT 1;
  
  IF sample_homeowner_id IS NOT NULL THEN
    -- Insert sample home investment
    INSERT INTO public.home_investments (homeowner_id, property_address, purchase_price, current_estimated_value, annual_budget)
    VALUES (sample_homeowner_id, '123 Main St, Anytown', 450000.00, 520000.00, 15000.00)
    RETURNING id INTO home_investment_id;
    
    -- Insert sample expenses
    INSERT INTO public.homeowner_expenses (homeowner_id, home_investment_id, category, subcategory, amount, description, expense_date, money_saved_vs_big_company) VALUES
    (sample_homeowner_id, home_investment_id, 'maintenance', 'plumbing', 850.00, 'Fixed leaking kitchen sink', CURRENT_DATE - INTERVAL '15 days', 200.00),
    (sample_homeowner_id, home_investment_id, 'improvement', 'electrical', 1200.00, 'Installed new lighting fixtures', CURRENT_DATE - INTERVAL '30 days', 350.00),
    (sample_homeowner_id, home_investment_id, 'maintenance', 'hvac', 450.00, 'AC tune-up and filter replacement', CURRENT_DATE - INTERVAL '45 days', 150.00);
  END IF;
END $$;

-----------------------------------------------------------------
-- 7️⃣ GRANT PERMISSIONS
-----------------------------------------------------------------

-- Grant permissions to authenticated users
GRANT ALL ON public.job_milestones TO authenticated;
GRANT ALL ON public.job_progress TO authenticated;
GRANT ALL ON public.home_investments TO authenticated;
GRANT ALL ON public.homeowner_expenses TO authenticated;
GRANT ALL ON public.monthly_budgets TO authenticated;
GRANT ALL ON public.homeowner_testimonials TO authenticated;
GRANT SELECT ON public.community_recommendations TO authenticated;
GRANT ALL ON public.success_stories TO authenticated;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION update_job_progress_from_milestones TO authenticated;
GRANT EXECUTE ON FUNCTION update_home_investment_totals TO authenticated;

-----------------------------------------------------------------
-- 8️⃣ COMMENTS & DOCUMENTATION
-----------------------------------------------------------------

COMMENT ON TABLE public.job_milestones IS 'Detailed milestone tracking for job progress visualization';
COMMENT ON TABLE public.job_progress IS 'Overall job progress tracking with percentage completion';
COMMENT ON TABLE public.home_investments IS 'Homeowner property investment tracking and ROI calculation';
COMMENT ON TABLE public.homeowner_expenses IS 'Detailed expense tracking for homeowner spending analysis';
COMMENT ON TABLE public.monthly_budgets IS 'Monthly budget planning and tracking for homeowners';
COMMENT ON TABLE public.homeowner_testimonials IS 'Homeowner success stories and contractor testimonials';
COMMENT ON TABLE public.community_recommendations IS 'Algorithm-driven contractor recommendations';
COMMENT ON TABLE public.success_stories IS 'Featured success stories for social proof';

-- ==========================================================
-- ✅ Migration Complete
-- This schema provides full database support for:
-- • Visual job progress tracking with milestones
-- • Home investment and expense tracking with ROI
-- • Enhanced social proof with testimonials and recommendations
-- ==========================================================