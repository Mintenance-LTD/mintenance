-- Create storage buckets for contractor profile images and portfolio photos
-- Following Single Responsibility Principle - only handles storage setup

-- Create profile-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create contractor-portfolio bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-portfolio',
  'contractor-portfolio',
  true,
  5242880, -- 5MB limit per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for profile-images bucket
CREATE POLICY "Contractors can upload their own profile image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Contractors can update their own profile image"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Contractors can delete their own profile image"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- RLS Policies for contractor-portfolio bucket
CREATE POLICY "Contractors can upload to their own portfolio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contractor-portfolio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Contractors can update their own portfolio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contractor-portfolio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Contractors can delete their own portfolio photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contractor-portfolio' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view contractor portfolio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'contractor-portfolio');

