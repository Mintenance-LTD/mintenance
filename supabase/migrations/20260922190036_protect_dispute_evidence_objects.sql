-- Preserve the original bytes behind durable dispute references. Service-role
-- retention work remains possible; ordinary clients cannot overwrite or erase evidence.
CREATE POLICY dispute_evidence_insert_scope ON storage.objects AS RESTRICTIVE
FOR INSERT TO authenticated WITH CHECK (
 bucket_id <> 'job-attachments' OR (string_to_array(name,'/'))[2] IS DISTINCT FROM 'disputes'
 OR (
  cardinality(string_to_array(name,'/')) = 4
  AND (string_to_array(name,'/'))[3] = (select auth.uid())::text
  AND (string_to_array(name,'/'))[4] NOT IN ('','.','..')
  AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id::text=(string_to_array(name,'/'))[1]
   AND (j.homeowner_id=(select auth.uid()) OR j.contractor_id=(select auth.uid()) OR j.payer_user_id=(select auth.uid())))
 )
);
CREATE POLICY dispute_evidence_no_client_update ON storage.objects AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (bucket_id <> 'job-attachments' OR (string_to_array(name,'/'))[2] IS DISTINCT FROM 'disputes')
WITH CHECK (bucket_id <> 'job-attachments' OR (string_to_array(name,'/'))[2] IS DISTINCT FROM 'disputes');
CREATE POLICY dispute_evidence_no_client_delete ON storage.objects AS RESTRICTIVE
FOR DELETE TO authenticated
USING (bucket_id <> 'job-attachments' OR (string_to_array(name,'/'))[2] IS DISTINCT FROM 'disputes');
