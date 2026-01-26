const mockPaymentMethod = {
  id: 'pm_mock_123',
  type: 'card',
  card: {
    brand: 'visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2025,
  },
};

const mockPaymentIntent = {
  id: 'pi_mock_123',
  amount: 10000,
  currency: 'usd',
  status: 'requires_payment_method',
  clientSecret: 'pi_mock_123_secret',
};

const mockSetupIntent = {
  id: 'seti_mock_123',
  status: 'requires_payment_method',
  clientSecret: 'seti_mock_123_secret',
};

module.exports = {
  // Stripe initialization
  initStripe: jest.fn(() => Promise.resolve()),

  // Payment methods
  createPaymentMethod: jest.fn(() =>
    Promise.resolve({
      paymentMethod: mockPaymentMethod,
      error: null,
    })
  ),

  // Payment confirmation
  confirmPayment: jest.fn(() =>
    Promise.resolve({
      paymentIntent: { ...mockPaymentIntent, status: 'succeeded' },
      error: null,
    })
  ),

  confirmSetupIntent: jest.fn(() =>
    Promise.resolve({
      setupIntent: { ...mockSetupIntent, status: 'succeeded' },
      error: null,
    })
  ),

  // Payment sheet
  presentPaymentSheet: jest.fn(() =>
    Promise.resolve({
      error: null,
    })
  ),

  initPaymentSheet: jest.fn(() =>
    Promise.resolve({
      error: null,
    })
  ),

  // Apple/Google Pay
  isApplePaySupported: jest.fn(() => Promise.resolve(false)),
  isGooglePaySupported: jest.fn(() => Promise.resolve(false)),
  presentApplePay: jest.fn(() => Promise.resolve({ error: { code: 'NotSupported' } })),
  presentGooglePay: jest.fn(() => Promise.resolve({ error: { code: 'NotSupported' } })),

  // Card form
  createToken: jest.fn(() =>
    Promise.resolve({
      token: { id: 'tok_mock_123' },
      error: null,
    })
  ),

  // Retrieve intents
  retrievePaymentIntent: jest.fn(() =>
    Promise.resolve({
      paymentIntent: mockPaymentIntent,
      error: null,
    })
  ),

  retrieveSetupIntent: jest.fn(() =>
    Promise.resolve({
      setupIntent: mockSetupIntent,
      error: null,
    })
  ),

  // Components (React components that need to return null in tests)
  StripeProvider: ({ children }) => children,
  CardField: () => null,
  CardForm: () => null,
  ApplePayButton: () => null,
  GooglePayButton: () => null,
  AuBECSDebitForm: () => null,

  // Constants
  PaymentMethodType: {
    Card: 'Card',
    Alipay: 'Alipay',
    Grabpay: 'Grabpay',
    Ideal: 'Ideal',
    Fpx: 'Fpx',
    CardPresent: 'CardPresent',
    SepaDebit: 'SepaDebit',
    AuBecsDebit: 'AuBecsDebit',
    BacsDebit: 'BacsDebit',
    Giropay: 'Giropay',
    P24: 'P24',
    Eps: 'Eps',
    Bancontact: 'Bancontact',
    Oxxo: 'Oxxo',
    Sofort: 'Sofort',
    Upi: 'Upi',
    USBankAccount: 'USBankAccount',
  },

  // Utilities
  useStripe: jest.fn(() => ({
    createPaymentMethod: module.exports.createPaymentMethod,
    confirmPayment: module.exports.confirmPayment,
    createToken: module.exports.createToken,
    retrievePaymentIntent: module.exports.retrievePaymentIntent,
    retrieveSetupIntent: module.exports.retrieveSetupIntent,
  })),

  useConfirmPayment: jest.fn(() => ({
    confirmPayment: module.exports.confirmPayment,
  })),

  useConfirmSetupIntent: jest.fn(() => ({
    confirmSetupIntent: module.exports.confirmSetupIntent,
  })),

  // Reset helper for tests
  __resetMocks: () => {
    Object.keys(module.exports).forEach(key => {
      if (typeof module.exports[key] === 'function' && key !== '__resetMocks') {
        module.exports[key].mockClear();
      }
    });
  },
};