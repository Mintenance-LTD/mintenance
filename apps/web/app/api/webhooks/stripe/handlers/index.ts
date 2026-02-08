/**
 * Stripe Webhook Event Handlers
 *
 * Central registry for all Stripe webhook event handlers.
 * Each handler is responsible for a specific event type.
 */
import { Stripe } from 'stripe';
import { SubscriptionHandler } from './subscription.handler';
import { InvoiceHandler } from './invoice.handler';
import { ChargeHandler } from './charge.handler';
import { AccountHandler } from './account.handler';
import { CheckoutHandler } from './checkout.handler';
import { logger } from '@mintenance/shared';
export type StripeEventHandler = (event: Stripe.Event) => Promise<void>;
export class WebhookHandlerRegistry {
  private handlers: Map<string, StripeEventHandler>;
  constructor() {
    this.handlers = new Map();
    this.registerHandlers();
  }
  private registerHandlers(): void {
    const subscriptionHandler = new SubscriptionHandler();
    const invoiceHandler = new InvoiceHandler();
    const chargeHandler = new ChargeHandler();
    const accountHandler = new AccountHandler();
    const checkoutHandler = new CheckoutHandler();
    // Charge Events
    this.handlers.set('charge.refunded', (e) => chargeHandler.handleRefunded(e));
    // Subscription Events
    this.handlers.set('customer.subscription.created', (e) => subscriptionHandler.handleCreated(e));
    this.handlers.set('customer.subscription.updated', (e) => subscriptionHandler.handleUpdated(e));
    this.handlers.set('customer.subscription.deleted', (e) => subscriptionHandler.handleDeleted(e));
    // Invoice Events
    this.handlers.set('invoice.payment_succeeded', (e) => invoiceHandler.handlePaymentSucceeded(e));
    this.handlers.set('invoice.payment_failed', (e) => invoiceHandler.handlePaymentFailed(e));
    // Account Events
    this.handlers.set('account.updated', (e) => accountHandler.handleUpdated(e));
    // Checkout Events
    this.handlers.set('checkout.session.completed', (e) => checkoutHandler.handleSessionCompleted(e));
  }
  async handleEvent(event: Stripe.Event): Promise<void> {
    const handler = this.handlers.get(event.type);
    if (!handler) {
      logger.info(`Unhandled webhook event type: ${event.type}`, {
        service: 'stripe-webhook',
        eventId: event.id,
      });
      return;
    }
    logger.info(`Processing webhook event: ${event.type}`, {
      service: 'stripe-webhook',
      eventId: event.id,
    });
    try {
      await handler(event);
      logger.info(`Successfully processed webhook event: ${event.type}`, {
        service: 'stripe-webhook',
        eventId: event.id,
      });
    } catch (error) {
      logger.error(`Failed to process webhook event: ${event.type}`, {
        service: 'stripe-webhook',
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
  getSupportedEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}