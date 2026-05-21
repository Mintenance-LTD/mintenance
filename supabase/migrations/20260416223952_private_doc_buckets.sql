-- Audit 2026-04-16 P0 #3 & #4: contractor-documents + job-attachments buckets were
-- public, exposing sensitive contractor onboarding PDFs/Word/zips and job attachments
-- via guessable direct URLs. RLS on storage.objects is already scoped per-user, so
-- flipping public=false is safe — authenticated callers must use createSignedUrl.
-- Callers updated in apps/web (upload, contractor/documents, maintenance/detect, sign-off).

BEGIN;

UPDATE storage.buckets
   SET public = false
 WHERE id IN ('contractor-documents', 'job-attachments');

COMMIT;
