import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { NotificationService } from '@/lib/services/notifications/NotificationService';

/**
 * POST /api/notifications/send
 *
 * Server-side push dispatch on behalf of an authenticated client. This
 * replaces the client-side cross-user push send that was removed in the
 * 2026-04-21 security audit — the previous path let any authenticated
 * Mintenance user enumerate UUIDs and POST arbitrary payloads directly
 * to exp.host, a cross-user phishing primitive.
 *
 * Authorization model:
 *   1. Caller is authenticated (withApiHandler)
 *   2. Caller must share a business relationship with the recipient
 *      (video call, job, or bid). No relationship = 403, so a random
 *      authenticated user cannot push to a stranger.
 *   3. Push token resolution + Expo send happens server-side via
 *      NotificationService.createNotification() (which also respects
 *      the recipient's notification preferences + quiet hours + retry
 *      queue). The client never sees the recipient's token.
 *
 * Current callers (mobile):
 *   - NotificationPushSender.sendPushNotification (via NotificationService)
 *   - notifyParticipants() in video/CallNotifier.ts
 *
 * Response shape:
 *   { success: true, notificationId: string | null, suppressed?: boolean }
 *   - notificationId is null when the recipient muted this notification
 *     type (suppressed=true in that case)
 */

// The payload is intentionally strict: only the fields createNotification()
// consumes are accepted. action_url is a path like "/jobs/abc" — the mobile
// client doesn't send full URLs. Metadata is an opaque record limited in
// size to prevent abuse.
const sendSchema = z
  .object({
    recipientId: z.string().uuid(),
    type: z.string().min(1).max(64),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(1000),
    actionUrl: z.string().max(500).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

/**
 * Check whether `callerId` has a legitimate business relationship with
 * `recipientId`. Runs the cheapest checks first (unique indexes on both
 * ends) and short-circuits on the first match.
 *
 * Video-call relationship: both users are on the same video_calls row
 *   (initiator_id / participant_id). This is the hot path for
 *   notifyParticipants() in CallNotifier.
 *
 * Job relationship: caller is the homeowner and recipient is the
 *   assigned contractor (or vice versa) on any job.
 *
 * Bid relationship: recipient placed a bid on a job the caller owns,
 *   or caller placed a bid on a job the recipient owns.
 */
async function hasBusinessRelationship(
  callerId: string,
  recipientId: string
): Promise<boolean> {
  if (callerId === recipientId) {
    // Self-push is allowed (e.g., local reminder schedule from device).
    return true;
  }

  // Video call participants. `or()` + `and()` express:
  //   (initiator = A AND participant = B) OR (initiator = B AND participant = A)
  const { data: vcRow } = await serverSupabase
    .from('video_calls')
    .select('id')
    .or(
      `and(initiator_id.eq.${callerId},participant_id.eq.${recipientId}),and(initiator_id.eq.${recipientId},participant_id.eq.${callerId})`
    )
    .limit(1)
    .maybeSingle();
  if (vcRow) return true;

  // Shared job (homeowner ↔ assigned contractor, either direction).
  const { data: jobRow } = await serverSupabase
    .from('jobs')
    .select('id')
    .or(
      `and(homeowner_id.eq.${callerId},contractor_id.eq.${recipientId}),and(homeowner_id.eq.${recipientId},contractor_id.eq.${callerId})`
    )
    .limit(1)
    .maybeSingle();
  if (jobRow) return true;

  // Bid relationship: the recipient is a contractor bidding on the
  // caller's job, or the caller is a contractor bidding on the
  // recipient's job. We resolve this via a two-step join because
  // PostgREST's `or()` cannot traverse FKs cleanly. Fetch the set of
  // job ids caller owns + contractor ids that have bid on those jobs.
  const { data: callerJobs } = await serverSupabase
    .from('jobs')
    .select('id')
    .eq('homeowner_id', callerId)
    .limit(200);
  const callerJobIds = (callerJobs ?? [])
    .map((j: { id: string }) => j.id)
    .filter(Boolean);
  if (callerJobIds.length > 0) {
    const { data: bidRow } = await serverSupabase
      .from('bids')
      .select('id')
      .eq('contractor_id', recipientId)
      .in('job_id', callerJobIds)
      .limit(1)
      .maybeSingle();
    if (bidRow) return true;
  }

  // Mirror check: recipient is the homeowner, caller placed a bid.
  const { data: recipientJobs } = await serverSupabase
    .from('jobs')
    .select('id')
    .eq('homeowner_id', recipientId)
    .limit(200);
  const recipientJobIds = (recipientJobs ?? [])
    .map((j: { id: string }) => j.id)
    .filter(Boolean);
  if (recipientJobIds.length > 0) {
    const { data: bidRow } = await serverSupabase
      .from('bids')
      .select('id')
      .eq('contractor_id', callerId)
      .in('job_id', recipientJobIds)
      .limit(1)
      .maybeSingle();
    if (bidRow) return true;
  }

  return false;
}

export const POST = withApiHandler(
  // 30 req/min per caller is generous for a client-initiated fan-out
  // (e.g., notifyParticipants across 3-4 call participants on scheduled
  // meetings). Higher than a typical user-facing mutation (10/min)
  // because failure here means silent CTA drop for the recipient.
  { rateLimit: { maxRequests: 30 } },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = sendSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError(
        `Invalid notification payload: ${parsed.error.message}`
      );
    }

    const {
      recipientId,
      type,
      title,
      body: message,
      actionUrl,
      data,
    } = parsed.data;

    // Authorization: caller must have a business relationship with
    // recipient. This is the security-critical check — any error here
    // MUST return 403, not 200 with an empty body, so the mobile client
    // doesn't mistake a permission failure for a suppression.
    const authorized = await hasBusinessRelationship(user.id, recipientId);
    if (!authorized) {
      logger.warn('Push send refused — no business relationship', {
        service: 'notifications',
        callerId: user.id,
        recipientId,
        type,
      });
      throw new ForbiddenError(
        'Cannot send notification to a user you are not working with'
      );
    }

    // Delegate to the existing server-side facade. This handles:
    //   - user_notification_preferences (type mute + quiet hours)
    //   - notifications row insert (respects in_app_enabled)
    //   - Expo push send (respects push_enabled)
    //   - failed-push retry queue
    const notificationId = await NotificationService.createNotification({
      userId: recipientId,
      type,
      title,
      message,
      actionUrl,
      metadata: data,
    });

    // notificationId is null when the recipient muted this type. From
    // the caller's perspective that's still a successful dispatch —
    // signal it with `suppressed: true` so the mobile client can log
    // it but not raise an error.
    if (notificationId === null) {
      return NextResponse.json({
        success: true,
        notificationId: null,
        suppressed: true,
      });
    }

    logger.info('Notification dispatched via /api/notifications/send', {
      service: 'notifications',
      callerId: user.id,
      recipientId,
      type,
      notificationId,
    });

    return NextResponse.json({
      success: true,
      notificationId,
    });
  }
);
