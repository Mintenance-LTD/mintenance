/**
 * Subscription Handler - Processes subscription webhook events
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
    previous_attributes?: unknown;
  };
}
export interface SubscriptionHandlerConfig {
  stripe: unknown;
  supabase: SupabaseClient;
  webhookSecret: string;
}
export class SubscriptionHandler {
  private supabase: SupabaseClient;
  constructor(config: SubscriptionHandlerConfig) {
    this.supabase = config.supabase;
  }
  async handleCreated(event: StripeEvent): Promise<unknown> {
    const subscription = event.data.object;
    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    });
    await this.supabase
      .from('subscriptions')
      .insert({
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: subscription.metadata,
        created_at: new Date().toISOString()
      });
    return { processed: true, subscriptionId: subscription.id };
  }
  async handleUpdated(event: StripeEvent): Promise<unknown> {
    const subscription = event.data.object;
    logger.info('Subscription updated', {
      subscriptionId: subscription.id,
      status: subscription.status,
      previousAttributes: event.data.previous_attributes
    });
    await this.supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
    return { processed: true, subscriptionId: subscription.id };
  }
  async handleDeleted(event: StripeEvent): Promise<unknown> {
    const subscription = event.data.object;
    logger.info('Subscription deleted', {
      subscriptionId: subscription.id,
      canceledAt: subscription.canceled_at
    });
    await this.supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
    return { processed: true, subscriptionId: subscription.id, deleted: true };
  }
  async handleTrialWillEnd(event: StripeEvent): Promise<unknown> {
    const subscription = event.data.object;
    logger.info('Subscription trial will end', {
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end
    });
    // Send notification to user
    const { data: sub } = await this.supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    if (sub?.user_id) {
      await this.supabase
        .from('notifications')
        .insert({
          user_id: sub.user_id,
          type: 'trial_ending',
          data: {
            subscriptionId: subscription.id,
            trialEndDate: new Date(subscription.trial_end * 1000).toISOString()
          },
          created_at: new Date().toISOString()
        });
    }
    return { processed: true, subscriptionId: subscription.id };
  }
}