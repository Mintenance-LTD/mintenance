import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
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
  it('changes the request key with the resource and keeps callback rerenders from starting payments', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'synthetic',
        amount: 500,
        grossAmount: 500,
        creditApplied: 0,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const props = {
      jobId: 'first-job',
      contractorId: 'contractor',
      jobTitle: 'Synthetic',
      defaultAmount: 500,
      onSuccess: vi.fn(),
      onError: vi.fn(),
    };
    const view = render(<PaymentForm {...props} />);
    await screen.findByRole('button', { name: /Pay £500/ });
    await act(async () => {
      view.rerender(<PaymentForm {...props} onError={vi.fn()} />);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    view.rerender(<PaymentForm {...props} jobId='second-job' />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const first = fetchMock.mock.calls[0][1];
    const second = fetchMock.mock.calls[1][1];
    expect(first.headers['Idempotency-Key']).not.toBe(
      second.headers['Idempotency-Key']
    );
    expect(JSON.parse(first.body).jobId).toBe('first-job');
    expect(JSON.parse(second.body).jobId).toBe('second-job');
    view.rerender(
      <PaymentForm {...props} jobId='second-job' defaultAmount={600} />
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][1].headers['Idempotency-Key']).not.toBe(
      second.headers['Idempotency-Key']
    );
  });
  it('reuses one key when StrictMode invokes the same request effect twice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: 'synthetic', amount: 500 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <React.StrictMode>
        <PaymentForm
          jobId='job'
          contractorId='contractor'
          jobTitle='Synthetic'
          defaultAmount={500}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />
      </React.StrictMode>
    );
    await screen.findByRole('button', { name: /Pay £500/ });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe(
      fetchMock.mock.calls[1][1].headers['Idempotency-Key']
    );
  });
  it('clears the old payable intent when the form no longer has a valid job', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ clientSecret: 'synthetic', amount: 500 }),
      })
    );
    const props = {
      jobId: 'job',
      contractorId: 'contractor',
      jobTitle: 'Synthetic',
      defaultAmount: 500,
      onSuccess: vi.fn(),
      onError: vi.fn(),
    };
    const view = render(<PaymentForm {...props} />);
    await screen.findByRole('button', { name: /Pay £500/ });
    view.rerender(<PaymentForm {...props} jobId='' />);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Pay £500/ })).toBeNull()
    );
  });

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
