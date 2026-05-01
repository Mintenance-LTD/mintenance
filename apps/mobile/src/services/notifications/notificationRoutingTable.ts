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
      return p.jobId ? jobDetailsRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    case 'bid_received':
      return p.jobId ? bidReviewRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    case 'bid_accepted':
      return p.jobId ? jobDetailsRoute(p.jobId) : NOTIFICATIONS_FALLBACK;

    case 'message_received':
      if (p.conversationId) {
        return {
          screen: 'Main',
          params: {
            screen: 'MessagingTab',
            params: {
              screen: 'Messaging',
              params: {
                conversationId: p.conversationId,
                jobTitle: p.jobTitle ?? '',
                recipientId: p.senderId ?? '',
                recipientName: p.senderName ?? '',
              },
            },
          },
        };
      }
      return NOTIFICATIONS_FALLBACK;

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

    case 'system':
      return HOME_FALLBACK;

    default:
      // Unknown / future notification types — open the inbox so the
      // user can still see the body. Better than a silent drop or a
      // confusing HomeTab landing.
      return NOTIFICATIONS_FALLBACK;
  }
}
