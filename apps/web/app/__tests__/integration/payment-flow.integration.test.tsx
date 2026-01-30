/**
 * Payment Flow Integration Tests
 *
 * Tests the critical revenue-generating user journey:
 * Job Posted → Bid Accepted → Payment → Job Confirmed
 *
 * These tests use REAL behavioral assertions and test actual business logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  createTestJobScenario,
  createTestAcceptedJobScenario,
  STRIPE_TEST_CARDS,
  resetTestCounter,
} from '@/test/factories';

// Mock Stripe
const mockCreatePaymentIntent = vi.fn();
const mockConfirmPayment = vi.fn();

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve({
    confirmPayment: mockConfirmPayment,
  })),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    paymentIntents: {
      create: mockCreatePaymentIntent,
      retrieve: vi.fn((id) => Promise.resolve({
        id,
        status: 'succeeded',
        amount: 15000,
      })),
    },
  },
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn((key) => {
      if (key === 'payment_intent') return 'pi_test_123';
      if (key === 'payment_intent_client_secret') return 'pi_test_123_secret';
      return null;
    }),
  }),
}));

describe('Payment Flow Integration Tests', () => {
  beforeEach(() => {
    resetTestCounter();
    vi.clearAllMocks();

    // Setup successful payment intent creation by default
    mockCreatePaymentIntent.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
      amount: 15000,
      status: 'requires_payment_method',
    });

    // Setup successful payment confirmation by default
    mockConfirmPayment.mockResolvedValue({
      paymentIntent: {
        id: 'pi_test_123',
        status: 'succeeded',
      },
    });
  });

  describe('Checkout Page', () => {
    it('displays correct job details and payment amount', async () => {
      const { job, bid } = createTestAcceptedJobScenario();

      const { default: CheckoutPage } = await import('@/app/checkout/page');
      render(<CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />);

      await waitFor(() => {
        expect(screen.getByText(job.title)).toBeInTheDocument();
        expect(screen.getByText(`£${bid.quote_amount}`)).toBeInTheDocument();
      });
    });

    it('creates Stripe payment intent on page load', async () => {
      const { job, bid } = createTestAcceptedJobScenario();

      const { default: CheckoutPage } = await import('@/app/checkout/page');
      render(<CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />);

      await waitFor(() => {
        expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
          amount: bid.quote_amount * 100, // Stripe uses cents
          currency: 'gbp',
          metadata: expect.objectContaining({
            job_id: job.id,
            bid_id: bid.id,
          }),
        });
      });
    });

    it('validates required payment fields', async () => {
      const { job, bid } = createTestAcceptedJobScenario();

      const { default: CheckoutPage } = await import('@/app/checkout/page');
      render(<CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />);

      // Try to submit without filling card details
      const submitButton = await screen.findByRole('button', { name: /pay now|complete payment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/card number is required/i)).toBeInTheDocument();
      });
    });

    it('successfully processes payment with valid card', async () => {
      const { job, bid } = createTestAcceptedJobScenario();

      const { default: CheckoutPage } = await import('@/app/checkout/page');
      render(<CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />);

      // Wait for payment form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      });

      // Fill in card details (Stripe test card)
      const cardNumberInput = screen.getByLabelText(/card number/i);
      const expiryInput = screen.getByLabelText(/expiry/i);
      const cvcInput = screen.getByLabelText(/cvc|security code/i);

      fireEvent.change(cardNumberInput, { target: { value: STRIPE_TEST_CARDS.SUCCESS.number } });
      fireEvent.change(expiryInput, { target: { value: '12/30' } });
      fireEvent.change(cvcInput, { target: { value: STRIPE_TEST_CARDS.SUCCESS.cvc } });

      // Submit payment
      const submitButton = screen.getByRole('button', { name: /pay now|complete payment/i });
      fireEvent.click(submitButton);

      // Verify payment was processed
      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalled();
      });
    });

    it('shows error message when payment fails', async () => {
      const { job, bid } = createTestAcceptedJobScenario();

      // Mock payment failure
      mockConfirmPayment.mockResolvedValue({
        error: {
          type: 'card_error',
          message: 'Your card was declined',
        },
      });

      const { default: CheckoutPage } = await import('@/app/checkout/page');
      render(<CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />);

      // Fill and submit payment
      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      });

      const cardNumberInput = screen.getByLabelText(/card number/i);
      fireEvent.change(cardNumberInput, { target: { value: STRIPE_TEST_CARDS.DECLINE.number } });

      const submitButton = screen.getByRole('button', { name: /pay now|complete payment/i });
      fireEvent.click(submitButton);

      // Verify error is shown
      await waitFor(() => {
        expect(screen.getByText(/your card was declined/i)).toBeInTheDocument();
      });
    });

    it('shows insufficient funds error with appropriate message', async () => {
      const { job, bid } = createTestAcceptedJobScenario();

      mockConfirmPayment.mockResolvedValue({
        error: {
          type: 'card_error',
          code: 'insufficient_funds',
          message: 'Your card has insufficient funds',
        },
      });

      const { default: CheckoutPage } = await import('@/app/checkout/page');
      render(<CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      });

      const cardNumberInput = screen.getByLabelText(/card number/i);
      fireEvent.change(cardNumberInput, {
        target: { value: STRIPE_TEST_CARDS.INSUFFICIENT_FUNDS.number },
      });

      const submitButton = screen.getByRole('button', { name: /pay now|complete payment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument();
      });
    });

    it('disables submit button while processing payment', async () => {
      const { job, bid } = createTestAcceptedJobScenario();

      // Make payment take some time
      mockConfirmPayment.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ paymentIntent: { status: 'succeeded' } }), 1000))
      );

      const { default: CheckoutPage } = await import('@/app/checkout/page');
      render(<CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /pay now|complete payment/i });
      fireEvent.click(submitButton);

      // Button should be disabled immediately
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });
  });

  describe('Payment Confirmation Page', () => {
    it('displays success message after successful payment', async () => {
      const { job, payment } = createTestAcceptedJobScenario();

      const { default: PaymentReturnPage } = await import('@/app/checkout/return/page');
      render(<PaymentReturnPage searchParams={{
        payment_intent: payment.stripe_payment_intent_id,
        payment_intent_client_secret: `${payment.stripe_payment_intent_id}_secret`,
      }} />);

      await waitFor(() => {
        expect(screen.getByText(/payment successful|payment confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(job.title, 'i'))).toBeInTheDocument();
      });
    });

    it('shows payment amount and job details', async () => {
      const { job, payment } = createTestAcceptedJobScenario();

      const { default: PaymentReturnPage } = await import('@/app/checkout/return/page');
      render(<PaymentReturnPage searchParams={{
        payment_intent: payment.stripe_payment_intent_id,
      }} />);

      await waitFor(() => {
        expect(screen.getByText(`£${payment.amount}`)).toBeInTheDocument();
        expect(screen.getByText(job.title)).toBeInTheDocument();
      });
    });

    it('provides link to view job details', async () => {
      const { job, payment } = createTestAcceptedJobScenario();

      const { default: PaymentReturnPage } = await import('@/app/checkout/return/page');
      render(<PaymentReturnPage searchParams={{
        payment_intent: payment.stripe_payment_intent_id,
      }} />);

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /view job|go to job/i });
        expect(link).toHaveAttribute('href', `/jobs/${job.id}`);
      });
    });

    it('handles failed payment status correctly', async () => {
      const { payment } = createTestAcceptedJobScenario();

      // Mock failed payment intent
      vi.mocked(await import('@/lib/stripe')).stripe.paymentIntents.retrieve = vi.fn(() =>
        Promise.resolve({
          id: payment.stripe_payment_intent_id,
          status: 'canceled',
          amount: payment.amount * 100,
        })
      );

      const { default: PaymentReturnPage } = await import('@/app/checkout/return/page');
      render(<PaymentReturnPage searchParams={{
        payment_intent: payment.stripe_payment_intent_id,
      }} />);

      await waitFor(() => {
        expect(screen.getByText(/payment failed|payment was not successful/i)).toBeInTheDocument();
      });
    });
  });

  describe('End-to-End Payment Flow', () => {
    it('completes full payment journey from checkout to confirmation', async () => {
      const { job, bid, homeowner } = createTestAcceptedJobScenario();

      // 1. User lands on checkout page
      const { default: CheckoutPage } = await import('@/app/checkout/page');
      const { unmount } = render(
        <CheckoutPage searchParams={{ jobId: job.id, bidId: bid.id }} />
      );

      // 2. Verify job details displayed
      await waitFor(() => {
        expect(screen.getByText(job.title)).toBeInTheDocument();
        expect(screen.getByText(`£${bid.quote_amount}`)).toBeInTheDocument();
      });

      // 3. Fill payment form
      await waitFor(() => {
        expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      });

      const cardNumberInput = screen.getByLabelText(/card number/i);
      fireEvent.change(cardNumberInput, { target: { value: STRIPE_TEST_CARDS.SUCCESS.number } });

      // 4. Submit payment
      const submitButton = screen.getByRole('button', { name: /pay now|complete payment/i });
      fireEvent.click(submitButton);

      // 5. Verify payment processed
      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalled();
      });

      unmount();

      // 6. Navigate to confirmation page
      const { default: PaymentReturnPage } = await import('@/app/checkout/return/page');
      render(<PaymentReturnPage searchParams={{
        payment_intent: 'pi_test_123',
        payment_intent_client_secret: 'pi_test_123_secret',
      }} />);

      // 7. Verify success message shown
      await waitFor(() => {
        expect(screen.getByText(/payment successful|payment confirmed/i)).toBeInTheDocument();
      });
    });
  });
});
