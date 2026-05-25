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
  return {
    jobId: pick('jobId', 'job_id'),
    conversationId: pick('conversationId', 'conversation_id'),
    meetingId: pick('meetingId', 'meeting_id'),
    senderId: pick('senderId', 'sender_id'),
    senderName: pick('senderName', 'sender_name'),
    jobTitle: pick('jobTitle', 'job_title'),
    quoteId: pick('quoteId', 'quote_id'),
    notificationId: pick('notificationId', 'notification_id'),
    propertyId: pick('propertyId', 'property_id'),
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
      return p.jobId ? jobDetailsRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    case 'bid_received':
      return p.jobId ? bidReviewRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    case 'bid_accepted':
      return p.jobId ? jobDetailsRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

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
