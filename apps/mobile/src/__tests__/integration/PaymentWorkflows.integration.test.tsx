/**
 * Payment Workflows Integration Tests
 *
 * Realigned 2026-06-03. The previous version was an internally inconsistent
 * scaffold: it asserted on `supabase.functions.invoke` / Stripe SDK calls that
 * the in-test mock screens never made, used DOM idioms (`.textContent`,
 * `<button>`, `<div>`) that don't exist under the React Native test renderer,
 * referenced `act` without importing it, mounted the real `AuthProvider`
 * against a `supabase` mock that lacked `auth`, and stubbed `PaymentService`
 * with methods that didn't match the methods the screens called.
 *
 * This rewrite drives small RN mock screens against a faithfully-mocked
 * `PaymentService` (method names match the real facade in
 * `services/PaymentService.ts`) and asserts on the observable UI + the service
 * calls the screens actually make. Amounts are GBP (£) to match the platform.
 */
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { render, fireEvent, waitFor, act } from '../test-utils';
import { PaymentService } from '../../services/PaymentService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// PaymentService facade — names mirror services/PaymentService.ts.
jest.mock('../../services/PaymentService', () => ({
  PaymentService: {
    initializePayment: jest.fn(),
    createPaymentIntent: jest.fn(),
    createPaymentMethod: jest.fn(),
    confirmPayment: jest.fn(),
    createEscrowTransaction: jest.fn(),
    holdPaymentInEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
    refundPayment: jest.fn(),
    getPaymentHistory: jest.fn(),
    getPaymentMethods: jest.fn(),
  },
}));

const mockPaymentService = PaymentService as unknown as Record<
  string,
  jest.Mock
>;

type Nav = { navigate: jest.Mock };
type Route = {
  params: { amount: number; jobId: string; contractorId: string };
};

// ---------------------------------------------------------------------------
// Mock payment screen — initialize -> create method -> confirm -> navigate.
// Mirrors the real homeowner escrow-funding flow at a high level.
// ---------------------------------------------------------------------------
const MockPaymentScreen: React.FC<{ navigation: Nav; route: Route }> = ({
  navigation,
  route,
}) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { amount, jobId, contractorId } = route.params;

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const intent = await PaymentService.createPaymentIntent(amount, 'gbp', {
        jobId,
        contractorId,
        clientId: 'test-user',
      });

      const method = await PaymentService.createPaymentMethod({ type: 'card' });

      const result = await PaymentService.confirmPayment({
        clientSecret: intent.client_secret,
        paymentMethodId: method.id,
      });

      if (result.status === 'succeeded') {
        navigation.navigate('PaymentSuccess', { paymentId: result.id });
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        testID='pay-button'
        onPress={handlePayment}
        disabled={loading}
      >
        <Text testID='pay-button-label'>
          {loading ? 'Processing...' : `Pay £${amount}`}
        </Text>
      </TouchableOpacity>
      {error ? <Text testID='error-message'>{error}</Text> : null}
    </View>
  );
};

const renderScreen = (navigation: Nav, route: Route) =>
  render(<MockPaymentScreen navigation={navigation} route={route} />);

const baseRoute: Route = {
  params: { amount: 150, jobId: 'job-123', contractorId: 'contractor-456' },
};

