import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromCookies } from '@/lib/auth';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { SubscriptionService } from '@/lib/services/subscription/SubscriptionService';
import { HomeownerSubscriptionService } from '@/lib/services/subscription/HomeownerSubscriptionService';
import { TrialService } from '@/lib/services/subscription/TrialService';
import { logger } from '@mintenance/shared';
import { requireCSRF } from '@/lib/csrf-validator';
import { handleAPIError, UnauthorizedError, BadRequestError, ForbiddenError } from '@/lib/errors/api-error';
import { rateLimiter } from '@/lib/rate-limiter';
import { validateRequest } from '@/lib/validation/validator';
import { createSubscriptionSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
  // Rate limiting check
  const rateLimitResult = await rateLimiter.checkRateLimit({
    identifier: `${request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous'}:${request.url}`,
    windowMs: 60000,
    maxRequests: 30
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
          'X-RateLimit-Limit': String(30),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        }
      }
    );
  }

    // Validate CSRF
    if (!(await requireCSRF(request))) {
      throw new ForbiddenError('CSRF token validation failed');
    }

    const user = await getCurrentUserFromCookies();
    if (!user || (user.role !== 'contractor' && user.role !== 'homeowner')) {
      throw new UnauthorizedError('Authentication required');
    }

    // Validate and sanitize input using Zod schema
    const validationResult = await validateRequest(request, createSubscriptionSchema);
    if (validationResult instanceof NextResponse) return validationResult;
    const { data: validatedData } = validationResult;

    const { planType, billingCycle } = validatedData;

    // Homeowner premium flow
    if (user.role === 'homeowner') {
      if (planType !== 'premium') {
        throw new BadRequestError('Homeowners can only subscribe to the premium plan');
      }

      const existing = await HomeownerSubscriptionService.getCurrentSubscription(user.id);
      if (existing?.status === 'active' && existing.plan_type === 'premium') {
        return NextResponse.json({
          success: true,
          message: 'You are already subscribed to homeowner premium',
          subscriptionId: existing.id,
          requiresPayment: false,
        });
      }

      const customerId = await HomeownerSubscriptionService.getOrCreateStripeCustomer(
        user.id,
        user.email
      );

      const created = await HomeownerSubscriptionService.createPremiumSubscription(
        user.id,
        customerId,
        billingCycle || 'monthly'
      );

      await serverSupabase
        .from('profiles')
        .update({
          subscription_status: created.clientSecret ? 'incomplete' : 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      logger.info('Homeowner premium subscription created', {
        service: 'subscriptions',
        homeownerId: user.id,
        stripeSubscriptionId: created.stripeSubscriptionId,
      });

      return NextResponse.json({
        success: true,
        subscriptionId: created.dbSubscriptionId,
        stripeSubscriptionId: created.stripeSubscriptionId,
        clientSecret: created.clientSecret,
        requiresPayment: !!created.clientSecret,
        checkoutPath: '/homeowner/subscription/checkout',
      });
    }

    // Contractor flow
    if (planType === 'premium') {
      throw new BadRequestError('Invalid contractor plan type');
    }

    // Check if user already has a subscription
    const existingSubscription = await SubscriptionService.getContractorSubscription(user.id);
    
    // Handle free tier separately - no Stripe needed
    if (planType === 'free') {
      // If already on free tier, return success
      if (existingSubscription?.planType === 'free' && existingSubscription.status === 'free') {
        return NextResponse.json({
          success: true,
          message: 'You are already on the free tier',
          subscriptionId: existingSubscription.id,
        });
      }

      // Cancel any existing paid subscriptions
      if (existingSubscription && existingSubscription.stripeSubscriptionId) {
        try {
          const Stripe = (await import('stripe')).default;
          if (process.env.STRIPE_SECRET_KEY) {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2024-04-10',
            });
            try {
              await stripe.subscriptions.cancel(existingSubscription.stripeSubscriptionId);
            } catch (cancelError) {
              logger.warn('Could not cancel Stripe subscription', {
                service: 'subscriptions',
                subscriptionId: existingSubscription.stripeSubscriptionId,
              });
            }
          }
        } catch (err) {
          logger.warn('Error canceling Stripe subscription', {
            service: 'subscriptions',
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Mark existing subscription as canceled
        await serverSupabase
          .from('contractor_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscription.id);
      }

      // Create free tier subscription
      const subscriptionDbId = await SubscriptionService.createFreeTierSubscription(user.id);

      logger.info('Free tier subscription created', {
        service: 'subscriptions',
        contractorId: user.id,
      });

      return NextResponse.json({
        success: true,
        subscriptionId: subscriptionDbId,
        stripeSubscriptionId: null,
        clientSecret: null,
        requiresPayment: false,
      });
    }
    
    if (existingSubscription && existingSubscription.stripeSubscriptionId) {
      // Check the actual Stripe subscription status (more reliable than database status)
      let stripeSubscriptionStatus: string | null = null;
      try {
        const Stripe = (await import('stripe')).default;
        if (!process.env.STRIPE_SECRET_KEY) {
          throw new Error('STRIPE_SECRET_KEY not configured');
        }
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2024-04-10',
        });
        
        const stripeSub = await stripe.subscriptions.retrieve(existingSubscription.stripeSubscriptionId);
        stripeSubscriptionStatus = stripeSub.status;
      } catch (stripeError) {
        logger.warn('Could not retrieve Stripe subscription status, using database status', {
          service: 'subscriptions',
          subscriptionId: existingSubscription.stripeSubscriptionId,
          error: stripeError instanceof Error ? stripeError.message : String(stripeError),
        });
      }

      // Use Stripe status if available, otherwise fall back to database status
      const effectiveStatus = stripeSubscriptionStatus || existingSubscription.status;

      // If user is trying to subscribe to the same plan and it's active, return error
      if (existingSubscription.planType === planType && effectiveStatus === 'active') {
        throw new BadRequestError(`You are already subscribed to the ${planType} plan`);
      }

      // Check if subscription is incomplete/unpaid/trial/expired - cancel it and create new one
      const incompleteStatuses = ['incomplete', 'incomplete_expired', 'trial', 'unpaid', 'expired', 'past_due'];
      if (incompleteStatuses.includes(effectiveStatus)) {
        logger.info('Canceling incomplete/expired subscription to create new one', {
          service: 'subscriptions',
          contractorId: user.id,
          oldSubscriptionId: existingSubscription.stripeSubscriptionId,
          databaseStatus: existingSubscription.status,
          stripeStatus: stripeSubscriptionStatus,
          effectiveStatus: effectiveStatus,
        });

        try {
          // Cancel the incomplete subscription in Stripe
          if (existingSubscription.stripeSubscriptionId) {
            const Stripe = (await import('stripe')).default;
            if (!process.env.STRIPE_SECRET_KEY) {
              throw new Error('STRIPE_SECRET_KEY not configured');
            }
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
              apiVersion: '2024-04-10',
            });
            
            try {
              await stripe.subscriptions.cancel(existingSubscription.stripeSubscriptionId);
            } catch (cancelError) {
              // Subscription might already be canceled, that's okay
              logger.warn('Subscription may already be canceled in Stripe', {
                service: 'subscriptions',
                subscriptionId: existingSubscription.stripeSubscriptionId,
              });
            }
          }

          // IMPORTANT: Update database status to 'canceled' to release the unique constraint
          // The unique constraint only applies to 'trial' and 'active' statuses
          const { error: updateError } = await serverSupabase
            .from('contractor_subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSubscription.id);

          if (updateError) {
            logger.error('Failed to update subscription status in database', {
              service: 'subscriptions',
              subscriptionId: existingSubscription.id,
              error: updateError.message,
            });
            // Continue anyway - we'll try to handle it with upsert
          } else {
            logger.info('Marked old subscription as canceled in database', {
              service: 'subscriptions',
              subscriptionId: existingSubscription.id,
            });
          }
        } catch (cancelError) {
          logger.warn('Failed to cancel incomplete subscription, continuing anyway', {
            service: 'subscriptions',
            error: cancelError instanceof Error ? cancelError.message : String(cancelError),
          });
        }

        // Fall through to create new subscription
      } else if (existingSubscription.status === 'active' && existingSubscription.stripeSubscriptionId) {
        // Subscription is active and different plan - try to update it
        try {
          const { subscriptionId, clientSecret, requiresPayment } = 
            await SubscriptionService.updateSubscriptionPlan(
              user.id,
              planType,
              existingSubscription.stripeSubscriptionId
            );

          logger.info('Subscription plan updated', {
            service: 'subscriptions',
            contractorId: user.id,
            oldPlan: existingSubscription.planType,
            newPlan: planType,
            subscriptionId,
            requiresPayment,
          });

          return NextResponse.json({
            success: true,
            subscriptionId: existingSubscription.id,
            stripeSubscriptionId: subscriptionId,
            clientSecret,
            requiresPayment,
            isUpgrade: true,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          logger.error('Error updating subscription plan', {
            service: 'subscriptions',
            contractorId: user.id,
            oldPlan: existingSubscription.planType,
            newPlan: planType,
            stripeSubscriptionId: existingSubscription.stripeSubscriptionId,
            error: errorMessage,
            stack: err instanceof Error ? err.stack : undefined,
          });

          // Return more specific error message
          return NextResponse.json(
            { 
              error: 'Failed to update subscription plan',
              details: errorMessage,
              // Include helpful context for debugging
              debug: process.env.NODE_ENV === 'development' ? {
                oldPlan: existingSubscription.planType,
                newPlan: planType,
                subscriptionId: existingSubscription.stripeSubscriptionId,
              } : undefined,
            },
            { status: 500 }
          );
        }
      }
      // If subscription exists but status is 'canceled' or other, fall through to create new
    }

    // Get or create Stripe customer (only for paid plans)
    const { data: userData } = await serverSupabase
      .from('profiles')
      .select('stripe_customer_id, email, trial_ends_at')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = userData?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create Stripe customer
      const Stripe = (await import('stripe')).default;
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY not configured');
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-04-10',
      });

      const customer = await stripe.customers.create({
        email: userData?.email || user.email,
        metadata: {
          userId: user.id,
          userRole: 'contractor',
        },
      });

      stripeCustomerId = customer.id;

      // Save customer ID
      await serverSupabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // Get trial end date
    const trialStatus = await TrialService.getTrialStatus(user.id);
    const trialEnd = trialStatus?.trialEndsAt || null;

    // Create Stripe subscription
    const { subscriptionId, clientSecret } = await SubscriptionService.createStripeSubscription(
      user.id,
      planType,
      stripeCustomerId
    );

    // Get Stripe price ID (only for paid plans)
    // Note: planType is guaranteed to be a paid plan at this point (free tier handled above)
    let priceId = 'free-tier';
    const Stripe = (await import('stripe')).default;
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    });

    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    priceId = stripeSubscription.items.data[0]?.price.id || '';

    // Save subscription to database
    const subscriptionDbId = await SubscriptionService.saveSubscription(
      user.id,
      planType,
      subscriptionId,
      stripeCustomerId,
      priceId,
      trialEnd || undefined
    );

    logger.info('Subscription created', {
      service: 'subscriptions',
      contractorId: user.id,
      planType,
      subscriptionId,
    });

    return NextResponse.json({
      success: true,
      subscriptionId: subscriptionDbId,
      stripeSubscriptionId: subscriptionId,
      clientSecret,
      requiresPayment: !!clientSecret,
    });
  } catch (err) {
    return handleAPIError(err);
  }
}
