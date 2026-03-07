import Stripe from 'stripe';
import { logger } from '@mintenance/shared';
import { sendNotification } from './webhook-helpers';
import {
  handlePaymentIntentSucceeded,
  handlePaymentIntentFailed,
  handlePaymentIntentCanceled,
  handlePaymentIntentRequiresAction,
  handleChargeSucceeded,
  handleChargeFailed,
  handleChargeRefunded,
} from './payment-handlers';
import {
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from './subscription-handlers';
import {
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
} from './invoice-handlers';
import {
  handleAccountUpdated,
  handleCheckoutSessionCompleted,
} from './checkout-handlers';
import {
  handleDisputeCreated,
  handleDisputeUpdated,
  handleDisputeClosed,
} from './dispute-handlers';

/**
 * Stripe Webhook Event Handler
 *
 * Thin dispatcher that routes Stripe webhook events to domain-specific handlers.
 * Handler implementations are in separate files for maintainability:
 * - payment-handlers.ts: PaymentIntent + Charge events
 * - subscription-handlers.ts: Subscription lifecycle events
 * - invoice-handlers.ts: Invoice payment events
 * - checkout-handlers.ts: Checkout session + Account events
 * - dispute-handlers.ts: Dispute lifecycle events
 */
export class StripeWebhookEventHandler {
  private stripe: Stripe;

  constructor(stripe: Stripe) {
    this.stripe = stripe;
  }

  async handleEvent(event: Stripe.Event): Promise<void> {
    const notify = sendNotification;

    switch (event.type) {
      // Payment Intent events
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, notify);
        return;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, notify);
        return;
      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, notify);
        return;
      case 'payment_intent.requires_action':
        await handlePaymentIntentRequiresAction(event.data.object as Stripe.PaymentIntent, notify);
        return;

      // Charge events
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge, notify);
        return;
      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge, notify);
        return;
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, notify);
        return;

      // Subscription events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, notify);
        return;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, notify);
        return;

      // Invoice events
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, notify);
        return;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, notify);
        return;

      // Account events
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account, notify);
        return;

      // Checkout events
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          this.stripe,
          notify
        );
        return;

      // Dispute events
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute, notify);
        return;
      case 'charge.dispute.updated':
        await handleDisputeUpdated(event.data.object as Stripe.Dispute, notify);
        return;
      case 'charge.dispute.closed':
        await handleDisputeClosed(event.data.object as Stripe.Dispute, notify);
        return;

      default:
        logger.info('Unhandled webhook event type', {
          service: 'stripe-webhook',
          eventType: event.type,
        });
    }
  }
}
