import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account | Mintenance',
  description:
    'Join Mintenance as a homeowner or contractor. Connect with local tradespeople and manage home maintenance projects with escrow-protected payments.',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        // 2026-05-15: Mint Editorial — mint-tinted background + brand
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
