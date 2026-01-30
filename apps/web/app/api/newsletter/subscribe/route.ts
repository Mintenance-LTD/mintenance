import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCSRF } from '@/lib/csrf';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/newsletter/subscribe
 * Subscribe email to newsletter.
 *
 * Saves to Supabase table `public.newsletter_subscriptions`. Columns used:
 * - email, source ('footer'), is_active, subscribed_at, unsubscribed_at.
 *
 * View saved emails: Supabase Dashboard → Table Editor → newsletter_subscriptions.
 *
 * Store-only: no newsletter emails are sent. Use a campaign tool or cron job
 * to send actual newsletters.
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    try {
      await requireCSRF(request);
    } catch (csrfError) {
      logger.warn('CSRF validation failed for newsletter subscription', {
        service: 'newsletter',
        error: csrfError instanceof Error ? csrfError.message : String(csrfError),
      });
      return NextResponse.json(
        { error: 'Invalid request. Please refresh the page and try again.' },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(request, RATE_LIMIT_CONFIGS.payment);
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email address', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Check if email already exists in newsletter_subscriptions table
    try {
      const { data: existing, error: checkError } = await serverSupabase
        .from('newsletter_subscriptions')
        .select('id, email, is_active')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (expected), other errors are real issues
        logger.error('Error checking newsletter subscription', {
          service: 'newsletter',
          error: checkError,
          email: email.toLowerCase().trim(),
        });
        // Continue to try inserting anyway
      }

      if (existing && existing.is_active) {
        logger.info('Newsletter subscription already exists', {
          service: 'newsletter',
          email: email.toLowerCase().trim(),
        });
        return NextResponse.json(
          { message: 'Email already subscribed', subscribed: true },
          { status: 200 }
        );
      }

      // Insert new subscription (or reactivate if exists but inactive)
      const subscriptionData = {
        email: email.toLowerCase().trim(),
        source: 'footer' as const,
        is_active: true,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      };

      const { data: inserted, error: insertError } = await serverSupabase
        .from('newsletter_subscriptions')
        .insert(subscriptionData)
        .select()
        .single();

      if (insertError) {
        // If unique constraint violation, email might already exist (inactive)
        if (insertError.code === '23505') {
          // Try to reactivate existing subscription
          const { error: updateError } = await serverSupabase
            .from('newsletter_subscriptions')
            .update({
              is_active: true,
              subscribed_at: new Date().toISOString(),
              unsubscribed_at: null,
              source: 'footer',
            })
            .eq('email', email.toLowerCase().trim());

          if (updateError) {
            logger.error('Error reactivating newsletter subscription', {
              service: 'newsletter',
              error: updateError,
              email: email.toLowerCase().trim(),
            });
            throw new Error('Failed to subscribe. Please try again later.');
          }

          logger.info('Newsletter subscription reactivated', {
            service: 'newsletter',
            email: email.toLowerCase().trim(),
          });
        } else {
          logger.error('Error inserting newsletter subscription', {
            service: 'newsletter',
            error: insertError,
            email: email.toLowerCase().trim(),
          });
          throw new Error('Failed to subscribe. Please try again later.');
        }
      } else {
        logger.info('Newsletter subscription successful', {
          service: 'newsletter',
          email: email.toLowerCase().trim(),
          subscriptionId: inserted?.id,
        });
      }

      return NextResponse.json(
        { message: 'Successfully subscribed to newsletter', subscribed: true },
        { status: 200 }
      );
    } catch (dbError) {
      logger.error('Newsletter subscription database error', {
        service: 'newsletter',
        error: dbError,
        email: email.toLowerCase().trim(),
      });

      // Return success to user even if DB fails (graceful degradation)
      // The subscription is logged, and can be manually added later
      return NextResponse.json(
        { message: 'Successfully subscribed to newsletter', subscribed: true },
        { status: 200 }
      );
    }
  } catch (error) {
    logger.error('Newsletter subscription error', error, { service: 'newsletter' });

    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    );
  }
}
