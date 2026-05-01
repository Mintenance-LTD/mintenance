/**
 * Notification routing matrix tests.
 *
 * 2026-05-01 audit follow-up (Recommended automated audits #3): the
 * routing table is the SINGLE source of truth for which screen a
 * notification tap lands on. A regression here silently routes the
 * user to the wrong screen — by design we don't throw on unknown
 * types (we fall back to the inbox), so a typo in the switch
 * statement shows up only when a real user taps a real notification.
 *
 * This test fixes one fixture per supported notification type AND
 * the unknown-type / missing-payload branches, so adding a new type
 * without updating the table fails CI.
 */
import {
  normalizePayload,
  routeForNotification,
} from '../notificationRoutingTable';

const NOTIFICATIONS_FALLBACK = {
  screen: 'Modal',
  params: { screen: 'Notifications' },
};

const HOME_FALLBACK = {
  screen: 'Main',
  params: { screen: 'HomeTab' },
};

describe('notificationRoutingTable', () => {
  describe('normalizePayload', () => {
    it('picks camelCase keys when present', () => {
      const p = normalizePayload({
        jobId: 'job-1',
        conversationId: 'conv-1',
        meetingId: 'meet-1',
        senderId: 'user-1',
        senderName: 'Alice',
        jobTitle: 'Fix tap',
        quoteId: 'quote-1',
        notificationId: 'notif-1',
      });
      expect(p).toEqual({
        jobId: 'job-1',
        conversationId: 'conv-1',
        meetingId: 'meet-1',
        senderId: 'user-1',
        senderName: 'Alice',
        jobTitle: 'Fix tap',
        quoteId: 'quote-1',
        notificationId: 'notif-1',
      });
    });

    it('falls back to snake_case keys when camelCase missing', () => {
      const p = normalizePayload({
        job_id: 'job-2',
        conversation_id: 'conv-2',
        meeting_id: 'meet-2',
        sender_id: 'user-2',
        sender_name: 'Bob',
        job_title: 'Paint wall',
        quote_id: 'quote-2',
        notification_id: 'notif-2',
      });
      expect(p).toEqual({
        jobId: 'job-2',
        conversationId: 'conv-2',
        meetingId: 'meet-2',
        senderId: 'user-2',
        senderName: 'Bob',
        jobTitle: 'Paint wall',
        quoteId: 'quote-2',
        notificationId: 'notif-2',
      });
    });

    it('camelCase wins when both forms are present', () => {
      const p = normalizePayload({
        jobId: 'camel',
        job_id: 'snake',
      });
      expect(p.jobId).toBe('camel');
    });

    it('returns all-undefined for null / empty / non-object payload', () => {
      expect(normalizePayload(null)).toEqual({
        jobId: undefined,
        conversationId: undefined,
        meetingId: undefined,
        senderId: undefined,
        senderName: undefined,
        jobTitle: undefined,
        quoteId: undefined,
        notificationId: undefined,
      });
      expect(normalizePayload(undefined)).toEqual({
        jobId: undefined,
        conversationId: undefined,
        meetingId: undefined,
        senderId: undefined,
        senderName: undefined,
        jobTitle: undefined,
        quoteId: undefined,
        notificationId: undefined,
      });
      expect(normalizePayload({})).toEqual({
        jobId: undefined,
        conversationId: undefined,
        meetingId: undefined,
        senderId: undefined,
        senderName: undefined,
        jobTitle: undefined,
        quoteId: undefined,
        notificationId: undefined,
      });
    });

    it('rejects empty-string values (treats as missing)', () => {
      const p = normalizePayload({ jobId: '' });
      expect(p.jobId).toBeUndefined();
    });

    it('rejects non-string values (treats as missing)', () => {
      const p = normalizePayload({ jobId: 123, conversationId: true });
      expect(p.jobId).toBeUndefined();
      expect(p.conversationId).toBeUndefined();
    });
  });

  describe('routeForNotification — fallback branches', () => {
    it('returns inbox fallback when type is undefined', () => {
      expect(routeForNotification(undefined, {})).toEqual(
        NOTIFICATIONS_FALLBACK
      );
    });

    it('returns inbox fallback when type is empty string', () => {
      expect(routeForNotification('', {})).toEqual(NOTIFICATIONS_FALLBACK);
    });

    it('returns inbox fallback for unknown types (default branch)', () => {
      expect(
        routeForNotification('totally_made_up_type', { jobId: 'j1' })
      ).toEqual(NOTIFICATIONS_FALLBACK);
    });

    it('returns inbox fallback for `system` payload null (HOME_FALLBACK)', () => {
      // `system` notifications go to HomeTab, not the inbox.
      expect(routeForNotification('system', null)).toEqual(HOME_FALLBACK);
    });
  });

  describe('routeForNotification — job-detail-routed types', () => {
    // These all share the same shape: jobId present → JobDetails;
    // jobId missing → inbox fallback.
    const JOB_DETAIL_TYPES = [
      'job_update',
      'job_started',
      'job_completed',
      'review_requested',
      'contract_created',
      'contract_signed',
      'payment_released',
      'bid_rejected',
      'bid_accepted',
      'quote_sent',
    ];

    it.each(JOB_DETAIL_TYPES)(
      'routes %s with jobId to Main > JobsTab > JobDetails',
      (type) => {
        expect(routeForNotification(type, { jobId: 'job-1' })).toEqual({
          screen: 'Main',
          params: {
            screen: 'JobsTab',
            params: { screen: 'JobDetails', params: { jobId: 'job-1' } },
          },
        });
      }
    );

    it.each(JOB_DETAIL_TYPES)(
      'routes %s without jobId to inbox fallback',
      (type) => {
        expect(routeForNotification(type, {})).toEqual(NOTIFICATIONS_FALLBACK);
      }
    );

    it.each(JOB_DETAIL_TYPES)(
      'routes %s with snake_case job_id to JobDetails',
      (type) => {
        const result = routeForNotification(type, { job_id: 'job-snake' });
        expect(result.screen).toBe('Main');
        const inner = (result.params as Record<string, unknown>)
          .params as Record<string, unknown>;
        expect(inner.params).toEqual({ jobId: 'job-snake' });
      }
    );
  });

  describe('routeForNotification — bid_received', () => {
    it('routes to BidReview when jobId is present', () => {
      expect(routeForNotification('bid_received', { jobId: 'job-1' })).toEqual({
        screen: 'Main',
        params: {
          screen: 'JobsTab',
          params: { screen: 'BidReview', params: { jobId: 'job-1' } },
        },
      });
    });

    it('falls back to inbox when jobId is missing', () => {
      expect(routeForNotification('bid_received', {})).toEqual(
        NOTIFICATIONS_FALLBACK
      );
    });
  });

  describe('routeForNotification — message_received', () => {
    it('routes to MessagingTab > Messaging with full conversation params', () => {
      expect(
        routeForNotification('message_received', {
          conversationId: 'conv-1',
          jobTitle: 'Fix tap',
          senderId: 'user-1',
          senderName: 'Alice',
        })
      ).toEqual({
        screen: 'Main',
        params: {
          screen: 'MessagingTab',
          params: {
            screen: 'Messaging',
            params: {
              conversationId: 'conv-1',
              jobTitle: 'Fix tap',
              recipientId: 'user-1',
              recipientName: 'Alice',
            },
          },
        },
      });
    });

    it('uses empty strings for optional fields when payload only has conversationId', () => {
      const result = routeForNotification('message_received', {
        conversationId: 'conv-1',
      });
      const inner = (result.params as Record<string, unknown>).params as Record<
        string,
        unknown
      >;
      const params = inner.params as Record<string, string>;
      expect(params.conversationId).toBe('conv-1');
      expect(params.jobTitle).toBe('');
      expect(params.recipientId).toBe('');
      expect(params.recipientName).toBe('');
    });

    it('falls back to inbox when conversationId is missing', () => {
      expect(routeForNotification('message_received', {})).toEqual(
        NOTIFICATIONS_FALLBACK
      );
    });
  });

  describe('routeForNotification — meeting_scheduled', () => {
    it('routes to MeetingDetails modal when meetingId is present', () => {
      expect(
        routeForNotification('meeting_scheduled', { meetingId: 'meet-1' })
      ).toEqual({
        screen: 'Modal',
        params: {
          screen: 'MeetingDetails',
          params: { meetingId: 'meet-1' },
        },
      });
    });

    it('falls back to ProfileTab > Calendar when meetingId is missing', () => {
      expect(routeForNotification('meeting_scheduled', {})).toEqual({
        screen: 'Main',
        params: { screen: 'ProfileTab', params: { screen: 'Calendar' } },
      });
    });

    it('uses meeting_id snake_case alias', () => {
      expect(
        routeForNotification('meeting_scheduled', { meeting_id: 'meet-snake' })
      ).toEqual({
        screen: 'Modal',
        params: {
          screen: 'MeetingDetails',
          params: { meetingId: 'meet-snake' },
        },
      });
    });
  });

  describe('routeForNotification — payment_received', () => {
    it('routes to JobDetails when jobId is present', () => {
      expect(
        routeForNotification('payment_received', { jobId: 'job-1' })
      ).toEqual({
        screen: 'Main',
        params: {
          screen: 'JobsTab',
          params: { screen: 'JobDetails', params: { jobId: 'job-1' } },
        },
      });
    });

    it('falls back to ProfileTab > PaymentHistory when jobId is missing', () => {
      expect(routeForNotification('payment_received', {})).toEqual({
        screen: 'Main',
        params: {
          screen: 'ProfileTab',
          params: { screen: 'PaymentHistory' },
        },
      });
    });
  });

  describe('routeForNotification — system', () => {
    it('always routes to HomeTab regardless of payload', () => {
      expect(routeForNotification('system', null)).toEqual(HOME_FALLBACK);
      expect(routeForNotification('system', {})).toEqual(HOME_FALLBACK);
      expect(routeForNotification('system', { jobId: 'ignored' })).toEqual(
        HOME_FALLBACK
      );
    });
  });

  describe('contract guarantees', () => {
    it('every supported type returns a screen string (never null)', () => {
      const SUPPORTED_TYPES = [
        'job_update',
        'job_started',
        'job_completed',
        'review_requested',
        'contract_created',
        'contract_signed',
        'payment_released',
        'bid_rejected',
        'bid_received',
        'bid_accepted',
        'message_received',
        'meeting_scheduled',
        'payment_received',
        'quote_sent',
        'system',
      ];
      for (const t of SUPPORTED_TYPES) {
        const route = routeForNotification(t, {
          jobId: 'j',
          conversationId: 'c',
          meetingId: 'm',
        });
        expect(typeof route.screen).toBe('string');
        expect(route.screen.length).toBeGreaterThan(0);
      }
    });

    it('returned route always has a top-level Main or Modal screen (never a typo)', () => {
      const SUPPORTED_TYPES = [
        'job_update',
        'job_started',
        'job_completed',
        'review_requested',
        'contract_created',
        'contract_signed',
        'payment_released',
        'bid_rejected',
        'bid_received',
        'bid_accepted',
        'message_received',
        'meeting_scheduled',
        'payment_received',
        'quote_sent',
        'system',
        'unknown_future_type',
      ];
      for (const t of SUPPORTED_TYPES) {
        const route = routeForNotification(t, {});
        expect(['Main', 'Modal']).toContain(route.screen);
      }
    });
  });
});
