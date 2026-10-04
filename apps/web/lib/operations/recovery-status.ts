import { z } from 'zod';

// Alert tolerances, not promises about provider delivery. Keep schedule contracts tested.
export const recoveryJobs = [
  {
    name: 'payment-reconciliation',
    label: 'Payment reconciliation',
    maxAgeMinutes: 15,
  },
  { name: 'refund-recovery', label: 'Refund recovery', maxAgeMinutes: 15 },
  {
    name: 'admin-release-recovery',
    label: 'Payment release recovery',
    maxAgeMinutes: 15,
  },
  {
    name: 'dispute-resolution-recovery',
    label: 'Dispute recovery',
    maxAgeMinutes: 15,
  },
  {
    name: 'account-deletion-recovery',
    label: 'Account deletion recovery',
    maxAgeMinutes: 15,
  },
  {
    name: 'password-change-recovery',
    label: 'Password change recovery',
    maxAgeMinutes: 15,
  },
  {
    name: 'notification-processor',
    label: 'Queued notifications',
    maxAgeMinutes: 15,
  },
  { name: 'push-receipts', label: 'Push delivery receipts', maxAgeMinutes: 15 },
  {
    name: 'evidence-disposal',
    label: 'Evidence disposal',
    maxAgeMinutes: 26 * 60,
  },
  { name: 'pii-cleanup', label: 'Personal data cleanup', maxAgeMinutes: 26 * 60 },
  { name: 'retention-cleanup', label: 'Retention cleanup', maxAgeMinutes: 26 * 60 },
  { name: 'data-archival', label: 'Historical job archival', maxAgeMinutes: 35 * 24 * 60 },
] as const;

export const recoveryRunSchema = z.object({
  status: z.enum(['running', 'success', 'failed']),
  started_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});
export type RecoveryRun = z.infer<typeof recoveryRunSchema>;
export const recoveryReportSchema = z.object({
  checkedAt: z.string().datetime(),
  jobs: z
    .array(
      z.object({
        name: z.string(),
        label: z.string(),
        state: z.enum([
          'recent_success',
          'running',
          'missing',
          'overdue',
          'failed',
          'attention',
          'unknown',
        ]),
        lastStartedAt: z.string().nullable(),
        lastSuccessAt: z.string().nullable(),
        maxAgeMinutes: z.number().positive(),
      })
    )
    .length(recoveryJobs.length),
});
export type RecoveryReport = z.infer<typeof recoveryReportSchema>;

export function recoveryState(
  latest: RecoveryRun | null,
  success: RecoveryRun | null,
  maxAgeMinutes: number,
  now: number
): RecoveryReport['jobs'][number]['state'] {
  if (!latest) return 'missing';
  const started = Date.parse(latest.started_at);
  const completed = latest.completed_at
    ? Date.parse(latest.completed_at)
    : null;
  if (
    started > now ||
    (completed !== null && (completed < started || completed > now))
  )
    return 'unknown';
  if (latest.status === 'failed') return 'failed';
  const retentionResults = latest.metadata?.results;
  if (retentionResults && typeof retentionResults === 'object' &&
      !Array.isArray(retentionResults) &&
      typeof (retentionResults as Record<string, unknown>).profiles_deferred_for_review === 'number' &&
      Number((retentionResults as Record<string, unknown>).profiles_deferred_for_review) > 0) {
    return 'attention';
  }
  // Some workers record a completed run while reporting unresolved provider work.
  if (
    [
      'failed',
      'errors',
      'expired',
      'attemptsNeedingReview',
      'needsReconciliation',
      'mismatched',
      'missingInStripe',
      'queuedErrors',
    ].some(
      (key) =>
        typeof latest.metadata?.[key] === 'number' &&
        Number(latest.metadata[key]) > 0
    )
  )
    return 'attention';
  if (now - started > maxAgeMinutes * 60_000) return 'overdue';
  if (latest.status === 'running') {
    if (now - started > 5 * 60_000) return 'overdue';
    if (
      !success ||
      now - Date.parse(success.started_at) > maxAgeMinutes * 60_000
    )
      return 'overdue';
    return 'running';
  }
  return completed === null ? 'unknown' : 'recent_success';
}
