export class CheckoutHandler {
  constructor(config: any) {}
  async handleCompleted(event: any) { return { processed: true }; }
  async handleExpired(event: any) { return { processed: true }; }
  async handleAsyncPaymentSucceeded(event: any) { return { processed: true }; }
  async handleAsyncPaymentFailed(event: any) { return { processed: true }; }
}
