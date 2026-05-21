-- 2026-05-21 drift-cleanup: recovered from supabase_migrations.schema_migrations.

-- Add review_status column for per-document verification workflow
ALTER TABLE public.contractor_documents
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending', 'approved', 'rejected', 'not_started'));

-- Add review metadata columns
ALTER TABLE public.contractor_documents
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add verification_type for categorizing verification documents
ALTER TABLE public.contractor_documents
  ADD COLUMN IF NOT EXISTS verification_type TEXT
  CHECK (verification_type IN ('identity', 'business_licence', 'insurance', 'certification'));

-- Index for fast lookup of verification documents
CREATE INDEX IF NOT EXISTS idx_contractor_documents_verification
  ON public.contractor_documents(contractor_id, verification_type)
  WHERE verification_type IS NOT NULL;
