import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SendNotificationFn } from './webhook-helpers';

/**
 * Subscription created/updated — sync status to profiles and the
 * role-specific subscription table (contractor_subscriptions /
 * homeowner_subscriptions).
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Subscription updated webhook received', {
    service: 'stripe-webhook',
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  try {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (!customerId) {
      logger.warn('Subscription missing customer ID', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
      });
      return;
    }

    const { data: user, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, role')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for subscription customer', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        customerId,
      });
      return;
    }

    // Map Stripe subscription status to our internal status
    const statusMap: Record<string, string> = {
      active: 'active',
      past_due: 'past_due',
      canceled: 'cancelled',
      unpaid: 'unpaid',
      incomplete: 'incomplete',
      incomplete_expired: 'expired',
      trialing: 'trialing',
      paused: 'paused',
    };
    const mappedStatus = statusMap[subscription.status] || subscription.status;
    const homeownerStatus =
      mappedStatus === 'cancelled' ? 'canceled' : mappedStatus;

    // Determine tier from price metadata or product
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const tierFromMetadata =
      subscription.metadata?.tier ||
      subscription.items?.data?.[0]?.price?.metadata?.tier;

    // Update profiles.subscription_status
    const { error: profileError } = await serverSupabase
      .from('profiles')
      .update({
        subscription_status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      logger.error(
        'Failed to update profile subscription status',
        profileError,
        {
          service: 'stripe-webhook',
          userId: user.id,
        }
      );
    }

    // Update role-specific subscription table/profile
    if (user.role === 'contractor') {
      // contractor_subscriptions is the tier source of truth
      // (FeeCalculationService.resolveContractorTier filters
      // status IN ('active','trial')). Previously this branch wrote the
      // retired contractor_profiles shadow table — keyed on a user_id
      // column that table never had, so Stripe status transitions never
      // reached tier resolution and cancelled contractors kept
      // discounted fee rates.
      const csStatusMap: Record<string, string> = {
        active: 'active',
        past_due: 'past_due',
        cancelled: 'canceled',
        unpaid: 'unpaid',
        incomplete: 'unpaid',
        expired: 'expired',
        trialing: 'trial',
        paused: 'expired',
      };
      const csStatus = csStatusMap[mappedStatus];
      if (!csStatus) {
        logger.warn('Unmapped Stripe status for contractor_subscriptions', {
          service: 'stripe-webhook',
          userId: user.id,
          stripeStatus: subscription.status,
        });
      } else {
        const contractorUpdate: Record<string, unknown> = {
          status: csStatus,
          current_period_start: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        };
        if (
          tierFromMetadata &&
          ['free', 'basic', 'professional', 'enterprise'].includes(
            tierFromMetadata
          )
        ) {
          contractorUpdate.plan_type = tierFromMetadata;
        }

        const { error: contractorError } = await serverSupabase
          .from('contractor_subscriptions')
          .update(contractorUpdate)
          .eq('stripe_subscription_id', subscription.id);

        if (contractorError) {
          logger.error(
            'Failed to update contractor_subscriptions',
            contractorError,
            {
              service: 'stripe-webhook',
              userId: user.id,
              subscriptionId: subscription.id,
            }
          );
        }
      }
    } else if (user.role === 'homeowner') {
      const { error: homeownerSubError } = await serverSupabase
        .from('homeowner_subscriptions')
        .update({
          status: homeownerStatus,
          current_period_start: subscription.current_period_start
            ? new Date(subscription.current_period_start * 1000).toISOString()
            : null,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (homeownerSubError) {
        logger.error(
          'Failed to update homeowner_subscriptions subscription',
          homeownerSubError,
          {
            service: 'stripe-webhook',
            userId: user.id,
            mappedStatus,
            homeownerStatus,
          }
        );
      }
    }

    // Send notifications for concerning statuses
    if (['past_due', 'unpaid'].includes(subscription.status)) {
      await sendNotification(
        user.id,
        'Subscription Payment Issue',
        'There is an issue with your subscription payment. Please update your payment method to avoid service interruption.',
        'subscription_payment_issue'
      );
    } else if (subscription.status === 'canceled') {
      await sendNotification(
        user.id,
        'Subscription Cancelled',
        'Your subscription has been cancelled. You can resubscribe at any time from your account settings.',
        'subscription_cancelled'
      );
    }

    logger.info('Subscription status synced', {
      service: 'stripe-webhook',
      subscriptionId: subscription.id,
      userId: user.id,
      status: mappedStatus,
      priceId,
      tier: tierFromMetadata,
    });
  } catch (error) {
    logger.error('Error in handleSubscriptionUpdated', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}

/**
 * Subscription deleted — downgrade user to free tier.
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  sendNotification: SendNotificationFn
): Promise<void> {
  logger.info('Subscription deleted webhook received', {
    service: 'stripe-webhook',
    subscriptionId: subscription.id,
  });

  try {
    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

    if (!customerId) {
      logger.warn('Subscription missing customer ID', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
      });
      return;
    }

    const { data: user, error: userError } = await serverSupabase
      .from('profiles')
      .select('id, role')
      .eq('stripe_customer_id', customerId)
      .single();

    if (userError || !user) {
      logger.warn('User not found for subscription customer', {
        service: 'stripe-webhook',
        subscriptionId: subscription.id,
        customerId,
      });
      return;
    }

    // Downgrade to free/none in profiles
    const { error: profileError } = await serverSupabase
      .from('profiles')
      .update({
        subscription_status: 'none',
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      logger.error('Failed to downgrade profile subscription', profileError, {
        service: 'stripe-webhook',
        userId: user.id,
      });
    }

    // Downgrade role-specific subscription states
    if (user.role === 'contractor') {
      // Cancel the row in contractor_subscriptions (tier source of truth)
      // so resolveContractorTier stops matching status IN ('active','trial')
      // and the contractor reverts to the default fee rate. The retired
      // contractor_profiles shadow write this replaces never worked (no
      // user_id column), so cancellations previously never demoted tier.
      const { error: contractorError } = await serverSupabase
        .from('contractor_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : new Date().toISOString(),
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (contractorError) {
        logger.error(
          'Failed to downgrade contractor subscription',
          contractorError,
          {
            service: 'stripe-webhook',
            userId: user.id,
            subscriptionId: subscription.id,
          }
        );
      }
    } else if (user.role === 'homeowner') {
      const { error: homeownerError } = await serverSupabase
        .from('homeowner_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (homeownerError) {
        logger.error(
          'Failed to downgrade homeowner subscription',
          homeownerError,
          {
            service: 'stripe-webhook',
            userId: user.id,
          }
        );
      }
    }

    // Notify user
    await sendNotification(
      user.id,
      'Subscription Ended',
      'Your subscription has ended. You have been downgraded to the free plan. Resubscribe any time from your account settings.',
      'subscription_ended'
    );

    logger.info('Subscription deleted and user downgraded', {
      service: 'stripe-webhook',
      subscriptionId: subscription.id,
      userId: user.id,
    });
  } catch (error) {
    logger.error('Error in handleSubscriptionDeleted', error, {
      service: 'stripe-webhook',
    });
    throw error;
  }
}
