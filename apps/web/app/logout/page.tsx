import type { Metadata } from 'next';
import LogoutClient from './LogoutClient';

export const metadata: Metadata = {
  title: 'Sign Out | Mintenance',
  description: 'Sign out of your Mintenance account securely.',
  // Prevent prefetching/crawlers from triggering this route accidentally.
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Logout Confirmation Page
 *
 * SAFETY: Visiting this URL must NOT log the user out. A browser prefetch,
 * crawler, embedded image, or stale link must not be able to destroy a
 * session by GET navigation. The actual logout is performed by the client
 * via POST /api/auth/logout (CSRF-protected) only after the user clicks
 * the "Sign out" button.
 */
export default function LogoutPage() {
  return <LogoutClient />;
}
