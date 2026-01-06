#!/bin/bash
# Phase 1: Database Migration Consolidation Script

echo "=== DATABASE MIGRATION CONSOLIDATION ==="

# Create backup first
echo "1. Backing up existing migrations..."
if [ ! -d "supabase/migrations_backup_$(date +%Y%m%d)" ]; then
    cp -r supabase/migrations "supabase/migrations_backup_$(date +%Y%m%d)"
    echo "✓ Backup created: supabase/migrations_backup_$(date +%Y%m%d)"
else
    echo "⚠ Backup already exists for today"
fi

# Create consolidated migrations directory
echo "2. Creating consolidated migrations directory..."
mkdir -p supabase/migrations_consolidated

# Analyze and report on duplicates
echo "3. Analyzing duplicate tables..."
cat > supabase/migrations_consolidated/DUPLICATE_ANALYSIS.md << 'EOF'
# Duplicate Table Analysis

## Tables with Multiple Definitions

### 1. saved_jobs
- First: 20250131000004_add_saved_jobs_table.sql
- Second: 20251204000001_add_job_tracking_tables.sql
- Resolution: Use second version with 'notes' column

### 2. job_views
- Multiple definitions found
- Resolution: Consolidate with proper foreign keys

### 3. payments
- Multiple definitions with different columns
- Resolution: Merge all columns, ensure compatibility

### 4. security_events
- First: 20251222_add_security_events_table.sql
- Second: 20251222000000_add_security_events_table.sql
- Resolution: Use most complete version

### 5. yolo_models
- ML-related tables duplicated
- Resolution: Consolidate ML infrastructure

### 6. confidence_calibration_data
- ML metrics table duplicated
- Resolution: Single version for AI features

### 7. hybrid_routing_decisions
- Routing logic table duplicated
- Resolution: Consolidate routing infrastructure

### 8. job_guarantees
- Guarantee system duplicated
- Resolution: Single guarantee tracking system

EOF

echo "4. Creating consolidated core tables migration..."
cat > supabase/migrations_consolidated/001_core_tables.sql << 'EOF'
-- Consolidated Core Tables Migration
-- Generated: $(date)
-- This replaces multiple conflicting migrations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users and Profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('homeowner', 'contractor', 'admin')) NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies (for contractors)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  license_number TEXT,
  insurance_number TEXT,
  verified BOOLEAN DEFAULT false,
  rating DECIMAL(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT address_owner CHECK (
    (profile_id IS NOT NULL AND company_id IS NULL) OR
    (profile_id IS NULL AND company_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_companies_owner ON public.companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_addresses_profile ON public.addresses(profile_id);
CREATE INDEX IF NOT EXISTS idx_addresses_company ON public.addresses(company_id);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
EOF

echo "5. Creating consolidated job system migration..."
cat > supabase/migrations_consolidated/002_job_system.sql << 'EOF'
-- Consolidated Job System Migration
-- This is the SINGLE source of truth for jobs and bids

-- Jobs table (CANONICAL VERSION)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'completed', 'cancelled')),
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'emergency')),
  location JSONB,
  images TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Bids table (CANONICAL VERSION)
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  estimated_duration_days INTEGER,
  materials_included BOOLEAN DEFAULT true,
  warranty_months INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, contractor_id)
);

-- Saved jobs (SINGLE VERSION - includes notes field)
CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);

-- Job views (SINGLE VERSION with proper tracking)
CREATE TABLE IF NOT EXISTS public.job_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job milestones
CREATE TABLE IF NOT EXISTS public.job_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job guarantees (SINGLE VERSION)
CREATE TABLE IF NOT EXISTS public.job_guarantees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('workmanship', 'timeline', 'price', 'satisfaction')),
  description TEXT,
  duration_months INTEGER,
  terms JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner ON public.jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_job ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor ON public.bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON public.saved_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_job_views_job ON public.job_views(job_id);
