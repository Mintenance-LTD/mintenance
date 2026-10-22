-- Keep this bucket API-only even if a broader permissive storage policy is added later.
CREATE POLICY tenant_report_photos_api_only ON storage.objects AS RESTRICTIVE
FOR ALL TO anon,authenticated
USING (bucket_id <> 'tenant-report-photos')
WITH CHECK (bucket_id <> 'tenant-report-photos');
