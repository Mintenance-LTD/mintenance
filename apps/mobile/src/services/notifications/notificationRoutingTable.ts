/**
 * Notification Routing Table — single source of truth for mapping a
 * notification (type + payload) to a navigation target.
 *
 * 2026-04-30 audit P1: previously two surfaces (`NotificationDeepLink`
 * for OS notification taps + `notificationNavigation` for in-app
 * notification list taps) implemented overlapping switch statements
 * that disagreed on `meeting_scheduled`, `bid_received`, and key
 * casing. This module now owns the mapping and both surfaces delegate
 * here so behaviour is consistent regardless of where the user tapped.
 *
 * The returned shape mirrors the `navigation.navigate(<screen>, ...)`
 * call signature React Navigation expects, including the
 * `screen`/`params` nesting for nested navigators.
 */
import type { NotificationData } from './types';

/**
 * Top-level navigation actions correspond to the root stack screens
 * registered in `navigation/types.ts` (`Main`, `Modal`, plus the root-
 * level booking screens).
 */
export interface NotificationRoute {
  screen: string;
  params?: Record<string, unknown>;
}

interface NormalizedPayload {
  jobId?: string;
  conversationId?: string;
  meetingId?: string;
  senderId?: string;
  senderName?: string;
  jobTitle?: string;
  quoteId?: string;
  notificationId?: string;
  // 2026-05-24 audit-37 P2: property-scoped notifications (tenant
  // linking, property team invite accepted, etc.) carry property_id
  // in their metadata. Normalising it here lets the router deep-link
  // to PropertyDetail instead of dropping the recipient on the inbox.
  propertyId?: string;
  // 2026-05-25 audit-43 P1: appointment_scheduled push from
  // /api/contractor/appointments POST ships appointmentId. Standalone
  // appointments (no jobId) deep-link to Calendar instead of falling
  // through to inbox.
  appointmentId?: string;
}

/**
 * 2026-05-26 audit-54 P2: parse common actionUrl path patterns into
 * the same ID shape we get from metadata. Live data showed many
 * notifications (esp. message_received synthesised at
 * /api/notifications) carry only `actionUrl` and no metadata, so
 * without this parse the router has nothing to deep-link with even
 * though the URL itself encodes the IDs. Returns a partial payload —
 * caller merges these as a fallback for unset metadata fields.
 *
 * Supported patterns:
 *   /jobs/:jobId                    → { jobId }
 *   /contractor/jobs/:jobId         → { jobId }
 *   /messages/:jobId(?...)          → { jobId, conversationId, senderId,
 *                                       senderName, jobTitle } (jobId
 *                                       doubles as conversationId per
 *                                       app convention; ?userId / ?userName
 *                                       / ?jobTitle query params pulled
 *                                       from the synthesised URL)
 *   /properties/:propertyId         → { propertyId }
 */
