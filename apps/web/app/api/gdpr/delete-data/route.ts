import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

/**
 * POST /api/gdpr/delete-data — DEPRECATED.
 *
 * 2026-05-26 audit-64 P1: this legacy route ran `delete_user_data`
 * directly with none of the protections the canonical
 * /api/user/delete-account flow now provides:
 *
 *   - no active-escrow / held-funds blocker (money would be left
 *     in limbo and the counter-party stranded)
 *   - no active-job blocker (assigned / in_progress jobs would lose
 *     their participant mid-work)
 *   - no signed-but-unfunded contract / open-dispute blocker
 *   - no Stripe subscription cancellation (billing would continue
 *     indefinitely against the orphan customer)
 *   - no auth.users deletion (credential survived; user could log
 *     back into a "deleted" account)
 *   - no token blacklisting (existing JWT cookies stayed valid
 *     until natural expiry)
 *
 * On top of that, the legacy route also tried to mark its
 * dsr_requests audit row 'completed' AFTER calling
 * delete_user_data — but the RPC deletes
 * `public.dsr_requests WHERE user_id = p_user_id`, so the
 * completion UPDATE matched zero rows. No audit trail of the
 * deletion was ever retained on this path.
 *
 * Grep across `apps/web/app` and `apps/mobile/src` shows zero
 * production callers. Mobile + web both call
 * /api/user/delete-account directly. The cleanest fix is to
 * deprovision this endpoint with a 410 Gone pointing callers at
 * the canonical route. Kept the file around as the migration
 * landing pad rather than deleting it outright so any old client
 * still pinned to this URL gets a clear error instead of a 404.
 */
export const POST = withApiHandler(
  { rateLimit: { maxRequests: 5 } },
  async (_request, { user }) => {
    logger.warn(
      'Deprecated /api/gdpr/delete-data hit — caller should use /api/user/delete-account',
      { service: 'gdpr', userId: user.id }
    );
    return NextResponse.json(
      {
        error: 'This deletion endpoint is no longer available.',
        message:
          'Account deletion now runs through /api/user/delete-account, which checks for active escrow, jobs, and subscriptions before removing data. Please use the in-app "Delete account" button or POST {confirmation:"DELETE"} to /api/user/delete-account.',
        code: 'DEPRECATED_DELETE_ENDPOINT',
        canonicalEndpoint: '/api/user/delete-account',
      },
      { status: 410 }
    );
  }
);
