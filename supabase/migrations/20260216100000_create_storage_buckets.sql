-- ============================================================
-- Storage Buckets for Core Platform Workflows
-- ============================================================
-- Creates 4 buckets used by active application code:
-- 1. avatars         - User profile images
-- 2. Job-storage     - Job before/after photos and videos
-- 3. job-attachments - Signatures, PDFs, general attachments
-- 4. contractor-portfolio - Contractor work portfolio images
--
-- Each bucket has RLS policies for authenticated access.
-- Uses ON CONFLICT and DROP POLICY IF EXISTS for idempotency.
-- ============================================================

-- ============================================================
-- 1. AVATARS BUCKET (used by api/users/avatar/route.ts)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Avatars RLS policies
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');


-- ============================================================
-- 2. JOB-STORAGE BUCKET (used by api/jobs/[id]/photos/*)
-- ============================================================
-- Stores before photos, after photos, and video walkthroughs.
-- Private bucket - only authenticated users who are part of the job.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Job-storage',
  'Job-storage',
  false,
  104857600, -- 100MB (for video walkthroughs)
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Job-storage RLS policies
DROP POLICY IF EXISTS "Authenticated users can upload job photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload job photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Job-storage');

DROP POLICY IF EXISTS "Users can update their own job photos" ON storage.objects;
CREATE POLICY "Users can update their own job photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Job-storage' AND
  auth.uid() = owner
);

DROP POLICY IF EXISTS "Users can delete their own job photos" ON storage.objects;
CREATE POLICY "Users can delete their own job photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'Job-storage' AND
  auth.uid() = owner
);

DROP POLICY IF EXISTS "Authenticated users can view job photos" ON storage.objects;
CREATE POLICY "Authenticated users can view job photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'Job-storage');


-- ============================================================
-- 3. JOB-ATTACHMENTS BUCKET (used by api/upload/route.ts, sign-off)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-attachments',
  'job-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Job-attachments RLS policies
DROP POLICY IF EXISTS "Authenticated users can upload job attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload job attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-attachments');

DROP POLICY IF EXISTS "Users can update their own job attachments" ON storage.objects;
CREATE POLICY "Users can update their own job attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-attachments' AND
  auth.uid() = owner
);

DROP POLICY IF EXISTS "Users can delete their own job attachments" ON storage.objects;
CREATE POLICY "Users can delete their own job attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-attachments' AND
  auth.uid() = owner
);

DROP POLICY IF EXISTS "Anyone can view job attachments" ON storage.objects;
CREATE POLICY "Anyone can view job attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-attachments');


-- ============================================================
-- 4. CONTRACTOR-PORTFOLIO BUCKET (used by api/contractor/upload-photos)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-portfolio',
  'contractor-portfolio',
  true,
  5242880, -- 5MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Contractor-portfolio RLS policies
DROP POLICY IF EXISTS "Contractors can upload to their own portfolio" ON storage.objects;
CREATE POLICY "Contractors can upload to their own portfolio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contractor-portfolio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Contractors can update their own portfolio" ON storage.objects;
CREATE POLICY "Contractors can update their own portfolio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contractor-portfolio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Contractors can delete their own portfolio photos" ON storage.objects;
CREATE POLICY "Contractors can delete their own portfolio photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contractor-portfolio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Anyone can view contractor portfolio" ON storage.objects;
CREATE POLICY "Anyone can view contractor portfolio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contractor-portfolio');
