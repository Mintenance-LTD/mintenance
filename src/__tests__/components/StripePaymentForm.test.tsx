import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StripePaymentForm } from '../../components/StripePaymentForm';

// Mock Stripe React Native
const mockConfirmPayment = jest.fn();

jest.mock('@stripe/stripe-react-native', () => ({
  CardField: ({ onCardChange, ...props }: any) => {
    // Mock component that simulates card input
    const MockCardField = require('react-native').View;
    return (
      <MockCardField
        testID="card-field"
        onPress={() => {
          // Simulate card completion
          onCardChange({ complete: true });
        }}
        {...props}
      />
    );
  },
  useConfirmPayment: () => ({
    confirmPayment: mockConfirmPayment,
  }),
  useStripe: () => ({}),
}));

describe('StripePaymentForm', () => {
  const mockProps = {
    amount: 150.00,
    clientSecret: 'pi_test_1234_secret_test',
    onPaymentSuccess: jest.fn(),
    onPaymentError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders payment form correctly', () => {
    const { getByText, getByTestId } = render(
      <StripePaymentForm {...mockProps} />
    );

    expect(getByText('Payment Information')).toBeTruthy();
    expect(getByText('🔒 Your payment information is secure')).toBeTruthy();
    expect(getByText('Pay $150.00 Securely')).toBeTruthy();
    expect(getByTestId('card-field')).toBeTruthy();
  });

  it('disables pay button when card is incomplete', () => {
    const { getByText } = render(
      <StripePaymentForm {...mockProps} />
    );

    const payButton = getByText('Pay $150.00 Securely');
    expect(payButton.parent?.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#d1d5db' })
    );
  });

  it('enables pay button when card is complete', async () => {
    const { getByText, getByTestId } = render(
      <StripePaymentForm {...mockProps} />
    );

    // Simulate card completion
    fireEvent.press(getByTestId('card-field'));

    await waitFor(() => {
      const payButton = getByText('Pay $150.00 Securely');
      expect(payButton.parent?.props.style).not.toContainEqual(
        expect.objectContaining({ backgroundColor: '#d1d5db' })
      );
    });
  });

  it('handles successful payment', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      paymentIntent: {
        id: 'pi_test_1234',
        status: 'succeeded',
      },
      error: null,
    });

    const { getByText, getByTestId } = render(
      <StripePaymentForm {...mockProps} />
    );

    // Complete card and submit payment
    fireEvent.press(getByTestId('card-field'));
    
    await waitFor(() => {
      const payButton = getByText('Pay $150.00 Securely');
      fireEvent.press(payButton);
    });

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledWith(
        'pi_test_1234_secret_test',
        { paymentMethodType: 'Card' }
      );
      expect(mockProps.onPaymentSuccess).toHaveBeenCalledWith('pi_test_1234');
    });
  });

  it('handles payment error', async () => {
    mockConfirmPayment.mockResolvedValueOnce({
      paymentIntent: null,
      error: {
        message: 'Your card was declined.',
        type: 'card_error',
      },
    });

    const { getByText, getByTestId } = render(
      <StripePaymentForm {...mockProps} />
    );

    // Complete card and submit payment
    fireEvent.press(getByTestId('card-field'));
    
    await waitFor(() => {
      const payButton = getByText('Pay $150.00 Securely');
      fireEvent.press(payButton);
    });

    await waitFor(() => {
      expect(mockProps.onPaymentError).toHaveBeenCalledWith('Your card was declined.');
    });
  });

  it('shows loading state during payment processing', async () => {
    mockConfirmPayment.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    const { getByText, getByTestId } = render(
      <StripePaymentForm {...mockProps} />
    );

    // Complete card and submit payment
    fireEvent.press(getByTestId('card-field'));
    
    await waitFor(() => {
      const payButton = getByText('Pay $150.00 Securely');
      fireEvent.press(payButton);
    });

    // Should show loading indicator
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('prevents multiple payment attempts', async () => {
    let resolvePayment: (value: any) => void;
    mockConfirmPayment.mockImplementationOnce(
      () => new Promise(resolve => { resolvePayment = resolve; })
    );

    const { getByText, getByTestId } = render(
      <StripePaymentForm {...mockProps} />
    );

    // Complete card
    fireEvent.press(getByTestId('card-field'));
    
    await waitFor(() => {
      const payButton = getByText('Pay $150.00 Securely');
      
      // Press button multiple times
      fireEvent.press(payButton);
      fireEvent.press(payButton);
      fireEvent.press(payButton);
    });

    // Should only call confirmPayment once
    expect(mockConfirmPayment).toHaveBeenCalledTimes(1);
  });

  it('formats amount correctly', () => {
    const { getByText } = render(
      <StripePaymentForm {...mockProps} amount={99.99} />
    );

    expect(getByText('Pay $99.99 Securely')).toBeTruthy();
  });

  it('shows security information', () => {
    const { getByText } = render(
      <StripePaymentForm {...mockProps} />
    );

    expect(getByText('🔒 Your payment information is secure')).toBeTruthy();
    expect(getByText('Powered by Stripe - PCI DSS compliant')).toBeTruthy();
  });

  it('requires complete card information before payment', async () => {
    const { getByText } = render(
      <StripePaymentForm {...mockProps} />
    );

    // Try to pay without completing card
    const payButton = getByText('Pay $150.00 Securely');
    fireEvent.press(payButton);

    // Should not call confirmPayment
    expect(mockConfirmPayment).not.toHaveBeenCalled();
    expect(mockProps.onPaymentSuccess).not.toHaveBeenCalled();
  });
});