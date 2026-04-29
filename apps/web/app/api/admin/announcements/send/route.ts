import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';
import { ExpoPushService } from '@/lib/services/push/ExpoPushService';
import { brandedEmail, brandedEmailText } from '@/lib/email-branded-template';
import { BadRequestError, NotFoundError } from '@/lib/errors/api-error';
import { z } from 'zod';

const sendSchema = z.object({
  announcementId: z.string().uuid(),
  channels: z
    .object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      inApp: z.boolean().default(true),
    })
    .optional(),
});

/**
 * POST /api/admin/announcements/send
 * Send a published announcement to the target audience via email + push + in-app.
 */
export const POST = withApiHandler(
  {
    roles: ['admin'],
    rateLimit: { maxRequests: 5 },
    // Sends a published announcement to the entire target audience
    // via email + push + in-app. Single highest-blast-radius admin
    // mutation — demand fresh MFA proof.
    requireMfaVerifiedWithinMinutes: 15,
  },
  async (request, { user }) => {
    const body = await request.json();
    const parsed = sendSchema.safeParse(body);

    if (!parsed.success) {
      throw new BadRequestError('Invalid request');
    }

    const { announcementId, channels } = parsed.data;
    const sendEmail = channels?.email ?? true;
    const sendPush = channels?.push ?? true;
    const sendInApp = channels?.inApp ?? true;

    // Fetch the announcement
    const { data: announcement, error: annError } = await serverSupabase
      .from('announcements')
      .select('*')
      .eq('id', announcementId)
      .single();

    if (annError || !announcement) {
      throw new NotFoundError('Announcement not found');
    }

    if (!announcement.is_published) {
      throw new BadRequestError(
        'Announcement must be published before sending'
      );
    }

    // Determine target users
    const targetAudience = announcement.target_audience || 'all';
    let userQuery = serverSupabase
      .from('profiles')
      .select('id, email, first_name, role');

    if (targetAudience === 'homeowners') {
      userQuery = userQuery.eq('role', 'homeowner');
    } else if (targetAudience === 'contractors') {
      userQuery = userQuery.eq('role', 'contractor');
    } else if (targetAudience === 'verified_contractors') {
      userQuery = userQuery.eq('role', 'contractor').eq('admin_verified', true);
    }
    // 'all' = no filter

    const { data: users, error: usersError } = await userQuery;

    if (usersError || !users) {
      logger.error('Failed to fetch target users', usersError, {
        service: 'announcements',
      });
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const results = {
      email: { sent: 0, failed: 0 },
      push: { sent: 0, failed: 0 },
      inApp: 0,
    };

    // 1. In-app notifications (insert into notifications table)
    if (sendInApp) {
      const notificationRows = users.map((u) => ({
        user_id: u.id,
        type: 'announcement',
        title: announcement.title,
        message: announcement.content.slice(0, 500),
        metadata: {
          announcement_id: announcementId,
          priority: announcement.priority,
        },
        read: false,
        created_at: new Date().toISOString(),
      }));

      // Insert in batches of 500
      for (let i = 0; i < notificationRows.length; i += 500) {
        const batch = notificationRows.slice(i, i + 500);
        const { error: insertError } = await serverSupabase
          .from('notifications')
          .insert(batch);

        if (insertError) {
          logger.error('Failed to insert notification batch', insertError, {
            service: 'announcements',
          });
        } else {
          results.inApp += batch.length;
        }
      }
    }

    // 2. Email notifications (batches of 10)
    if (sendEmail) {
      const priorityLabel =
        announcement.priority === 'urgent'
          ? '🚨 Urgent: '
          : announcement.priority === 'high'
            ? '⚠️ '
            : '';

      for (let i = 0; i < users.length; i += 10) {
        const batch = users.slice(i, i + 10);
        await Promise.allSettled(
          batch.map(async (u) => {
            const displayName = u.first_name || 'there';
            const html = brandedEmail({
              title: `${priorityLabel}${announcement.title}`,
              subtitle:
                announcement.announcement_type === 'maintenance'
                  ? 'Platform Update'
                  : announcement.announcement_type === 'feature'
                    ? 'New Feature'
                    : 'Announcement',
              preheader: announcement.content.slice(0, 120),
              body: `
                <p>Hi ${displayName},</p>
                ${announcement.content}
              `,
              cta: {
                text: 'Open Mintenance',
                url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/dashboard`,
              },
            });

            const text = brandedEmailText({
              title: announcement.title,
              body: `Hi ${displayName},\n\n${announcement.content}`,
              cta: {
                text: 'Open Mintenance',
                url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com'}/dashboard`,
              },
            });

            const success = await EmailService.sendEmail({
              to: u.email,
              subject: `${priorityLabel}${announcement.title}`,
              html,
              text,
            });

            if (success) results.email.sent++;
            else results.email.failed++;
          })
        );
      }
    }

    // 3. Push notifications
    if (sendPush) {
      const pushRole =
        targetAudience === 'homeowners'
          ? 'homeowner'
          : targetAudience === 'contractors' ||
              targetAudience === 'verified_contractors'
            ? 'contractor'
            : 'all';

      const pushResult = await ExpoPushService.sendToRole(
        pushRole as 'homeowner' | 'contractor' | 'admin' | 'all',
        {
          title: announcement.title,
          body: announcement.content.replace(/<[^>]+>/g, '').slice(0, 200),
          data: {
            type: 'announcement',
            announcementId,
            url: '/dashboard',
          },
        }
      );
      results.push = { sent: pushResult.sent, failed: pushResult.failed };
    }

    // Mark announcement as sent
    await serverSupabase
      .from('announcements')
      .update({
        sent_at: new Date().toISOString(),
        sent_by: user.id,
        send_results: results,
      })
      .eq('id', announcementId);

    logger.info('Announcement sent', {
      service: 'announcements',
      announcementId,
      targetAudience,
      results,
      sentBy: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Announcement sent to ${users.length} users`,
      results,
    });
  }
);
