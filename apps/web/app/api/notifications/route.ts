import { NextRequest, NextResponse } from 'next/server';
import {
  serverSupabase,
  resolveRequestDbClient,
} from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { logger } from '@mintenance/shared';
import { validateRequest } from '@/lib/validation/validator';
import { notificationEngagementSchema } from '@/lib/validation/schemas';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { fetchNotificationFeed } from '@/lib/notifications/feed';
import { z } from 'zod';

const createNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(300),
  message: z.string().min(1).max(2000),
  action_url: z.string().max(500).optional(),
});

export const GET = withApiHandler(
  { rateLimit: { maxRequests: 120 }, csrf: false },
  async (request, { user }) => {
    const userId = user.id;

    // Sprint 7 (3.3): use the tagged resolver so telemetry flags when we fall
    // back to service role. This file applies an explicit `.eq('user_id',
    // userId)` filter below which is safe under either mode, but the helper
    // now surfaces how often the RLS path is bypassed in production so we
    // can prioritize migrating callers to Supabase-Auth if it is happening
    // frequently. If you add new queries here you MUST still filter by
    // user_id — service-role mode bypasses RLS entirely.
    const { db: userDb, enforcesRls: _enforcesRls } = resolveRequestDbClient(
      request,
      { route: '/api/notifications' }
    );

    // Mobile inbox passes `?history=1&limit=50&offset=0` to scroll past
    // read items. Default (no flag) keeps the recent-or-unread feed for
    // the web dashboard activity card.
    const url = new URL(request.url);
    const includeHistory =
      url.searchParams.get('history') === '1' ||
      url.searchParams.get('history') === 'true';
    const requestedLimit = Number.parseInt(
      url.searchParams.get('limit') ?? '',
      10
    );
    const requestedOffset = Number.parseInt(
      url.searchParams.get('offset') ?? '',
      10
    );

    // Shared with the dashboard activity feed — see lib/notifications/feed.ts
    // for the filtering rules (excludes social types, keeps items recent
    // or unread). Moving the filter into one place stops the two views
    // from drifting apart on every schema/policy tweak.
    const feedLimit = includeHistory
      ? Math.min(
          Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 50, 1),
          100
        )
      : 7;
    const feedOffset =
      includeHistory && Number.isFinite(requestedOffset) && requestedOffset > 0
        ? requestedOffset
        : 0;

    const mappedNotifications = await fetchNotificationFeed(userId, {
      db: userDb,
      limit: feedLimit,
      offset: feedOffset,
      includeHistory,
    });

    // History mode: skip the realtime-enrichment block (quote views,
    // unread messages, project reminders). Those are recency-sensitive
    // synthetic rows that don't belong in a paginated history view —
    // they would interleave unpredictably across pages.
    if (includeHistory) {
      return NextResponse.json({ notifications: mappedNotifications });
    }

    // Debug: Log specific notification types
    const bidAcceptedNotifs = mappedNotifications.filter(
      (n) => n.type === 'bid_accepted'
    );
    const jobViewedNotifs = mappedNotifications.filter(
      (n) => n.type === 'job_viewed'
    );
    const jobNearbyNotifs = mappedNotifications.filter(
      (n) => n.type === 'job_nearby'
    );
    const bidReceivedNotifs = mappedNotifications.filter(
      (n) => n.type === 'bid_received'
    );

    if (bidAcceptedNotifs.length > 0) {
      logger.info('Found bid_accepted notifications', {
        service: 'notifications',
        userId,
        count: bidAcceptedNotifs.length,
      });
    }
    if (jobViewedNotifs.length > 0) {
      logger.info('Found job_viewed notifications', {
        service: 'notifications',
        userId,
        count: jobViewedNotifs.length,
      });
    }
    if (jobNearbyNotifs.length > 0) {
      logger.info('Found job_nearby notifications', {
        service: 'notifications',
        userId,
        count: jobNearbyNotifs.length,
      });
    }
    if (bidReceivedNotifs.length > 0) {
      logger.info('Found bid_received notifications', {
        service: 'notifications',
        userId,
        count: bidReceivedNotifs.length,
      });
    }

    // Fetch real-time notifications from source tables
    const realTimeNotifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      created_at: string;
      action_url?: string;
    }> = [];

    // 1. Quote Views - Quotes that were viewed in the last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: viewedQuotes } = await userDb
      .from('contractor_quotes')
      .select('id, quote_number, client_name, viewed_at, title')
      .eq('contractor_id', userId)
      .eq('status', 'viewed')
      .gte('viewed_at', oneWeekAgo.toISOString())
      .order('viewed_at', { ascending: false })
      .limit(10);

    interface QuoteRecord {
      id: string;
      client_name?: string;
      title?: string;
      quote_number?: string;
      viewed_at?: string;
      accepted_at?: string;
      total_amount?: string | number;
    }

    if (viewedQuotes && viewedQuotes.length > 0) {
      viewedQuotes.forEach((quote: QuoteRecord) => {
        const existingNotif = mappedNotifications.find(
          (n) => n.id === `quote-viewed-${quote.id}`
        );
        if (!existingNotif) {
          // 2026-05-21 Mint Editorial voice — name the client first.
          const clientLabel = quote.client_name || 'A client';
          const quoteLabel = quote.title || quote.quote_number || 'your quote';
          realTimeNotifications.push({
            id: `quote-viewed-${quote.id}`,
            type: 'quote_viewed',
            title: `${clientLabel} opened ${quoteLabel}`,
            message: `Now's a good time to nudge them.`,
            read: false,
            created_at: quote.viewed_at || new Date().toISOString(),
            action_url: `/contractor/quotes/${quote.id}`,
          });
        }
      });
    }

    // 2. Quote Acceptances - Quotes accepted in the last 30 days
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const { data: acceptedQuotes } = await userDb
      .from('contractor_quotes')
      .select('id, quote_number, client_name, accepted_at, title, total_amount')
      .eq('contractor_id', userId)
      .eq('status', 'accepted')
      .gte('accepted_at', oneMonthAgo.toISOString())
      .order('accepted_at', { ascending: false })
      .limit(10);

    if (acceptedQuotes && acceptedQuotes.length > 0) {
      acceptedQuotes.forEach((quote: QuoteRecord) => {
        const existingNotif = mappedNotifications.find(
          (n) => n.id === `quote-accepted-${quote.id}`
        );
        if (!existingNotif) {
          // 2026-05-21 Mint Editorial voice — no emoji, amount in title.
          const clientLabel = quote.client_name || 'A client';
          const quoteLabel = quote.title || quote.quote_number || 'your quote';
          const fmtAmount = `£${parseFloat(String(quote.total_amount || 0)).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
          realTimeNotifications.push({
            id: `quote-accepted-${quote.id}`,
            type: 'quote_accepted',
            title: `${clientLabel} accepted ${quoteLabel} — ${fmtAmount}`,
            message: `Confirm the start date and you're on.`,
            read: false,
            created_at: quote.accepted_at || new Date().toISOString(),
            action_url: `/contractor/quotes/${quote.id}`,
          });
        }
      });
    }

    // 3. Unread Messages - Messages received in the last 30 days
    //
    // 2026-05-23 audit P1: the live messages schema is
    //   (id, job_id, sender_id, receiver_id, content, read, ...)
    // — there is no `thread_id` and no `read_by` array. The previous
    // implementation joined via message_threads.id IN (...).thread_id
    // which never matched anything, so unread-message notifications
    // were silently empty for every user. Filter directly on
    // `receiver_id = userId AND read = false` and use messages.job_id
    // (which the table carries) for the action URL.
    interface MessageRecord {
      id: string;
      sender_id: string;
      content?: string;
      created_at: string;
      job_id?: string;
    }

    const { data: unreadRaw } = await userDb
      .from('messages')
      .select('id, created_at, content, sender_id, job_id')
      .eq('receiver_id', userId)
      .eq('read', false)
      .gte('created_at', oneMonthAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    const unreadMessages: MessageRecord[] | null =
      (unreadRaw as MessageRecord[] | null) ?? null;

    interface SenderRecord {
      id: string;
      first_name?: string;
      last_name?: string;
      company_name?: string;
    }

    if (unreadMessages && unreadMessages.length > 0) {
      const senderIds = [...new Set(unreadMessages.map((m) => m.sender_id))];
      const { data: senders } = await serverSupabase
        .from('profiles')
        .select('id, first_name, last_name, company_name')
        .in('id', senderIds);

      const senderMap = new Map<string, SenderRecord>(
        (senders || []).map((s: SenderRecord) => [s.id, s])
      );

      unreadMessages.forEach((msg) => {
        const existingNotif = mappedNotifications.find(
          (n) => n.id === `msg-${msg.id}`
        );
        if (!existingNotif) {
          const sender = senderMap.get(msg.sender_id);
          const senderName = sender
            ? sender.first_name && sender.last_name
              ? `${sender.first_name} ${sender.last_name}`
              : sender.company_name || 'Someone'
            : 'Someone';

          const messageContent = msg.content || '';
          // 2026-05-23: read job_id directly off the message row
          // (messages.job_id is the live schema's link, not the
          // removed thread_id indirection).
          const jobId = msg.job_id;

          const actionUrl = jobId
            ? `/messages/${jobId}?userId=${msg.sender_id}&userName=${encodeURIComponent(senderName)}&jobTitle=Job`
            : '/messages';

          // 2026-05-21 Mint Editorial voice — sender as title, body is
          // the message preview itself (matches WhatsApp/iMessage feel).
          realTimeNotifications.push({
            id: `msg-${msg.id}`,
            type: 'message_received',
            title: senderName,
            message: `${messageContent.substring(0, 100)}${messageContent.length > 100 ? '…' : ''}`,
            read: false,
            created_at: msg.created_at || new Date().toISOString(),
            action_url: actionUrl,
          });
        }
      });
    }

    // 4. Project Reminders - Jobs starting within 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = new Date();

    const { data: upcomingJobs } = await userDb
      .from('jobs')
      .select('id, title, scheduled_start_date, status')
      .eq('contractor_id', userId)
      .in('status', ['assigned', 'in_progress'])
      .gte('scheduled_start_date', now.toISOString())
      .lte('scheduled_start_date', tomorrow.toISOString())
      .order('scheduled_start_date', { ascending: true })
      .limit(10);

    interface JobRecord {
      id: string;
      title?: string;
      scheduled_start_date?: string;
      status?: string;
    }

    if (upcomingJobs && upcomingJobs.length > 0) {
      upcomingJobs.forEach((job: JobRecord) => {
        const existingNotif = mappedNotifications.find(
          (n) => n.id === `project-reminder-${job.id}`
        );
        if (!existingNotif && job.scheduled_start_date) {
          const startDate = new Date(job.scheduled_start_date);
          const hoursUntil = Math.round(
            (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)
          );

          // 2026-05-21 Mint Editorial voice — when in the title, advice in body.
          const startsIn =
            hoursUntil === 0
              ? 'today'
              : `in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`;
          realTimeNotifications.push({
            id: `project-reminder-${job.id}`,
            type: 'project_reminder',
            title: `${job.title || 'Project'} starts ${startsIn}`,
            message: `Time to load the van — check parking + access on the job thread.`,
            read: false,
            created_at: job.scheduled_start_date || new Date().toISOString(),
            action_url: `/jobs/${job.id}`,
          });
        }
      });
    }

    // Combine and sort all notifications
    const allNotifications = [...mappedNotifications, ...realTimeNotifications];
    allNotifications.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ notifications: allNotifications.slice(0, 20) });
  }
);

