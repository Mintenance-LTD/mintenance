import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { usePayment } from '../usePayment';
import { PaymentService } from '../../../../services/PaymentService';
import { mobileApiClient } from '../../../../utils/mobileApiClient';
import { logger } from '../../../../utils/logger';

// ── Mock externals only (never the hook under test) ────────────────────────

jest.mock('../../../../services/PaymentService', () => ({
  PaymentService: {
    calculateFees: jest.fn(),
    getPaymentMethods: jest.fn(),
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    processJobPayment: jest.fn(),
  },
}));

jest.mock('../../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../../../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockPaymentService = PaymentService as jest.Mocked<typeof PaymentService>;
const mockApi = mobileApiClient as jest.Mocked<typeof mobileApiClient>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const alertSpy = Alert.alert as jest.Mock;

// Default GBP amount used across most tests: £200.00
const AMOUNT = 200;

const DEFAULT_METHOD = {
  id: 'pm_card_default',
  type: 'card',
  card: { brand: 'visa', last4: '4242', expiryMonth: 12, expiryYear: 2030 },
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const NON_DEFAULT_METHOD = {
  id: 'pm_card_other',
  type: 'card',
  card: {
    brand: 'mastercard',
    last4: '5555',
    expiryMonth: 6,
    expiryYear: 2029,
  },
  isDefault: false,
  createdAt: '2026-02-01T00:00:00Z',
};

// Local fallback fees mirroring FeeCalculator output shape (GBP).
const FALLBACK_FEES = {
  platformFee: 24, // 12% of £200
  stripeFee: 3.2,
  contractorAmount: 172.8,
  totalFees: 27.2,
};

function baseOptions(
  overrides: Partial<Parameters<typeof usePayment>[0]> = {}
) {
  return {
    userId: 'user-123',
    jobId: 'job-abc',
    contractorId: 'contractor-xyz',
    jobTitle: 'Fix leaking tap',
    amount: AMOUNT,
    useEscrow: true,
    onSuccess: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // The shared RN Alert mock auto-presses buttons[0]. Override to a no-op so
  // tests opt in to button presses explicitly (avoids unintended onSuccess /
  // retry recursion firing during arrange).
  alertSpy.mockImplementation(() => {});

  mockPaymentService.calculateFees.mockReturnValue(FALLBACK_FEES);
  // Default: payment methods load with a default card; fee GET resolves to null.
  mockPaymentService.getPaymentMethods.mockResolvedValue({
    methods: [DEFAULT_METHOD, NON_DEFAULT_METHOD],
    error: null,
  } as never);
  mockApi.get.mockResolvedValue({ fees: null } as never);
  mockApi.post.mockResolvedValue({} as never);
});

describe('usePayment — initial load', () => {
  it('loads payment methods, selects the default, clears error, ends loading', async () => {
    const { result } = renderHook(() => usePayment(baseOptions()));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockPaymentService.getPaymentMethods).toHaveBeenCalledTimes(1);
    expect(result.current.paymentMethods).toHaveLength(2);
    expect(result.current.selectedMethod).toEqual(DEFAULT_METHOD);
    expect(result.current.error).toBeNull();
    expect(result.current.retryCount).toBe(0);
    expect(result.current.processing).toBe(false);
  });

  it('does not select a method when none is marked default', async () => {
    mockPaymentService.getPaymentMethods.mockResolvedValue({
      methods: [NON_DEFAULT_METHOD],
      error: null,
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.selectedMethod).toBeNull();
    expect(result.current.paymentMethods).toEqual([NON_DEFAULT_METHOD]);
  });

  it('does nothing and stays loading=true when userId is undefined', async () => {
    const { result } = renderHook(() =>
      usePayment(baseOptions({ userId: undefined }))
    );

    // loadPaymentMethods early-returns before the finally that clears loading.
    await waitFor(() =>
      expect(mockPaymentService.getPaymentMethods).not.toHaveBeenCalled()
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.paymentMethods).toEqual([]);
  });

  it('sets error from result.error and stops loading', async () => {
    mockPaymentService.getPaymentMethods.mockResolvedValue({
      methods: null,
      error: 'Stripe unavailable',
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Stripe unavailable');
    expect(result.current.selectedMethod).toBeNull();
  });

  it('sets a generic error when result has neither methods nor error', async () => {
    mockPaymentService.getPaymentMethods.mockResolvedValue({
      methods: null,
      error: null,
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load payment methods');
  });

  it('catches thrown errors, logs, and sets the error state', async () => {
    const boom = new Error('network down');
    mockPaymentService.getPaymentMethods.mockRejectedValue(boom);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load payment methods');
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to load payment methods',
      boom
    );
  });
});

describe('usePayment — fee resolution', () => {
  it('uses local fallback fees before the server breakdown loads', async () => {
    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockPaymentService.calculateFees).toHaveBeenCalledWith(AMOUNT);
    expect(result.current.platformFee).toBe(FALLBACK_FEES.platformFee);
    expect(result.current.contractorPayout).toBe(
      FALLBACK_FEES.contractorAmount
    );
    // useEscrow=true, serverFees null → totalAmount falls back to amount (£200)
    expect(result.current.totalAmount).toBe(AMOUNT);
  });

  it('reconciles to server-authoritative GBP fees from payment-details', async () => {
    mockApi.get.mockResolvedValue({
      fees: { platformFee: 16, contractorPayout: 184, totalAmount: 200 },
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));

    await waitFor(() => expect(result.current.platformFee).toBe(16));
    expect(mockApi.get).toHaveBeenCalledWith(
      '/api/jobs/job-abc/payment-details'
    );
    expect(result.current.contractorPayout).toBe(184);
    expect(result.current.totalAmount).toBe(200);
  });

  it('computes totalAmount as amount + platformFee for non-escrow direct pay', async () => {
    const { result } = renderHook(() =>
      usePayment(baseOptions({ useEscrow: false }))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    // £200 + £24 platform fee = £224
    expect(result.current.totalAmount).toBe(AMOUNT + FALLBACK_FEES.platformFee);
  });

  it('skips the fee GET entirely when jobId is empty', async () => {
    const { result } = renderHook(() => usePayment(baseOptions({ jobId: '' })));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('keeps local estimate and warns when the fee GET rejects', async () => {
    const err = new Error('502');
    mockApi.get.mockRejectedValue(err);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() =>
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load server fee breakdown; using local estimate',
        { jobId: 'job-abc', err: '502' }
      )
    );
    expect(result.current.platformFee).toBe(FALLBACK_FEES.platformFee);
  });

  it('serializes a non-Error rejection from the fee GET via String()', async () => {
    mockApi.get.mockRejectedValue('weird-string-failure');

    renderHook(() => usePayment(baseOptions()));
    await waitFor(() =>
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load server fee breakdown; using local estimate',
        { jobId: 'job-abc', err: 'weird-string-failure' }
      )
    );
  });
});

describe('usePayment — escrow payment (happy path)', () => {
  it('creates an intent (with contractorId), confirms, flips escrow, alerts, calls onSuccess', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_live_123',
      paymentIntentId: 'pi_123',
      error: null,
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Succeeded',
    } as never);

    const onSuccess = jest.fn();
    // Auto-press the first button (OK → onSuccess) for the success alert.
    alertSpy.mockImplementation((_t, _m, buttons) => {
      if (buttons?.[0]?.onPress) buttons[0].onPress();
    });

    const { result } = renderHook(() => usePayment(baseOptions({ onSuccess })));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    // GBP amount + contractorId threaded through to the intent.
    expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledWith(
      'job-abc',
      AMOUNT,
      'pm_card_default',
      'contractor-xyz'
    );
    expect(mockPaymentService.confirmPayment).toHaveBeenCalledWith({
      clientSecret: 'cs_live_123',
      paymentMethodId: 'pm_card_default',
    });
    expect(mockApi.post).toHaveBeenCalledWith('/api/payments/confirm-intent', {
      paymentIntentId: 'pi_123',
      jobId: 'job-abc',
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Payment Successful',
      expect.stringContaining('escrow'),
      expect.any(Array)
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.processing).toBe(false);
  });

  it('does not call confirm-intent when the intent has no paymentIntentId', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_live_456',
      paymentIntentId: undefined,
      error: null,
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Succeeded',
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Payment Successful',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('treats a failed confirm-intent POST as non-fatal and still succeeds', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_live_789',
      paymentIntentId: 'pi_789',
      error: null,
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Succeeded',
    } as never);
    const postErr = new Error('confirm-intent 500');
    mockApi.post.mockRejectedValue(postErr);

    const onSuccess = jest.fn();
    alertSpy.mockImplementation((_t, _m, buttons) => {
      if (buttons?.[0]?.onPress) buttons[0].onPress();
    });

    const { result } = renderHook(() => usePayment(baseOptions({ onSuccess })));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'confirm-intent call failed; webhook will reconcile',
      { jobId: 'job-abc', paymentIntentId: 'pi_789', err: 'confirm-intent 500' }
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Payment Successful',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('serializes a non-Error confirm-intent rejection via String()', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_x',
      paymentIntentId: 'pi_x',
      error: null,
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Succeeded',
    } as never);
    mockApi.post.mockRejectedValue('post-string-fail');

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'confirm-intent call failed; webhook will reconcile',
      { jobId: 'job-abc', paymentIntentId: 'pi_x', err: 'post-string-fail' }
    );
  });
});

