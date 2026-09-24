import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
const paymentMocks = vi.hoisted(() => ({
  submit: vi.fn(),
  confirmPayment: vi.fn(),
}));
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  PaymentElement: () => <div>Payment fields</div>,
  useStripe: () => ({ confirmPayment: paymentMocks.confirmPayment }),
  useElements: () => ({ submit: paymentMocks.submit }),
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: async () => 'synthetic' }));
import { PaymentForm } from '@/components/payments/PaymentForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('credit-funded payment display', () => {
  it('recovers from an interrupted confirmation without creating another intent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: 'synthetic', amount: 10 }),
    });
    vi.stubGlobal('fetch', fetchMock);
    paymentMocks.submit.mockResolvedValue({});
    paymentMocks.confirmPayment
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        paymentIntent: { id: 'pi_synthetic', status: 'succeeded' },
      });
    const onError = vi.fn();
    const onSuccess = vi.fn();
    render(
      <PaymentForm
        jobId='job'
        contractorId='contractor'
        jobTitle='Synthetic'
        defaultAmount={10}
        onError={onError}
        onSuccess={onSuccess}
      />
    );
    const pay = await screen.findByRole('button', { name: /Pay £10/ });
    fireEvent.click(pay);
    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('interrupted')
      )
    );
    expect(pay).not.toBeDisabled();
    fireEvent.click(pay);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('pi_synthetic'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps pending processing distinct from success and prevents resubmission', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ clientSecret: 'synthetic', amount: 10 }),
      })
    );
    paymentMocks.submit.mockResolvedValue({});
    paymentMocks.confirmPayment.mockResolvedValue({
      paymentIntent: { id: 'pi_synthetic', status: 'processing' },
    });
    const onSuccess = vi.fn();
    render(
      <PaymentForm
        jobId='job'
        contractorId='contractor'
        jobTitle='Synthetic'
        defaultAmount={10}
        onError={vi.fn()}
        onSuccess={onSuccess}
      />
    );
    const pay = await screen.findByRole('button', { name: /Pay £10/ });
    fireEvent.click(pay);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'still processing'
    );
    expect(pay).toBeDisabled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
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
  it('shares one in-flight request when StrictMode repeats the effect', async () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
