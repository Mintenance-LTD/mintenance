import { formatUKSchedule } from '@/lib/scheduling/uk-date-time';
import {
  formatVisitSlot,
  visitResponseLabel,
  type VisitEvent,
} from '@/lib/scheduling/visit-history';

export function VisitEventDetails({ event }: { event: VisitEvent }) {
  return event.previousSlot ? (
    <dl className='grid gap-2 text-sm sm:grid-cols-2'>
      <div>
        <dt className='font-semibold'>Previous time</dt>
        <dd>{formatVisitSlot(event.previousSlot)}</dd>
        <dd>{visitResponseLabel(event.previousSlot)}</dd>
      </div>
      <div>
        <dt className='font-semibold'>Proposed time</dt>
        <dd>{formatVisitSlot(event.slot)}</dd>
        <dd>
          {event.slot.response === 'pending'
            ? 'Awaiting client confirmation at the time of rescheduling'
            : visitResponseLabel(event.slot)}
        </dd>
      </div>
    </dl>
  ) : (
    <p className='text-sm'>
      {formatVisitSlot(event.slot)}
      {event.kind === 'response' && event.slot.responseAt
        ? ` · Response recorded ${formatUKSchedule(event.slot.responseAt)}`
        : ''}
    </p>
  );
}
