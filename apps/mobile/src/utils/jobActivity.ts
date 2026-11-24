type JobActivity = { status?: string; archived_at?: string | null } | null | undefined;

/** Active work is assigned or underway; posted jobs are awaiting a contractor. */
export function isActiveJob(job: JobActivity): boolean {
  return (
    !!job &&
    !job.archived_at &&
    ['assigned', 'in_progress'].includes(job.status ?? '')
  );
}

export function isActiveContractorJob(job: JobActivity): boolean {
  return isActiveJob(job) || (job?.status === 'disputed' && !job.archived_at);
}
