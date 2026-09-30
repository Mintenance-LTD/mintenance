import { serverSupabase } from '@/lib/api/supabaseServer';
export async function cleanupPropertyDocumentFiles(): Promise<number> {
  const cutoff = new Date(Date.now() - 86400000).toISOString();
  const { data, error } = await serverSupabase
    .from('property_document_files')
    .select('id,object_path')
    .or(`property_id.is.null,and(status.eq.pending,created_at.lt.${cutoff})`)
    .order('created_at')
    .limit(25);
  if (error) throw error;
  let removed = 0;
  for (const file of data || []) {
    const { error: storageError } = await serverSupabase.storage
      .from('property-documents')
      .remove([file.object_path]);
    if (storageError) throw storageError;
    const { error: deleteError } = await serverSupabase
      .from('property_document_files')
      .delete()
      .eq('id', file.id);
    if (deleteError) throw deleteError;
    removed++;
  }
  return removed;
}