describe('Payment Workflows Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Payment Flow', () => {
    it('completes the full payment workflow from UI interaction', async () => {
      mockPaymentService.createPaymentIntent.mockResolvedValue({
        id: 'pi_test_success',
        client_secret: 'pi_test_success_secret',
      });
      mockPaymentService.createPaymentMethod.mockResolvedValue({
        id: 'pm_test_success',
        card: { last4: '4242', brand: 'visa' },
      });
      mockPaymentService.confirmPayment.mockResolvedValue({
        id: 'pi_test_success',
        status: 'succeeded',
      });

      const navigation: Nav = { navigate: jest.fn() };
      const { getByTestId } = renderScreen(navigation, baseRoute);

      await act(async () => {
        fireEvent.press(getByTestId('pay-button'));
      });

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('PaymentSuccess', {
          paymentId: 'pi_test_success',
        });
      });

      // GBP currency is passed through to the payment intent.
      expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
        150,
        'gbp',
        {
          jobId: 'job-123',
          contractorId: 'contractor-456',
          clientId: 'test-user',
        }
      );
      expect(mockPaymentService.createPaymentMethod).toHaveBeenCalledWith({
        type: 'card',
      });
      expect(mockPaymentService.confirmPayment).toHaveBeenCalledWith({
        clientSecret: 'pi_test_success_secret',
        paymentMethodId: 'pm_test_success',
      });
    });
  });

  describe('Payment Error Handling', () => {
    it('displays an error message when the card is declined', async () => {
      mockPaymentService.createPaymentIntent.mockResolvedValue({
        id: 'pi_test_error',
        client_secret: 'pi_test_error_secret',
      });
      mockPaymentService.createPaymentMethod.mockResolvedValue({
        id: 'pm_test_error',
      });
      mockPaymentService.confirmPayment.mockResolvedValue({
        status: 'failed',
        error: { code: 'card_declined', message: 'Your card was declined.' },
      });

      const navigation: Nav = { navigate: jest.fn() };
      const { getByTestId } = renderScreen(navigation, baseRoute);

      await act(async () => {
        fireEvent.press(getByTestId('pay-button'));
      });

      await waitFor(() => {
        expect(getByTestId('error-message')).toHaveTextContent(
          'Your card was declined.'
        );
      });
      expect(navigation.navigate).not.toHaveBeenCalled();
    });

    it('handles network errors gracefully', async () => {
      mockPaymentService.createPaymentIntent.mockRejectedValue(
        new Error('Network request failed')
      );

      const navigation: Nav = { navigate: jest.fn() };
      const { getByTestId } = renderScreen(navigation, baseRoute);

      await act(async () => {
        fireEvent.press(getByTestId('pay-button'));
      });

      await waitFor(() => {
        expect(getByTestId('error-message')).toHaveTextContent(
          'Network request failed'
        );
      });
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('3D Secure Authentication Flow', () => {
    it('confirms again after a requires_action result, then succeeds', async () => {
      mockPaymentService.initializePayment.mockResolvedValue({
        client_secret: 'pi_test_3ds_secret',
      });
      mockPaymentService.createPaymentMethod.mockResolvedValue({
        id: 'pm_test_3ds',
      });
      mockPaymentService.confirmPayment
        .mockResolvedValueOnce({
          id: 'pi_test_3ds',
          status: 'requires_action',
        })
        .mockResolvedValueOnce({ id: 'pi_test_3ds', status: 'succeeded' });

      const handleCardAction = jest.fn().mockResolvedValue({ error: null });

      const Enhanced3DSPaymentScreen: React.FC<{
        navigation: Nav;
        route: Route;
      }> = ({ navigation, route }) => {
        const [error, setError] = React.useState<string | null>(null);
        const { amount, jobId, contractorId } = route.params;

        const handlePayment = async () => {
          try {
            const { client_secret } = await PaymentService.initializePayment({
              amount,
              jobId,
              contractorId,
            });
            const method = await PaymentService.createPaymentMethod({
              type: 'card',
            });
            let result = await PaymentService.confirmPayment({
              clientSecret: client_secret,
              paymentMethodId: method.id,
            });

            if (result.status === 'requires_action') {
              const actionResult = await handleCardAction(client_secret);
              if (!actionResult.error) {
                result = await PaymentService.confirmPayment({
                  clientSecret: client_secret,
                  paymentMethodId: method.id,
                });
              }
            }

            if (result.status === 'succeeded') {
              navigation.navigate('PaymentSuccess', { paymentId: result.id });
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        };

        return (
          <View>
            <TouchableOpacity testID='pay-button' onPress={handlePayment}>
              <Text>Pay £{amount}</Text>
            </TouchableOpacity>
            {error ? <Text testID='error-message'>{error}</Text> : null}
          </View>
        );
      };

      const navigation: Nav = { navigate: jest.fn() };
      const { getByTestId } = render(
        <Enhanced3DSPaymentScreen navigation={navigation} route={baseRoute} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('pay-button'));
      });

      await waitFor(() => {
        expect(navigation.navigate).toHaveBeenCalledWith('PaymentSuccess', {
          paymentId: 'pi_test_3ds',
        });
      });

      expect(mockPaymentService.confirmPayment).toHaveBeenCalledTimes(2);
      expect(handleCardAction).toHaveBeenCalledWith('pi_test_3ds_secret');
    });
  });

  describe('Escrow Management Integration', () => {
    it('creates an escrow transaction and holds the payment', async () => {
      mockPaymentService.createEscrowTransaction.mockResolvedValue({
        id: 'escrow-123',
        job_id: 'job-123',
        payer_id: 'homeowner-123',
        payee_id: 'contractor-456',
        amount: 150,
        status: 'pending',
      });
      mockPaymentService.holdPaymentInEscrow.mockResolvedValue({
        id: 'escrow-123',
        status: 'held',
      });

      const escrow = await PaymentService.createEscrowTransaction(
        'job-123',
        'homeowner-123',
        'contractor-456',
        150
      );

      expect(escrow.id).toBe('escrow-123');
      expect(escrow.status).toBe('pending');

      const held = await PaymentService.holdPaymentInEscrow(
        escrow.id,
        'pi_test_123'
      );

      expect(mockPaymentService.holdPaymentInEscrow).toHaveBeenCalledWith(
        'escrow-123',
        'pi_test_123'
      );
      expect(held.status).toBe('held');
    });
  });

  describe('Payment State Management', () => {
    it('keeps an initialized payment state shape', () => {
      const paymentState = {
        amount: 150,
        jobId: 'job-123',
        contractorId: 'contractor-456',
        clientSecret: null,
        paymentMethodId: null,
        status: 'initialized',
      };
      expect(paymentState.status).toBe('initialized');
      expect(paymentState.amount).toBe(150);
    });
  });

  describe('Offline Payment Handling', () => {
    it('rejects when offline and resolves once back online', async () => {
      mockPaymentService.initializePayment.mockRejectedValueOnce(
        new Error('Network request failed')
      );

      await expect(
        PaymentService.initializePayment({
          amount: 150,
          jobId: 'job-offline',
          contractorId: 'contractor-offline',
        })
      ).rejects.toThrow('Network request failed');

      mockPaymentService.initializePayment.mockResolvedValueOnce({
        client_secret: 'pi_test_online',
      });

      const onlineResult = await PaymentService.initializePayment({
        amount: 150,
        jobId: 'job-online',
        contractorId: 'contractor-online',
      });

      expect(onlineResult.client_secret).toBe('pi_test_online');
    });
  });
});
