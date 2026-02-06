
import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '../../test-utils';
import { PaymentMethodsScreen } from '../../../screens/payment-methods';

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

describe('Payment Methods Management - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display available payment options', () => {
    const { getByText } = render(
      <PaymentMethodsScreen navigation={{ goBack: jest.fn() }} />
    );

    expect(getByText('Payment Method')).toBeTruthy();
    expect(getByText('Cash')).toBeTruthy();
    expect(getByText('PayPal')).toBeTruthy();
    expect(getByText('Apple Pay')).toBeTruthy();
    expect(getByText('+ Add New Card')).toBeTruthy();
  });

  it('should show add card form when toggled', () => {
    const { getByText, getByPlaceholderText } = render(
      <PaymentMethodsScreen navigation={{ goBack: jest.fn() }} />
    );

    fireEvent.press(getByText('+ Add New Card'));

    expect(getByPlaceholderText('Esther Howard')).toBeTruthy();
    expect(getByPlaceholderText('4716 9627 1635 8047')).toBeTruthy();
    expect(getByPlaceholderText('02/30')).toBeTruthy();
    expect(getByPlaceholderText('000')).toBeTruthy();
  });

  it('should submit card details and show success alert', async () => {
    jest.useFakeTimers();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { getByText, getByPlaceholderText } = render(
      <PaymentMethodsScreen navigation={{ goBack: jest.fn() }} />
    );

    fireEvent.press(getByText('+ Add New Card'));

    fireEvent.changeText(getByPlaceholderText('Esther Howard'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('4716 9627 1635 8047'), '4242424242424242');
    fireEvent.changeText(getByPlaceholderText('02/30'), '12/25');
    fireEvent.changeText(getByPlaceholderText('000'), '123');

    fireEvent.press(getByText('Add Card'));

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Success', 'Card added successfully');
    });

    jest.useRealTimers();
  });
});
