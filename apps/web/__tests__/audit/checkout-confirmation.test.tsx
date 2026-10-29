import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  confirm: vi.fn(),
  submit: vi.fn(),
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: () => Promise.resolve({}) }));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div>Secure card input</div>,
  useStripe: () => ({ confirmPayment: m.confirm }),
  useElements: () => ({ submit: m.submit }),
}));
vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    disabled,
    type,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type={type} disabled={disabled}>
      {children}
    </button>
  ),
}));
import { SubscriptionCheckoutClient } from '@/components/checkout/SubscriptionCheckoutClient';
import { InvoicePaymentClient } from '@/app/contractor/(dashboard)/invoices/components/InvoicePaymentClient';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_fixture');
  m.submit.mockResolvedValue({});
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});
for (const kind of ['subscription', 'invoice']) {
  const show = () =>
    render(
      kind === 'subscription' ? (
        <SubscriptionCheckoutClient
          clientSecret='pi_fixture_secret_test'
          subscriptionId='sub_fixture'
          planType='professional'
        />
      ) : (
        <InvoicePaymentClient
          clientSecret='pi_fixture_secret_test'
          invoiceId='invoice-fixture'
          invoiceNumber='TEST-1'
          amount={29}
          currency='GBP'
        />
      )
    );
  it.each([
    'processing',
    'requires_action',
    'requires_payment_method',
    'requires_capture',
    undefined,
  ])(`${kind}: does not claim success for %s`, async (status) => {
    m.confirm.mockResolvedValue({
      paymentIntent: status ? { status } : undefined,
    });
    show();
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        status === 'processing' ? 'processing' : 'not completed'
      )
    );
    expect(m.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
  it(`${kind}: failed authentication allows a successful retry`, async () => {
    m.confirm
      .mockResolvedValueOnce({ error: { message: 'Authentication failed' } })
      .mockResolvedValueOnce({ paymentIntent: { status: 'succeeded' } });
    show();
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    await screen.findByText('Authentication failed');
    expect(m.push).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    await waitFor(() => expect(m.push).toHaveBeenCalledTimes(1));
    expect(m.confirm).toHaveBeenLastCalledWith(
      expect.objectContaining({ redirect: 'if_required' })
    );
  });
}
