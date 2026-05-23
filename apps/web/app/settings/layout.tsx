import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getCurrentUserFromCookies,
  getCurrentUserFromHeaders,
} from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Settings | Mintenance',
};

/**
 * 2026-05-23 audit P2: settings/page.tsx is a client component that
 * returned `null` when no user — meaning unauthenticated visitors saw
 * a blank screen instead of being redirected. Other protected segments
 * (/jobs/quick-create, /dashboard) use a server-side layout gate; this
 * one didn't, so it could produce blank-page behaviour in odd states
 * (expired session, link-preview crawlers, hard navigations).
 *
 * Pattern matches apps/web/app/jobs/quick-create/layout.tsx — check
 * cookies/headers on the server, redirect to /login with a return URL
 * before any client hydration.
 */
export const dynamic = 'force-dynamic';

export default async function SettingsLayout({
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
    redirect('/login?redirect=/settings');
  }

  return <>{children}</>;
}
