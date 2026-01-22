export class InvoiceHandler {
  constructor(config: any) {}
  async handleCreated(event: any) { return { processed: true }; }
  async handleFinalized(event: any) { return { processed: true }; }
  async handlePaymentSucceeded(event: any) { return { processed: true }; }
  async handlePaymentFailed(event: any) { return { processed: true }; }
  async handlePaymentActionRequired(event: any) { return { processed: true }; }
}
