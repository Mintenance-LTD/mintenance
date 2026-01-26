import { describe, it, expect, beforeEach } from 'vitest';
import { BidScoringService } from '../BidScoringService';

describe('BidScoringService', () => {
  let service: BidScoringService;

  beforeEach(() => {
    service = new BidScoringService({});
  });

  describe('calculateBidScore', () => {
    it('should return a score object with expected fields', async () => {
      const mockBid = { id: 'bid-1', amount: 1000 };
      const score = await service.calculateBidScore(mockBid);

      expect(score).toBeDefined();
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
      expect(score).toHaveProperty('priceScore');
      expect(score).toHaveProperty('timelineScore');
    });
  });
});
