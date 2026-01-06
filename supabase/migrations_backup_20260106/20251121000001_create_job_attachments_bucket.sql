-- Create job-attachments bucket for signatures and other job-related files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-attachments',
  'job-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for job-attachments bucket

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Authenticated users can upload job attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own job attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own job attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view job attachments" ON storage.objects;

-- Allow authenticated users (contractors and homeowners) to upload attachments
-- We'll use a simpler policy here: if you are authenticated, you can upload.
-- In a stricter system, we'd check if the user is part of the job, but for now this suffices.
CREATE POLICY "Authenticated users can upload job attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'job-attachments'
);

-- Allow authenticated users to update their own uploads
CREATE POLICY "Users can update their own job attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-attachments' AND
  auth.uid() = owner
);

-- Allow authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own job attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-attachments' AND
  auth.uid() = owner
);

-- Allow anyone (or just authenticated) to view attachments
-- Since these are job signatures, maybe we want them public for simplicity in the app,
-- or restricted. The bucket is set to public=true, so let's allow public read for now
-- to avoid signed URL complexity in the frontend, but ideally this should be restricted.
CREATE POLICY "Anyone can view job attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-attachments');