describe('usePayment — guards & validation', () => {
  it('alerts and aborts when no method is selected', async () => {
    mockPaymentService.getPaymentMethods.mockResolvedValue({
      methods: [NON_DEFAULT_METHOD],
      error: null,
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Please select a payment method'
    );
    expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled();
    expect(result.current.processing).toBe(false);
  });

  it('alerts and aborts when userId is missing even with a selected method', async () => {
    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSelectedMethod(DEFAULT_METHOD as never));

    // Re-render with undefined userId by selecting then forcing the guard:
    const { result: r2 } = renderHook(() =>
      usePayment(baseOptions({ userId: undefined }))
    );
    act(() => r2.current.setSelectedMethod(DEFAULT_METHOD as never));
    await act(async () => {
      await r2.current.handlePayment();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Please select a payment method'
    );
    expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled();
  });
});

describe('usePayment — escrow failure paths', () => {
  it('throws when createPaymentIntent returns an error', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: null,
      error: 'card declined',
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Payment failed',
      expect.any(Error)
    );
    expect(result.current.retryCount).toBe(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Payment Failed',
      expect.stringContaining('try again'),
      expect.any(Array)
    );
    expect(mockPaymentService.confirmPayment).not.toHaveBeenCalled();
  });

  it('throws when createPaymentIntent returns no clientSecret (generic message)', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: null,
      error: null,
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Payment failed',
      expect.objectContaining({ message: 'Failed to create payment intent' })
    );
  });

  it('throws when escrow confirmPayment status is not Succeeded', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_1',
      paymentIntentId: 'pi_1',
      error: null,
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Failed',
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockApi.post).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Payment failed',
      expect.objectContaining({ message: 'Payment confirmation failed' })
    );
    expect(result.current.retryCount).toBe(1);
  });
});

