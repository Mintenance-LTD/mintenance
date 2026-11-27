import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PROPERTY_JOB_STATUS_LABELS } from '@mintenance/shared';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { getCurrentUserFromCookies } from '@/lib/auth';
import {
  propertyRepairHref,
  propertyRepairQueueHref,
  propertyRepairQueueReturn,
} from '@/lib/properties/repair-navigation';
import { readPropertyRepair } from '@/lib/services/property-team/read-property-repair';
import { RepairFollowup } from './RepairFollowup';
import '../../components/property-workspace.css';

const dateTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/London',
});

export default async function PropertyRepairPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; jobId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, jobId } = await params;
  const query = await searchParams;
  const fromQueue = query.from === 'queue';
  const queueSearch = new URLSearchParams();
  if (fromQueue) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') queueSearch.set(key, value);
    }
  }
  const actor = await getCurrentUserFromCookies();
  if (!actor) {
    const target = fromQueue
      ? propertyRepairQueueHref(id, jobId, queueSearch)
      : propertyRepairHref(id, jobId);
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }
  const repair = await readPropertyRepair(actor.id, id, jobId);
  if (!repair) notFound();

  return (
    <HomeownerPageWrapper>
      <main className='property-workspace space-y-4'>
        <nav aria-label='Repair navigation' className='flex flex-wrap gap-4'>
          {fromQueue && (
            <Link
              href={propertyRepairQueueReturn(queueSearch)}
              className='pw-back'
            >
              Back to action queue
            </Link>
          )}
          <Link href={`/properties/${repair.property.id}`} className='pw-back'>
            Back to {repair.property.name}
          </Link>
        </nav>
        <header className='card card-pad'>
          <p className='text-sm text-slate-600'>
            {repair.property.name} · Property repair
          </p>
          <h1 className='t-h1'>{repair.title}</h1>
          <p className='mt-2 font-medium'>
            {PROPERTY_JOB_STATUS_LABELS[repair.status] || repair.status}
          </p>
          <p className='mt-2 text-sm text-slate-600'>
            Job reference {repair.id}
          </p>
          {repair.description && (
            <p className='mt-4 whitespace-pre-wrap'>{repair.description}</p>
          )}
        </header>
        <section className='card card-pad space-y-2'>
          <h2 className='t-h2'>Next step</h2>
          <p>{repair.nextAction}</p>
          {repair.dueAt && (
            <p>
              Follow-up due {dateTime.format(new Date(repair.dueAt))} UK time
            </p>
          )}
          {repair.canManageFollowup && (
            <RepairFollowup propertyId={repair.property.id} jobId={repair.id} />
          )}
        </section>
        <section className='card card-pad space-y-2'>
          <h2 className='t-h2'>Current work window</h2>
          {repair.start && (
            <p>Starts {dateTime.format(new Date(repair.start))} UK time</p>
          )}
          {repair.end && (
            <p>Ends {dateTime.format(new Date(repair.end))} UK time</p>
          )}
          {!repair.start && !repair.end && <p>No work window recorded.</p>}
          {repair.completedAt && (
            <p>
              Work marked complete{' '}
              {dateTime.format(new Date(repair.completedAt))} UK time
            </p>
          )}
        </section>
        <section className='card card-pad space-y-3'>
          <h2 className='t-h2'>Completion evidence</h2>
          {!repair.photos.length && <p>No before or after photos recorded.</p>}
          <div className='grid gap-4 sm:grid-cols-2'>
            {repair.photos.map((photo) => (
              <figure key={photo.id} className='space-y-1'>
                <figcaption>
                  {photo.kind === 'before' ? 'Before photo' : 'After photo'}
                </figcaption>
                {photo.url ? (
                  <a href={photo.url} target='_blank' rel='noreferrer'>
                    {/* eslint-disable-next-line @next/next/no-img-element -- Load private signed evidence directly. */}
                    <img
                      src={photo.url}
                      loading='lazy'
                      decoding='async'
                      alt={
                        photo.kind === 'before' ? 'Before work' : 'After work'
                      }
                      className='aspect-[4/3] w-full rounded-lg object-contain'
                    />
                  </a>
                ) : (
                  <p>Photo unavailable.</p>
                )}
              </figure>
            ))}
          </div>
        </section>
      </main>
    </HomeownerPageWrapper>
  );
}
