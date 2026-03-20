import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Two-Factor Authentication | Mintenance',
  description:
    'Complete two-factor authentication to securely access your Mintenance account.',
};

export default function AuthMfaVerifyLayout({
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
