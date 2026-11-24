import Link from 'next/link';
import { contractorJobReference } from '@mintenance/shared';
import type { QuoteLinkedJob } from '@/lib/quotes/effective-quotes';

export function QuoteJobLink({ job }: { job: QuoteLinkedJob }) {
  return (
    <div className='space-y-1 text-sm'>
      <p className='font-semibold'>
        {contractorJobReference(job.id)} · {job.nextStep}
      </p>
      <Link
        href={`/contractor/jobs/${job.id}`}
        className='font-semibold underline'
      >
        View job
      </Link>
    </div>
  );
}
