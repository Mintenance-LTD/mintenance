import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { withApiHandler } from '@/lib/api/with-api-handler';
import { EmailService } from '@/lib/email-service';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/newsletter
 * Subscribe email to newsletter and send welcome email via Brevo.
 *
 * Saves to Supabase table `public.newsletter_subscriptions`.
 */
export const POST = withApiHandler(
  { auth: false, rateLimit: { maxRequests: 10, windowMs: 60_000 } },
  async (request) => {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid email address',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Check if email already exists
      const { data: existing, error: checkError } = await serverSupabase
        .from('newsletter_subscriptions')
        .select('id, email, is_active, unsubscribe_token')
        .eq('email', normalizedEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        logger.error('Error checking newsletter subscription', {
          service: 'newsletter',
          error: checkError,
          email: normalizedEmail,
        });
      }

      if (existing && existing.is_active) {
        logger.info('Newsletter subscription already exists', {
          service: 'newsletter',
          email: normalizedEmail,
        });
        return NextResponse.json(
          { message: "You're already subscribed!", subscribed: true },
          { status: 200 }
        );
      }

      // Insert new subscription (or reactivate if exists but inactive)
      const subscriptionData = {
        email: normalizedEmail,
        source: 'footer' as const,
        is_active: true,
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
      };

      const { data: inserted, error: insertError } = await serverSupabase
        .from('newsletter_subscriptions')
        .insert(subscriptionData)
        .select('id, unsubscribe_token')
        .single();

      let unsubscribeToken = inserted?.unsubscribe_token;

      if (insertError) {
        if (insertError.code === '23505') {
          // Unique constraint violation - reactivate
          const { data: reactivated, error: updateError } = await serverSupabase
            .from('newsletter_subscriptions')
            .update({
              is_active: true,
              subscribed_at: new Date().toISOString(),
              unsubscribed_at: null,
              source: 'footer',
            })
            .eq('email', normalizedEmail)
            .select('id, unsubscribe_token')
            .single();

          if (updateError) {
            logger.error('Error reactivating newsletter subscription', {
              service: 'newsletter',
              error: updateError,
              email: normalizedEmail,
            });
            throw new Error('Failed to subscribe. Please try again later.');
          }

          unsubscribeToken = reactivated.unsubscribe_token;

          logger.info('Newsletter subscription reactivated', {
            service: 'newsletter',
            email: normalizedEmail,
          });
        } else {
          logger.error('Error inserting newsletter subscription', {
            service: 'newsletter',
            error: insertError,
            email: normalizedEmail,
          });
          throw new Error('Failed to subscribe. Please try again later.');
        }
      } else {
        logger.info('Newsletter subscription successful', {
          service: 'newsletter',
          email: normalizedEmail,
          subscriptionId: inserted?.id,
        });
      }

      // Send welcome email only when the DB returned the token required by
      // the one-click unsubscribe link. Never send an email with a broken or
      // address-based unsubscribe URL.
      if (unsubscribeToken) {
        EmailService.sendNewsletterWelcomeEmail(
          normalizedEmail,
          unsubscribeToken
        ).catch((err) => {
          logger.error('Failed to send newsletter welcome email', {
            service: 'newsletter',
            error: err,
            email: normalizedEmail,
          });
        });
      } else {
        logger.error('Newsletter subscription has no unsubscribe token', {
          service: 'newsletter',
          email: normalizedEmail,
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
        email: normalizedEmail,
      });

      // Do not acknowledge a subscription that was never persisted. A false
      // success makes the form look healthy while the user receives nothing.
      return NextResponse.json(
        { error: 'Unable to subscribe right now. Please try again later.' },
        { status: 503 }
      );
    }
  }
);