describe('usePayment — retry / single-intent reuse', () => {
  it('reuses the cached intent on Try Again (no second createPaymentIntent)', async () => {
    // First confirm fails post-create; retry reuses pendingIntentRef.
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_retry',
      paymentIntentId: 'pi_retry',
      error: null,
    } as never);
    mockPaymentService.confirmPayment
      .mockResolvedValueOnce({ status: 'Failed' } as never)
      .mockResolvedValueOnce({ status: 'Succeeded' } as never);

    const onSuccess = jest.fn();
    // First failure alert: press "Try Again" (buttons[1].onPress = handlePayment).
    // Second alert is the success alert: press OK (buttons[0].onPress).
    alertSpy.mockImplementation((title, _m, buttons) => {
      if (title === 'Payment Failed') {
        // Try Again
        const tryAgain = buttons[1];
        if (tryAgain?.onPress) tryAgain.onPress();
      } else if (title === 'Payment Successful') {
        if (buttons?.[0]?.onPress) buttons[0].onPress();
      }
    });

    const { result } = renderHook(() => usePayment(baseOptions({ onSuccess })));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    // Intent created exactly once despite the retry.
    expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockPaymentService.confirmPayment).toHaveBeenCalledTimes(2);
  });

  it('shows the terminal "different payment method" alert once retryCount reaches 2', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_term',
      paymentIntentId: 'pi_term',
      error: null,
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Failed',
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Fail 3 times to push retryCount through 0 → 1 → 2.
    await act(async () => {
      await result.current.handlePayment();
    });
    await act(async () => {
      await result.current.handlePayment();
    });
    await act(async () => {
      await result.current.handlePayment();
    });

    expect(result.current.retryCount).toBe(3);
    // Last alert is the terminal one (single OK button).
    const lastCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    expect(lastCall[0]).toBe('Payment Failed');
    expect(lastCall[1]).toContain('different payment method');
    expect(lastCall[2]).toEqual([{ text: 'OK' }]);
  });

  it('resetRetry clears retryCount and the cached intent', async () => {
    mockPaymentService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'cs_rr',
      paymentIntentId: 'pi_rr',
      error: null,
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Failed',
    } as never);

    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });
    expect(result.current.retryCount).toBe(1);

    act(() => result.current.resetRetry());
    expect(result.current.retryCount).toBe(0);

    // After reset + a new attempt, a fresh intent is minted.
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Succeeded',
    } as never);
    alertSpy.mockImplementation(() => {});
    await act(async () => {
      await result.current.handlePayment();
    });
    expect(mockPaymentService.createPaymentIntent).toHaveBeenCalledTimes(2);
  });
});

