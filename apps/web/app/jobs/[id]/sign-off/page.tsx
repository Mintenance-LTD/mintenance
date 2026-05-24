/**
 * /jobs/[id]/sign-off — DEPRECATED, redirects to canonical job detail.
 *
 * 2026-05-24 audit-33 P1: this page (and its JobSignOffClient component)
 * allowed a homeowner to enter sign-off when the job was NOT yet in
 * `completed` status, then directly `UPDATE jobs SET status='completed'`
 * from the client via the user's RLS-scoped supabase token. That path
 * bypassed every server-side completion guard:
 *   - PaymentEnforcement.canCompleteJob (no escrow ⇒ no completion)
 *   - after-photo evidence gate in /api/jobs/[id]/photos/after
 *   - state-machine validateStatusTransition
 *   - homeowner-approval idempotency in /confirm-completion
 *   - escrow auto-release scheduling
 *   - all contractor/homeowner/tenant/admin completion notifications
 *
 * It also collected a digital "signature" that the codebase never
 * actually attached to the job row (it lived for two seconds in state
 * and was forgotten on redirect).
 *
 * Real completion goes through:
 *   contractor uploads after-photos → /api/jobs/[id]/photos/after
 *     auto-completes the job → homeowner taps "Review Work" / Approve
 *     in /jobs/[id] which POSTs /api/jobs/[id]/confirm-completion.
 *
 * Keep the URL alive so external links / push notifications / emails
 * that may still reference it don't 404 — just redirect to the
 * canonical detail page where the legitimate Approve CTA lives.
 */
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Job — Mintenance',
  robots: { index: false, follow: false },
};

export default async function JobSignOffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/jobs/${id}`);
}
