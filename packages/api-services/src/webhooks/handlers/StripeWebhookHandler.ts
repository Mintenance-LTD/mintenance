/**
 * Stripe Webhook Handler - Processes Stripe webhook events
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@mintenance/shared';
import { PaymentIntentHandler } from './stripe/PaymentIntentHandler';
import { SubscriptionHandler } from './stripe/SubscriptionHandler';
import { InvoiceHandler } from './stripe/InvoiceHandler';
import { CheckoutHandler } from './stripe/CheckoutHandler';
import { ChargeHandler } from './stripe/ChargeHandler';
import { AccountHandler } from './stripe/AccountHandler';
// Mock Stripe types
interface Stripe {
  webhooks: {
    constructEvent(body: string, signature: string, secret: string): unknown;
  };
}
interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: {
    object: unknown;
    previous_attributes?: unknown;
  };
}

export interface StripeWebhookConfig {
  stripe: Stripe;
  supabase: SupabaseClient;
  webhookSecret: string;
}
export class StripeWebhookHandler {
  private stripe: Stripe;
  private supabase: SupabaseClient;
  private webhookSecret: string;
  // Event-specific handlers
  private paymentIntentHandler: PaymentIntentHandler;
  private subscriptionHandler: SubscriptionHandler;
  private invoiceHandler: InvoiceHandler;
  private checkoutHandler: CheckoutHandler;
  private chargeHandler: ChargeHandler;
  private accountHandler: AccountHandler;
  constructor(config: StripeWebhookConfig) {
    this.stripe = config.stripe;
    this.supabase = config.supabase;
    this.webhookSecret = config.webhookSecret;
    // Initialize event handlers
    this.paymentIntentHandler = new PaymentIntentHandler(config);
    this.subscriptionHandler = new SubscriptionHandler(config);
    this.invoiceHandler = new InvoiceHandler(config);
    this.checkoutHandler = new CheckoutHandler(config);
    this.chargeHandler = new ChargeHandler(config);
    this.accountHandler = new AccountHandler(config);
  }
  /**
   * Verify and parse Stripe webhook event
   */
  async verifyAndParseEvent(body: string, signature: string): Promise<StripeEvent> {
    if (!this.webhookSecret) {
      throw new Error('Webhook endpoint not properly configured');
    }
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.webhookSecret
      );
      // Validate timestamp to prevent replay attacks (60 second tolerance)
      const eventTimestamp = event.created;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timestampTolerance = 60;
      if (Math.abs(currentTimestamp - eventTimestamp) > timestampTolerance) {
        logger.warn('Webhook event timestamp outside tolerance window', {
          eventId: event.id,
          eventTimestamp,
          currentTimestamp,
          timeDifference: Math.abs(currentTimestamp - eventTimestamp)
        });
        throw new Error('Event timestamp outside acceptable range');
      }
      return event;
    } catch (error) {
      logger.error('Webhook signature verification failed', { error });
      throw new Error('Webhook signature verification failed');
    }
  }
  /**
   * Handle Stripe webhook event
   */
  async handleEvent(event: StripeEvent): Promise<unknown> {
    logger.info('Processing Stripe webhook event', {
      eventId: event.id,
      eventType: event.type
    });
    try {
      switch (event.type) {
        // Payment Intent Events
        case 'payment_intent.succeeded':
          return await this.paymentIntentHandler.handleSucceeded(event);
        case 'payment_intent.payment_failed':
          return await this.paymentIntentHandler.handleFailed(event);
        case 'payment_intent.canceled':
          return await this.paymentIntentHandler.handleCanceled(event);
        case 'payment_intent.processing':
          return await this.paymentIntentHandler.handleProcessing(event);
        case 'payment_intent.requires_action':
          return await this.paymentIntentHandler.handleRequiresAction(event);
        // Charge Events
        case 'charge.succeeded':
          return await this.chargeHandler.handleSucceeded(event);
        case 'charge.failed':
          return await this.chargeHandler.handleFailed(event);
        case 'charge.refunded':
          return await this.chargeHandler.handleRefunded(event);
        case 'charge.dispute.created':
          return await this.chargeHandler.handleDisputeCreated(event);
        // Subscription Events
        case 'customer.subscription.created':
          return await this.subscriptionHandler.handleCreated(event);
        case 'customer.subscription.updated':
          return await this.subscriptionHandler.handleUpdated(event);
        case 'customer.subscription.deleted':
          return await this.subscriptionHandler.handleDeleted(event);
        case 'customer.subscription.trial_will_end':
          return await this.subscriptionHandler.handleTrialWillEnd(event);
        // Invoice Events
        case 'invoice.created':
          return await this.invoiceHandler.handleCreated(event);
        case 'invoice.finalized':
          return await this.invoiceHandler.handleFinalized(event);
        case 'invoice.payment_succeeded':
          return await this.invoiceHandler.handlePaymentSucceeded(event);
        case 'invoice.payment_failed':
          return await this.invoiceHandler.handlePaymentFailed(event);
        case 'invoice.payment_action_required':
          return await this.invoiceHandler.handlePaymentActionRequired(event);
        // Checkout Events
        case 'checkout.session.completed':
          return await this.checkoutHandler.handleCompleted(event);
        case 'checkout.session.expired':
          return await this.checkoutHandler.handleExpired(event);
        case 'checkout.session.async_payment_succeeded':
          return await this.checkoutHandler.handleAsyncPaymentSucceeded(event);
        case 'checkout.session.async_payment_failed':
          return await this.checkoutHandler.handleAsyncPaymentFailed(event);
        // Account Events (for Connect)
        case 'account.updated':
          return await this.accountHandler.handleUpdated(event);
        case 'account.application.deauthorized':
          return await this.accountHandler.handleDeauthorized(event);
        case 'capability.updated':
          return await this.accountHandler.handleCapabilityUpdated(event);
        // Transfer Events (for payouts)
        case 'transfer.created':
          return await this.handleTransferCreated(event);
        case 'transfer.updated':
          return await this.handleTransferUpdated(event);
        case 'transfer.failed':
          return await this.handleTransferFailed(event);
        // Payout Events
        case 'payout.created':
          return await this.handlePayoutCreated(event);
        case 'payout.updated':
          return await this.handlePayoutUpdated(event);
        case 'payout.failed':
          return await this.handlePayoutFailed(event);
        // Customer Events
        case 'customer.created':
          return await this.handleCustomerCreated(event);
        case 'customer.updated':
          return await this.handleCustomerUpdated(event);
        case 'customer.deleted':
          return await this.handleCustomerDeleted(event);
        // Default handler for unrecognized events
        default:
          logger.info('Unhandled webhook event type', {
            eventType: event.type,
            eventId: event.id
          });
          return { acknowledged: true, handled: false };
      }
    } catch (error) {
      logger.error('Error processing webhook event', {
        eventType: event.type,
        eventId: event.id,
        error
      });
      throw error;
    }
  }
  // ============= Transfer Event Handlers =============
  private async handleTransferCreated(event: StripeEvent): Promise<unknown> {
    const transfer = event.data.object;
    await this.supabase
      .from('transfers')
      .insert({
        stripe_transfer_id: transfer.id,
        amount: transfer.amount / 100,
        destination: transfer.destination,
        status: transfer.status,
        metadata: transfer.metadata,
        created_at: new Date().toISOString()
      });
    logger.info('Transfer created', {
      transferId: transfer.id,
      amount: transfer.amount / 100,
      destination: transfer.destination
    });
    return { processed: true, transferId: transfer.id };
  }
  private async handleTransferUpdated(event: StripeEvent): Promise<unknown> {
    const transfer = event.data.object;
    await this.supabase
      .from('transfers')
      .update({
        status: transfer.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_transfer_id', transfer.id);
    return { processed: true, transferId: transfer.id };
  }
  private async handleTransferFailed(event: StripeEvent): Promise<unknown> {
    const transfer = event.data.object;
    await this.supabase
      .from('transfers')
      .update({
        status: 'failed',
        failure_reason: transfer.failure_message,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_transfer_id', transfer.id);
    // Notify contractor of failed transfer
    logger.error('Transfer failed', {
      transferId: transfer.id,
      reason: transfer.failure_message
    });
    return { processed: true, transferId: transfer.id, status: 'failed' };
  }
  // ============= Payout Event Handlers =============
  private async handlePayoutCreated(event: StripeEvent): Promise<unknown> {
    const payout = event.data.object;
    await this.supabase
      .from('payouts')
      .insert({
        stripe_payout_id: payout.id,
        amount: payout.amount / 100,
        arrival_date: new Date(payout.arrival_date * 1000).toISOString(),
        status: payout.status,
        method: payout.method,
        created_at: new Date().toISOString()
      });
    return { processed: true, payoutId: payout.id };
  }
  private async handlePayoutUpdated(event: StripeEvent): Promise<unknown> {
    const payout = event.data.object;
    await this.supabase
      .from('payouts')
      .update({
        status: payout.status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payout_id', payout.id);
    return { processed: true, payoutId: payout.id };
  }
  private async handlePayoutFailed(event: StripeEvent): Promise<unknown> {
    const payout = event.data.object;
    await this.supabase
      .from('payouts')
      .update({
        status: 'failed',
        failure_reason: payout.failure_message,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payout_id', payout.id);
    logger.error('Payout failed', {
      payoutId: payout.id,
      reason: payout.failure_message
    });
    return { processed: true, payoutId: payout.id, status: 'failed' };
  }
  // ============= Customer Event Handlers =============
  private async handleCustomerCreated(event: StripeEvent): Promise<unknown> {
    const customer = event.data.object;
    // Update user with Stripe customer ID
    await this.supabase
      .from('users')
      .update({
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString()
      })
      .eq('email', customer.email);
    return { processed: true, customerId: customer.id };
  }
  private async handleCustomerUpdated(event: StripeEvent): Promise<unknown> {
    const customer = event.data.object;
    // Update customer information
    await this.supabase
      .from('users')
      .update({
        stripe_customer_metadata: customer.metadata,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customer.id);
    return { processed: true, customerId: customer.id };
  }
  private async handleCustomerDeleted(event: StripeEvent): Promise<unknown> {
    const customer = event.data.object;
    // Remove Stripe customer ID from user
    await this.supabase
      .from('users')
      .update({
        stripe_customer_id: null,
        stripe_customer_metadata: null,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customer.id);
    return { processed: true, customerId: customer.id, deleted: true };
  }
}