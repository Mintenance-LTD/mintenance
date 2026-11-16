import { serverSupabase } from '@/lib/api/supabaseServer';
import { InternalServerError } from '@/lib/errors/api-error';

export async function hasEarlyStartRequest(
  contractId: string
): Promise<boolean> {
  const { data, error } = await serverSupabase
    .from('contract_consents')
    .select('early_start_requested')
    .eq('contract_id', contractId)
    .eq('signer_role', 'homeowner')
    .maybeSingle();
  if (error)
    throw new InternalServerError('Could not check early-start choices');
  if (data?.early_start_requested === true) return true;
  const { data: later, error: laterError } = await serverSupabase
    .from('contract_early_start_requests')
    .select('contract_id')
    .eq('contract_id', contractId)
    .maybeSingle();
  if (laterError)
    throw new InternalServerError('Could not check early-start request');
  return Boolean(later);
}
