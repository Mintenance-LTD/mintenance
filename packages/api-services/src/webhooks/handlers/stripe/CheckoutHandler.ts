export class CheckoutHandler {
  constructor(config: unknown) {}
  async handleCompleted(event: Record<string, unknown>) { return { processed: true }; }
  async handleExpired(event: Record<string, unknown>) { return { processed: true }; }
  async handleAsyncPaymentSucceeded(event: Record<string, unknown>) { return { processed: true }; }
  async handleAsyncPaymentFailed(event: Record<string, unknown>) { return { processed: true }; }
}
