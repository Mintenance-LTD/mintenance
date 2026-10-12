import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
export const GET = withCronHandler('cancelled-job-cleanup', async () => {
  if (process.env.CANCELLED_JOB_CLEANUP_ENABLED !== 'true') return { status: 'disabled' };
  const { data, error } = await serverSupabase.rpc('cleanup_cancelled_jobs');
  if (error) throw new Error('Cancelled job cleanup failed');
  return { deleted: data };
});
