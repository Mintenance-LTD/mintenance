import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search | Mintenance',
  description:
    'Search for maintenance jobs and verified contractors with advanced filters.',
};

export default function SearchLayout({
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
