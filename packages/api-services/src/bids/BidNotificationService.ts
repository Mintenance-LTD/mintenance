export class BidNotificationService {
  constructor(config: any) {}

  async notifyBidSubmission(bid: any) {}
  async notifyBidAcceptance(bid: any, contract: any) {}
  async notifyBidRejection(bid: any, reason?: string) {}
}
