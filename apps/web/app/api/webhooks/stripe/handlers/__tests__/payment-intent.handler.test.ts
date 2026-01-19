import { PaymentIntentHandler } from '../payment-intent.handler';
import { Stripe } from 'stripe';
import { logger } from '@mintenance/shared';
import { serverSupabase } from '@/lib/api/supabaseServer';

// Mock dependencies
jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: jest.fn(),
}));

describe('PaymentIntentHandler', () => {
  let handler: PaymentIntentHandler;
  let mockSupabase: any;

  beforeEach(() => {
    handler = new PaymentIntentHandler();
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };
    (serverSupabase as jest.Mock).mockReturnValue(mockSupabase);
    jest.clearAllMocks();
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

      mockSupabase.update.mockResolvedValue({ error: null });
      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({
        data: { homeowner_id: 'user_123', title: 'Fix leaky faucet' },
        error: null,
      });

      await handler.handleSucceeded(event);

      // Verify job status was updated
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'paid',
          payment_intent_id: 'pi_test_123',
          paid_amount: 100, // Converted from cents
        })
      );

      // Verify payment record was created
      expect(mockSupabase.from).toHaveBeenCalledWith('payments');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          job_id: 'job_123',
          payment_intent_id: 'pi_test_123',
          amount: 100,
          status: 'succeeded',
        })
      );

      // Verify notification was sent
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
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
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const event = createMockEvent({ job_id: 'job_123' });
      const dbError = new Error('Database connection failed');

      mockSupabase.update.mockResolvedValue({ error: dbError });

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
            type: 'card_error',
          },
        } as Stripe.PaymentIntent,
      },
    });

    it('should handle failed payment with error details', async () => {
      const event = createFailedEvent({ job_id: 'job_456' });

      mockSupabase.update.mockResolvedValue({ error: null });
      mockSupabase.insert.mockResolvedValue({ error: null });
      mockSupabase.single.mockResolvedValue({
        data: { homeowner_id: 'user_456', title: 'Repair roof' },
        error: null,
      });

      await handler.handleFailed(event);

      // Verify job status was updated with error
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'failed',
          payment_error: 'Your card was declined',
        })
      );

      // Verify payment record with failure details
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          failure_code: 'card_declined',
          failure_message: 'Your card was declined',
        })
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Payment failed',
        expect.objectContaining({
          failureCode: 'card_declined',
        })
      );
    });

    it('should handle missing job_id without throwing', async () => {
      const event = createFailedEvent({});

      await handler.handleFailed(event);

      expect(mockSupabase.update).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('handleCanceled', () => {
    it('should update job status to canceled', async () => {
      const event: Stripe.Event = {
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
            metadata: { job_id: 'job_789' },
          } as Stripe.PaymentIntent,
        },
      };

      mockSupabase.update.mockResolvedValue({ error: null });
      mockSupabase.insert.mockResolvedValue({ error: null });

      await handler.handleCanceled(event);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'canceled',
        })
      );

      expect(logger.info).toHaveBeenCalledWith(
        'Payment canceled',
        expect.objectContaining({
          paymentIntentId: 'pi_test_789',
        })
      );
    });
  });
});