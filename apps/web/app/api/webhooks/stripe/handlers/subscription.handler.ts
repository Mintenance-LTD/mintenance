import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
export class SubscriptionHandler {
  async handleCreated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const supabase = serverSupabase;
    logger.info('Subscription created', {
      service: 'stripe-webhook',
      eventId: event.id,
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });
    try {
      const contractorId = subscription.metadata?.contractor_id;
      if (!contractorId) {
        logger.warn('Subscription missing contractor_id in metadata', {
          subscriptionId: subscription.id,
        });
        return;
      }
      // Create or update subscription record
      const { error } = await supabase.from('contractor_subscriptions').upsert({
        contractor_id: contractorId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000).toISOString()
          : null,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        metadata: subscription.metadata,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        throw new Error(`Failed to create subscription record: ${error.message}`);
      }
      // Update contractor profile
      await supabase
        .from('contractor_profiles')
        .update({
          subscription_status: subscription.status,
          subscription_tier: subscription.metadata?.tier || 'basic',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractorId);
      // Create notification
      await NotificationService.createNotification({
        userId: contractorId,
        type: 'subscription_created',
        title: 'Subscription Activated',
        message: 'Your subscription has been successfully activated.',
        metadata: { subscription_id: subscription.id },
      });
    } catch (error) {
      logger.error('Failed to process subscription created event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        subscriptionId: subscription.id,
      });
      throw error;
    }
  }
  async handleUpdated(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const previousAttributes = (event.data as unknown as Record<string, unknown>).previous_attributes as Record<string, unknown> || {};
    const supabase = serverSupabase;
    logger.info('Subscription updated', {
      service: 'stripe-webhook',
      eventId: event.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      previousStatus: previousAttributes.status,
    });
    try {
      const contractorId = subscription.metadata?.contractor_id;
      if (!contractorId) {
        return;
      }
      // Update subscription record
      await supabase
        .from('contractor_subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at: subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null,
          canceled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      // Update contractor profile
      await supabase
        .from('contractor_profiles')
        .update({
          subscription_status: subscription.status,
          subscription_tier: subscription.metadata?.tier || 'basic',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractorId);
      // Notify on important status changes
      if (previousAttributes.status && previousAttributes.status !== subscription.status) {
        let message = 'Your subscription has been updated.';
        if (subscription.status === 'active' && previousAttributes.status === 'trialing') {
          message = 'Your trial period has ended and your subscription is now active.';
        } else if (subscription.status === 'past_due') {
          message = 'Your subscription payment is past due. Please update your payment method.';
        } else if (subscription.status === 'canceled') {
          message = 'Your subscription has been canceled.';
        }
        await NotificationService.createNotification({
          userId: contractorId,
          type: 'subscription_updated',
          title: 'Subscription Status Changed',
          message,
          metadata: {
            subscription_id: subscription.id,
            old_status: previousAttributes.status,
            new_status: subscription.status,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to process subscription updated event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        subscriptionId: subscription.id,
      });
      throw error;
    }
  }
  async handleDeleted(event: Stripe.Event): Promise<void> {
    const subscription = event.data.object as Stripe.Subscription;
    const supabase = serverSupabase;
    logger.info('Subscription deleted', {
      service: 'stripe-webhook',
      eventId: event.id,
      subscriptionId: subscription.id,
    });
    try {
      const contractorId = subscription.metadata?.contractor_id;
      if (!contractorId) {
        return;
      }
      // Update subscription record
      await supabase
        .from('contractor_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      // Update contractor profile to free tier
      await supabase
        .from('contractor_profiles')
        .update({
          subscription_status: 'canceled',
          subscription_tier: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractorId);
      // Create notification
      await NotificationService.createNotification({
        userId: contractorId,
        type: 'subscription_canceled',
        title: 'Subscription Canceled',
        message: 'Your subscription has been canceled. You can still access basic features.',
        metadata: { subscription_id: subscription.id },
      });
    } catch (error) {
      logger.error('Failed to process subscription deleted event', {
        service: 'stripe-webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        subscriptionId: subscription.id,
      });
      throw error;
    }
  }
}