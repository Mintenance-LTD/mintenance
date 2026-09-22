/** Operational status only; job history is not a property-condition assessment. */
export const PROPERTY_JOB_STATUS_LABELS: Readonly<Record<string, string>> = {
  draft: 'Draft',
  open: 'Open',
  posted: 'Awaiting bids',
  assigned: 'Assigned',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
};
export function isOpenPropertyJob(status: string): boolean {
  return ['open', 'posted', 'assigned', 'in_progress', 'disputed'].includes(
    status
  );
}
