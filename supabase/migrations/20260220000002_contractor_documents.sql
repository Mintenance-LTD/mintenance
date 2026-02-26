-- Migration: Contractor Documents
-- Adds table for contractor document management with file storage

CREATE TABLE IF NOT EXISTS contractor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- pdf, jpg, png, docx, zip, etc.
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('contracts', 'photos', 'certifications', 'insurance', 'receipts', 'templates', 'other')),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  public_url TEXT, -- cached public URL
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  starred BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE contractor_documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Contractor manages own documents') THEN
    CREATE POLICY "Contractor manages own documents" ON contractor_documents
      FOR ALL USING (contractor_id = auth.uid());
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contractor_docs_contractor ON contractor_documents(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_docs_category ON contractor_documents(contractor_id, category);
CREATE INDEX IF NOT EXISTS idx_contractor_docs_starred ON contractor_documents(contractor_id) WHERE starred = true;
CREATE INDEX IF NOT EXISTS idx_contractor_docs_job ON contractor_documents(job_id) WHERE job_id IS NOT NULL;

-- Storage bucket for contractor documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-documents',
  'contractor-documents',
  true,
  20971520, -- 20MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: contractors can manage their own files
CREATE POLICY "Contractors upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contractor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Contractors read own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'contractor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Contractors delete own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'contractor-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read access for contractor-documents bucket (since bucket is public)
CREATE POLICY "Public read contractor documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'contractor-documents');
