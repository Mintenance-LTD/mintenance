import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { logger } from '@mintenance/shared';

const unsubscribeSchema = z.object({
  token: z.string().uuid('Invalid unsubscribe token'),
  category: z
    .enum([
      'marketing',
      'bid_notifications',
      'job_updates',
      'payment_notifications',
      'message_notifications',
      'all',
    ])
    .optional()
    .default('all'),
});

/**
 * GET /api/email/unsubscribe?token=UUID&category=all
 * GDPR-compliant one-click email unsubscribe.
 * No authentication required — uses a unique unsubscribe token.
 */
// auth-check: ok — public by design. The unique per-recipient unsubscribe
// token (looked up against the relevant subscription record) is the auth; requiring a
// session here would break one-click unsubscribe links delivered via
// email. Mandated by GDPR + CAN-SPAM / UK PECR. Token validity is
// enforced by Zod (uuid) + DB lookup below.
export const GET = withApiHandler(
  {
    auth: false,
    csrf: false,
    rateLimit: { maxRequests: 10, windowMs: 60_000 },
  },
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const parsed = unsubscribeSchema.safeParse({
      token: searchParams.get('token'),
      category: searchParams.get('category') || 'all',
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { token, category } = parsed.data;

    // Find the email preference record by token
    const { data: prefs, error: preferencesError } = await serverSupabase
      .from('email_preferences')
      .select('id, user_id')
      .eq('unsubscribe_token', token)
      .maybeSingle();

    if (preferencesError) {
      logger.error('Failed to look up email unsubscribe token', {
        service: 'email',
        error: preferencesError,
      });
      return NextResponse.json(
        { error: 'Failed to process unsubscribe' },
        { status: 500 }
      );
    }

    let confirmationLabel: string;

    if (prefs) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (category === 'all') {
        updateData.unsubscribed_all = true;
        updateData.marketing = false;
        updateData.bid_notifications = false;
        updateData.job_updates = false;
        updateData.payment_notifications = false;
        updateData.message_notifications = false;
      } else {
        updateData[category] = false;
      }

      const { error: updateError } = await serverSupabase
        .from('email_preferences')
        .update(updateData)
        .eq('id', prefs.id);

      if (updateError) {
        logger.error('Failed to process unsubscribe', updateError, {
          service: 'email',
          userId: prefs.user_id,
        });
        return NextResponse.json(
          { error: 'Failed to process unsubscribe' },
          { status: 500 }
        );
      }

      logger.info('User unsubscribed from emails', {
        service: 'email',
        userId: prefs.user_id,
        category,
      });

      confirmationLabel =
        category === 'all'
          ? 'all Mintenance emails'
          : category.replace(/_/g, ' ');
    } else {
      const { data: newsletter, error: newsletterError } = await serverSupabase
        .from('newsletter_subscriptions')
        .select('id')
        .eq('unsubscribe_token', token)
        .maybeSingle();

      if (newsletterError) {
        logger.error('Failed to look up newsletter unsubscribe token', {
          service: 'newsletter',
          error: newsletterError,
        });
        return NextResponse.json(
          { error: 'Failed to process unsubscribe' },
          { status: 500 }
        );
      }

      if (!newsletter) {
        return NextResponse.json(
          { error: 'Invalid or expired unsubscribe link' },
          { status: 404 }
        );
      }

      const { error: updateError } = await serverSupabase
        .from('newsletter_subscriptions')
        .update({
          is_active: false,
          unsubscribed_at: new Date().toISOString(),
        })
        .eq('id', newsletter.id);

      if (updateError) {
        logger.error('Failed to process newsletter unsubscribe', {
          service: 'newsletter',
          error: updateError,
          subscriptionId: newsletter.id,
        });
        return NextResponse.json(
          { error: 'Failed to process unsubscribe' },
          { status: 500 }
        );
      }

      logger.info('Newsletter subscription disabled', {
        service: 'newsletter',
        subscriptionId: newsletter.id,
      });
      confirmationLabel = 'Mintenance newsletter emails';
    }

    // Return a simple HTML confirmation page
    const html = `<!DOCTYPE html>
<html><head><title>Unsubscribed</title>
<style>body{font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb;}
.card{background:white;padding:40px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center;max-width:400px;}
h1{color:#10b981;margin-bottom:12px;}p{color:#6b7280;line-height:1.6;}</style></head>
<body><div class="card">
<h1>Unsubscribed</h1>
<p>You have been unsubscribed from ${confirmationLabel}.</p>
<p>You can manage your email preferences in your <a href="/settings/notifications">account settings</a>.</p>
</div></body></html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }
);
