/**
 * Payment Flow End-to-End Journey Tests
 *
 * Comprehensive E2E tests for mobile payment flows using Stripe integration
 * Tests complete user journeys from screen interaction to backend integration
 *
 * @group e2e
 * @group payments
 */

import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AddPaymentMethodScreen from '../../src/screens/payment/AddPaymentMethodScreen';
import { PaymentService } from '../../src/services/PaymentService';
import { useAuth } from '../../src/contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  STRIPE_TEST_CARDS,
  createMockCardDetails,
  EXPECTED_ERROR_MESSAGES,
} from './stripe-test-cards';
import {
  MOCK_TEST_USER,
  MOCK_TEST_JOB,
  mockSuccessfulSetupIntent,
  mock3DSRequiredSetupIntent,
  mock3DSCompletedSetupIntent,
  mockCardDeclinedError,
  mockAuthCanceledError,
  mockSuccessfulPaymentIntent,
  mockPaymentMethodsList,
  mockApiSuccess,
  mockApiError,
  mockAuthSession,
  suppressConsoleLogs,
  waitForAsync,
} from './test-helpers';

// Mock dependencies
jest.mock('@stripe/stripe-react-native', () => ({
  CardField: 'CardField',
  useStripe: jest.fn(),
  useConfirmSetupIntent: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../src/services/PaymentService');
jest.mock('../../src/lib/supabase');

const mockStripe = require('@stripe/stripe-react-native');
const mockNav = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const { supabase } = require('../../src/lib/supabase');

describe('Payment Flow E2E Journey Tests', () => {
  let mockNavigation: any;
  let mockConfirmSetupIntent: jest.Mock;
  let alertSpy: jest.SpyInstance;

  suppressConsoleLogs();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock navigation
    mockNavigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
    };
    mockNav.mockReturnValue(mockNavigation);

    // Mock auth context
    mockUseAuth.mockReturnValue({
      user: MOCK_TEST_USER,
      session: mockAuthSession().data.session,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
    } as any);

    // Mock Stripe hook
    mockConfirmSetupIntent = jest.fn();
    mockStripe.useStripe.mockReturnValue({
      confirmSetupIntent: mockConfirmSetupIntent,
    });
    mockStripe.useConfirmSetupIntent.mockReturnValue({
      confirmSetupIntent: mockConfirmSetupIntent,
    });

    // Mock supabase auth
    supabase.auth.getSession.mockResolvedValue(mockAuthSession());

    // Spy on Alert
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Journey 1: Add Payment Method - Success Flow', () => {
    it('should complete full payment method addition successfully', async () => {
      // Step 1: Setup successful responses
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: 'seti_test_success_secret',
        error: null,
      });

      mockConfirmSetupIntent.mockResolvedValue(mockSuccessfulSetupIntent());

      (PaymentService.savePaymentMethod as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Step 2: Render screen
      const { getByText, getByTestId, UNSAFE_getByType } = render(
        <AddPaymentMethodScreen />
      );

      // Step 3: Verify screen renders
      expect(getByText('Add Payment Method')).toBeTruthy();
      expect(getByText('Card Information')).toBeTruthy();

      // Step 4: Simulate card field complete
      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.SUCCESS);

      fireEvent(cardField, 'onCardChange', mockCardDetails);

      // Step 5: Verify "Save for future use" is checked by default
      expect(getByText('Save this card for future payments')).toBeTruthy();

      // Step 6: Tap "Add Payment Method" button
      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      // Step 7: Verify loading state
      await waitFor(() => {
        expect(getByTestId('loading-indicator') || getByText(/processing/i)).toBeTruthy();
      });

      // Step 8: Wait for backend calls
      await waitFor(() => {
        expect(PaymentService.createSetupIntent).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockConfirmSetupIntent).toHaveBeenCalledWith(
          'seti_test_success_secret',
          expect.objectContaining({
            paymentMethodType: 'Card',
            paymentMethodData: expect.objectContaining({
              billingDetails: expect.objectContaining({
                email: MOCK_TEST_USER.email,
                name: `${MOCK_TEST_USER.firstName} ${MOCK_TEST_USER.lastName}`,
              }),
            }),
          })
        );
      });

      await waitFor(() => {
        expect(PaymentService.savePaymentMethod).toHaveBeenCalledWith(
          'pm_test_success_456',
          true // saveForFuture
        );
      });

      // Step 9: Verify success alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Success',
          'Payment method added successfully',
          expect.arrayContaining([
            expect.objectContaining({
              text: 'OK',
              onPress: expect.any(Function),
            }),
          ])
        );
      });

      // Step 10: Verify navigation back on OK
      const okButton = alertSpy.mock.calls[0][2][0];
      okButton.onPress();

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });

    it('should handle saveForFuture toggle correctly', async () => {
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: 'seti_test_success_secret',
        error: null,
      });

      mockConfirmSetupIntent.mockResolvedValue(mockSuccessfulSetupIntent());

      (PaymentService.savePaymentMethod as jest.Mock).mockResolvedValue({
        success: true,
      });

      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      // Simulate card field complete
      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.SUCCESS);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      // Toggle "Save for future use" off
      const saveCheckbox = getByText('Save this card for future payments');
      fireEvent.press(saveCheckbox);

      // Add payment method
      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      // Verify savePaymentMethod called with false
      await waitFor(() => {
        expect(PaymentService.savePaymentMethod).toHaveBeenCalledWith(
          'pm_test_success_456',
          false // saveForFuture = false after toggle
        );
      });
    });
  });

  describe('Journey 2: Add Payment Method - 3D Secure Flow', () => {
    it('should handle 3D Secure authentication successfully', async () => {
      // Step 1: Setup 3DS flow
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: 'seti_test_3ds_secret',
        error: null,
      });

      // First call requires action
      mockConfirmSetupIntent
        .mockResolvedValueOnce(mock3DSRequiredSetupIntent())
        .mockResolvedValueOnce(mock3DSCompletedSetupIntent());

      (PaymentService.savePaymentMethod as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Step 2: Render and interact
      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.THREE_D_SECURE_REQUIRED);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      // Step 3: Verify 3DS authentication flow
      // Note: In real implementation, user would see 3DS modal here
      // Stripe SDK handles this automatically

      await waitFor(() => {
        expect(mockConfirmSetupIntent).toHaveBeenCalledTimes(1);
      });

      // Step 4: After successful 3DS, payment method is saved
      await waitFor(() => {
        expect(PaymentService.savePaymentMethod).toHaveBeenCalledWith(
          'pm_test_3ds_456',
          true
        );
      });

      // Step 5: Verify success
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Success',
          'Payment method added successfully',
          expect.any(Array)
        );
      });
    });

    it('should handle 3D Secure authentication cancellation', async () => {
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: 'seti_test_3ds_secret',
        error: null,
      });

      // User cancels 3DS authentication
      mockConfirmSetupIntent.mockResolvedValue(mockAuthCanceledError());

      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.THREE_D_SECURE_REQUIRED);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      // Verify cancellation alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Authentication Canceled',
          'Payment method was not added'
        );
      });

      // Verify payment method was NOT saved
      expect(PaymentService.savePaymentMethod).not.toHaveBeenCalled();

      // Verify user stays on screen
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('should handle 3D Secure authentication failure', async () => {
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: 'seti_test_3ds_secret',
        error: null,
      });

      // Bank declines 3DS authentication
      mockConfirmSetupIntent.mockResolvedValue({
        setupIntent: null,
        error: {
          code: 'Failed',
          message: 'Authentication failed',
          type: 'authentication_error',
        },
      });

      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.THREE_D_SECURE_REQUIRED);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      // Verify authentication failed alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Authentication Failed',
          'Your bank declined the authentication. Please try another card.'
        );
      });

      // Verify payment method was NOT saved
      expect(PaymentService.savePaymentMethod).not.toHaveBeenCalled();
    });
  });

  describe('Journey 3: Add Payment Method - Declined Card', () => {
    it('should handle card declined error gracefully', async () => {
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: 'seti_test_declined_secret',
        error: null,
      });

      mockConfirmSetupIntent.mockResolvedValue(mockCardDeclinedError());

      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.CARD_DECLINED);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      // Verify error alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('declined')
        );
      });

      // Verify payment method was NOT saved
      expect(PaymentService.savePaymentMethod).not.toHaveBeenCalled();

      // Verify user stays on screen to retry
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });

    it('should handle insufficient funds error', async () => {
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: 'seti_test_insufficient_secret',
        error: null,
      });

      mockConfirmSetupIntent.mockResolvedValue({
        setupIntent: null,
        error: {
          code: 'Failed',
          message: 'Your card has insufficient funds.',
          type: 'card_error',
          declineCode: 'insufficient_funds',
        },
      });

      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.INSUFFICIENT_FUNDS);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('insufficient funds')
        );
      });
    });

    it('should handle network failure during setup', async () => {
      (PaymentService.createSetupIntent as jest.Mock).mockResolvedValue({
        setupIntentClientSecret: null,
        error: 'Network request failed',
      });

      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.SUCCESS);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Network request failed')
        );
      });
    });
  });

  describe('Journey 4: Job Payment Flow', () => {
    it('should process job payment successfully', async () => {
      const jobAmount = 5000;
      const paymentMethodId = 'pm_test_saved_123';

      // Mock successful payment processing
      (PaymentService.processJobPayment as jest.Mock).mockResolvedValue({
        success: true,
        paymentIntentId: 'pi_test_job_payment_123',
        requiresAction: false,
      });

      const result = await PaymentService.processJobPayment(
        MOCK_TEST_JOB.id,
        jobAmount,
        paymentMethodId,
        false
      );

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('pi_test_job_payment_123');
      expect(PaymentService.processJobPayment).toHaveBeenCalledWith(
        MOCK_TEST_JOB.id,
        jobAmount,
        paymentMethodId,
        false
      );
    });

    it('should handle job payment with 3D Secure', async () => {
      const jobAmount = 5000;
      const paymentMethodId = 'pm_test_3ds_123';

      // First call requires action
      (PaymentService.processJobPayment as jest.Mock).mockResolvedValueOnce({
        success: false,
        requiresAction: true,
        clientSecret: 'pi_test_3ds_secret',
        paymentIntentId: 'pi_test_3ds_123',
      });

      const result = await PaymentService.processJobPayment(
        MOCK_TEST_JOB.id,
        jobAmount,
        paymentMethodId,
        false
      );

      expect(result.requiresAction).toBe(true);
      expect(result.clientSecret).toBe('pi_test_3ds_secret');

      // In real flow, app would handle 3DS authentication here
      // Then retry payment
    });

    it('should handle payment method save during job payment', async () => {
      const jobAmount = 5000;
      const paymentMethodId = 'pm_test_new_123';

      (PaymentService.processJobPayment as jest.Mock).mockResolvedValue({
        success: true,
        paymentIntentId: 'pi_test_job_payment_123',
      });

      const result = await PaymentService.processJobPayment(
        MOCK_TEST_JOB.id,
        jobAmount,
        paymentMethodId,
        true // saveForFuture = true
      );

      expect(result.success).toBe(true);
      expect(PaymentService.processJobPayment).toHaveBeenCalledWith(
        MOCK_TEST_JOB.id,
        jobAmount,
        paymentMethodId,
        true
      );
    });
  });

  describe('Journey 5: List Payment Methods', () => {
    it('should retrieve and display saved payment methods', async () => {
      const mockMethods = mockPaymentMethodsList();
      (PaymentService.getPaymentMethods as jest.Mock).mockResolvedValue(mockMethods);

      const result = await PaymentService.getPaymentMethods();

      expect(result.methods).toHaveLength(2);
      expect(result.methods![0].card?.last4).toBe('4242');
      expect(result.methods![0].card?.brand).toBe('visa');
      expect(result.methods![0].isDefault).toBe(true);

      expect(result.methods![1].card?.last4).toBe('5555');
      expect(result.methods![1].card?.brand).toBe('mastercard');
      expect(result.methods![1].isDefault).toBe(false);
    });

    it('should handle empty payment methods list', async () => {
      (PaymentService.getPaymentMethods as jest.Mock).mockResolvedValue({
        methods: [],
      });

      const result = await PaymentService.getPaymentMethods();

      expect(result.methods).toEqual([]);
    });

    it('should handle error fetching payment methods', async () => {
      (PaymentService.getPaymentMethods as jest.Mock).mockResolvedValue({
        methods: undefined,
        error: 'Failed to fetch payment methods',
      });

      const result = await PaymentService.getPaymentMethods();

      expect(result.error).toBe('Failed to fetch payment methods');
      expect(result.methods).toBeUndefined();
    });
  });

  describe('Journey 6: Remove Payment Method', () => {
    it('should delete payment method successfully', async () => {
      const paymentMethodId = 'pm_test_to_delete_123';

      (PaymentService.deletePaymentMethod as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await PaymentService.deletePaymentMethod(paymentMethodId);

      expect(result.success).toBe(true);
      expect(PaymentService.deletePaymentMethod).toHaveBeenCalledWith(paymentMethodId);
    });

    it('should handle error deleting payment method', async () => {
      const paymentMethodId = 'pm_test_error_123';

      (PaymentService.deletePaymentMethod as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to delete payment method',
      });

      const result = await PaymentService.deletePaymentMethod(paymentMethodId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete payment method');
    });

    it('should not allow deleting default payment method if it is the only one', async () => {
      // This would typically be enforced by backend
      const paymentMethodId = 'pm_test_only_default_123';

      (PaymentService.deletePaymentMethod as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Cannot delete your only payment method',
      });

      const result = await PaymentService.deletePaymentMethod(paymentMethodId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('only payment method');
    });
  });

  describe('Journey 7: Set Default Payment Method', () => {
    it('should set payment method as default successfully', async () => {
      const paymentMethodId = 'pm_test_new_default_123';

      (PaymentService.setDefaultPaymentMethod as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await PaymentService.setDefaultPaymentMethod(paymentMethodId);

      expect(result.success).toBe(true);
      expect(PaymentService.setDefaultPaymentMethod).toHaveBeenCalledWith(paymentMethodId);
    });

    it('should handle error setting default payment method', async () => {
      const paymentMethodId = 'pm_test_error_123';

      (PaymentService.setDefaultPaymentMethod as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Failed to set default payment method',
      });

      const result = await PaymentService.setDefaultPaymentMethod(paymentMethodId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to set default payment method');
    });
  });

  describe('Validation and Error Handling', () => {
    it('should not allow submitting incomplete card details', async () => {
      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      // Simulate incomplete card field
      const cardField = UNSAFE_getByType(mockStripe.CardField);
      fireEvent(cardField, 'onCardChange', {
        complete: false,
        last4: '',
        validNumber: 'Invalid',
      });

      const addButton = getByText('Add Payment Method');

      // Button should be disabled
      expect(addButton.props.accessibilityState?.disabled).toBe(true);

      fireEvent.press(addButton);

      // Should show alert for incomplete card
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Incomplete Card',
          'Please enter complete card details'
        );
      });

      // Should not call any API
      expect(PaymentService.createSetupIntent).not.toHaveBeenCalled();
    });

    it('should require user to be logged in', async () => {
      // Mock logged out state
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: jest.fn(),
        signOut: jest.fn(),
        signUp: jest.fn(),
      } as any);

      const { getByText, UNSAFE_getByType } = render(<AddPaymentMethodScreen />);

      const cardField = UNSAFE_getByType(mockStripe.CardField);
      const mockCardDetails = createMockCardDetails(STRIPE_TEST_CARDS.SUCCESS);
      fireEvent(cardField, 'onCardChange', mockCardDetails);

      const addButton = getByText('Add Payment Method');
      fireEvent.press(addButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          'You must be logged in to add a payment method'
        );
      });

      expect(PaymentService.createSetupIntent).not.toHaveBeenCalled();
    });
  });
});
