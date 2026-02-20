-- Migration: Create contractor_expenses and contractor_training tables
-- These tables support the contractor Expenses and Training pages

-- ============================================================
-- Contractor Expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS contractor_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('materials', 'tools', 'fuel', 'software', 'insurance', 'marketing', 'other')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  payment_method TEXT DEFAULT 'card',
  receipt_storage_path TEXT,
  receipt_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_billable BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contractor_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractor manages own expenses"
  ON contractor_expenses FOR ALL
  USING (contractor_id = auth.uid());

CREATE INDEX idx_expenses_contractor ON contractor_expenses(contractor_id);
CREATE INDEX idx_expenses_date ON contractor_expenses(contractor_id, date DESC);
CREATE INDEX idx_expenses_category ON contractor_expenses(contractor_id, category);

-- ============================================================
-- Contractor Training
-- ============================================================
CREATE TABLE IF NOT EXISTS contractor_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  completion_date DATE NOT NULL,
  hours INTEGER NOT NULL DEFAULT 0 CHECK (hours >= 0),
  certificate_url TEXT,
  certificate_storage_path TEXT,
  category TEXT DEFAULT 'general',
  skills TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contractor_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractor manages own training"
  ON contractor_training FOR ALL
  USING (contractor_id = auth.uid());

CREATE INDEX idx_training_contractor ON contractor_training(contractor_id);
CREATE INDEX idx_training_date ON contractor_training(contractor_id, completion_date DESC);
