
// Mock React Native modules
jest.mock('react-native', () => require('../../__mocks__/react-native.js'));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { PaymentService } from '../../../services/PaymentService';
import { PaymentScreen } from '../../../screens/PaymentScreen';
import { initStripe, createPaymentMethod } from '@stripe/stripe-react-native';

jest.mock('../../../services/PaymentService');
jest.mock('@stripe/stripe-react-native');

describe('Payment Creation - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (initStripe as jest.Mock).mockResolvedValue(undefined);
    (createPaymentMethod as jest.Mock).mockResolvedValue({
      paymentMethod: { id: 'pm_test123' },
      error: null,
    });
    (PaymentService.createPaymentIntent as jest.Mock).mockResolvedValue({
      clientSecret: 'pi_test_secret',
      amount: 10000,
    });
  });

  it('should create payment for job', async () => {
    const mockJob = {
      id: 'job123',
      title: 'Plumbing Repair',
      accepted_bid: { amount: 10000, contractor_id: 'contractor123' },
    };

    const { getByText, getByTestId } = render(
      <PaymentScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { job: mockJob } }}
      />
    );

    fireEvent.press(getByText(/pay now/i));

    await waitFor(() => {
      expect(PaymentService.createPaymentIntent).toHaveBeenCalledWith({
        amount: 10000,
        job_id: 'job123',
        contractor_id: 'contractor123',
      });
    });
  });

  it('should handle payment method selection', async () => {
    const { getByText, getByTestId } = render(
      <PaymentScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { job: { id: 'job123', accepted_bid: { amount: 10000 } } } }}
      />
    );

    fireEvent.press(getByTestId('payment-method-selector'));
    fireEvent.press(getByText(/add new card/i));

    await waitFor(() => {
      expect(getByTestId('card-input')).toBeTruthy();
    });
  });

  it('should validate card details', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <PaymentScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { job: { id: 'job123', accepted_bid: { amount: 10000 } } } }}
      />
    );

    const cardInput = getByTestId('card-input');

    // Invalid card number
    fireEvent.changeText(cardInput, '1234');
    fireEvent.press(getByText(/pay now/i));

    await waitFor(() => {
      expect(queryByText(/invalid card/i)).toBeTruthy();
    });
  });

  it('should show payment confirmation', async () => {
    (PaymentService.confirmPayment as jest.Mock).mockResolvedValue({
      status: 'succeeded',
      id: 'pi_completed',
    });

    const mockNavigation = { navigate: jest.fn() };
    const { getByText } = render(
      <PaymentScreen
        navigation={mockNavigation}
        route={{ params: { job: { id: 'job123', accepted_bid: { amount: 10000 } } } }}
      />
    );

    fireEvent.press(getByText(/pay now/i));

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PaymentSuccess', {
        payment_id: 'pi_completed',
      });
    });
  });

  it('should handle payment failure', async () => {
    (PaymentService.confirmPayment as jest.Mock).mockRejectedValue(
      new Error('Card declined')
    );

    const { getByText, queryByText } = render(
      <PaymentScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { job: { id: 'job123', accepted_bid: { amount: 10000 } } }}
      />
    );

    fireEvent.press(getByText(/pay now/i));

    await waitFor(() => {
      expect(queryByText(/card declined/i)).toBeTruthy();
    });
  });
});
