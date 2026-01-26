import { PaymentIntentHandler } from '../payment-intent.handler';
import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock dependencies - Vitest syntax
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: vi.fn(),
}));

// Helper to create chainable mock (outside describe to be accessible everywhere)
const createChain = (returnValue: any = { error: null, data: null }) => {
  const chain: any = {
    from: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(() => Promise.resolve(returnValue)),
  };

  // Make all methods return the chain for chaining, AND resolve to the returnValue
  chain.from.mockReturnThis();
  chain.select.mockReturnThis();
  chain.update.mockReturnThis();
  chain.insert.mockReturnThis();

  // eq() can be chained with single(), so it must return chain, not promise
  chain.eq.mockReturnThis();

  // Override eq() to also be awaitable when it's the last in chain (no single() called)
  chain.eq.mockImplementation((...args: any[]) => {
    // Return a thenable object (can be awaited) that also has .single() method
    const thenable: any = Promise.resolve(returnValue);
    thenable.single = chain.single;
    return thenable;
  });

  return chain;
};

describe('PaymentIntentHandler', () => {
  let handler: PaymentIntentHandler;
  let mockSupabaseClient: any;

  beforeEach(() => {
    handler = new PaymentIntentHandler();

    mockSupabaseClient = {
      from: vi.fn(() => createChain()),
    };

    vi.mocked(serverSupabase).mockReturnValue(mockSupabaseClient);
    vi.clearAllMocks();
  });

  describe('handleSucceeded', () => {
    const createMockEvent = (metadata: any = {}): Stripe.Event => ({
      id: 'evt_test_123',
      object: 'event',
      api_version: '2024-06-20',
      created: Date.now() / 1000,
      type: 'payment_intent.succeeded',
      livemode: false,
      pending_webhooks: 0,
      request: null,
      data: {
        object: {
          id: 'pi_test_123',
          object: 'payment_intent',
          amount: 10000, // $100 in cents
          currency: 'usd',
          status: 'succeeded',
          metadata,
          customer: 'cus_test_123',
        } as Stripe.PaymentIntent,
      },
    });

    it('should process successful payment with job_id', async () => {
      const event = createMockEvent({ job_id: 'job_123' });

      // Override mock for select() chain to return job data
      const selectChain: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() =>
          Promise.resolve({
            data: { homeowner_id: 'user_123', title: 'Fix leaky faucet' },
            error: null,
          })
        ),
      };
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'jobs' && selectChain.select.mock.calls.length === 0) {
          // First call to jobs table with select
          return selectChain;
        }
        return createChain();
      });

      await handler.handleSucceeded(event);

      // Verify Supabase methods were called correctly
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');

      // Verify logger was called
      expect(logger.info).toHaveBeenCalledWith(
        'Payment succeeded',
        expect.objectContaining({
          paymentIntentId: 'pi_test_123',
        })
      );
    });

    it('should handle missing job_id in metadata', async () => {
      const event = createMockEvent({}); // No job_id

      await handler.handleSucceeded(event);

      expect(logger.warn).toHaveBeenCalledWith(
        'Payment intent missing job_id in metadata',
        expect.objectContaining({
          paymentIntentId: 'pi_test_123',
        })
      );
      // Should not call Supabase when no job_id
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const event = createMockEvent({ job_id: 'job_123' });
      const dbError = { message: 'Database connection failed' };

      // Override mock to return error
      const errorChain: any = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn(() => Promise.resolve({ error: dbError })),
        single: vi.fn(() => Promise.resolve({ error: dbError })),
      };
      mockSupabaseClient.from.mockReturnValue(errorChain);

      await expect(handler.handleSucceeded(event)).rejects.toThrow(
        'Failed to update job payment status: Database connection failed'
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('handleFailed', () => {
    const createFailedEvent = (metadata: any = {}): Stripe.Event => ({
      id: 'evt_test_456',
      object: 'event',
      api_version: '2024-06-20',
      created: Date.now() / 1000,
      type: 'payment_intent.payment_failed',
      livemode: false,
      pending_webhooks: 0,
      request: null,
      data: {
        object: {
          id: 'pi_test_456',
          object: 'payment_intent',
          amount: 5000,
          currency: 'usd',
          status: 'requires_payment_method',
          metadata,
          last_payment_error: {
            code: 'card_declined',
            message: 'Your card was declined',
          } as any,
        } as Stripe.PaymentIntent,
      },
    });

    it('should handle failed payment with error details', async () => {
      const event = createFailedEvent({ job_id: 'job_456' });

      await handler.handleFailed(event);

      // Verify Supabase was called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('jobs');

      // Verify logger was called with warning
      expect(logger.warn).toHaveBeenCalledWith(
        'Payment failed',
        expect.objectContaining({
          paymentIntentId: 'pi_test_456',
          failureCode: 'card_declined',
        })
      );
    });

    it('should handle missing job_id without throwing', async () => {
      const event = createFailedEvent({}); // No job_id

      await handler.handleFailed(event);

      // Should not call Supabase when no job_id
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('handleCanceled', () => {
    const createCanceledEvent = (metadata: any = {}): Stripe.Event => ({
      id: 'evt_test_789',
      object: 'event',
      api_version: '2024-06-20',
      created: Date.now() / 1000,
      type: 'payment_intent.canceled',
      livemode: false,
      pending_webhooks: 0,
      request: null,
      data: {
        object: {
          id: 'pi_test_789',
          object: 'payment_intent',
          amount: 7500,
          currency: 'usd',
          status: 'canceled',
          metadata,
          cancellation_reason: 'requested_by_customer',
        } as any,
      },
    });

    it('should update job status to canceled', async () => {
      const event = createCanceledEvent({ job_id: 'job_789' });

      await handler.handleCanceled(event);

      // Verify Supabase methods were called
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments');
    });
  });
});
