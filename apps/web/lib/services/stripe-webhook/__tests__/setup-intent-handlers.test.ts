import { beforeEach, describe, it, expect, vi } from 'vitest';
import type Stripe from 'stripe';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  save: vi.fn(),
  eq: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/stripe/elements/setup-intents', () => ({
  handleSetupIntentSucceeded: mocks.save,
}));
vi.mock('@mintenance/shared', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
import {
  handleSetupIntentWebhookSucceeded,
  handleSetupIntentWebhookFailed,
  handlePaymentMethodDetached,
} from '../setup-intent-handlers';
const setup = {
  id: 'seti_synthetic',
  customer: 'cus_synthetic',
  payment_method: 'pm_synthetic',
} as Stripe.SetupIntent;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.eq.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.remove.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { id: 'payer-1' }, error: null }),
      }),
    }),
    update: mocks.update,
    delete: mocks.remove,
  });
  mocks.save.mockResolvedValue(undefined);
});
describe('payment method provider events', () => {
  it.each([false, true])(
    'binds completed setup to the provider customer (expanded=%s)',
    async (expanded) => {
      await handleSetupIntentWebhookSucceeded(
        {
          ...setup,
          ...(expanded
            ? {
                customer: { id: 'cus_synthetic' },
                payment_method: { id: 'pm_synthetic' },
              }
            : {}),
        } as Stripe.SetupIntent,
        vi.fn()
      );
      expect(mocks.save).toHaveBeenCalledWith({
        setupIntentId: setup.id,
        customerId: 'cus_synthetic',
        paymentMethodId: 'pm_synthetic',
        userId: 'payer-1',
      });
    }
  );
  it('retries when saving the attached method fails', async () => {
    mocks.save.mockRejectedValue(new Error('Persistence unavailable'));
    await expect(
      handleSetupIntentWebhookSucceeded(setup, vi.fn())
    ).rejects.toThrow('Persistence unavailable');
  });
  it('does not invent a method for incomplete provider data', async () => {
    await handleSetupIntentWebhookSucceeded(
      { ...setup, payment_method: null },
      vi.fn()
    );
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('does not bind an unknown customer to another account', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    });
    await handleSetupIntentWebhookSucceeded(setup, vi.fn());
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('records setup failure against the exact provider identifier', async () => {
    await handleSetupIntentWebhookFailed(setup, vi.fn());
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'canceled', last_error: 'unknown' })
    );
    expect(mocks.eq).toHaveBeenCalledWith('stripe_setup_intent_id', setup.id);
  });
  it('does not acknowledge a failed setup failure write', async () => {
    mocks.eq.mockResolvedValue({ error: new Error('DB unavailable') });
    await expect(
      handleSetupIntentWebhookFailed(setup, vi.fn())
    ).rejects.toThrow('persist SetupIntent failure');
  });
  it('removes only the detached provider method', async () => {
    await handlePaymentMethodDetached(
      { id: 'pm_synthetic' } as Stripe.PaymentMethod,
      vi.fn()
    );
    expect(mocks.eq).toHaveBeenCalledWith(
      'stripe_payment_method_id',
      'pm_synthetic'
    );
  });
  it('does not acknowledge failed method removal', async () => {
    mocks.eq.mockResolvedValue({ error: new Error('DB unavailable') });
    await expect(
      handlePaymentMethodDetached(
        { id: 'pm_synthetic' } as Stripe.PaymentMethod,
        vi.fn()
      )
    ).rejects.toThrow('remove detached payment method');
  });
});

import { handleAccountUpdated } from '../checkout-handlers';
describe('provider account reconciliation failures', () => {
  it('retries a failed customer lookup instead of losing the saved-card event', async () => {
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
            error: new Error('DB unavailable'),
          }),
        }),
      }),
    });
    await expect(
      handleSetupIntentWebhookSucceeded(setup, vi.fn())
    ).rejects.toThrow('resolve SetupIntent customer');
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('ignores accounts with no contractor binding', async () => {
    await handleAccountUpdated(
      { id: 'acct_synthetic', metadata: {} } as Stripe.Account,
      vi.fn()
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each(['profiles', 'contractor_payout_accounts'])(
    'retries when %s account state could not be saved',
    async (table) => {
      mocks.from.mockImplementation((name) => ({
        update: () => ({
          eq: async () => ({
            error: name === table ? new Error('DB unavailable') : null,
          }),
        }),
      }));
      await expect(
        handleAccountUpdated(
          {
            id: 'acct_synthetic',
            metadata: { contractor_id: 'contractor-1' },
            details_submitted: true,
            charges_enabled: false,
            payouts_enabled: false,
          } as Stripe.Account,
          vi.fn()
        )
      ).rejects.toThrow('persist Stripe Connect');
    }
  );
});
