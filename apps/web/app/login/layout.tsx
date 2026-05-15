import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | Mintenance',
  description:
    'Sign in to your Mintenance account to manage projects, message contractors, and track home maintenance.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        // 2026-05-13: Mint Editorial — mint-tinted background + brand
        // spinner so the loading flash matches the redesigned page.
        // `data-theme` makes the --me-* tokens resolve on this subtree.
        <div
          data-theme='mint-editorial'
          className='min-h-screen flex items-center justify-center'
          style={{ background: 'var(--me-bg)' }}
        >
          <div
            className='animate-spin h-10 w-10 rounded-full'
            style={{
              border: '4px solid var(--me-brand-soft)',
              borderTopColor: 'var(--me-brand)',
            }}
          />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
