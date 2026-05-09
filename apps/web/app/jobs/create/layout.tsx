import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getCurrentUserFromCookies,
  getCurrentUserFromHeaders,
} from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Post a Job | Mintenance',
};

/**
 * AUDIT_PUNCH_LIST P1 #13 (A-P1-3) — server-side auth gate added
 * 2026-05-09. Was a `'use client'` page with auth check on the
 * client, which briefly flashed protected content before
 * redirecting unauthenticated visitors. The layout is a server
 * component, so the auth check completes before the client page
 * ever hydrates.
 *
 * Resolution order: middleware-injected headers (fast, common) →
 * cookie-based check (slow, fallback). Same pattern used by
 * `/jobs/tracking/page.tsx`.
 */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }
  if (!user) {
    redirect('/login?redirect=/jobs/create');
  }

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
