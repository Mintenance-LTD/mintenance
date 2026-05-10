import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getCurrentUserFromCookies,
  getCurrentUserFromHeaders,
} from '@/lib/auth';

/**
 * AUDIT_PUNCH_LIST P1 #13 (A-P1-3) — server-side auth gate added
 * 2026-05-09 for `/jobs/[id]/review`. The page is `'use client'`
 * and was checking auth on the client, which briefly flashed the
 * review form before redirecting unauthenticated visitors. The
 * server-side gate redirects before any client component renders.
 *
 * Job-participation check (homeowner-or-contractor of completed job)
 * stays in the page; this gate only enforces "must be authenticated".
 */
export default async function ReviewLayout({
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
    redirect(`/login?redirect=/jobs/${id}/review`);
  }

  return children;
}
