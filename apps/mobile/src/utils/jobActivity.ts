/** Active work is assigned or underway; posted jobs are awaiting a contractor. */
export function isActiveJob(
  job: { status?: string; archived_at?: string | null } | null | undefined
): boolean {
  return (
    !!job &&
    !job.archived_at &&
    ['assigned', 'in_progress'].includes(job.status ?? '')
  );
}
