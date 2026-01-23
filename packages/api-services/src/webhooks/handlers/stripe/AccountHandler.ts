export class AccountHandler {
  constructor(config: unknown) {}
  async handleUpdated(event: Record<string, unknown>) { return { processed: true }; }
  async handleDeauthorized(event: Record<string, unknown>) { return { processed: true }; }
  async handleCapabilityUpdated(event: Record<string, unknown>) { return { processed: true }; }
}
