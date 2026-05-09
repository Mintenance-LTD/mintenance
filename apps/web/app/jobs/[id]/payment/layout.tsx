import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getCurrentUserFromCookies,
  getCurrentUserFromHeaders,
} from '@/lib/auth';

/**
 * AUDIT_PUNCH_LIST P1 #13 (A-P1-3) — server-side auth gate added
 * 2026-05-09 for `/jobs/[id]/payment`. The page is `'use client'`
 * and was checking auth on the client, which briefly flashed the
 * payment form before redirecting unauthenticated visitors. The
 * server-side gate redirects before any client component renders.
 *
 * Notes:
 *   - Auth-only check. Job-ownership check stays in the page since
 *     we don't have the dynamic `id` param at this layout's scope
 *     in a Next-types-friendly way without a redundant fetch.
 *   - The `/login` redirect preserves the original target via the
 *     `redirect` query param, so post-login the user lands back on
 *     the payment page.
 */
export default async function PaymentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const headersList = await headers();
  let user = getCurrentUserFromHeaders(headersList as unknown as Headers);
  if (!user) {
    user = await getCurrentUserFromCookies();
  }
  if (!user) {
    const { id } = await params;
    redirect(`/login?redirect=/jobs/${id}/payment`);
  }

  return children;
}
