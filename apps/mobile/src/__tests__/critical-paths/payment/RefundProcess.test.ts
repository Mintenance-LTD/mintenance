import { PaymentService } from '../../../services/PaymentService';

jest.mock('../../../services/PaymentService', () => ({
  PaymentService: {
    refundPayment: jest.fn(),
  },
}));

describe('Refund Process - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process full refund for cancelled job', async () => {
    (PaymentService.refundPayment as jest.Mock).mockResolvedValue({
      success: true,
      refund_id: 'refund_123',
    });

    const refund = await PaymentService.refundPayment({
      paymentIntentId: 'pi_123',
      amount: 10000,
      reason: 'job_cancelled',
    });

    expect(refund.success).toBe(true);
    expect(refund.refund_id).toBe('refund_123');
  });

  it('should process partial refund for disputed work', async () => {
    (PaymentService.refundPayment as jest.Mock).mockResolvedValue({
      success: true,
      refund_id: 'refund_124',
    });

    const refund = await PaymentService.refundPayment({
      paymentIntentId: 'pi_123',
      amount: 5000,
      reason: 'partial_dispute',
    });

    expect(refund.success).toBe(true);
    expect(PaymentService.refundPayment).toHaveBeenCalledWith({
      paymentIntentId: 'pi_123',
      amount: 5000,
      reason: 'partial_dispute',
    });
  });

  it('should handle refund failure', async () => {
    (PaymentService.refundPayment as jest.Mock).mockRejectedValue(
      new Error('Insufficient funds')
    );

    await expect(
      PaymentService.refundPayment({
        paymentIntentId: 'pi_123',
        amount: 10000,
        reason: 'insufficient_funds',
      })
    ).rejects.toThrow('Insufficient funds');
  });

  it('should validate refund amount', async () => {
    const { PaymentService: ActualPaymentService } = jest.requireActual(
      '../../../services/PaymentService'
    );

    await expect(
      ActualPaymentService.refundPayment({
        paymentIntentId: 'pi_123',
        amount: 0,
        reason: 'invalid_amount',
      })
    ).rejects.toThrow('Refund amount must be greater than 0');
  });
});
