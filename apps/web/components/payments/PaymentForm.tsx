import React, { ChangeEvent, FormEvent, useState } from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { FeeCalculator } from './FeeCalculator';
import { PaymentService } from '@/lib/services/PaymentService';
import { logger } from '@mintenance/shared';
import { FormField, ValidatedInput } from '@/components/ui/FormField';

interface PaymentFormProps {
  jobId: string;
  contractorId: string;
  jobTitle: string;
  defaultAmount?: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

type BillingAddress = {
  line1: string;
  city: string;
  state: string;
  postal_code: string;
};

export const PaymentForm: React.FC<PaymentFormProps> = ({
  jobId,
  contractorId,
  jobTitle,
  defaultAmount = 0,
  onSuccess,
  onError,
  onCancel,
}) => {
  const enablePaymentMocks = process.env.NEXT_PUBLIC_ENABLE_PAYMENT_MOCKS === 'true';
  const [amount, setAmount] = useState(defaultAmount.toString());
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({
    line1: '',
    city: '',
    state: '',
    postal_code: '',
  });
  const [processing, setProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  const parsedAmount = Number.parseFloat(amount);
  const amountNum = Number.isNaN(parsedAmount) ? 0 : parsedAmount;
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
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleBillingAddressChange = (field: keyof BillingAddress) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setBillingAddress((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'amount':
        if (!value || parseFloat(value) <= 0) return 'Please enter a valid payment amount';
        if (parseFloat(value) < 1) return 'Minimum payment is £1.00';
        if (parseFloat(value) > 10000) return 'Maximum payment is £10,000.00';
        return undefined;
      case 'cardNumber':
        if (!value) return 'Card number is required';
        const digits = value.replace(/\s/g, '');
        if (digits.length < 13) return 'Please enter a valid card number (13-19 digits)';
        if (digits.length > 19) return 'Card number is too long';
        return undefined;
      case 'expiryDate':
        if (!value) return 'Expiry date is required';
        if (value.length < 5) return 'Please enter a valid expiry date (MM/YY)';
        const [month, year] = value.split('/').map(Number);
        if (month < 1 || month > 12) return 'Invalid month';
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          return 'Card has expired';
        }
        return undefined;
      case 'cvc':
        if (!value) return 'CVC is required';
        if (value.length < 3) return 'CVC must be 3-4 digits';
        return undefined;
      case 'cardholderName':
        if (!value.trim()) return 'Cardholder name is required';
        if (value.trim().length < 2) return 'Please enter a valid name';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleFieldBlur = (field: string, value: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const isFieldValid = (field: string, value: string): boolean => {
    return touchedFields[field] && !errors[field] && Boolean(value);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newTouchedFields: Record<string, boolean> = {};

    const fields = [
      { name: 'amount', value: amount },
      { name: 'cardNumber', value: cardNumber },
      { name: 'expiryDate', value: expiryDate },
      { name: 'cvc', value: cvc },
      { name: 'cardholderName', value: cardholderName },
    ];

    fields.forEach(({ name, value }) => {
      newTouchedFields[name] = true;
      const error = validateField(name, value);
      if (error) newErrors[name] = error;
    });

    setTouchedFields(newTouchedFields);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      onError(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setProcessing(true);

    try {
      // Parse expiry date
      const [expMonth, expYear] = expiryDate.split('/').map(num => parseInt(num, 10));
      const fullYear = expYear < 50 ? 2000 + expYear : 1900 + expYear;

      if (!enablePaymentMocks && (typeof window === 'undefined' || !window.Stripe)) {
        throw new Error('Stripe.js is not available. Please configure Stripe before processing payments.');
      }

      if (!enablePaymentMocks) {
        await PaymentService.createPaymentMethod({
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
      }

      const { client_secret } = await PaymentService.initializePayment({
        amount: amountNum,
        jobId,
        contractorId,
      });

      if (!client_secret) {
        throw new Error('Payment provider did not return a client secret.');
      }

      if (enablePaymentMocks) {
        onSuccess(client_secret);
        return;
      }

      onSuccess(client_secret);
    } catch (error: unknown) {
      logger.error('Payment error:', error);
      const fallbackMessage = 'Payment failed. Please try again.';
      const message = error instanceof Error ? error.message ?? fallbackMessage : fallbackMessage;
      onError(message);
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
            Minimum: £1.00 • Maximum: £10,000.00
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
            <FormField
              label="Card Number"
              required
              error={touchedFields.cardNumber ? errors.cardNumber : undefined}
              success={isFieldValid('cardNumber', cardNumber)}
              helperText={isFieldValid('cardNumber', cardNumber) ? 'Card number valid' : 'Enter your 13-19 digit card number'}
              htmlFor="payment-cardNumber"
            >
              <ValidatedInput
                id="payment-cardNumber"
                type="text"
                value={cardNumber}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  setCardNumber(formatted);
                  if (touchedFields.cardNumber) {
                    handleFieldBlur('cardNumber', formatted);
                  }
                }}
                onBlur={() => handleFieldBlur('cardNumber', cardNumber)}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                error={Boolean(touchedFields.cardNumber && errors.cardNumber)}
                success={isFieldValid('cardNumber', cardNumber)}
              />
            </FormField>
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

          <FormField
            label="Cardholder Name"
            required
            error={touchedFields.cardholderName ? errors.cardholderName : undefined}
            success={isFieldValid('cardholderName', cardholderName)}
            helperText={isFieldValid('cardholderName', cardholderName) ? 'Name confirmed' : 'Enter name as it appears on card'}
            htmlFor="payment-cardholderName"
          >
            <ValidatedInput
              id="payment-cardholderName"
              type="text"
              value={cardholderName}
              onChange={(e) => {
                setCardholderName(e.target.value);
                if (touchedFields.cardholderName) {
                  handleFieldBlur('cardholderName', e.target.value);
                }
              }}
              onBlur={() => handleFieldBlur('cardholderName', cardholderName)}
              placeholder="John Smith"
              error={Boolean(touchedFields.cardholderName && errors.cardholderName)}
              success={isFieldValid('cardholderName', cardholderName)}
            />
          </FormField>
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
                  onChange={handleBillingAddressChange('line1')}
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
                  onChange={handleBillingAddressChange('city')}
                  placeholder="City"
                />
                <Input
                  type="text"
                  value={billingAddress.state}
                  onChange={handleBillingAddressChange('state')}
                  placeholder="State"
                />
                <Input
                  type="text"
                  value={billingAddress.postal_code}
                  onChange={handleBillingAddressChange('postal_code')}
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
          backgroundColor: `${theme.colors.success}10`,
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