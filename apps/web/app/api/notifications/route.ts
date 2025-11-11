import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { requireCSRF } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Calculate date 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Fetch notifications from database
    // Keep notifications that are:
    // 1. Created within the last 24 hours, OR
    // 2. Unread (regardless of age)
    // Also limit to max 7 notifications to auto-remove older ones
    const { data: notifications, error } = await serverSupabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .or(`created_at.gte.${twentyFourHoursAgo.toISOString()},read.eq.false`)
      .order('created_at', { ascending: false })
      .limit(7); // Maximum 7 notifications - older ones will be automatically excluded when 8th is added

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Map database notifications to component format
    const mappedNotifications = (notifications || []).map((notif: any) => ({
      id: notif.id,
      type: notif.type || 'bid_received',
      title: notif.title || 'Notification',
      message: notif.message || '',
      read: notif.read === true || notif.read === 1,
      created_at: notif.created_at || new Date().toISOString(),
      link: notif.action_url || notif.link,
      action_url: notif.action_url,
    }));

    // Debug: Log specific notification types
    const bidAcceptedNotifs = mappedNotifications.filter((n: any) => n.type === 'bid_accepted');
    const jobViewedNotifs = mappedNotifications.filter((n: any) => n.type === 'job_viewed');
    const jobNearbyNotifs = mappedNotifications.filter((n: any) => n.type === 'job_nearby');
    const bidReceivedNotifs = mappedNotifications.filter((n: any) => n.type === 'bid_received');
    
    if (bidAcceptedNotifs.length > 0) {
      console.log(`[Notifications API] Found ${bidAcceptedNotifs.length} bid_accepted notification(s) for user ${userId}`);
    }
    if (jobViewedNotifs.length > 0) {
      console.log(`[Notifications API] Found ${jobViewedNotifs.length} job_viewed notification(s) for user ${userId}`);
    }
    if (jobNearbyNotifs.length > 0) {
      console.log(`[Notifications API] Found ${jobNearbyNotifs.length} job_nearby notification(s) for user ${userId}`);
    }
    if (bidReceivedNotifs.length > 0) {
      console.log(`[Notifications API] Found ${bidReceivedNotifs.length} bid_received notification(s) for user ${userId}`);
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
    
    const { data: viewedQuotes } = await serverSupabase
      .from('contractor_quotes')
      .select('id, quote_number, client_name, viewed_at, title')
      .eq('contractor_id', userId)
      .eq('status', 'viewed')
      .gte('viewed_at', oneWeekAgo.toISOString())
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (viewedQuotes && viewedQuotes.length > 0) {
      viewedQuotes.forEach((quote: any) => {
        // Check if notification already exists
        const existingNotif = mappedNotifications.find(n => n.id === `quote-viewed-${quote.id}`);
        if (!existingNotif) {
          realTimeNotifications.push({
            id: `quote-viewed-${quote.id}`,
            type: 'quote_viewed',
            title: 'Quote Viewed',
            message: `${quote.client_name || 'A client'} viewed your quote "${quote.title || quote.quote_number || 'Untitled'}"`,
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
    
    const { data: acceptedQuotes } = await serverSupabase
      .from('contractor_quotes')
      .select('id, quote_number, client_name, accepted_at, title, total_amount')
      .eq('contractor_id', userId)
      .eq('status', 'accepted')
      .gte('accepted_at', oneMonthAgo.toISOString())
      .order('accepted_at', { ascending: false })
      .limit(10);

    if (acceptedQuotes && acceptedQuotes.length > 0) {
      acceptedQuotes.forEach((quote: any) => {
        const existingNotif = mappedNotifications.find(n => n.id === `quote-accepted-${quote.id}`);
        if (!existingNotif) {
          realTimeNotifications.push({
            id: `quote-accepted-${quote.id}`,
            type: 'quote_accepted',
            title: 'Quote Accepted! 🎉',
            message: `${quote.client_name || 'A client'} accepted your quote "${quote.title || quote.quote_number || 'Untitled'}" for £${parseFloat(quote.total_amount || 0).toFixed(2)}`,
            read: false,
            created_at: quote.accepted_at || new Date().toISOString(),
            action_url: `/contractor/quotes/${quote.id}`,
          });
        }
      });
    }

    // 3. Unread Messages - Messages received in the last 30 days
    const { data: unreadMessages } = await serverSupabase
      .from('messages')
      .select('id, created_at, content, sender_id, receiver_id, job_id')
      .eq('receiver_id', userId)
      .eq('read', false)
      .gte('created_at', oneMonthAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (unreadMessages && unreadMessages.length > 0) {
      // Get sender names
      const senderIds = [...new Set(unreadMessages.map((m: any) => m.sender_id))];
      const { data: senders } = await serverSupabase
        .from('users')
        .select('id, first_name, last_name, company_name')
        .in('id', senderIds);

      const senderMap = new Map((senders || []).map((s: any) => [s.id, s]));

      unreadMessages.forEach((msg: any) => {
        const existingNotif = mappedNotifications.find(n => n.id === `msg-${msg.id}`);
        if (!existingNotif) {
          const sender = senderMap.get(msg.sender_id);
          const senderName = sender 
            ? (sender.first_name && sender.last_name 
                ? `${sender.first_name} ${sender.last_name}` 
                : sender.company_name || 'Someone')
            : 'Someone';
          
          const messageContent = msg.content || msg.message_text || '';
          const jobTitle = (msg.jobs as any)?.title || 'Job';
          
          // Build message thread URL with query params for proper routing
          const actionUrl = msg.job_id 
            ? `/messages/${msg.job_id}?userId=${msg.sender_id}&userName=${encodeURIComponent(senderName)}&jobTitle=${encodeURIComponent(jobTitle)}`
            : '/messages';
          
          realTimeNotifications.push({
            id: `msg-${msg.id}`,
            type: 'message_received', // Use message_received type for proper routing
            title: 'New Message',
            message: `${senderName}: ${messageContent.substring(0, 80)}${messageContent.length > 80 ? '...' : ''}`,
            read: false,
            created_at: msg.created_at || new Date().toISOString(),
            action_url: actionUrl,
            // Store job info in action_url query params, which the notification handler will parse
          } as any);
        }
      });
    }

    // 4. Project Reminders - Jobs starting within 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = new Date();

    const { data: upcomingJobs } = await serverSupabase
      .from('jobs')
      .select('id, title, scheduled_start_date, status')
      .eq('contractor_id', userId)
      .in('status', ['assigned', 'in_progress'])
      .gte('scheduled_start_date', now.toISOString())
      .lte('scheduled_start_date', tomorrow.toISOString())
      .order('scheduled_start_date', { ascending: true })
      .limit(10);

    if (upcomingJobs && upcomingJobs.length > 0) {
      upcomingJobs.forEach((job: any) => {
        const existingNotif = mappedNotifications.find(n => n.id === `project-reminder-${job.id}`);
        if (!existingNotif) {
          const startDate = new Date(job.scheduled_start_date);
          const hoursUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          realTimeNotifications.push({
            id: `project-reminder-${job.id}`,
            type: 'project_reminder',
            title: 'Project Reminder',
            message: `"${job.title || 'Untitled Project'}" starts ${hoursUntil === 0 ? 'today' : `in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''}`}`,
            read: false,
            created_at: job.scheduled_start_date || new Date().toISOString(),
            action_url: `/jobs/${job.id}`,
          });
        }
      });
    }

    // Combine and sort all notifications
    const allNotifications = [...mappedNotifications, ...realTimeNotifications];
    allNotifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(allNotifications.slice(0, 20));
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Track notification engagement (PATCH endpoint)
 */
export async function PATCH(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const body = await request.json();
    const { notificationId, userId, action } = body; // action: 'opened', 'clicked', 'dismissed'

    if (!notificationId || !userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: notificationId, userId, action' },
        { status: 400 }
      );
    }

    if (!['opened', 'clicked', 'dismissed'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: opened, clicked, or dismissed' },
        { status: 400 }
      );
    }

    // Update notification read status if opened/clicked
    if (action === 'opened' || action === 'clicked') {
      await serverSupabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId);
    }

    // Track engagement via NotificationService
    await NotificationService.trackEngagement(notificationId, userId, {
      opened: action === 'opened' || action === 'clicked',
      clicked: action === 'clicked',
      dismissed: action === 'dismissed',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notification engagement tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
