// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import type Stripe from 'stripe';
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriod,
  getInvoicePaymentClientSecret,
} from '../stripe-compat';

/**
 * The Stripe SDK v22 types describe the dahlia API while our runtime
 * stays pinned to acacia (lib/stripe.ts) and webhook payloads follow
 * the endpoint's own version — so every helper must read BOTH shapes.
 * These tests pin that dual contract.
 */

describe('getInvoiceSubscriptionId', () => {
  it('reads the legacy top-level subscription field (acacia webhooks)', () => {
    const invoice = {
      subscription: 'sub_legacy_1',
    } as unknown as Stripe.Invoice;
    expect(getInvoiceSubscriptionId(invoice)).toBe('sub_legacy_1');
  });

  it('reads an expanded legacy subscription object', () => {
    const invoice = {
      subscription: { id: 'sub_legacy_2' },
    } as unknown as Stripe.Invoice;
    expect(getInvoiceSubscriptionId(invoice)).toBe('sub_legacy_2');
  });

  it('prefers the basil+ parent.subscription_details location', () => {
    const invoice = {
      parent: { subscription_details: { subscription: 'sub_new_1' } },
      subscription: 'sub_stale_legacy',
    } as unknown as Stripe.Invoice;
    expect(getInvoiceSubscriptionId(invoice)).toBe('sub_new_1');
  });

  it('returns undefined for a one-off (non-subscription) invoice', () => {
    const invoice = { parent: null } as unknown as Stripe.Invoice;
    expect(getInvoiceSubscriptionId(invoice)).toBeUndefined();
  });
});

describe('getSubscriptionPeriod', () => {
  it('reads legacy top-level current_period_* (acacia)', () => {
    const subscription = {
      items: { data: [{}] },
      current_period_start: 1700000000,
      current_period_end: 1702592000,
    } as unknown as Stripe.Subscription;
    expect(getSubscriptionPeriod(subscription)).toEqual({
      start: 1700000000,
      end: 1702592000,
    });
  });

  it('prefers the basil+ per-item period', () => {
    const subscription = {
      items: {
        data: [
          { current_period_start: 1700000001, current_period_end: 1702592001 },
        ],
      },
    } as unknown as Stripe.Subscription;
    expect(getSubscriptionPeriod(subscription)).toEqual({
      start: 1700000001,
      end: 1702592001,
    });
  });

  it('returns nulls when neither shape carries a period', () => {
    const subscription = {
      items: { data: [] },
    } as unknown as Stripe.Subscription;
    expect(getSubscriptionPeriod(subscription)).toEqual({
      start: null,
      end: null,
    });
  });
});

describe('getInvoicePaymentClientSecret', () => {
  it('reads the legacy expanded payment_intent (acacia)', () => {
    const invoice = {
      payment_intent: { id: 'pi_1', client_secret: 'pi_1_secret_x' },
    } as unknown as Stripe.Invoice;
    expect(getInvoicePaymentClientSecret(invoice)).toBe('pi_1_secret_x');
  });

  it('prefers the basil+ confirmation_secret', () => {
    const invoice = {
      confirmation_secret: {
        client_secret: 'pi_2_secret_y',
        type: 'payment_intent',
      },
      payment_intent: { id: 'pi_stale', client_secret: 'stale' },
    } as unknown as Stripe.Invoice;
    expect(getInvoicePaymentClientSecret(invoice)).toBe('pi_2_secret_y');
  });

  it('returns null for a missing invoice or unexpanded string PI', () => {
    expect(getInvoicePaymentClientSecret(null)).toBeNull();
    expect(
      getInvoicePaymentClientSecret({
        payment_intent: 'pi_not_expanded',
      } as unknown as Stripe.Invoice)
    ).toBeNull();
  });
});
