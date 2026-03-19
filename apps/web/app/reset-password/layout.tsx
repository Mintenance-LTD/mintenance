import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Set New Password | Mintenance',
  description:
    'Create a new password for your Mintenance account. Your reset link is valid for one hour.',
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center bg-[#F9FAFB]'>
          <div className='animate-spin h-10 w-10 border-4 border-teal-500 border-t-transparent rounded-full' />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
