import { z } from 'zod';
import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ServiceUnavailableError } from '@/lib/errors/api-error';

const resultSchema = z.object({
  processed: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  needsReconciliation: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
});

export const maxDuration = 60;
export const GET = withCronHandler('evidence-disposal', async () => {
  const { data, error } = await serverSupabase.rpc(
    'process_retained_evidence_disposals',
    { p_limit: 10 }
  );
  const parsed = resultSchema.safeParse(data);
  if (error || !parsed.success)
    throw new ServiceUnavailableError(
      'Evidence disposal could not be confirmed.'
    );
  if (parsed.data.needsReconciliation)
    throw new ServiceUnavailableError(
      'Evidence disposal needs staff reconciliation.'
    );
  // The worker only processes scheduled rows. An earlier blocked external-file
  // decision must not disappear from monitoring just because this run did no work.
  const backlog = await serverSupabase
    .from('evidence_disposal_requests')
    .select('id')
    .eq('status', 'needs_reconciliation')
    .limit(1);
  if (backlog.error || !Array.isArray(backlog.data))
    throw new ServiceUnavailableError(
      'Evidence disposal backlog could not be verified.'
    );
  if (backlog.data.length)
    throw new ServiceUnavailableError(
      'Evidence disposal remains blocked. Review /admin/evidence-retention/disposal.'
    );
  return parsed.data;
});
