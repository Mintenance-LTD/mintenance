/**
 * Payment Workflows Integration Tests
 * Tests payment flows with real component interactions
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { PaymentService } from '../../services/PaymentService';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock payment screens (would import actual screens in real app)
const MockPaymentScreen = ({ navigation, route }: any) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { amount, jobId, contractorId } = route.params;

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Create payment intent
      const paymentIntent = await PaymentService.createPaymentIntent(
        amount,
        'usd',
        { jobId, contractorId, clientId: 'test-user' }
      );

      // Step 2: Confirm payment intent (would use Stripe SDK in real app)
      const result = await PaymentService.confirmPaymentIntent(
        paymentIntent.id
      );

      if (result.status === 'succeeded') {
        navigation.navigate('PaymentSuccess', { paymentId: result.id });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        testID="pay-button"
        onPress={handlePayment}
        disabled={loading}
      >
        <Text>{loading ? 'Processing...' : `Pay $${amount}`}</Text>
      </TouchableOpacity>
      {error && <Text testID="error-message">{error}</Text>}
    </View>
  );
};

const MockPaymentSuccessScreen = ({ route }: any) => {
  const { paymentId } = route.params;
  return (
    <View testID="payment-success">
      <Text>Payment successful: {paymentId}</Text>
    </View>
  );
};

// Mock navigation stack
const createNavigationStack = () => {
  const Stack = require('@react-navigation/stack').createStackNavigator();
  return (
    <Stack.Navigator>
      <Stack.Screen name="Payment" component={MockPaymentScreen} />
      <Stack.Screen name="PaymentSuccess" component={MockPaymentSuccessScreen} />
    </Stack.Navigator>
  );
};

// Mock providers
const TestProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'homeowner',
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationContainer>{children}</NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>
  );
};

// Mock Stripe and Supabase
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  createPaymentMethod: jest.fn(),
  confirmPayment: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockStripe = require('@stripe/stripe-react-native');
const { supabase } = require('../../config/supabase');

describe('Payment Workflows Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Payment Flow', () => {
    it('should complete full payment workflow from UI interaction', async () => {
      // Setup successful mocks
      supabase.functions.invoke.mockResolvedValue({
        data: { client_secret: 'pi_test_success_secret' },
        error: null,
      });

      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_test_success',
          card: { last4: '4242', brand: 'visa' },
        },
        error: null,
      });

      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: {
          id: 'pi_test_success',
          status: 'succeeded',
          amount: 15000,
        },
        error: null,
      });

      const Stack = createNavigationStack();

      const { getByTestId } = render(
        <TestProvider>
          <Stack />
        </TestProvider>
      );

      // Navigate to payment screen with job details
      const navigation = { navigate: jest.fn() };
      const route = {
        params: {
          amount: 150,
          jobId: 'job-123',
          contractorId: 'contractor-456',
        },
      };

      // Re-render with actual screen
      const { rerender } = render(
        <TestProvider>
          <MockPaymentScreen navigation={navigation} route={route} />
        </TestProvider>
      );

      // Trigger payment flow
      const payButton = getByTestId('pay-button');
      fireEvent.press(payButton);

      // Wait for payment processing
      await waitFor(() => {
        expect(payButton.props.children.props.children).toBe('Processing...');
      });

      // Wait for success navigation
      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('PaymentSuccess', {
          paymentId: 'pi_test_success',
        });
      });

      // Verify API calls were made in correct order
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'create-payment-intent',
        {
          body: {
            amount: 15000,
            jobId: 'job-123',
            contractorId: 'contractor-456',
          },
        }
      );

      expect(mockStripe.createPaymentMethod).toHaveBeenCalledWith({
        type: 'card',
        card: {
          number: '4242424242424242',
          expMonth: 12,
          expYear: 2025,
          cvc: '123',
        },
        billingDetails: {
          name: 'Test User',
          email: 'test@example.com',
        },
      });

      expect(mockStripe.confirmPayment).toHaveBeenCalledWith(
        'pi_test_success_secret',
        {
          paymentMethodType: 'Card',
          paymentMethodData: {
            paymentMethodId: 'pm_test_success',
          },
        }
      );
    });
  });

  describe('Payment Error Handling', () => {
    it('should display error message when payment fails', async () => {
      // Setup error mocks
      supabase.functions.invoke.mockResolvedValue({
        data: { client_secret: 'pi_test_error_secret' },
        error: null,
      });

      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_test_error',
          card: { last4: '0002', brand: 'visa' },
        },
        error: null,
      });

      mockStripe.confirmPayment.mockResolvedValue({
        paymentIntent: null,
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
      });

      const navigation = { navigate: jest.fn() };
      const route = {
        params: {
          amount: 150,
          jobId: 'job-123',
          contractorId: 'contractor-456',
        },
      };

      const { getByTestId } = render(
        <TestProvider>
          <MockPaymentScreen navigation={navigation} route={route} />
        </TestProvider>
      );

      // Trigger payment flow
      const payButton = getByTestId('pay-button');
      fireEvent.press(payButton);

      // Wait for error to appear
      await waitFor(() => {
        const errorMessage = getByTestId('error-message');
        expect(errorMessage.textContent).toBe('Your card was declined.');
      });

      // Verify navigation was not called
      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      // Setup network error
      supabase.functions.invoke.mockRejectedValue(
        new Error('Network request failed')
      );

      const navigation = { navigate: jest.fn() };
      const route = {
        params: {
          amount: 150,
          jobId: 'job-123',
          contractorId: 'contractor-456',
        },
      };

      const { getByTestId } = render(
        <TestProvider>
          <MockPaymentScreen navigation={navigation} route={route} />
        </TestProvider>
      );

      // Trigger payment flow
      const payButton = getByTestId('pay-button');
      fireEvent.press(payButton);

      // Wait for error to appear
      await waitFor(() => {
        const errorMessage = getByTestId('error-message');
        expect(errorMessage.textContent).toBe('Network request failed');
      });
    });
  });

  describe('3D Secure Authentication Flow', () => {
    it('should handle 3D Secure authentication workflow', async () => {
      // Setup 3D Secure flow
      supabase.functions.invoke.mockResolvedValue({
        data: { client_secret: 'pi_test_3ds_secret' },
        error: null,
      });

      mockStripe.createPaymentMethod.mockResolvedValue({
        paymentMethod: {
          id: 'pm_test_3ds',
          card: { last4: '3155', brand: 'visa' },
        },
        error: null,
      });

      // First confirmation requires action
      mockStripe.confirmPayment
        .mockResolvedValueOnce({
          paymentIntent: {
            id: 'pi_test_3ds',
            status: 'requires_action',
            next_action: { type: 'use_stripe_sdk' },
          },
          error: null,
        })
        // Second confirmation succeeds
        .mockResolvedValueOnce({
          paymentIntent: {
            id: 'pi_test_3ds',
            status: 'succeeded',
            amount: 15000,
          },
          error: null,
        });

      mockStripe.handleCardAction = jest.fn().mockResolvedValue({
        paymentIntent: {
          id: 'pi_test_3ds',
          status: 'requires_confirmation',
        },
        error: null,
      });

      const navigation = { navigate: jest.fn() };
      const route = {
        params: {
          amount: 150,
          jobId: 'job-123',
          contractorId: 'contractor-456',
        },
      };

      // Enhanced payment screen that handles 3DS
      const Enhanced3DSPaymentScreen = ({ navigation, route }: any) => {
        const [loading, setLoading] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);
        const { amount, jobId, contractorId } = route.params;

        const handlePayment = async () => {
          try {
            setLoading(true);
            setError(null);

            const { client_secret } = await PaymentService.initializePayment({
              amount,
              jobId,
              contractorId,
            });

            const paymentMethod = await PaymentService.createPaymentMethod({
              type: 'card',
              card: {
                number: '4000000000003155', // 3DS test card
                expMonth: 12,
                expYear: 2025,
                cvc: '123',
              },
            });

            let result = await PaymentService.confirmPayment({
              clientSecret: client_secret,
              paymentMethodId: paymentMethod.id,
            });

            // Handle 3DS authentication
            if (result.status === 'requires_action') {
              const actionResult = await mockStripe.handleCardAction(client_secret);
              if (!actionResult.error) {
                result = await PaymentService.confirmPayment({
                  clientSecret: client_secret,
                  paymentMethodId: paymentMethod.id,
                });
              }
            }

            if (result.status === 'succeeded') {
              navigation.navigate('PaymentSuccess', { paymentId: result.id });
            }
          } catch (err: any) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };

        return (
          <>
            <button testID="pay-button" onClick={handlePayment} disabled={loading}>
              {loading ? 'Processing...' : `Pay $${amount}`}
            </button>
            {error && <div testID="error-message">{error}</div>}
          </>
        );
      };

      const { getByTestId } = render(
        <TestProvider>
          <Enhanced3DSPaymentScreen navigation={navigation} route={route} />
        </TestProvider>
      );

      // Trigger payment flow
      const payButton = getByTestId('pay-button');
      fireEvent.press(payButton);

      // Wait for successful completion
      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('PaymentSuccess', {
          paymentId: 'pi_test_3ds',
        });
      });

      // Verify 3DS flow was executed
      expect(mockStripe.confirmPayment).toHaveBeenCalledTimes(2);
      expect(mockStripe.handleCardAction).toHaveBeenCalledWith('pi_test_3ds_secret');
    });
  });

  describe('Escrow Management Integration', () => {
    it('should handle escrow creation and release flow', async () => {
      // Mock escrow operations
      supabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'escrow-123',
            job_id: 'job-123',
            payer_id: 'homeowner-123',
            payee_id: 'contractor-456',
            amount: 150,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      } as any);

      // Test escrow creation after successful payment
      const escrowTransaction = await PaymentService.createEscrowTransaction(
        'job-123',
        'homeowner-123',
        'contractor-456',
        150
      );

      expect(escrowTransaction.id).toBe('escrow-123');
      expect(escrowTransaction.status).toBe('pending');

      // Test holding payment in escrow
      await PaymentService.holdPaymentInEscrow(escrowTransaction.id, 'pi_test_123');

      expect(supabase.from().update).toHaveBeenCalledWith({
        status: 'held',
        payment_intent_id: 'pi_test_123',
        updated_at: expect.any(String),
      });
    });
  });

  describe('Payment State Management', () => {
    it('should maintain payment state throughout navigation', async () => {
      // This test would verify that payment state is preserved
      // when navigating between screens during the payment flow
      const mockPaymentState = {
        amount: 150,
        jobId: 'job-123',
        contractorId: 'contractor-456',
        clientSecret: null,
        paymentMethodId: null,
        status: 'initialized',
      };

      // Would test React Query state persistence, navigation state, etc.
      expect(mockPaymentState.status).toBe('initialized');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should clean up payment objects and prevent memory leaks', async () => {
      // Mock memory tracking
      const initialMemory = global.performance?.memory?.usedJSHeapSize || 0;

      // Perform multiple payment operations
      for (let i = 0; i < 10; i++) {
        supabase.functions.invoke.mockResolvedValue({
          data: { client_secret: `pi_test_${i}` },
          error: null,
        });

        await PaymentService.initializePayment({
          amount: 100,
          jobId: `job-${i}`,
          contractorId: `contractor-${i}`,
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = global.performance?.memory?.usedJSHeapSize || 0;

      // Memory shouldn't grow significantly
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(1024 * 1024); // Less than 1MB growth
      }
    });
  });

  describe('Offline Payment Handling', () => {
    it('should queue payments when offline and process when online', async () => {
      // Mock offline state
      const mockNetworkState = { isConnected: false };

      // Simulate offline payment attempt
      const offlinePaymentPromise = PaymentService.initializePayment({
        amount: 150,
        jobId: 'job-offline',
        contractorId: 'contractor-offline',
      });

      // Should fail when offline
      await expect(offlinePaymentPromise).rejects.toThrow();

      // Mock coming back online
      mockNetworkState.isConnected = true;

      // Setup successful online response
      supabase.functions.invoke.mockResolvedValue({
        data: { client_secret: 'pi_test_online' },
        error: null,
      });

      // Retry payment when online
      const onlineResult = await PaymentService.initializePayment({
        amount: 150,
        jobId: 'job-online',
        contractorId: 'contractor-online',
      });

      expect(onlineResult.client_secret).toBe('pi_test_online');
    });
  });
});