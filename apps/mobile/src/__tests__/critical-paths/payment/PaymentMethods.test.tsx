import React from 'react';
import { fireEvent, render, waitFor } from '../../test-utils';
import { PaymentMethodsScreen } from '../../../screens/payment-methods';
import { PaymentService } from '../../../services/PaymentService';
import { createMockNavigation } from '../../test-utils';

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

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'homeowner-1', role: 'homeowner' },
  }),
}));

jest.mock('../../../services/PaymentService', () => ({
  PaymentService: {
    getPaymentMethods: jest.fn(),
    deletePaymentMethod: jest.fn(),
    setDefaultPaymentMethod: jest.fn(),
  },
}));

const mockGetPaymentMethods = PaymentService.getPaymentMethods as jest.Mock;

describe('Payment Methods Management - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPaymentMethods.mockResolvedValue({ methods: [] });
  });

  it('shows the saved-card empty state and payment purpose', async () => {
    const navigation = createMockNavigation();

    const { getByText, queryByText } = render(
      <PaymentMethodsScreen navigation={navigation} />
    );

    expect(getByText('Payment Method')).toBeTruthy();
    expect(getByText('Your Cards')).toBeTruthy();
    expect(getByText(/Used to pay into escrow/)).toBeTruthy();

    await waitFor(() => {
      expect(getByText('No cards saved yet')).toBeTruthy();
    });

    expect(queryByText('Cash')).toBeNull();
    expect(queryByText('PayPal')).toBeNull();
    expect(queryByText('Apple Pay')).toBeNull();
  });

  it('navigates to the dedicated add-card screen', async () => {
    const navigation = createMockNavigation();

    const { getByText } = render(
      <PaymentMethodsScreen navigation={navigation} />
    );

    await waitFor(() => {
      expect(getByText('Add New Card')).toBeTruthy();
    });

    fireEvent.press(getByText('Add New Card'));

    expect(navigation.navigate).toHaveBeenCalledWith('AddPaymentMethod');
  });

  it('renders saved cards returned by the payment service', async () => {
    mockGetPaymentMethods.mockResolvedValue({
      methods: [
        {
          id: 'pm_1',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            expiryMonth: 12,
            expiryYear: 2030,
          },
          isDefault: true,
          createdAt: '2026-04-01T00:00:00.000Z',
        },
      ],
    });

    const navigation = createMockNavigation();

    const { getByText } = render(
      <PaymentMethodsScreen navigation={navigation} />
    );

    await waitFor(() => {
      expect(getByText('Visa **** 4242')).toBeTruthy();
      expect(getByText('Expires 12/2030')).toBeTruthy();
      expect(getByText('Default')).toBeTruthy();
    });
  });
});