/**
 * Track notification engagement (PATCH endpoint)
 */
export const PATCH = withApiHandler(
  { rateLimit: { maxRequests: 120 } },
  async (request, { user }) => {
    // Use the tagged resolver for telemetry on service-role fallback (Sprint 7/3.3).
    const { db: userDb } = resolveRequestDbClient(request, {
      route: '/api/notifications',
    });

    // Validate and sanitize input using Zod schema
    const validation = await validateRequest(
      request,
      notificationEngagementSchema
    );
    if (validation instanceof NextResponse) return validation;
    const { data } = validation;

    const { notificationId, action } = data;

    // Update notification read status if opened/clicked
    if (action === 'opened' || action === 'clicked') {
      await userDb
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);
    }

    // Track engagement via NotificationService
    await NotificationService.trackEngagement(notificationId, user.id, {
      opened: action === 'opened' || action === 'clicked',
      clicked: action === 'clicked',
      dismissed: action === 'dismissed',
    });

    return NextResponse.json({ success: true });
  }
);

/**
 * Create a notification (POST endpoint).
 *
 * 2026-05-01 audit follow-up: previously, ANY authenticated user could
 * call this to insert a notification row targeting ANY other user_id.
 * That was a phishing primitive (fake "Bid accepted" notifications,
 * fake "Payment released" alerts). Two changes lock it down:
 *
 *   1. `roles: ['admin']` + `requireMfaVerifiedWithinMinutes: 15`:
 *      only admins with fresh MFA can use it. Service-role traffic
 *      should call NotificationService.createNotification directly
 *      from the server — they don't go through HTTP.
 *
 *   2. The body is routed through NotificationService instead of a
 *      raw `.from('notifications').insert(...)`, so push + per-user
 *      preferences + quiet-hours apply consistently with every
 *      other notification source.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 60 },
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request, { user }) => {
    const validation = await validateRequest(request, createNotificationSchema);
    if (validation instanceof NextResponse) return validation;
    const { data: payload } = validation;

    try {
      const notificationId = await NotificationService.createNotification({
        userId: payload.user_id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.action_url,
        metadata: { admin_id: user.id, source: 'api/notifications POST' },
      });

      return NextResponse.json(
        { data: { id: notificationId } },
        { status: 201 }
      );
    } catch (error) {
      logger.error('Error creating notification', error, {
        service: 'notifications',
        userId: user.id,
        targetUserId: payload.user_id,
      });
      throw error;
    }
  }
);
