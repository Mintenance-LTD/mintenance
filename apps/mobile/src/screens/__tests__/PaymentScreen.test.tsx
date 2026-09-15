import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PaymentService } from '../../services/PaymentService';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { PaymentScreen } from '../PaymentScreen';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual(
    '@react-native-async-storage/async-storage/jest/async-storage-mock'
  )
);

// expo-screen-capture pulls expo-modules-core's native EventEmitter (undefined
// under Jest, the native dependency crashes the screen import.
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  usePreventScreenCapture: jest.fn(),
}));

// AuthContext: the payment hook reads user?.id.
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com', role: 'homeowner' },
    loading: false,
  }),
}));

jest.mock('../../services/PaymentService', () => ({
  PaymentService: {
    getPaymentMethods: jest.fn(),
    calculateFees: jest.fn(() => ({ platformFee: 20, contractorAmount: 330 })),
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
  },
}));
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: jest.fn(), post: jest.fn() },
}));
const method = {
  id: 'pm_test',
  type: 'card',
  card: { brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2030 },
  isDefault: true,
  createdAt: '2026-01-01',
};

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
};

const mockRoute = {
  key: 'test-key',
  name: 'PaymentScreen',
  params: {
    jobId: 'job-1',
    amount: 350,
    contractorId: 'contractor-1',
    jobTitle: 'Fix leaking tap',
    useEscrow: true,
  },
};

// Mock any services this screen might use
jest.mock('../../services/AuthService', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  getUser: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderScreen = (props = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <PaymentScreen
          navigation={mockNavigation}
          route={mockRoute}
          {...props}
        />
      </NavigationContainer>
    </QueryClientProvider>
  );
};

describe('PaymentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PaymentService.getPaymentMethods as jest.Mock).mockResolvedValue({
      methods: [method],
    });
    (mobileApiClient.get as jest.Mock).mockResolvedValue({
      fees: { platformFee: 20, contractorPayout: 330, totalAmount: 350 },
    });
    (PaymentService.createPaymentIntent as jest.Mock).mockResolvedValue({
      clientSecret: 'pi_test_secret',
      paymentIntentId: 'pi_test',
    });
    (PaymentService.confirmPayment as jest.Mock).mockResolvedValue({
      status: 'Succeeded',
    });
    (mobileApiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      status: 'held',
    });
    (Alert.alert as jest.Mock).mockImplementation(() => {});
  });
  afterEach(() => {
    queryClient.clear();
  });

  it('shows loading until payment methods resolve', async () => {
    (PaymentService.getPaymentMethods as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );
    const view = renderScreen();
    expect(view.getByText('Loading payment options…')).toBeTruthy();
    expect(view.queryByLabelText('Pay £350.00')).toBeNull();
  });

  it('disables payment when no method exists', async () => {
    (PaymentService.getPaymentMethods as jest.Mock).mockResolvedValue({
      methods: [],
    });
    const view = renderScreen();
    await waitFor(() =>
      expect(view.getByLabelText('Add payment method')).toBeTruthy()
    );
    expect(
      view.getByLabelText('Pay £350.00').props.accessibilityState.disabled
    ).toBe(true);
    expect(PaymentService.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('shows a method-load failure instead of a payable screen', async () => {
    (PaymentService.getPaymentMethods as jest.Mock).mockResolvedValue({
      error: 'Unable to load cards',
    });
    const view = renderScreen();
    await waitFor(() =>
      expect(view.getByText('Unable to load cards')).toBeTruthy()
    );
    expect(view.queryByLabelText('Pay £350.00')).toBeNull();
  });

  it('confirms the selected payment and requires held escrow before success', async () => {
    const view = renderScreen();
    await waitFor(() =>
      expect(view.getByLabelText('Pay £350.00')).toBeTruthy()
    );
    fireEvent.press(view.getByLabelText('Pay £350.00'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Successful',
        expect.any(String),
        expect.any(Array)
      )
    );
    expect(PaymentService.createPaymentIntent).toHaveBeenCalledWith(
      'job-1',
      350,
      'pm_test',
      'contractor-1'
    );
    expect(mobileApiClient.post).toHaveBeenCalledWith(
      '/api/payments/confirm-intent',
      { paymentIntentId: 'pi_test', jobId: 'job-1' }
    );
  });

  it('shows pending confirmation without false payment success', async () => {
    (mobileApiClient.post as jest.Mock).mockResolvedValue({
      success: false,
      status: 'pending',
    });
    const view = renderScreen();
    await waitFor(() =>
      expect(view.getByLabelText('Pay £350.00')).toBeTruthy()
    );
    fireEvent.press(view.getByLabelText('Pay £350.00'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Received',
        expect.stringContaining('pending'),
        expect.any(Array)
      )
    );
    expect(Alert.alert).not.toHaveBeenCalledWith(
      'Payment Successful',
      expect.anything(),
      expect.anything()
    );
  });
});
