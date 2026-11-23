'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import {
  currentVisitSlot,
  formatVisitSlot,
  visitEventLabel,
  visitIsPast,
  visitResponseLabel,
  visitStatusLabel,
  type VisitRecord,
} from '@/lib/scheduling/visit-history';
import { formatUKSchedule } from '@/lib/scheduling/uk-date-time';
import { appointmentAddress } from '@/lib/scheduling/appointment-display';
import { VisitEventDetails } from './VisitEventDetails';
import { VisitResponseActions } from './VisitResponseActions';
import styles from '@/components/property-operations/operations.module.css';

export function VisitDetail({
  visit,
  role,
}: {
  visit: VisitRecord;
  role: 'homeowner' | 'contractor';
}) {
  const router = useRouter();
  const slot = currentVisitSlot(visit);
  const contractor = role === 'contractor';
  const participant = contractor ? visit.client : visit.contractor;
  const location =
    appointmentAddress(visit.locationAddress ?? undefined) ||
    (visit.locationType === 'phone'
      ? 'Phone visit'
      : ['video', 'remote'].includes(visit.locationType ?? '')
        ? 'Video visit'
        : null);
  const backHref = contractor
    ? '/contractor/scheduling'
    : `/appointments/response${visitIsPast(visit) ? '?view=past' : ''}`;
  return (
    <div className={`${styles.page} ${styles.compact}`}>
      <Link href={backHref} className={styles.back}>
        <ArrowLeft size={16} aria-hidden='true' />
        {contractor ? 'Back to scheduling' : 'Back to visit confirmations'}
      </Link>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Visit details</p>
          <h1>{visit.title}</h1>
        </div>
      </header>
      <section aria-label='Current visit slot' className={styles.card}>
        <h2 className={styles.next}>
          <CalendarCheck size={18} aria-hidden='true' /> {formatVisitSlot(slot)}
        </h2>
        <p className={styles.badge}>{visitStatusLabel(slot)}</p>
        <p>
          {visitResponseLabel(slot)}
          {slot.responseAt ? ` · ${formatUKSchedule(slot.responseAt)}` : ''}
        </p>
        {(participant?.name || location) && (
          <dl className='grid gap-2 text-sm'>
            {participant?.name && (
              <div>
                <dt className='font-semibold'>
                  {contractor ? 'Client' : 'Contractor'}
                </dt>
                <dd>{participant.name}</dd>
              </div>
            )}
            {location && (
              <div>
                <dt className='font-semibold'>Location</dt>
                <dd>{location}</dd>
              </div>
            )}
          </dl>
        )}
        {visit.job && (
          <Link
            className={styles.secondary}
            href={`${contractor ? '/contractor' : ''}/jobs/${visit.job.id}`}
          >
            View job
          </Link>
        )}
        <VisitResponseActions
          key={`${visit.id}:${visit.date}:${visit.time}:${visit.endTime}:${visit.clientResponse}`}
          visit={visit}
          onSaved={() => router.refresh()}
        />
      </section>
      <section aria-labelledby='visit-history-title' className={styles.card}>
        <h2 id='visit-history-title' className='text-lg font-semibold'>
          Visit history
        </h2>
        {visit.history?.length ? (
          <ol className='divide-y divide-slate-200'>
            {visit.history.map((event) => (
              <li key={event.id} className='space-y-2 py-3'>
                <h3 className='font-semibold'>{visitEventLabel(event)}</h3>
                <p className='text-sm text-slate-600'>
                  {formatUKSchedule(event.recordedAt)}
                </p>
                <VisitEventDetails event={event} />
              </li>
            ))}
          </ol>
        ) : (
          <p className='text-sm text-slate-600'>
            There are no recorded slot changes for this visit.
          </p>
        )}
      </section>
    </div>
  );
}
