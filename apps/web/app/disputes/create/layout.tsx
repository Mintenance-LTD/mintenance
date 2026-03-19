import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Dispute | Mintenance',
  description:
    'File a dispute for a property maintenance job with evidence and priority level.',
};

export default function CreateDisputeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center'>
          <div className='animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full' />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
