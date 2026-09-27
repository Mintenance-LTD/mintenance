import { serverSupabase } from '@/lib/api/supabaseServer';
import {
  recoveryJobs,
  recoveryRunSchema,
  recoveryState,
  type RecoveryReport,
} from './recovery-status';

export async function readRecoveryHealth(
  now = Date.now()
): Promise<RecoveryReport> {
  const jobs = await Promise.all(
    recoveryJobs.map(async (job) => {
      const base = { ...job, lastStartedAt: null, lastSuccessAt: null };
      try {
        // Two indexed, bounded reads per worker. Never return log messages or metadata.
        const query = () =>
          serverSupabase
            .from('cron_job_runs')
            .select('status,started_at,completed_at,metadata')
            .eq('job_name', job.name)
            .order('started_at', { ascending: false })
            .limit(1);
        const [latestResult, successResult] = await Promise.all([
          query().maybeSingle(),
          query().eq('status', 'success').maybeSingle(),
        ]);
        if (latestResult.error || successResult.error)
          throw new Error('Run lookup failed');
        const latest = latestResult.data
          ? recoveryRunSchema.parse(latestResult.data)
          : null;
        const success = successResult.data
          ? recoveryRunSchema.parse(successResult.data)
          : null;
        return {
          ...job,
          state: recoveryState(latest, success, job.maxAgeMinutes, now),
          lastStartedAt: latest?.started_at ?? null,
          lastSuccessAt: success?.completed_at ?? null,
        };
      } catch {
        return { ...base, state: 'unknown' as const };
      }
    })
  );
  return { checkedAt: new Date(now).toISOString(), jobs };
}
