/**
 * Stripe Test Cards Configuration
 * Official test cards from Stripe documentation
 * https://stripe.com/docs/testing
 */

export const STRIPE_TEST_CARDS = {
  // Successful payments
  SUCCESS: {
    number: '4242424242424242',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Standard success card',
    expected: 'success',
  },

  // 3D Secure authentication required
  THREE_D_SECURE_REQUIRED: {
    number: '4000002500003155',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: '3D Secure authentication required',
    expected: 'requires_action',
  },

  THREE_D_SECURE_REQUIRED_2: {
    number: '4000002760003184',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: '3D Secure 2 authentication required',
    expected: 'requires_action',
  },

  // Card declined scenarios
  CARD_DECLINED: {
    number: '4000000000000002',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Card declined',
    expected: 'card_declined',
  },

  INSUFFICIENT_FUNDS: {
    number: '4000000000009995',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Insufficient funds',
    expected: 'insufficient_funds',
  },

  EXPIRED_CARD: {
    number: '4000000000000069',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Expired card',
    expected: 'expired_card',
  },

  INCORRECT_CVC: {
    number: '4000000000000127',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Incorrect CVC',
    expected: 'incorrect_cvc',
  },

  PROCESSING_ERROR: {
    number: '4000000000000119',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Processing error',
    expected: 'processing_error',
  },

  // Risk-based scenarios
  ELEVATED_RISK: {
    number: '4100000000000019',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Elevated risk - may trigger 3DS',
    expected: 'success',
  },

  HIGHEST_RISK: {
    number: '4000000000009235',
    expMonth: 12,
    expYear: 2030,
    cvc: '123',
    zip: '12345',
    description: 'Highest risk - blocked',
    expected: 'card_declined',
  },
} as const;

export type TestCardKey = keyof typeof STRIPE_TEST_CARDS;
export type TestCard = typeof STRIPE_TEST_CARDS[TestCardKey];

/**
 * Format card number for display (e.g., "4242 4242 4242 4242")
 */
export function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Get last 4 digits of card
 */
export function getLast4(cardNumber: string): string {
  return cardNumber.slice(-4);
}

/**
 * Get card brand from number
 */
export function getCardBrand(cardNumber: string): string {
  const firstDigit = cardNumber[0];
  switch (firstDigit) {
    case '4':
      return 'visa';
    case '5':
      return 'mastercard';
    case '3':
      return cardNumber[1] === '4' || cardNumber[1] === '7' ? 'amex' : 'unknown';
    case '6':
      return 'discover';
    default:
      return 'unknown';
  }
}

/**
 * Mock card details for testing
 */
export interface MockCardDetails {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  postalCode?: string;
}

/**
 * Create mock CardField details for testing
 */
export function createMockCardDetails(testCard: TestCard) {
  return {
    complete: true,
    last4: getLast4(testCard.number),
    expiryMonth: testCard.expMonth,
    expiryYear: testCard.expYear,
    brand: getCardBrand(testCard.number),
    validNumber: 'Valid',
    validCVC: 'Valid',
    validExpiryDate: 'Valid',
    postalCode: testCard.zip,
  };
}

/**
 * Expected error messages for declined cards
 */
export const EXPECTED_ERROR_MESSAGES = {
  card_declined: 'Your card was declined',
  insufficient_funds: 'Your card has insufficient funds',
  expired_card: 'Your card has expired',
  incorrect_cvc: 'Your card\'s security code is incorrect',
  processing_error: 'An error occurred while processing your card',
  authentication_failed: 'Your bank declined the authentication',
  authentication_canceled: 'Payment method was not added',
} as const;
