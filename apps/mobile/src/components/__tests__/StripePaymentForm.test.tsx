// Mock React Native and dependencies first
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock Stripe
jest.mock('@stripe/stripe-react-native');

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { StripePaymentForm } from '../StripePaymentForm';
import { useConfirmPayment, CardField } from '@stripe/stripe-react-native';

// Get mocked functions
const mockConfirmPayment = jest.fn();
const mockUseConfirmPayment = useConfirmPayment as jest.MockedFunction<typeof useConfirmPayment>;

describe('StripePaymentForm Component', () => {
  const defaultProps = {
    amount: 150.50,
    clientSecret: 'pi_test_secret_123',
    onPaymentSuccess: jest.fn(),
    onPaymentError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConfirmPayment.mockReturnValue({
      confirmPayment: mockConfirmPayment,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { root } = render(<StripePaymentForm {...defaultProps} />);
      expect(root).toBeTruthy();
    });

    it('should render payment information title', () => {
      render(<StripePaymentForm {...defaultProps} />);
      expect(screen.getByText('Payment Information')).toBeTruthy();
    });

    it('should render CardField component', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);
      expect(cardField).toBeTruthy();
    });

    it('should render pay button with correct testID', () => {
      render(<StripePaymentForm {...defaultProps} />);
      expect(screen.getByTestId('pay-button')).toBeTruthy();
    });

    it('should render security information', () => {
      render(<StripePaymentForm {...defaultProps} />);
      expect(screen.getByText('Your payment information is secure')).toBeTruthy();
      expect(screen.getByText('Powered by Stripe - PCI DSS compliant')).toBeTruthy();
    });

    it('should display formatted amount on pay button', () => {
      render(<StripePaymentForm {...defaultProps} amount={99.99} />);
      expect(screen.getByText('Pay $99.99 Securely')).toBeTruthy();
    });

    it('should format amount with two decimal places', () => {
      render(<StripePaymentForm {...defaultProps} amount={100} />);
      expect(screen.getByText('Pay $100.00 Securely')).toBeTruthy();
    });

    it('should handle large amounts correctly', () => {
      render(<StripePaymentForm {...defaultProps} amount={1234.56} />);
      expect(screen.getByText('Pay $1234.56 Securely')).toBeTruthy();
    });

    it('should handle small amounts correctly', () => {
      render(<StripePaymentForm {...defaultProps} amount={0.99} />);
      expect(screen.getByText('Pay $0.99 Securely')).toBeTruthy();
    });

    it('should handle zero amount', () => {
      render(<StripePaymentForm {...defaultProps} amount={0} />);
      expect(screen.getByText('Pay $0.00 Securely')).toBeTruthy();
    });
  });

  describe('CardField Configuration', () => {
    it('should pass correct props to CardField', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      expect(cardField.props.testID).toBe('card-field');
      expect(cardField.props.postalCodeEnabled).toBe(true);
    });

    it('should have correct placeholder values', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      expect(cardField.props.placeholders).toEqual({
        number: '4242 4242 4242 4242',
        expiration: 'MM/YY',
        cvc: 'CVC',
        postalCode: '12345',
      });
    });

    it('should have correct card styling', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      expect(cardField.props.cardStyle).toEqual({
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        fontSize: 16,
        placeholderColor: '#999999',
      });
    });

    it('should have onCardChange handler', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      expect(typeof cardField.props.onCardChange).toBe('function');
    });
  });

  describe('Card Completion State', () => {
    it('should disable pay button when card is not complete', () => {
      render(<StripePaymentForm {...defaultProps} />);
      const button = screen.getByTestId('pay-button');
      expect(button.props.disabled).toBe(true);
    });

    it('should enable pay button when card is complete', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      // Simulate card being completed
      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      expect(button.props.disabled).toBe(false);
    });

    it('should disable pay button when card becomes incomplete', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      // Complete the card
      act(() => {
      cardField.props.onCardChange({ complete: true });
      });
      let button = screen.getByTestId('pay-button');
      expect(button.props.disabled).toBe(false);

      // Make card incomplete
      act(() => {
      cardField.props.onCardChange({ complete: false });
      });
      button = screen.getByTestId('pay-button');
      expect(button.props.disabled).toBe(true);
    });

    it('should handle null cardDetails in onCardChange', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      expect(() => {
        act(() => {
        cardField.props.onCardChange(null);
        });
      }).not.toThrow();

      const button = screen.getByTestId('pay-button');
      expect(button.props.disabled).toBe(true);
    });

    it('should handle undefined cardDetails in onCardChange', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      expect(() => {
        act(() => {
        cardField.props.onCardChange(undefined);
        });
      }).not.toThrow();

      const button = screen.getByTestId('pay-button');
      expect(button.props.disabled).toBe(true);
    });

    it('should handle cardDetails with complete=false', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: false });
      });

      const button = screen.getByTestId('pay-button');
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Payment Processing - Validation', () => {
    it('should show alert when card is incomplete', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      render(<StripePaymentForm {...defaultProps} />);

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledWith('Error', 'Please complete your card information');
      expect(mockConfirmPayment).not.toHaveBeenCalled();
    });

    it('should show alert when clientSecret is empty', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { UNSAFE_getByType } = render(
        <StripePaymentForm {...defaultProps} clientSecret="" />
      );
      const cardField = UNSAFE_getByType(CardField as any);

      // Complete the card
      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      expect(alertSpy).toHaveBeenCalledWith('Error', 'Please complete your card information');
      expect(mockConfirmPayment).not.toHaveBeenCalled();
    });

    it('should not proceed with payment if card is incomplete', () => {
      render(<StripePaymentForm {...defaultProps} />);

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      expect(mockConfirmPayment).not.toHaveBeenCalled();
      expect(defaultProps.onPaymentSuccess).not.toHaveBeenCalled();
      expect(defaultProps.onPaymentError).not.toHaveBeenCalled();
    });
  });

  describe('Payment Processing - Success', () => {
    beforeEach(() => {
      mockConfirmPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_success_123' },
        error: null,
      });
    });

    it('should call confirmPayment with correct parameters', async () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalledWith('pi_test_secret_123', {
          paymentMethodType: 'Card',
        });
      });
    });

    it('should show loading indicator during payment', async () => {
      let resolvePayment: (value: any) => void;
      const paymentPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });
      mockConfirmPayment.mockReturnValue(paymentPromise as any);

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByTestId('activity-indicator')).toBeTruthy();
      });

      resolvePayment!({ paymentIntent: { id: 'pi_success_123' }, error: null });
    });

    it('should hide pay button text during loading', async () => {
      let resolvePayment: (value: any) => void;
      const paymentPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });
      mockConfirmPayment.mockReturnValue(paymentPromise as any);

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(screen.queryByText(/Pay \$/)).toBeFalsy();
      });

      resolvePayment!({ paymentIntent: { id: 'pi_success_123' }, error: null });
    });

    it('should disable button during payment', async () => {
      let resolvePayment: (value: any) => void;
      const paymentPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });
      mockConfirmPayment.mockReturnValue(paymentPromise as any);

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        const updatedButton = screen.getByTestId('pay-button');
        expect(updatedButton.props.disabled).toBe(true);
      });

      resolvePayment!({ paymentIntent: { id: 'pi_success_123' }, error: null });
    });

    it('should call onPaymentSuccess with payment intent id', async () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentSuccess).toHaveBeenCalledWith('pi_success_123');
      });
    });

    it('should reset loading state after success', async () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentSuccess).toHaveBeenCalled();
      });

      // Loading should be false, button should be enabled
      const updatedButton = screen.getByTestId('pay-button');
      expect(screen.queryByTestId('activity-indicator')).toBeFalsy();
    });
  });

  describe('Payment Processing - Errors', () => {
    it('should handle Stripe error from confirmPayment', async () => {
      mockConfirmPayment.mockResolvedValue({
        paymentIntent: null,
        error: { message: 'Card was declined' },
      });

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentError).toHaveBeenCalledWith('Card was declined');
      });
    });

    it('should handle exception during payment', async () => {
      mockConfirmPayment.mockRejectedValue(new Error('Network error'));

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentError).toHaveBeenCalledWith('Network error');
      });
    });

    it('should handle error without message', async () => {
      mockConfirmPayment.mockRejectedValue({ code: 'unknown' });

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentError).toHaveBeenCalledWith('Payment failed');
      });
    });

    it('should reset loading state after error', async () => {
      mockConfirmPayment.mockRejectedValue(new Error('Payment failed'));

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentError).toHaveBeenCalled();
      });

      // Loading should be false
      expect(screen.queryByTestId('activity-indicator')).toBeFalsy();
    });

    it('should not call onPaymentSuccess on error', async () => {
      mockConfirmPayment.mockRejectedValue(new Error('Payment failed'));

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentError).toHaveBeenCalled();
      });

      expect(defaultProps.onPaymentSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible property on pay button', () => {
      render(<StripePaymentForm {...defaultProps} />);
      const button = screen.getByTestId('pay-button');
      expect(button.props.accessible).toBe(true);
    });

    it('should set correct accessibility state when disabled', () => {
      render(<StripePaymentForm {...defaultProps} />);
      const button = screen.getByTestId('pay-button');
      expect(button.props.accessibilityState).toEqual({ disabled: true });
    });

    it('should set correct accessibility state when enabled', () => {
      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      expect(button.props.accessibilityState).toEqual({ disabled: false });
    });

    it('should set correct accessibility state during loading', async () => {
      let resolvePayment: (value: any) => void;
      const paymentPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });
      mockConfirmPayment.mockReturnValue(paymentPromise as any);

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        const updatedButton = screen.getByTestId('pay-button');
        expect(updatedButton.props.accessibilityState).toEqual({ disabled: true });
      });

      resolvePayment!({ paymentIntent: { id: 'pi_success_123' }, error: null });
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button presses', async () => {
      mockConfirmPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_success_123' },
        error: null,
      });

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');

      // Rapid presses
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      await waitFor(() => {
        // Should only be called once due to loading state
        expect(mockConfirmPayment).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle payment intent without id', async () => {
      mockConfirmPayment.mockResolvedValue({
        paymentIntent: {},
        error: null,
      });

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        // Should still call onPaymentSuccess with undefined
        expect(defaultProps.onPaymentSuccess).toHaveBeenCalledWith(undefined);
      });
    });

    it('should handle both paymentIntent and error being null', async () => {
      mockConfirmPayment.mockResolvedValue({
        paymentIntent: null,
        error: null,
      });

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        // Should not call either callback since no paymentIntent
        expect(defaultProps.onPaymentSuccess).not.toHaveBeenCalled();
        expect(defaultProps.onPaymentError).not.toHaveBeenCalled();
      });
    });

    it('should handle negative amounts', () => {
      render(<StripePaymentForm {...defaultProps} amount={-50} />);
      expect(screen.getByText('Pay $-50.00 Securely')).toBeTruthy();
    });

    it('should handle very large amounts', () => {
      render(<StripePaymentForm {...defaultProps} amount={999999.99} />);
      expect(screen.getByText('Pay $999999.99 Securely')).toBeTruthy();
    });

    it('should handle decimal amounts with more than 2 places', () => {
      render(<StripePaymentForm {...defaultProps} amount={123.456789} />);
      expect(screen.getByText('Pay $123.46 Securely')).toBeTruthy();
    });

    it('should allow re-submitting after error', async () => {
      // First attempt fails
      mockConfirmPayment.mockRejectedValueOnce(new Error('Network error'));
      // Second attempt succeeds
      mockConfirmPayment.mockResolvedValueOnce({
        paymentIntent: { id: 'pi_success_123' },
        error: null,
      });

      const { UNSAFE_getByType } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');

      // First press - error
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentError).toHaveBeenCalledWith('Network error');
      });

      jest.clearAllMocks();

      // Second press - success
      fireEvent.press(button);

      await waitFor(() => {
        expect(defaultProps.onPaymentSuccess).toHaveBeenCalledWith('pi_success_123');
      });
    });
  });

  describe('Props Changes', () => {
    it('should update amount when prop changes', () => {
      const { rerender } = render(<StripePaymentForm {...defaultProps} amount={100} />);
      expect(screen.getByText('Pay $100.00 Securely')).toBeTruthy();

      rerender(<StripePaymentForm {...defaultProps} amount={200} />);
      expect(screen.getByText('Pay $200.00 Securely')).toBeTruthy();
    });

    it('should use new clientSecret when prop changes', async () => {
      const { rerender, UNSAFE_getByType } = render(
        <StripePaymentForm {...defaultProps} clientSecret="secret_1" />
      );
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      rerender(<StripePaymentForm {...defaultProps} clientSecret="secret_2" />);

      mockConfirmPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_success_123' },
        error: null,
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockConfirmPayment).toHaveBeenCalledWith('secret_2', {
          paymentMethodType: 'Card',
        });
      });
    });

    it('should call new callback when prop changes', async () => {
      const newOnSuccess = jest.fn();
      const { rerender, UNSAFE_getByType } = render(
        <StripePaymentForm {...defaultProps} />
      );

      rerender(
        <StripePaymentForm {...defaultProps} onPaymentSuccess={newOnSuccess} />
      );

      mockConfirmPayment.mockResolvedValue({
        paymentIntent: { id: 'pi_success_123' },
        error: null,
      });

      const cardField = UNSAFE_getByType(CardField as any);
      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(newOnSuccess).toHaveBeenCalledWith('pi_success_123');
        expect(defaultProps.onPaymentSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('should unmount without errors', () => {
      const { unmount } = render(<StripePaymentForm {...defaultProps} />);
      expect(() => unmount()).not.toThrow();
    });

    it('should handle unmounting during payment', async () => {
      let resolvePayment: (value: any) => void;
      const paymentPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });
      mockConfirmPayment.mockReturnValue(paymentPromise as any);

      const { UNSAFE_getByType, unmount } = render(<StripePaymentForm {...defaultProps} />);
      const cardField = UNSAFE_getByType(CardField as any);

      act(() => {
      cardField.props.onCardChange({ complete: true });
      });

      const button = screen.getByTestId('pay-button');
      fireEvent.press(button);

      // Unmount while payment is in progress
      unmount();

      // Resolve payment after unmount - should not cause errors
      expect(() => {
        resolvePayment!({ paymentIntent: { id: 'pi_success_123' }, error: null });
      }).not.toThrow();
    });
  });
});