CREATE INDEX IF NOT EXISTS idx_job_views_viewer ON public.job_views(viewer_id);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_guarantees ENABLE ROW LEVEL SECURITY;
EOF

echo "6. Creating payment system migration..."
cat > supabase/migrations_consolidated/003_payment_system.sql << 'EOF'
-- Consolidated Payment System Migration
-- Single source of truth for all payment-related tables

-- Payments table (MERGED VERSION - includes all columns from duplicates)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES public.bids(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.profiles(id),
  payee_id UUID REFERENCES public.profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  platform_fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'in_escrow', 'released',
    'completed', 'failed', 'refunded', 'disputed'
  )),
  payment_method TEXT CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,
  escrow_released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods (saved payment methods)
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('card', 'bank_account')),
  stripe_payment_method_id TEXT,
  last4 TEXT,
  brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow accounts
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'held' CHECK (status IN ('held', 'releasing', 'released', 'refunded')),
  release_conditions JSONB,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_job ON public.payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON public.payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
EOF

echo "7. Creating security and audit migration..."
cat > supabase/migrations_consolidated/004_security_audit.sql << 'EOF'
-- Consolidated Security and Audit System
-- Single source for security events and audit logs

-- Security events table (MERGED VERSION)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_attempt', 'login_success', 'login_failed',
    'password_reset', 'account_locked', 'suspicious_activity',
    'permission_denied', 'data_breach_attempt'
  )),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(record_id);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
EOF

echo "8. Creating ML/AI tables migration..."
cat > supabase/migrations_consolidated/005_ml_ai_system.sql << 'EOF'
-- Consolidated ML/AI System Tables
-- Single source for all AI/ML related infrastructure

-- YOLO models (MERGED VERSION)
CREATE TABLE IF NOT EXISTS public.yolo_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  model_type TEXT CHECK (model_type IN ('detection', 'segmentation', 'classification')),
  file_path TEXT,
  accuracy DECIMAL(5,2),
  parameters JSONB,
  training_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, version)
);

-- Confidence calibration data (MERGED VERSION)
CREATE TABLE IF NOT EXISTS public.confidence_calibration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.yolo_models(id) ON DELETE CASCADE,
  confidence_threshold DECIMAL(3,2),
  precision_score DECIMAL(5,2),
  recall_score DECIMAL(5,2),
  f1_score DECIMAL(5,2),
  sample_size INTEGER,
  calibration_date TIMESTAMPTZ DEFAULT NOW()
);

-- Hybrid routing decisions (MERGED VERSION)
CREATE TABLE IF NOT EXISTS public.hybrid_routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.profiles(id),
  routing_score DECIMAL(5,2),
  factors JSONB,
  decision TEXT CHECK (decision IN ('auto_assigned', 'suggested', 'rejected')),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analysis results
CREATE TABLE IF NOT EXISTS public.ai_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.yolo_models(id),
  analysis_type TEXT NOT NULL,
  results JSONB NOT NULL,
  confidence DECIMAL(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_yolo_models_name ON public.yolo_models(name);
CREATE INDEX IF NOT EXISTS idx_calibration_model ON public.confidence_calibration_data(model_id);
CREATE INDEX IF NOT EXISTS idx_routing_job ON public.hybrid_routing_decisions(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_job ON public.ai_analysis_results(job_id);

-- Enable RLS
ALTER TABLE public.yolo_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_calibration_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hybrid_routing_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_results ENABLE ROW LEVEL SECURITY;
EOF

echo ""
echo "✅ Consolidated migrations created in: supabase/migrations_consolidated/"
echo ""
echo "Files created:"
ls -la supabase/migrations_consolidated/
echo ""
echo "=== CONSOLIDATION COMPLETE ==="
echo ""
echo "Next steps:"
echo "1. Review the consolidated migrations"
echo "2. Test on a fresh database"
echo "3. Replace existing migrations once verified"