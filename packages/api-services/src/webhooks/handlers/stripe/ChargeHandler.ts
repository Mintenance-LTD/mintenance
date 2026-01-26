export class ChargeHandler {
  constructor(config: unknown) {}
  async handleSucceeded(event: unknown) { return { processed: true }; }
  async handleFailed(event: unknown) { return { processed: true }; }
  async handleRefunded(event: unknown) { return { processed: true }; }
  async handleDisputeCreated(event: unknown) { return { processed: true }; }
}
