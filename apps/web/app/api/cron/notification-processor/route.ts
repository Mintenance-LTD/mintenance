import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationAgent } from '@/lib/services/agents/NotificationAgent';
import { requireCronAuth } from '@/lib/cron-auth';

/**
 * Cron endpoint for processing queued notifications and learning from engagement
 * Should be called every 15 minutes
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authError = requireCronAuth(request);
    if (authError) {
      return authError;
    }

    logger.info('Starting notification processing cycle', {
      service: 'notification-processor',
    });

    const results = {
      queuedProcessed: 0,
      queuedErrors: 0,
      learningProcessed: 0,
      learningErrors: 0,
    };

    // 1. Process queued notifications that are ready to send
    try {
      const now = new Date();
      const { data: readyNotifications, error: queueError } = await serverSupabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now.toISOString())
        .limit(50); // Process up to 50 at a time

      if (queueError) {
        logger.error('Error fetching queued notifications', {
          service: 'notification-processor',
          error: queueError.message,
        });
        results.queuedErrors++;
      } else if (readyNotifications && readyNotifications.length > 0) {
        // Process each queued notification
        for (const queuedNotif of readyNotifications) {
          try {
            // Create actual notification
            const { data: notification, error: createError } = await serverSupabase
              .from('notifications')
              .insert({
                user_id: queuedNotif.user_id,
                type: queuedNotif.notification_type,
                title: queuedNotif.title,
                message: queuedNotif.message,
                action_url: queuedNotif.action_url,
                read: false,
                created_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (createError) {
              logger.error('Error creating notification from queue', {
                service: 'notification-processor',
                error: createError.message,
                queueId: queuedNotif.id,
              });

              // Update queue with error
              await serverSupabase
                .from('notification_queue')
                .update({
                  status: 'failed',
                  error_message: createError.message,
                  retry_count: queuedNotif.retry_count + 1,
                  last_retry_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', queuedNotif.id);

              results.queuedErrors++;
              continue;
            }

            // Mark queue item as sent
            await serverSupabase
              .from('notification_queue')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', queuedNotif.id);

            results.queuedProcessed++;

            logger.info('Notification sent from queue', {
              service: 'notification-processor',
              queueId: queuedNotif.id,
              notificationId: notification.id,
              userId: queuedNotif.user_id,
            });
          } catch (error) {
            logger.error('Error processing queued notification', error, {
              service: 'notification-processor',
              queueId: queuedNotif.id,
            });
            results.queuedErrors++;
          }
        }
      }
    } catch (error) {
      logger.error('Error in queued notification processing', error, {
        service: 'notification-processor',
      });
      results.queuedErrors++;
    }

    // 2. Learn from engagement patterns (batch process users)
    try {
      // Get users who have engagement data to analyze
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usersToAnalyze } = await serverSupabase
        .from('notification_engagement')
        .select('user_id')
        .gte('sent_at', thirtyDaysAgo.toISOString())
        .limit(100)
        .order('sent_at', { ascending: false });

      if (usersToAnalyze && usersToAnalyze.length > 0) {
        // Get unique user IDs
        const uniqueUserIds = [...new Set(usersToAnalyze.map((e) => e.user_id))];

        // Analyze each user (limit to 20 users per run to avoid overload)
        for (const userId of uniqueUserIds.slice(0, 20)) {
          try {
            await NotificationAgent.learnOptimalTiming(userId);
            results.learningProcessed++;
          } catch (error) {
            logger.error('Error learning optimal timing for user', error, {
              service: 'notification-processor',
              userId,
            });
            results.learningErrors++;
          }
        }
      }
    } catch (error) {
      logger.error('Error in engagement learning', error, {
        service: 'notification-processor',
      });
      results.learningErrors++;
    }

    logger.info('Notification processing cycle completed', {
      service: 'notification-processor',
      results,
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    logger.error('Error in notification processor cron', error, {
      service: 'notification-processor',
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