function pickFromUuidPath(
  pathname: string,
  prefix: string
): string | undefined {
  if (!pathname.startsWith(prefix)) return undefined;
  const rest = pathname.slice(prefix.length).replace(/^\/+/, '');
  const seg = rest.split(/[/?#]/)[0];
  // UUID-ish guard (string length + characters). Avoids capturing the
  // literal `new` or other route keywords.
  return seg && /^[0-9a-f-]{8,}$/i.test(seg) ? seg : undefined;
}

function parseActionUrl(actionUrl?: string): Partial<NormalizedPayload> {
  if (!actionUrl) return {};
  let pathname = actionUrl;
  let search = '';
  try {
    // actionUrl may be a relative path like `/jobs/<id>` or an absolute
    // mintenance://… URL. URL constructor needs a base for relative.
    const u = new URL(actionUrl, 'https://placeholder.invalid');
    pathname = u.pathname;
    search = u.search;
  } catch {
    // Fall through with raw string as pathname.
  }
  const qp = new URLSearchParams(search);
  const out: Partial<NormalizedPayload> = {};

  // /contractor/jobs/:id  (check before /jobs/ for prefix specificity)
  const contractorJobId = pickFromUuidPath(pathname, '/contractor/jobs');
  if (contractorJobId) out.jobId = contractorJobId;

  if (!out.jobId) {
    const jobId = pickFromUuidPath(pathname, '/jobs');
    if (jobId) out.jobId = jobId;
  }

  // /messages/:jobId — conversationId IS jobId by app convention.
  // /api/notifications synthesises action_url like
  // `/messages/<jobId>?userId=<senderId>&userName=<senderName>&jobTitle=Job`.
  //
  // 2026-05-26 audit-62 P1: also accept the query-string variant
  // `/messages?jobId=<jobId>` emitted by /api/messages/threads/[id]/
  // messages on every new message. Live DB had 32 of 36
  // message_received rows using this shape — the path-only check
  // above returned undefined for them, the router fell back to the
  // notifications inbox, and the chat surface stayed unreachable.
  const messageJobIdFromPath = pickFromUuidPath(pathname, '/messages');
  const messageJobIdFromQuery =
    !messageJobIdFromPath && pathname === '/messages' ? qp.get('jobId') : null;
  const messageJobId = messageJobIdFromPath ?? messageJobIdFromQuery ?? null;
  if (messageJobId) {
    out.jobId = out.jobId ?? messageJobId;
    out.conversationId = messageJobId;
    const userId = qp.get('userId') ?? qp.get('senderId');
    if (userId) out.senderId = userId;
    const userName = qp.get('userName') ?? qp.get('senderName');
    if (userName) out.senderName = userName;
    const jobTitle = qp.get('jobTitle');
    if (jobTitle) out.jobTitle = jobTitle;
  }

  // /properties/:id
  const propertyId = pickFromUuidPath(pathname, '/properties');
  if (propertyId) out.propertyId = propertyId;

  return out;
}

/**
 * Notification payloads come in both camelCase (mobile push) and
 * snake_case (web-originated push). Normalize once.
 */
export function normalizePayload(data: unknown): NormalizedPayload {
  const d = (data ?? {}) as Record<string, unknown>;
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = d[k];
      if (typeof v === 'string' && v.length > 0) return v;
    }
    return undefined;
  };

  // 2026-05-26 audit-54 P2: parse the actionUrl as a fallback. Live
  // data showed 36 message_received rows where only action_url was
  // populated and the router fell through to the inbox.
  const actionUrl = pick('actionUrl', 'action_url', 'url', 'link');
  const fromUrl = parseActionUrl(actionUrl);

  return {
    jobId: pick('jobId', 'job_id') ?? fromUrl.jobId,
    conversationId:
      pick('conversationId', 'conversation_id') ?? fromUrl.conversationId,
    meetingId: pick('meetingId', 'meeting_id'),
    senderId: pick('senderId', 'sender_id') ?? fromUrl.senderId,
    senderName: pick('senderName', 'sender_name') ?? fromUrl.senderName,
    jobTitle: pick('jobTitle', 'job_title') ?? fromUrl.jobTitle,
    quoteId: pick('quoteId', 'quote_id'),
    notificationId: pick('notificationId', 'notification_id'),
    propertyId: pick('propertyId', 'property_id') ?? fromUrl.propertyId,
    appointmentId: pick('appointmentId', 'appointment_id'),
  };
}

const HOME_FALLBACK: NotificationRoute = {
  screen: 'Main',
  params: { screen: 'HomeTab' },
};

const NOTIFICATIONS_FALLBACK: NotificationRoute = {
  screen: 'Modal',
  params: { screen: 'Notifications' },
};

function jobDetailsRoute(jobId: string): NotificationRoute {
  return {
    screen: 'Main',
    params: {
      screen: 'JobsTab',
      params: { screen: 'JobDetails', params: { jobId } },
    },
  };
}

function bidReviewRoute(jobId: string): NotificationRoute {
  return {
    screen: 'Main',
    params: {
      screen: 'JobsTab',
      params: { screen: 'BidReview', params: { jobId } },
    },
  };
}

// 2026-05-24 audit-37 P2: PropertyDetail lives under
// ProfileTab → ProfileNavigator (see ProfileAccountNavigator). The
// route param is `propertyId`. Notifications that scope to a single
// property (tenant_linked, future property_team_* events) deep-link
// here instead of dropping the user on the generic inbox.
function propertyDetailRoute(propertyId: string): NotificationRoute {
  return {
    screen: 'Main',
    params: {
      screen: 'ProfileTab',
      params: {
        screen: 'PropertyDetail',
        params: { propertyId },
      },
    },
  };
}

