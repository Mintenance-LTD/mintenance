import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getCurrentUserFromCookies,
  getCurrentUserFromHeaders,
} from '@/lib/auth';

/**
 * Route-segment config for /jobs/quick-create.
 *
 * The page uses `useSearchParams()` to read pre-fill params from the
 * AirbnbSearchBar (category / urgency / property_id). Under Next.js 16
 * + Turbopack, that forces a CSR bailout which fails static generation
 * without a Suspense boundary. The page file is already over the
 * repo's 500-line pre-commit gate so we cannot add the directive
 * inline; route-segment config on a layout applies to the page below
 * and keeps the page file untouched.
 *
 * AUDIT_PUNCH_LIST P1 #13 (A-P1-3) — server-side auth gate added
 * 2026-05-09. Was a `'use client'` page with auth check on the
 * client, briefly flashing protected content before redirect. The
 * layout runs the auth check on the server before hydration.
 */
export const dynamic = 'force-dynamic';

export default async function QuickCreateLayout({
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
    redirect('/login?redirect=/jobs/quick-create');
  }

  return children;
}
