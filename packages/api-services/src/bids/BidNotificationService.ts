export class BidNotificationService {
  constructor(config: unknown) {}

  async notifyBidSubmission(bid: unknown) {}
  async notifyBidAcceptance(bid: unknown, contract: unknown) {}
  async notifyBidRejection(bid: unknown, reason?: string) {}
}
