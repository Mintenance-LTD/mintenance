import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EmailService } from '@/lib/email-service';

/**
 * POST /api/admin/coming-soon/notify
 * Send launch notification to all waitlist signups who haven't been notified yet.
 * Admin-only endpoint.
 */
export const POST = withApiHandler(
  { roles: ['admin'], rateLimit: { maxRequests: 2 } },
  async () => {
    // Get all un-notified signups
    const { data: signups, error } = await serverSupabase
      .from('coming_soon_signups')
      .select('id, email, name, position')
      .is('notified_at', null)
      .order('position', { ascending: true });

    if (error) {
      logger.error('Failed to fetch waitlist signups', error, {
        service: 'coming-soon',
      });
      return NextResponse.json(
        { error: 'Failed to fetch signups' },
        { status: 500 }
      );
    }

    if (!signups || signups.length === 0) {
      return NextResponse.json({
        message: 'No un-notified signups found',
        sent: 0,
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com';
    let sent = 0;
    let failed = 0;

    // Send in batches of 10 to avoid rate limits
    for (let i = 0; i < signups.length; i += 10) {
      const batch = signups.slice(i, i + 10);

      await Promise.allSettled(
        batch.map(async (signup) => {
          const displayName = signup.name || 'there';
          const success = await EmailService.sendEmail({
            to: signup.email,
            subject: "Mintenance is Live! You're Invited",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #0d9488; margin-bottom: 16px;">
                  Mintenance is Live!
                </h1>
                <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 12px;">
                  Hi ${displayName},
                </p>
                <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 12px;">
                  Great news! As #${signup.position} on our waitlist, you now have exclusive early access to Mintenance.
                </p>
                <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px;">
                  Create your free account today and start connecting with trusted local contractors.
                </p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${appUrl}/register" style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    Create Your Account
                  </a>
                </div>
                <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                  Best regards,<br/>The Mintenance Team
                </p>
                ${EmailService.getUnsubscribeFooter()}
              </div>
            `,
            text: `Hi ${displayName},\n\nGreat news! As #${signup.position} on our waitlist, you now have exclusive early access to Mintenance.\n\nCreate your free account: ${appUrl}/register\n\nBest regards,\nThe Mintenance Team`,
          });

          if (success) {
            await serverSupabase
              .from('coming_soon_signups')
              .update({ notified_at: new Date().toISOString() })
              .eq('id', signup.id);
            sent++;
          } else {
            failed++;
          }
        })
      );
    }

    logger.info('Launch notifications sent', {
      service: 'coming-soon',
      total: signups.length,
      sent,
      failed,
    });

    return NextResponse.json({
      success: true,
      message: `Sent ${sent} launch notifications (${failed} failed)`,
      total: signups.length,
      sent,
      failed,
    });
  }
);
