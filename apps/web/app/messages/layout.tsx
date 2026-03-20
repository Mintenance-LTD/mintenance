import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages | Mintenance',
  description: 'View and manage your messages with contractors and homeowners.',
};

export default function MessagesLayout({
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
