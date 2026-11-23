'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { useJobVisits } from '@/lib/hooks/useJobVisits';
import {
  currentVisitSlot,
  formatVisitSlot,
  visitEventLabel,
  visitHref,
  visitResponseLabel,
  visitStatusLabel,
} from '@/lib/scheduling/visit-history';
import { VisitEventDetails } from './VisitEventDetails';

export function JobVisitHistory({
  jobId,
  role,
}: {
  jobId: string;
  role: 'homeowner' | 'contractor';
}) {
  const result = useJobVisits(jobId);
  if (!result || (!result.failed && result.visits.length === 0)) return null;
  return (
    <section className='space-y-4 rounded-xl border border-slate-200 bg-white p-5'>
      <h2 className='flex items-center gap-2 text-base font-semibold'>
        <CalendarClock size={18} aria-hidden='true' /> Visit history
      </h2>
      {result.failed && (
        <p role='status' className='text-sm'>
          Visit history is temporarily unavailable.
        </p>
      )}
      {result.visits.map((visit) => {
        const slot = currentVisitSlot(visit);
        return (
          <div
            key={visit.id}
            className='space-y-2 border-t border-slate-200 pt-3 text-sm'
          >
            <h3 className='font-semibold'>{visit.title}</h3>
            <p>
              {visitStatusLabel(slot)} · {formatVisitSlot(slot)}
            </p>
            <p>{visitResponseLabel(slot)}</p>
            <Link
              href={visitHref(visit.id, role)}
              className='inline-block font-semibold text-teal-800 underline'
            >
              View visit
            </Link>
            {visit.history?.map((event) => (
              <div
                key={event.id}
                className='space-y-1 border-l-2 border-teal-200 pl-3'
              >
                <h4 className='font-semibold'>{visitEventLabel(event)}</h4>
                <VisitEventDetails event={event} />
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
