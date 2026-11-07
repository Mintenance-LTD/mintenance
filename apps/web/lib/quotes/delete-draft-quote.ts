import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
} from '@/lib/errors/api-error';

/** Both delete routes must preserve quotes already sent to a customer. */
export async function deleteDraftQuote(
  id: string,
  contractorId: string,
  expectedVersion?: string | null
) {
  const { data: quote, error } = await serverSupabase
    .from('contractor_quotes')
    .select('id, status, updated_at')
    .eq('id', id)
    .eq('contractor_id', contractorId)
    .maybeSingle();
  if (error) throw new InternalServerError('Could not load quote');
  if (!quote) throw new NotFoundError('Quote not found');
  if (quote.status !== 'draft')
    throw new ConflictError('Only draft quotes can be deleted.');
  const version =
    expectedVersion !== undefined ? expectedVersion : quote.updated_at;
  let deletion = serverSupabase
    .from('contractor_quotes')
    .delete()
    .eq('id', id)
    .eq('contractor_id', contractorId)
    .eq('status', 'draft');
  deletion =
    version == null
      ? deletion.is('updated_at', null)
      : deletion.eq('updated_at', version);
  const { data: deleted, error: deleteError } = await deletion
    .select('id')
    .maybeSingle();
  if (deleteError) throw new InternalServerError('Could not delete quote');
  if (!deleted)
    throw new ConflictError('Quote changed. Reload before deleting.');
}
