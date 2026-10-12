INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('property-documents','property-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY property_documents_api_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
USING (bucket_id <> 'property-documents') WITH CHECK (bucket_id <> 'property-documents');
CREATE TABLE public.property_document_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
 uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
 kind text NOT NULL CHECK(kind IN ('lease','inspection','warranty','invoice','certificate','other')),
 object_path text NOT NULL UNIQUE,
 mime_type text NOT NULL CHECK(mime_type IN ('application/pdf','image/jpeg','image/png')),
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX property_document_files_property_idx ON public.property_document_files(property_id,created_at,id);
ALTER TABLE public.property_document_files ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_document_files FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.property_document_files TO service_role;
COMMENT ON TABLE public.property_document_files IS 'Private property files; null property references and stale pending uploads are removed through the Storage API by retention cleanup.';
