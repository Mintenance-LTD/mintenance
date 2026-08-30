UPDATE storage.buckets
SET
  file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]::text[]
WHERE id = 'Job-storage';;
