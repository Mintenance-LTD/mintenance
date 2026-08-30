
UPDATE storage.buckets
   SET public = false
 WHERE id IN ('contractor-documents', 'job-attachments');
;
