import { redirect } from 'next/navigation';

/**
 * 2026-05-23: retired. Was a separate silver-mode 3-step wizard that
 * duplicated /jobs/create's validation, submit pipeline, and budget /
 * room-scope handling — already starting to drift (audit P2). Now a
 * server-side redirect to /jobs/create, which respects the user's
 * silver-mode preference via the shared useSilverMode hook.
 *
 * Kept the route file (rather than deleting the directory) so any
 * outbound link / push notification deep-link still lands on the
 * canonical wizard instead of 404'ing.
 */
export default function PostJobWizardRedirectPage() {
  redirect('/jobs/create');
}
