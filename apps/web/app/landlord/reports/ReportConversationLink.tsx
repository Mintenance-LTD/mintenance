import Link from 'next/link';

export function ReportConversationLink({
  reportId,
  propertyId,
  jobId,
}: {
  reportId: string;
  propertyId?: string;
  jobId?: string | null;
}) {
  return (
    <nav aria-label='Case links' className='flex flex-wrap gap-4'>
      <Link className='underline' href={`/maintenance/reports/${reportId}`}>
        Open shared issue conversation
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
        <span className='text-sm text-slate-600'>No linked job recorded.</span>
      )}
    </nav>
  );
}
