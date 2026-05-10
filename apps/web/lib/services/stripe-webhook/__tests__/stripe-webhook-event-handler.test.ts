// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type Stripe from 'stripe';

// ---------------------------------------------------------------------------
// Hoisted handler mocks — `survive vitest mockReset: true` so the
// dispatcher tests can assert which downstream handler was called.
// ---------------------------------------------------------------------------
const handlers = vi.hoisted(() => ({
  // payment-handlers
  handlePaymentIntentSucceeded: vi.fn(),
  handlePaymentIntentFailed: vi.fn(),
  handlePaymentIntentCanceled: vi.fn(),
  handlePaymentIntentRequiresAction: vi.fn(),
  handleChargeSucceeded: vi.fn(),
  handleChargeFailed: vi.fn(),
  handleChargeRefunded: vi.fn(),
  // subscription-handlers
  handleSubscriptionUpdated: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  // invoice-handlers
  handleInvoicePaymentSucceeded: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
  // checkout-handlers
  handleAccountUpdated: vi.fn(),
  handleCheckoutSessionCompleted: vi.fn(),
  // setup-intent-handlers
  handleSetupIntentWebhookSucceeded: vi.fn(),
  handleSetupIntentWebhookFailed: vi.fn(),
  handlePaymentMethodDetached: vi.fn(),
  // dispute-handlers
  handleDisputeCreated: vi.fn(),
  handleDisputeUpdated: vi.fn(),
  handleDisputeClosed: vi.fn(),
  // logger
  loggerInfo: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks (must be set up BEFORE the SUT import)
// ---------------------------------------------------------------------------
vi.mock('../payment-handlers', () => ({
  handlePaymentIntentSucceeded: handlers.handlePaymentIntentSucceeded,
  handlePaymentIntentFailed: handlers.handlePaymentIntentFailed,
  handlePaymentIntentCanceled: handlers.handlePaymentIntentCanceled,
  handlePaymentIntentRequiresAction: handlers.handlePaymentIntentRequiresAction,
  handleChargeSucceeded: handlers.handleChargeSucceeded,
  handleChargeFailed: handlers.handleChargeFailed,
  handleChargeRefunded: handlers.handleChargeRefunded,
}));
vi.mock('../subscription-handlers', () => ({
  handleSubscriptionUpdated: handlers.handleSubscriptionUpdated,
  handleSubscriptionDeleted: handlers.handleSubscriptionDeleted,
}));
vi.mock('../invoice-handlers', () => ({
  handleInvoicePaymentSucceeded: handlers.handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed: handlers.handleInvoicePaymentFailed,
}));
vi.mock('../checkout-handlers', () => ({
  handleAccountUpdated: handlers.handleAccountUpdated,
  handleCheckoutSessionCompleted: handlers.handleCheckoutSessionCompleted,
}));
vi.mock('../setup-intent-handlers', () => ({
  handleSetupIntentWebhookSucceeded: handlers.handleSetupIntentWebhookSucceeded,
  handleSetupIntentWebhookFailed: handlers.handleSetupIntentWebhookFailed,
  handlePaymentMethodDetached: handlers.handlePaymentMethodDetached,
}));
vi.mock('../dispute-handlers', () => ({
  handleDisputeCreated: handlers.handleDisputeCreated,
  handleDisputeUpdated: handlers.handleDisputeUpdated,
  handleDisputeClosed: handlers.handleDisputeClosed,
}));
vi.mock('../webhook-helpers', () => ({
  sendNotification: vi.fn(),
}));
vi.mock('@mintenance/shared', async () => {
  const actual =
    await vi.importActual<Record<string, unknown>>('@mintenance/shared');
  return {
    ...actual,
    logger: {
      info: handlers.loggerInfo,
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
});

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------
import { StripeWebhookEventHandler } from '../stripe-webhook-event-handler';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeEvent<T extends string>(
  type: T,
  obj: Record<string, unknown> = {}
): Stripe.Event {
  return {
    id: 'evt_test_dispatcher',
    type,
    api_version: '2025-01-27.acacia',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    object: 'event',
    data: { object: obj },
  } as unknown as Stripe.Event;
}

const stubStripe = {} as unknown as Stripe;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('StripeWebhookEventHandler dispatcher', () => {
  let handler: StripeWebhookEventHandler;

  beforeEach(() => {
    handler = new StripeWebhookEventHandler(stubStripe);
  });

  describe('payment_intent events', () => {
    it('routes payment_intent.succeeded to handlePaymentIntentSucceeded', async () => {
      const obj = { id: 'pi_1' };
      await handler.handleEvent(makeEvent('payment_intent.succeeded', obj));
      expect(handlers.handlePaymentIntentSucceeded).toHaveBeenCalledTimes(1);
      expect(handlers.handlePaymentIntentSucceeded).toHaveBeenCalledWith(
        obj,
        expect.any(Function)
      );
    });

    it('routes payment_intent.payment_failed', async () => {
      await handler.handleEvent(
        makeEvent('payment_intent.payment_failed', { id: 'pi_2' })
      );
      expect(handlers.handlePaymentIntentFailed).toHaveBeenCalledTimes(1);
    });

    it('routes payment_intent.canceled', async () => {
      await handler.handleEvent(
        makeEvent('payment_intent.canceled', { id: 'pi_3' })
      );
      expect(handlers.handlePaymentIntentCanceled).toHaveBeenCalledTimes(1);
    });

    it('routes payment_intent.requires_action', async () => {
      await handler.handleEvent(
        makeEvent('payment_intent.requires_action', { id: 'pi_4' })
      );
      expect(handlers.handlePaymentIntentRequiresAction).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe('charge events', () => {
    it('routes charge.refunded', async () => {
      await handler.handleEvent(makeEvent('charge.refunded', { id: 'ch_1' }));
      expect(handlers.handleChargeRefunded).toHaveBeenCalledTimes(1);
    });

    it('routes charge.succeeded and charge.failed independently', async () => {
      await handler.handleEvent(makeEvent('charge.succeeded', { id: 'ch_2' }));
      await handler.handleEvent(makeEvent('charge.failed', { id: 'ch_3' }));
      expect(handlers.handleChargeSucceeded).toHaveBeenCalledTimes(1);
      expect(handlers.handleChargeFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscription events', () => {
    it('treats customer.subscription.created and customer.subscription.updated as the same handler', async () => {
      // Documents the dispatcher's intentional fallthrough — created
      // is handled by the same upsert path as updated. If this ever
      // changes, this test fails loudly so the dispatcher contract
      // stays explicit.
      await handler.handleEvent(
        makeEvent('customer.subscription.created', { id: 'sub_1' })
      );
      await handler.handleEvent(
        makeEvent('customer.subscription.updated', { id: 'sub_2' })
      );
      expect(handlers.handleSubscriptionUpdated).toHaveBeenCalledTimes(2);
    });

    it('routes customer.subscription.deleted distinctly', async () => {
      await handler.handleEvent(
        makeEvent('customer.subscription.deleted', { id: 'sub_3' })
      );
      expect(handlers.handleSubscriptionDeleted).toHaveBeenCalledTimes(1);
    });
  });

  describe('invoice events', () => {
    it('routes invoice.payment_succeeded and invoice.payment_failed', async () => {
      await handler.handleEvent(
        makeEvent('invoice.payment_succeeded', { id: 'in_1' })
      );
      await handler.handleEvent(
        makeEvent('invoice.payment_failed', { id: 'in_2' })
      );
      expect(handlers.handleInvoicePaymentSucceeded).toHaveBeenCalledTimes(1);
      expect(handlers.handleInvoicePaymentFailed).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkout + account events', () => {
    it('routes account.updated', async () => {
      await handler.handleEvent(makeEvent('account.updated', { id: 'acct_1' }));
      expect(handlers.handleAccountUpdated).toHaveBeenCalledTimes(1);
    });

    it('routes checkout.session.completed and forwards the stripe instance', async () => {
      const obj = { id: 'cs_1' };
      await handler.handleEvent(makeEvent('checkout.session.completed', obj));
      expect(handlers.handleCheckoutSessionCompleted).toHaveBeenCalledTimes(1);
      // Asserts the dispatcher passes the constructor-injected stripe
      // through — checkout completion is the only event that needs
      // the SDK at handler time (line-item resolution).
      expect(handlers.handleCheckoutSessionCompleted).toHaveBeenCalledWith(
        obj,
        stubStripe,
        expect.any(Function)
      );
    });
  });

  describe('setup-intent events', () => {
    it('routes setup_intent.succeeded', async () => {
      await handler.handleEvent(
        makeEvent('setup_intent.succeeded', { id: 'seti_1' })
      );
      expect(handlers.handleSetupIntentWebhookSucceeded).toHaveBeenCalledTimes(
        1
      );
    });

    it('routes setup_intent.setup_failed', async () => {
      await handler.handleEvent(
        makeEvent('setup_intent.setup_failed', { id: 'seti_2' })
      );
      expect(handlers.handleSetupIntentWebhookFailed).toHaveBeenCalledTimes(1);
    });

    it('routes payment_method.detached', async () => {
      await handler.handleEvent(
        makeEvent('payment_method.detached', { id: 'pm_1' })
      );
      expect(handlers.handlePaymentMethodDetached).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispute events', () => {
    it('routes charge.dispute.created/updated/closed to distinct handlers', async () => {
      await handler.handleEvent(
        makeEvent('charge.dispute.created', { id: 'dp_1' })
      );
      await handler.handleEvent(
        makeEvent('charge.dispute.updated', { id: 'dp_2' })
      );
      await handler.handleEvent(
        makeEvent('charge.dispute.closed', { id: 'dp_3' })
      );
      expect(handlers.handleDisputeCreated).toHaveBeenCalledTimes(1);
      expect(handlers.handleDisputeUpdated).toHaveBeenCalledTimes(1);
      expect(handlers.handleDisputeClosed).toHaveBeenCalledTimes(1);
    });
  });

  describe('unhandled events', () => {
    it('logs an info-level "Unhandled webhook event type" and does not throw', async () => {
      // Important: unknown events must NOT throw — Stripe sends event
      // types we don't subscribe to all the time, and a thrown
      // dispatcher would convert successful retrieval into a 500
      // back to Stripe (which Stripe then retries indefinitely).
      await expect(
        handler.handleEvent(makeEvent('customer.deleted', { id: 'cus_1' }))
      ).resolves.toBeUndefined();

      expect(handlers.loggerInfo).toHaveBeenCalledWith(
        'Unhandled webhook event type',
        expect.objectContaining({
          service: 'stripe-webhook',
          eventType: 'customer.deleted',
        })
      );
      // Verify NONE of the domain handlers got invoked for the unknown event
      expect(handlers.handlePaymentIntentSucceeded).not.toHaveBeenCalled();
      expect(handlers.handleSubscriptionUpdated).not.toHaveBeenCalled();
      expect(handlers.handleDisputeCreated).not.toHaveBeenCalled();
    });
  });

  describe('handler propagation', () => {
    it('propagates errors from a downstream handler so the wrapper can mark the row failed', async () => {
      handlers.handlePaymentIntentSucceeded.mockRejectedValueOnce(
        new Error('downstream supabase outage')
      );
      await expect(
        handler.handleEvent(
          makeEvent('payment_intent.succeeded', { id: 'pi_99' })
        )
      ).rejects.toThrow('downstream supabase outage');
    });
  });
});
