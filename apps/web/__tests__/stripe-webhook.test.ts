/**
 * Stripe Webhook Tests
 * Tests critical payment processing and webhook security
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../app/api/webhooks/stripe/route';

// Mock dependencies
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

jest.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

jest.mock('@/lib/rate-limiter', () => ({
  checkWebhookRateLimit: jest.fn(),
}));

jest.mock('@mintenance/shared', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Stripe Webhook Security', () => {
  const mockStripe = require('stripe');
  const mockSupabase = require('@/lib/api/supabaseServer').serverSupabase;
  const mockRateLimiter = require('@/lib/rate-limiter');
  const mockLogger = require('@mintenance/shared').logger;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.NODE_ENV;
  });

  describe('Webhook Signature Verification', () => {
    it('should verify webhook signature', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
          },
        },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: false }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockStripe().webhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(String),
        't=1234567890,v1=test_signature',
        'whsec_test_secret'
      );
    });

    it('should reject webhook with invalid signature', async () => {
      mockStripe().webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=invalid_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Webhook signature verification failed'),
        expect.any(Error)
      );
    });

    it('should reject webhook with missing signature', async () => {
      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {},
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('Timestamp Validation', () => {
    it('should accept webhook with recent timestamp', async () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
        created: recentTimestamp,
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: false }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should reject webhook with old timestamp', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6+ minutes ago
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
        created: oldTimestamp,
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Event timestamp outside acceptable range')
      );
    });
  });

  describe('Idempotency Protection', () => {
    it('should process new webhook event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: false }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'check_webhook_idempotency',
        expect.objectContaining({
          event_id: 'evt_test_123',
        })
      );
    });

    it('should reject duplicate webhook event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: true }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.duplicate).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow webhook within rate limit', async () => {
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });

      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: false }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockRateLimiter.checkWebhookRateLimit).toHaveBeenCalled();
    });

    it('should reject webhook exceeding rate limit', async () => {
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(429);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Webhook rate limit exceeded')
      );
    });
  });

  describe('Event Processing', () => {
    it('should process payment_intent.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_123',
            status: 'succeeded',
            amount: 2000,
            currency: 'usd',
            metadata: {
              job_id: 'job_123',
              contractor_id: 'contractor_456',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: false }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Payment intent succeeded'),
        expect.objectContaining({
          payment_intent_id: 'pi_test_123',
          job_id: 'job_123',
        })
      );
    });

    it('should process checkout.session.completed event', async () => {
      const mockEvent = {
        id: 'evt_test_456',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_status: 'paid',
            customer_email: 'customer@example.com',
            metadata: {
              job_id: 'job_789',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: false }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Checkout session completed'),
        expect.objectContaining({
          session_id: 'cs_test_123',
          job_id: 'job_789',
        })
      );
    });

    it('should handle unsupported event types gracefully', async () => {
      const mockEvent = {
        id: 'evt_test_789',
        type: 'customer.created',
        data: { object: { id: 'cus_test_123' } },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: [{ is_duplicate: false }],
        error: null,
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled event type'),
        expect.objectContaining({
          event_type: 'customer.created',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } },
        created: Math.floor(Date.now() / 1000),
      };

      mockStripe().webhooks.constructEvent.mockReturnValue(mockEvent);
      mockRateLimiter.checkWebhookRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
      });
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify(mockEvent),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Webhook processing failed'),
        expect.any(Error)
      );
    });

    it('should handle missing webhook secret', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const request = new NextRequest('https://example.com/api/webhooks/stripe', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=1234567890,v1=test_signature',
        },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Missing STRIPE_WEBHOOK_SECRET'),
        expect.any(Error)
      );
    });
  });
});
