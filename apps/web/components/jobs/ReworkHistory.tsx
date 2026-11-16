'use client';
import type { ReworkRequest } from '@/lib/jobs/rework-evidence';
import { formatUKSchedule } from '@/lib/scheduling/uk-date-time';

export function ReworkHistory({ requests }: { requests: ReworkRequest[] }) {
  if (!requests.length) return null;
  return (
    <section
      aria-label='Rework history'
      className='space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm'
    >
      <h3 className='font-semibold'>
        Changes requested and completion history
      </h3>
      <ol className='space-y-3'>
        {[...requests].reverse().map((request) => (
          <li key={request.id}>
            {request.completion_version && (
              <p>
                Previous work submitted:{' '}
                {formatUKSchedule(request.completion_version)}
              </p>
            )}
            <p className='font-medium'>
              Changes requested · {formatUKSchedule(request.created_at)}
            </p>
            <p className='whitespace-pre-wrap'>{request.comments}</p>
          </li>
        ))}
      </ol>
      <p>
        Each request reopens the job. Payment stays held until fresh evidence is
        reviewed and the release checks pass.
      </p>
    </section>
  );
}
