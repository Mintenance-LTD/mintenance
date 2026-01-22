import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BidNotificationService } from '../BidNotificationService';

describe('BidNotificationService', () => {
  let service: BidNotificationService;

  beforeEach(() => {
    service = new BidNotificationService({});
  });

  describe('notifications', () => {
    it('should have notification methods defined', () => {
      expect(service.notifyBidSubmission).toBeDefined();
      expect(service.notifyBidAcceptance).toBeDefined();
      expect(service.notifyBidRejection).toBeDefined();
    });

    it('should successfully execute notifyBidSubmission', async () => {
      const mockBid = { id: 'bid-1' };
      await expect(service.notifyBidSubmission(mockBid)).resolves.not.toThrow();
    });
  });
});
