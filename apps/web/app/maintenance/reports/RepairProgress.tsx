import {
  reportHistoryDate,
  type ReportRepairProgress,
} from '@mintenance/shared';
import { formatVisitSlot } from '@/lib/scheduling/visit-history';

export function RepairProgress({
  progress,
}: {
  progress: ReportRepairProgress;
}) {
  return (
    <section
      aria-label='Repair progress'
      className='space-y-2 rounded-lg bg-teal-50 p-4 text-teal-950'
    >
      <h2 className='font-semibold'>Repair progress</h2>
      <ul className='space-y-1'>
        <li>Job created · {reportHistoryDate(progress.createdAt)}</li>
        {progress.confirmedVisit ? (
          <li>Visit confirmed · {formatVisitSlot(progress.confirmedVisit)}</li>
        ) : (
          <li>
            {progress.visitUnavailable
              ? 'Visit details unavailable. Refresh to retry.'
              : 'No confirmed visit recorded.'}
          </li>
        )}
        {progress.startedAt && (
          <li>Work started · {reportHistoryDate(progress.startedAt)}</li>
        )}
        {progress.completedAt && (
          <li>Work completed · {reportHistoryDate(progress.completedAt)}</li>
        )}
      </ul>
    </section>
  );
}
