-- Create storage bucket for training images (Building Surveyor AI)
-- Following Single Responsibility Principle - only handles storage setup

-- Create training-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-images',
  'training-images',
  true, -- Public so AI services can access them
  10485760, -- 10MB limit per image (larger than normal to accommodate high-res training images)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Public can view training images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage training images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload training images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update training images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete training images" ON storage.objects;

-- RLS Policy: Anyone can view training images (public bucket)
CREATE POLICY "Public can view training images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'training-images');

-- RLS Policy: Service role can upload/manage training images
CREATE POLICY "Service role can manage training images"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'training-images')
WITH CHECK (bucket_id = 'training-images');

-- RLS Policy: Authenticated users can upload training images (for manual uploads)
CREATE POLICY "Authenticated users can upload training images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-images');

-- RLS Policy: Authenticated users can update training images
CREATE POLICY "Authenticated users can update training images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'training-images')
WITH CHECK (bucket_id = 'training-images');

-- RLS Policy: Authenticated users can delete training images
CREATE POLICY "Authenticated users can delete training images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'training-images');