/**
 * Map a notification to a route.
 *
 * 2026-04-30 audit P1 follow-up: previously returned `null` on unknown
 * types, which made the OS-tap path silently drop and the in-app path
 * fall back to HomeTab. Both diverged from the documented contract
 * ("unknown notification types fall back to the in-app notifications
 * inbox"). This function now ALWAYS returns a route — unknown types,
 * missing payloads, and missing `type` all funnel to
 * `NOTIFICATIONS_FALLBACK` so the user lands on the inbox where they
 * can pick the correct notification manually.
 */
export function routeForNotification(
  type: NotificationData['type'] | string | undefined,
  data: unknown
): NotificationRoute {
  if (!type) return NOTIFICATIONS_FALLBACK;
  const p = normalizePayload(data);

  switch (type) {
    case 'job_update':
    case 'job_started':
    case 'job_completed':
    case 'review_requested':
    case 'contract_created':
    case 'contract_signed':
    case 'payment_released':
    case 'bid_rejected':
    // 2026-05-27 audit-70 P1: live notifications table has 6
    // `job_nearby` rows (contractor proximity alerts emitted when a
    // new job posts in their service area), 2 `job_assigned`, 1
    // `completion_confirmed`, 1 `job_confirmed`, and 1 each of
    // `contract_pending_signature` and `message` — none were routed.
    // All carry metadata.jobId (verified via web emitters); deep-link
    // to JobDetails which surfaces the relevant CTA per role.
    //   - job_nearby → contractor sees Bid CTA on the job
    //   - job_assigned → either party sees status + contract surface
    //   - completion_confirmed → homeowner sees the next step
    //   - contract_pending_signature → "your turn to sign" lands on
    //     the JobDetails surface where ContractManagement renders
    //   - job_confirmed → assignment confirmation deep-link
    case 'job_nearby':
    case 'job_assigned':
    case 'completion_confirmed':
    case 'contract_pending_signature':
    case 'job_confirmed':
    // 2026-05-24 audit-36 P1: contractor tracking push types from
    // /api/contractor/trips (POST + PATCH). Previously fell through
    // to the default NOTIFICATIONS_FALLBACK, so a homeowner tapping
    // "Contractor is on the way" or "Contractor arrived" landed in
    // the inbox instead of the job tracking/detail screen. The push
    // metadata carries jobId (see route.ts:196 / [id]/route.ts:111),
    // so jobDetailsRoute resolves cleanly. job_terminated reuses the
    // same path so the contractor-withdraw notification deep-links
    // too.
    case 'contractor_en_route':
    case 'contractor_arrived':
    case 'job_terminated':
    // 2026-05-24 audit-39 P1: /api/jobs/[id]/request-location ships
    // type='location_sharing_request' so the homeowner can ask the
    // assigned contractor to start live location sharing. The push
    // metadata carries jobId; deep-linking to JobDetails lands the
    // contractor on the screen where ContractorLocationSection
    // exposes the "Share location" toggle. Previously fell through
    // to NOTIFICATIONS_FALLBACK.
    case 'location_sharing_request':
    case 'location_sharing_started':
    case 'location_sharing_stopped':
    // 2026-05-27 audit-70 P2: web /api/jobs/[id]/enable-location-
    // sharing fires `location_sharing_enabled` (not `_started`),
    // so a homeowner tapping "Contractor is sharing their
    // location" used to land on the inbox instead of JobDetails.
    // Treat both spellings the same.
    case 'location_sharing_enabled':
      return p.jobId ? jobDetailsRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    case 'bid_received':
      return p.jobId ? bidReviewRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    case 'bid_accepted':
      return p.jobId ? jobDetailsRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    // 2026-05-27 audit-70 P1: bare 'message' is a legacy/alias type
    // emitted by older paths; live DB still has one row. Fall through
    // to the same handler as message_received so the chat surface
    // resolves identically.
    case 'message':
    case 'message_received': {
      // 2026-05-23 audit-16 P1: web POST /api/messages/threads/:id/messages
      // ships metadata `{ jobId, senderId }` (snake_cased as `job_id` /
      // `sender_id` over the FCM/Expo wire). It does NOT include a
      // separate conversationId — by the app's convention conversationId
      // IS the jobId (MessagingScreen destructures `conversationId: jobId`
      // and the thread endpoint resolves directly off jobs). Fall back to
      // jobId so notification taps land on the actual chat instead of the
      // generic inbox.
      const threadId = p.conversationId ?? p.jobId;
      if (threadId) {
        return {
          screen: 'Main',
          params: {
            screen: 'MessagingTab',
            params: {
              screen: 'Messaging',
              params: {
                conversationId: threadId,
                jobTitle: p.jobTitle ?? '',
                recipientId: p.senderId ?? '',
                recipientName: p.senderName ?? '',
              },
            },
          },
        };
      }
      return NOTIFICATIONS_FALLBACK;
    }

    case 'meeting_scheduled':
      if (p.meetingId) {
        return {
          screen: 'Modal',
          params: {
            screen: 'MeetingDetails',
            params: { meetingId: p.meetingId },
          },
        };
      }
      return {
        screen: 'Main',
        params: { screen: 'ProfileTab', params: { screen: 'Calendar' } },
      };

    // 2026-05-25 audit-43 P1: scheduling fan-out. Both events carry
    // metadata.jobId from the web routes (appointment_scheduled also
    // carries appointmentId for the standalone case where the booking
    // isn't tied to a job). Job-linked → JobDetails; otherwise drop the
    // user on Calendar where they can see the new slot in context.
    // Previously both fell through to the inbox.
    case 'appointment_scheduled':
    case 'job_scheduled':
      if (p.jobId) return jobDetailsRoute(p.jobId);
      return {
        screen: 'Main',
        params: { screen: 'ProfileTab', params: { screen: 'Calendar' } },
      };

    // 2026-05-25 audit-44 P1: admin verification outcomes. Deep-link
    // contractors to VerificationStatus where the badge / next step
    // lives (ProfileTab → ProfileNavigator → VerificationStatus —
    // registered in ProfileBusinessNavigator). Previously fell through
    // to the inbox, so the contractor had to manually navigate to see
    // whether admin approved or rejected their submission.
    case 'verification_approved':
    case 'verification_rejected':
      return {
        screen: 'Main',
        params: {
          screen: 'ProfileTab',
          params: { screen: 'VerificationStatus' },
        },
      };

    case 'payment_received':
      return p.jobId
        ? jobDetailsRoute(p.jobId)
        : {
            screen: 'Main',
            params: {
              screen: 'ProfileTab',
              params: { screen: 'PaymentHistory' },
            },
          };

    // 2026-05-25 audit-45 P1: tip-payment webhook fires this when a
    // homeowner's tip clears Stripe. Carries metadata.jobId from
    // tip-payment-handler.ts (added in same audit) so we can deep-link
    // to the contractor's JobDetails where the TipsReceivedSection
    // surfaces. Fall back to PaymentHistory if jobId somehow missing.
    case 'job_tip_received':
      return p.jobId
        ? jobDetailsRoute(p.jobId)
        : {
            screen: 'Main',
            params: {
              screen: 'ProfileTab',
              params: { screen: 'PaymentHistory' },
            },
          };

    case 'quote_sent':
      return p.jobId ? jobDetailsRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    // 2026-05-23 audit-16 P2: the job-review API sends `review` to the
    // reviewee + `review_milestone` for 5-star milestone counts (10/25/
    // 50/100). Previously neither was routed — only the older
    // `review_requested` type was — so contractors' "Tap to read it
    // and reply" CTA fell back to the generic inbox. Route reviews
    // to JobDetails when jobId metadata is present (works for both
    // sides because the job page shows received reviews); fall back
    // to the contractor Reviews list. Milestones always land on the
    // Reviews list since there's no per-job milestone payload.
    case 'review':
      return p.jobId
        ? jobDetailsRoute(p.jobId)
        : {
            screen: 'Main',
            params: {
              screen: 'ProfileTab',
              params: { screen: 'Reviews' },
            },
          };

    case 'review_milestone':
      return {
        screen: 'Main',
        params: {
          screen: 'ProfileTab',
          params: { screen: 'Reviews' },
        },
      };

    case 'system':
      return HOME_FALLBACK;

    // 2026-05-24 audit-37 P2: tenant-linking notifications fire when
    // an invited tenant accepts the invite. The web POST that sends
    // them includes metadata.property_id (see /api/properties/[id]/
    // tenants/accept). Previously fell through to the inbox.
    case 'tenant_linked':
    case 'property_team_invite':
    case 'property_team_invite_accepted':
      return p.propertyId
        ? propertyDetailRoute(p.propertyId)
        : NOTIFICATIONS_FALLBACK;

    default:
      // Unknown / future notification types — open the inbox so the
      // user can still see the body. Better than a silent drop or a
      // confusing HomeTab landing.
      return NOTIFICATIONS_FALLBACK;
  }
}
