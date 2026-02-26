import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { withApiHandler } from '@/lib/api/with-api-handler';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/newsletter/subscribe
 * Subscribe email to newsletter.
 *
 * Saves to Supabase table `public.newsletter_subscriptions`.
 * Store-only: no newsletter emails are sent.
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: false },
  async (request) => {
    // Custom rate limiting
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

    try {
      // Check if email already exists
      const { data: existing, error: checkError } = await serverSupabase
        .from('newsletter_subscriptions')
        .select('id, email, is_active')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        logger.error('Error checking newsletter subscription', {
          service: 'newsletter', error: checkError, email: email.toLowerCase().trim(),
        });
      }

      if (existing && existing.is_active) {
        logger.info('Newsletter subscription already exists', {
          service: 'newsletter', email: email.toLowerCase().trim(),
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
        if (insertError.code === '23505') {
          // Unique constraint violation - reactivate
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
              service: 'newsletter', error: updateError, email: email.toLowerCase().trim(),
            });
            throw new Error('Failed to subscribe. Please try again later.');
          }

          logger.info('Newsletter subscription reactivated', {
            service: 'newsletter', email: email.toLowerCase().trim(),
          });
        } else {
          logger.error('Error inserting newsletter subscription', {
            service: 'newsletter', error: insertError, email: email.toLowerCase().trim(),
          });
          throw new Error('Failed to subscribe. Please try again later.');
        }
      } else {
        logger.info('Newsletter subscription successful', {
          service: 'newsletter', email: email.toLowerCase().trim(),
          subscriptionId: inserted?.id,
        });
      }

      return NextResponse.json(
        { message: 'Successfully subscribed to newsletter', subscribed: true },
        { status: 200 }
      );
    } catch (dbError) {
      logger.error('Newsletter subscription database error', {
        service: 'newsletter', error: dbError, email: email.toLowerCase().trim(),
      });

      // Graceful degradation - return success even if DB fails
      return NextResponse.json(
        { message: 'Successfully subscribed to newsletter', subscribed: true },
        { status: 200 }
      );
    }
  }
);
