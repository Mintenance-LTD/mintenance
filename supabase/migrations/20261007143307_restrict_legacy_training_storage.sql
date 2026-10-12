-- Quarantine legacy training bytes pending provenance review; do not erase evidence.
UPDATE storage.buckets SET public=false WHERE id IN ('training-images','mint-ai-training-public');
CREATE POLICY "Deny client access to legacy training assets" ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
USING (bucket_id NOT IN ('training-images','mint-ai-training-public'))
WITH CHECK (bucket_id NOT IN ('training-images','mint-ai-training-public'));

