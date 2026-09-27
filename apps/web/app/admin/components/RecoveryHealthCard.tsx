'use client';
import { useQuery } from '@tanstack/react-query';
import { recoveryReportSchema } from '@/lib/operations/recovery-status';

const labels = {
  recent_success: 'Recent run completed',
  running: 'Running',
  missing: 'No recorded run',
  overdue: 'Overdue',
  failed: 'Failed',
  attention: 'Needs review',
  unknown: 'Unverified',
};

export function RecoveryHealthCard() {
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'recovery-health'],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/admin/recovery-health', {
        signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Unable to verify recovery jobs');
      return recoveryReportSchema.parse(await response.json());
    },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  return (
    <section
      aria-labelledby='recovery-heading'
      className='mb-8 rounded-2xl border border-slate-200 bg-white p-6'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2
          id='recovery-heading'
          className='text-xl font-semibold text-slate-900'
        >
          Recovery jobs
        </h2>
        <button
          type='button'
          onClick={() => void refetch()}
          disabled={isFetching}
          className='rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50'
        >
          {isFetching ? 'Checking…' : 'Refresh recovery status'}
        </button>
      </div>
      <p className='mt-2 text-sm text-slate-600'>
        Recorded runs for payment, account and evidence recovery. A completed
        run does not prove every provider action or notification was delivered.
      </p>
      {isError ? (
        <p role='alert' className='mt-4 text-red-700'>
          Recovery status could not be verified. Retry the check; previously
          loaded results are not current.
        </p>
      ) : isPending ? (
        <p role='status' className='mt-4'>
          Checking recorded runs…
        </p>
      ) : (
        data && (
          <>
            <p className='mt-3 text-sm text-slate-600'>
              Checked {new Date(data.checkedAt).toLocaleString('en-GB')}.
              Missing or overdue runs need a scheduler and logs check.
            </p>
            <ul className='mt-4 grid gap-3 md:grid-cols-3'>
              {data.jobs.map((job) => (
                <li
                  key={job.name}
                  className='rounded-xl border border-slate-200 p-3'
                >
                  <h3 className='font-medium text-slate-900'>{job.label}</h3>
                  <p
                    className={
                      job.state === 'recent_success' || job.state === 'running'
                        ? 'text-slate-700'
                        : 'font-semibold text-red-700'
                    }
                  >
                    {labels[job.state]}
                  </p>
                  <p className='mt-1 text-xs text-slate-600'>
                    Last completed run:{' '}
                    {job.lastSuccessAt
                      ? new Date(job.lastSuccessAt).toLocaleString('en-GB')
                      : 'None recorded'}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )
      )}
    </section>
  );
}
