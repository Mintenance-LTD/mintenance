import Link from 'next/link';

export function StartChecklist({
  funded,
  beforePhotoCount,
  windowPassed,
}: {
  funded: boolean;
  beforePhotoCount: number;
  windowPassed: boolean;
}) {
  return (
    <section
      aria-label='Start checklist'
      className='mb-4 rounded-lg border p-3'
    >
      <p className='text-sm font-semibold'>Start checklist</p>
      <ul className='mt-2 list-inside list-disc space-y-1 text-sm'>
        <li>
          {funded
            ? 'Customer payment secured'
            : 'Waiting for homeowner payment'}
        </li>
        <li>
          {beforePhotoCount
            ? 'Before photos uploaded'
            : 'Upload at least one before photo on site'}
        </li>
        {windowPassed && (
          <li>
            The scheduled work window has passed. Mintenance still allows you to
            start once the other checks pass and records the actual start time.
            If the visit did not go ahead, agree a new date with the homeowner
            first.{' '}
            <Link href='#job-schedule' className='underline'>
              View schedule
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
