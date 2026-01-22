export class AccountHandler {
  constructor(config: any) {}
  async handleUpdated(event: any) { return { processed: true }; }
  async handleDeauthorized(event: any) { return { processed: true }; }
  async handleCapabilityUpdated(event: any) { return { processed: true }; }
}
