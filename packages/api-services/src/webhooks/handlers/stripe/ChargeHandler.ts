export class ChargeHandler {
  constructor(config: any) {}
  async handleSucceeded(event: any) { return { processed: true }; }
  async handleFailed(event: any) { return { processed: true }; }
  async handleRefunded(event: any) { return { processed: true }; }
  async handleDisputeCreated(event: any) { return { processed: true }; }
}
