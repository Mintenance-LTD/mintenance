import type { Metadata } from 'next';
import { use } from 'react';
import Link from 'next/link';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';

export const metadata: Metadata = {
  title: 'Project Timeline | Mintenance',
  description:
    'View the detailed timeline and milestones for your property maintenance project.',
};

interface Params {
  params: Promise<{ jobId: string }>;
}

/**
 * Stub "rebuilding" placeholder for the per-job timeline. Web view
 * was never reached parity with the mobile timeline. Wraps in the
 * universal Mint Editorial / legacy shell so users land inside the
 * persistent sidebar instead of on an unframed page.
 *
 * Replace this with the real timeline UI once it's rebuilt; the
 * shell wrapper stays.
 */
export default function TimelinePage({ params }: Params) {
  const { jobId } = use(params);

  return (
    <HomeownerPageWrapper className='me-legacy-fit'>
      <div className='max-w-2xl mx-auto py-12 text-center'>
        <h1 className='text-3xl font-semibold text-gray-900 mb-3'>
          Project timeline
        </h1>
        <p className='text-gray-600 leading-relaxed mb-8'>
          Detailed project timelines are being rebuilt for the web dashboard.
          You can review and update milestones from the mobile application in
          the meantime.
        </p>
        <div className='flex flex-wrap items-center justify-center gap-3'>
          <Link
            href={`/jobs/${jobId}`}
            className='inline-flex items-center rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors'
          >
            View job details
          </Link>
          <Link
            href='/dashboard'
            className='inline-flex items-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}
