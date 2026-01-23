export class InvoiceHandler {
  constructor(config: unknown) {}
  async handleCreated(event: unknown) { return { processed: true }; }
  async handleFinalized(event: unknown) { return { processed: true }; }
  async handlePaymentSucceeded(event: unknown) { return { processed: true }; }
  async handlePaymentFailed(event: unknown) { return { processed: true }; }
  async handlePaymentActionRequired(event: unknown) { return { processed: true }; }
}