describe('usePayment — direct (non-escrow) payment', () => {
  it('processes a direct GBP payment with no 3DS and alerts success', async () => {
    mockPaymentService.processJobPayment.mockResolvedValue({
      success: true,
      requiresAction: false,
    } as never);

    const onSuccess = jest.fn();
    alertSpy.mockImplementation((_t, _m, buttons) => {
      if (buttons?.[0]?.onPress) buttons[0].onPress();
    });

    const { result } = renderHook(() =>
      usePayment(baseOptions({ useEscrow: false, onSuccess }))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockPaymentService.processJobPayment).toHaveBeenCalledWith(
      'job-abc',
      AMOUNT,
      'pm_card_default'
    );
    expect(mockPaymentService.createPaymentIntent).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Payment Successful',
      'Your payment has been processed successfully.',
      expect.any(Array)
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('handles a 3DS-required direct payment by confirming, then succeeding', async () => {
    mockPaymentService.processJobPayment.mockResolvedValue({
      success: false,
      requiresAction: true,
      clientSecret: 'cs_3ds',
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Succeeded',
    } as never);

    const { result } = renderHook(() =>
      usePayment(baseOptions({ useEscrow: false }))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockPaymentService.confirmPayment).toHaveBeenCalledWith({
      clientSecret: 'cs_3ds',
      paymentMethodId: 'pm_card_default',
    });
    expect(alertSpy).toHaveBeenCalledWith(
      'Payment Successful',
      'Your payment has been processed successfully.',
      expect.any(Array)
    );
  });

  it('throws when 3DS confirmation is not Succeeded', async () => {
    mockPaymentService.processJobPayment.mockResolvedValue({
      success: false,
      requiresAction: true,
      clientSecret: 'cs_3ds_fail',
    } as never);
    mockPaymentService.confirmPayment.mockResolvedValue({
      status: 'Canceled',
    } as never);

    const { result } = renderHook(() =>
      usePayment(baseOptions({ useEscrow: false }))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Payment failed',
      expect.objectContaining({ message: 'Payment confirmation failed' })
    );
    expect(result.current.retryCount).toBe(1);
  });

  it('throws result.error when direct payment is unsuccessful and no action', async () => {
    mockPaymentService.processJobPayment.mockResolvedValue({
      success: false,
      requiresAction: false,
      error: 'insufficient funds',
    } as never);

    const { result } = renderHook(() =>
      usePayment(baseOptions({ useEscrow: false }))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Payment failed',
      expect.objectContaining({ message: 'insufficient funds' })
    );
  });

  it('throws the generic "Payment failed" when unsuccessful with no error string', async () => {
    mockPaymentService.processJobPayment.mockResolvedValue({
      success: false,
      requiresAction: false,
      error: undefined,
    } as never);

    const { result } = renderHook(() =>
      usePayment(baseOptions({ useEscrow: false }))
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handlePayment();
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Payment failed',
      expect.objectContaining({ message: 'Payment failed' })
    );
  });
});

describe('usePayment — manual reload & setters', () => {
  it('setSelectedMethod updates the selection', async () => {
    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSelectedMethod(NON_DEFAULT_METHOD as never));
    expect(result.current.selectedMethod).toEqual(NON_DEFAULT_METHOD);
  });

  it('loadPaymentMethods can be re-invoked manually', async () => {
    const { result } = renderHook(() => usePayment(baseOptions()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockPaymentService.getPaymentMethods.mockClear();
    await act(async () => {
      await result.current.loadPaymentMethods();
    });
    expect(mockPaymentService.getPaymentMethods).toHaveBeenCalledTimes(1);
  });
});
