import { describe, it, expect, beforeEach } from 'vitest';
import { BidValidator } from '../BidValidator';

describe('BidValidator', () => {
  let validator: BidValidator;

  beforeEach(() => {
    validator = new BidValidator();
  });

  describe('validateSubmitBid', () => {
    const validBid = {
      jobId: '550e8400-e29b-41d4-a716-446655440000',
      bidAmount: 1500,
      proposalText: 'I am a professional plumber with 10 years experience.',
      estimatedDuration: 5,
      estimatedDurationUnit: 'days',
      proposedStartDate: new Date(Date.now() + 86400000).toISOString(),
    };

    it('should validate valid bid data', () => {
      const result = validator.validateSubmitBid(validBid);
      expect(result.bidAmount).toBe(1500);
      expect(result.estimatedDurationUnit).toBe('days');
    });

    it('should throw error for invalid jobId', () => {
      const data = { ...validBid, jobId: 'not-a-uuid' };
      expect(() => validator.validateSubmitBid(data)).toThrow('jobId: Invalid job ID');
    });

    it('should throw error for short proposal', () => {
      const data = { ...validBid, proposalText: 'Too short' };
      expect(() => validator.validateSubmitBid(data)).toThrow('proposalText: Proposal must be at least 10 characters');
    });

    it('should throw error for negative bidAmount', () => {
      const data = { ...validBid, bidAmount: -100 };
      expect(() => validator.validateSubmitBid(data)).toThrow('bidAmount: Bid amount must be positive');
    });

    it('should sanitize HTML from proposalText', () => {
      const data = { ...validBid, proposalText: 'I can fix <script>alert(1)</script> your pipes' };
      const result = validator.validateSubmitBid(data);
      expect(result.proposalText).toBe('I can fix scriptalert(1)/script your pipes');
    });

    it('should validate itemizedQuote', () => {
      const data = {
        ...validBid,
        itemizedQuote: [
          { description: 'Labor', amount: 1000, quantity: 1 },
          { description: 'Materials', amount: 500, quantity: 1 }
        ]
      };
      const result = validator.validateSubmitBid(data);
      expect(result.itemizedQuote).toHaveLength(2);
    });
  });

  describe('validateUpdateBid', () => {
    it('should allow partial updates', () => {
      const data = { bidAmount: 2000 };
      const result = validator.validateUpdateBid(data);
      expect(result.bidAmount).toBe(2000);
    });
  });
});
