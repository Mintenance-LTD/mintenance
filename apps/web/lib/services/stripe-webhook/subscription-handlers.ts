import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import type { SendNotificationFn } from './webhook-helpers';

/**
 * Subscription created/updated — sync status to profiles and contractor_profiles.
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
    const customerId = typeof subscription.customer === 'string'
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

    // Determine tier from price metadata or product
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const tierFromMetadata = subscription.metadata?.tier
      || subscription.items?.data?.[0]?.price?.metadata?.tier;

    // Update profiles.subscription_status
    const { error: profileError } = await serverSupabase
      .from('profiles')
      .update({
        subscription_status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      logger.error('Failed to update profile subscription status', profileError, {
        service: 'stripe-webhook',
        userId: user.id,
      });
    }

    // Update contractor_profiles if user is a contractor
    if (user.role === 'contractor') {
      const contractorUpdate: Record<string, unknown> = {
        subscription_status: mappedStatus,
        updated_at: new Date().toISOString(),
      };
      if (tierFromMetadata) {
        contractorUpdate.subscription_tier = tierFromMetadata;
      }

      const { error: contractorError } = await serverSupabase
        .from('contractor_profiles')
        .update(contractorUpdate)
        .eq('user_id', user.id);

      if (contractorError) {
        logger.error('Failed to update contractor_profiles subscription', contractorError, {
          service: 'stripe-webhook',
          userId: user.id,
        });
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
    logger.error('Error in handleSubscriptionUpdated', error, { service: 'stripe-webhook' });
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
    const customerId = typeof subscription.customer === 'string'
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

    // Downgrade contractor_profiles
    if (user.role === 'contractor') {
      const { error: contractorError } = await serverSupabase
        .from('contractor_profiles')
        .update({
          subscription_status: 'none',
          subscription_tier: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (contractorError) {
        logger.error('Failed to downgrade contractor subscription', contractorError, {
          service: 'stripe-webhook',
          userId: user.id,
        });
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
    logger.error('Error in handleSubscriptionDeleted', error, { service: 'stripe-webhook' });
    throw error;
  }
}
