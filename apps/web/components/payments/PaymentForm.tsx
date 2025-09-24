import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { FeeCalculator } from './FeeCalculator';
import { PaymentService } from '@/lib/services/PaymentService';
import type { FeeCalculation } from '@mintenance/types';

interface PaymentFormProps {
  jobId: string;
  contractorId: string;
  jobTitle: string;
  defaultAmount?: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  jobId,
  contractorId,
  jobTitle,
  defaultAmount = 0,
  onSuccess,
  onError,
  onCancel,
}) => {
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [processing, setProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const fees = PaymentService.calculateFees(amountNum);

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2, 4);
    }
    return digits;
  };

  const validateForm = () => {
    if (!amount || amountNum <= 0) {
      onError('Please enter a valid payment amount');
      return false;
    }
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
      onError('Please enter a valid card number');
      return false;
    }
    if (!expiryDate || expiryDate.length < 5) {
      onError('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    if (!cvc || cvc.length < 3) {
      onError('Please enter a valid CVC');
      return false;
    }
    if (!cardholderName.trim()) {
      onError('Please enter the cardholder name');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setProcessing(true);

    try {
      // Parse expiry date
      const [expMonth, expYear] = expiryDate.split('/').map(num => parseInt(num, 10));
      const fullYear = expYear < 50 ? 2000 + expYear : 1900 + expYear;

      // Create payment method
      const paymentMethod = await PaymentService.createPaymentMethod({
        type: 'card',
        card: {
          number: cardNumber.replace(/\s/g, ''),
          expMonth,
          expYear: fullYear,
          cvc,
        },
        billingDetails: {
          name: cardholderName,
          address: showAdvanced ? billingAddress : undefined,
        },
      });

      // Initialize payment
      const { client_secret } = await PaymentService.initializePayment({
        amount: amountNum,
        jobId,
        contractorId,
      });

      // For demo purposes, simulate successful payment
      // In a real implementation, you would use Stripe Elements
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful payment
      onSuccess(`pi_demo_${Date.now()}`);
    } catch (error: any) {
      console.error('Payment error:', error);
      onError(error.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Job Information */}
      <Card style={{ marginBottom: theme.spacing.lg }}>
        <div style={{ marginBottom: theme.spacing.md }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: '4px',
            }}
          >
            💼 {jobTitle}
          </h3>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0,
            }}
          >
            Secure payment with escrow protection
          </p>
        </div>
      </Card>

      <form onSubmit={handleSubmit}>
        {/* Payment Amount */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: theme.spacing.md,
            }}
          >
            Payment Amount
          </h3>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter payment amount"
            min="0"
            step="0.01"
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
            }}
            required
          />
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.xs,
            }}
          >
            Minimum: $1.00 • Maximum: $10,000.00
          </div>
        </Card>

        {/* Fee Calculator */}
        {amountNum > 0 && (
          <FeeCalculator
            amount={amountNum}
            fees={fees}
            style={{ marginBottom: theme.spacing.lg }}
          />
        )}

        {/* Card Details */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: theme.spacing.md,
            }}
          >
            💳 Card Details
          </h3>

          <div style={{ marginBottom: theme.spacing.md }}>
            <Input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              required
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <Input
              type="text"
              value={expiryDate}
              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
              placeholder="MM/YY"
              maxLength={5}
              required
            />
            <Input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="CVC"
              maxLength={4}
              required
            />
          </div>

          <Input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="Cardholder name"
            required
          />
        </Card>

        {/* Billing Address (Advanced) */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.primary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              justifyContent: 'space-between',
              padding: 0,
            }}
          >
            🏠 Billing Address (Optional)
            <span style={{ fontSize: '12px' }}>
              {showAdvanced ? '▼' : '▶'}
            </span>
          </button>

          {showAdvanced && (
            <div style={{ marginTop: theme.spacing.md }}>
              <div style={{ marginBottom: theme.spacing.md }}>
                <Input
                  type="text"
                  value={billingAddress.line1}
                  onChange={(e) => setBillingAddress({
                    ...billingAddress,
                    line1: e.target.value
                  })}
                  placeholder="Street address"
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  gap: theme.spacing.md,
                }}
              >
                <Input
                  type="text"
                  value={billingAddress.city}
                  onChange={(e) => setBillingAddress({
                    ...billingAddress,
                    city: e.target.value
                  })}
                  placeholder="City"
                />
                <Input
                  type="text"
                  value={billingAddress.state}
                  onChange={(e) => setBillingAddress({
                    ...billingAddress,
                    state: e.target.value
                  })}
                  placeholder="State"
                />
                <Input
                  type="text"
                  value={billingAddress.postal_code}
                  onChange={(e) => setBillingAddress({
                    ...billingAddress,
                    postal_code: e.target.value
                  })}
                  placeholder="ZIP"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: theme.spacing.md,
            justifyContent: 'space-between',
          }}
        >
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              disabled={processing}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={processing || amountNum <= 0}
            style={{ flex: 1 }}
          >
            {processing ? (
              <>
                <span style={{ marginRight: theme.spacing.xs }}>⏳</span>
                Processing Payment...
              </>
            ) : (
              <>
                <span style={{ marginRight: theme.spacing.xs }}>🔒</span>
                Pay {amountNum > 0 ? `$${amountNum.toFixed(2)}` : ''}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Security Notice */}
      <div
        style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.success + '10',
          border: `1px solid ${theme.colors.success}`,
          borderRadius: theme.borderRadius.md,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.success,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: '4px',
          }}
        >
          🔒 Secure Escrow Payment
        </div>
        <div
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}
        >
          Your payment is securely held in escrow and will be released to the contractor only when the job is completed to your satisfaction.
        </div>
      </div>
    </div>
  );
};