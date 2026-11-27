import Link from 'next/link';
import { reportConversationHref } from '@/lib/reports/conversation-navigation';

export function ReportConversationLink({
  reportId,
  propertyId,
  jobId,
  status,
}: {
  reportId: string;
  propertyId?: string;
  jobId?: string | null;
  status: string;
}) {
  return (
    <nav aria-label='Case links' className='flex flex-wrap items-center gap-3'>
      <Link
        className='rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800'
        href={reportConversationHref(reportId, 'tenant-reports')}
      >
        Open repair case
      </Link>
      {propertyId && (
        <Link className='underline' href={`/properties/${propertyId}`}>
          Open property
        </Link>
      )}
      {jobId && (
        <Link className='underline' href={`/jobs/${jobId}`}>
          Open linked job
        </Link>
      )}
      {!jobId && (
        <p className='w-full text-sm text-slate-600'>
          {status === 'converted'
            ? 'No linked job recorded.'
            : 'Review evidence and hand work to your property team. No marketplace job is needed.'}
        </p>
      )}
    </nav>
  );
}
