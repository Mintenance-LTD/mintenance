ALTER TABLE public.property_document_files ADD COLUMN archived_at timestamptz;
ALTER TABLE public.property_document_files ADD COLUMN archived_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.property_document_files ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX property_document_files_active ON public.property_document_files(property_id,created_at DESC) WHERE status='ready' AND archived_at IS NULL;
-- Archiving is reversible. Stored bytes, original upload timestamps, inspections
-- and signed contracts are not altered or purged by document metadata changes.
