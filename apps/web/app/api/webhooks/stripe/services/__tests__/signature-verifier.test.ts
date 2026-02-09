import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger
vi.mock('@mintenance/shared', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock api-error
vi.mock('@/lib/errors/api-error', () => {
  class BadRequestError extends Error {
    statusCode = 400;
    constructor(message: string) {
      super(message);
      this.name = 'BadRequestError';
    }
  }
  class InternalServerError extends Error {
    statusCode = 500;
    constructor(message: string) {
      super(message);
      this.name = 'InternalServerError';
    }
  }
  return { BadRequestError, InternalServerError };
});

import { WebhookSignatureVerifier } from '../signature-verifier';

describe('WebhookSignatureVerifier', () => {
  let verifier: WebhookSignatureVerifier;
  let mockStripe: any;

  beforeEach(() => {
    mockStripe = {
      webhooks: {
        constructEvent: vi.fn(),
      },
    };

    verifier = new WebhookSignatureVerifier(
      mockStripe as any,
      'whsec_test_secret_123'
    );
  });

  describe('constructor', () => {
    it('should throw if webhook secret is empty', () => {
      expect(
        () => new WebhookSignatureVerifier(mockStripe as any, '')
      ).toThrow('Webhook secret is required');
    });

    it('should create instance with valid secret', () => {
      expect(verifier).toBeInstanceOf(WebhookSignatureVerifier);
    });
  });

  describe('verifyAndConstructEvent', () => {
    it('should return event when signature is valid', async () => {
      const mockEvent = {
        id: 'evt_test_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = await verifier.verifyAndConstructEvent(
        '{"type":"payment_intent.succeeded"}',
        't=1234567890,v1=abc123'
      );

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        '{"type":"payment_intent.succeeded"}',
        't=1234567890,v1=abc123',
        'whsec_test_secret_123'
      );
    });

    it('should throw BadRequestError when signature header is null', async () => {
      await expect(
        verifier.verifyAndConstructEvent('body', null)
      ).rejects.toThrow('Missing stripe-signature header');
    });

    it('should throw BadRequestError for invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature');
      });

      await expect(
        verifier.verifyAndConstructEvent('body', 'invalid_sig')
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should throw BadRequestError for replay attack (stale timestamp)', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error(
          'Timestamp outside the tolerance zone of 300 seconds'
        );
      });

      await expect(
        verifier.verifyAndConstructEvent('body', 'old_sig')
      ).rejects.toThrow('Webhook timestamp too old (possible replay attack)');
    });

    it('should throw InternalServerError for unknown verification errors', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Something unexpected happened');
      });

      await expect(
        verifier.verifyAndConstructEvent('body', 'some_sig')
      ).rejects.toThrow('Failed to verify webhook signature');
    });
  });

  describe('validateConfiguration', () => {
    it('should return true for valid whsec_ prefixed secret', () => {
      expect(verifier.validateConfiguration()).toBe(true);
    });

    it('should return false for invalid secret format', () => {
      const badVerifier = new WebhookSignatureVerifier(
        mockStripe as any,
        'invalid_secret_no_prefix'
      );

      expect(badVerifier.validateConfiguration()).toBe(false);
    });
  });
});
