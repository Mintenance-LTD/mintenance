import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  PaymentElement: () => <div>Payment fields</div>,
  useStripe: () => ({}),
  useElements: () => ({}),
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: async () => 'synthetic' }));
import { PaymentForm } from '@/components/payments/PaymentForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('credit-funded payment display', () => {
  it('shows the server cash total on the pay button and explains applied credit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          clientSecret: 'synthetic',
          amount: 450,
          grossAmount: 500,
          creditApplied: 50,
        }),
      })
    );
    render(
      <PaymentForm
        jobId='job'
        contractorId='contractor'
        jobTitle='Synthetic'
        defaultAmount={500}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );
    expect(
      await screen.findByRole('button', { name: /Pay £450/ })
    ).toBeTruthy();
    expect(screen.getByText('Mintenance credit')).toBeTruthy();
    expect(screen.getByText('−£50.00')).toBeTruthy();
    expect(screen.getByText('£500.00')).toBeTruthy();
  });
  it('does not offer payment when the returned funding breakdown is contradictory', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          clientSecret: 'synthetic',
          amount: 450,
          grossAmount: 500,
          creditApplied: 100,
        }),
      })
    );
    const onError = vi.fn();
    render(
      <PaymentForm
        jobId='job'
        contractorId='contractor'
        jobTitle='Synthetic'
        defaultAmount={500}
        onSuccess={vi.fn()}
        onError={onError}
      />
    );
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('total could not be verified')
      )
    );
    expect(
      screen.queryByRole('button', { name: /Pay .* securely/ })
    ).toBeNull();
  });
});
