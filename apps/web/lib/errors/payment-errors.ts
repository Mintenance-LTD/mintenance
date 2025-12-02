/**
 * Payment Error Sanitization
 *
 * Provides secure error handling for payment operations by sanitizing
 * sensitive error details and mapping them to user-friendly messages.
 * Prevents leaking sensitive payment information to clients.
 */

import { logger } from '@mintenance/shared';
import Stripe from 'stripe';

/**
 * Standardized payment error codes for client consumption
 */
export enum PaymentErrorCode {
  // Card errors
  CARD_DECLINED = 'card_declined',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  INVALID_CARD = 'invalid_card',
  EXPIRED_CARD = 'expired_card',
  INCORRECT_CVC = 'incorrect_cvc',
  PROCESSING_ERROR = 'processing_error',

  // Authentication errors
  AUTHENTICATION_REQUIRED = 'authentication_required',
  AUTHENTICATION_FAILED = 'authentication_failed',

  // Amount errors
  AMOUNT_TOO_SMALL = 'amount_too_small',
  AMOUNT_TOO_LARGE = 'amount_too_large',
  INVALID_AMOUNT = 'invalid_amount',

  // Account errors
  INVALID_ACCOUNT = 'invalid_account',
  ACCOUNT_CLOSED = 'account_closed',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // General errors
  PAYMENT_METHOD_NOT_AVAILABLE = 'payment_method_not_available',
  CURRENCY_NOT_SUPPORTED = 'currency_not_supported',
  INVALID_REQUEST = 'invalid_request',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Sanitized error response for client consumption
 */
export interface SanitizedPaymentError {
  code: PaymentErrorCode;
  message: string;
  retryable: boolean;
  requiresAction?: boolean;
  actionUrl?: string;
}

/**
 * Error context for structured logging
 */
export interface PaymentErrorContext {
  userId?: string;
  jobId?: string;
  escrowTransactionId?: string;
  amount?: number;
  currency?: string;
  paymentIntentId?: string;
  operation: string;
  ip?: string;
}

/**
 * Map of Stripe error types to user-friendly messages
 */
const STRIPE_ERROR_MAP: Record<string, { code: PaymentErrorCode; message: string; retryable: boolean }> = {
  // Card errors
  'card_declined': {
    code: PaymentErrorCode.CARD_DECLINED,
    message: 'Your card was declined. Please try a different payment method or contact your bank.',
    retryable: true,
  },
  'insufficient_funds': {
    code: PaymentErrorCode.INSUFFICIENT_FUNDS,
    message: 'Your card has insufficient funds. Please use a different payment method.',
    retryable: true,
  },
  'invalid_card_type': {
    code: PaymentErrorCode.INVALID_CARD,
    message: 'This card type is not accepted. Please use a different card.',
    retryable: true,
  },
  'expired_card': {
    code: PaymentErrorCode.EXPIRED_CARD,
    message: 'Your card has expired. Please use a different payment method.',
    retryable: true,
  },
  'incorrect_cvc': {
    code: PaymentErrorCode.INCORRECT_CVC,
    message: 'The card security code is incorrect. Please check and try again.',
    retryable: true,
  },
  'processing_error': {
    code: PaymentErrorCode.PROCESSING_ERROR,
    message: 'An error occurred while processing your card. Please try again.',
    retryable: true,
  },
  'invalid_number': {
    code: PaymentErrorCode.INVALID_CARD,
    message: 'The card number is invalid. Please check and try again.',
    retryable: true,
  },
  'invalid_expiry_month': {
    code: PaymentErrorCode.INVALID_CARD,
    message: 'The card expiration month is invalid. Please check and try again.',
    retryable: true,
  },
  'invalid_expiry_year': {
    code: PaymentErrorCode.INVALID_CARD,
    message: 'The card expiration year is invalid. Please check and try again.',
    retryable: true,
  },

  // Authentication errors
  'authentication_required': {
    code: PaymentErrorCode.AUTHENTICATION_REQUIRED,
    message: 'Additional authentication is required. Please complete the verification.',
    retryable: true,
  },

  // Amount errors
  'amount_too_small': {
    code: PaymentErrorCode.AMOUNT_TOO_SMALL,
    message: 'The payment amount is too small. Minimum amount is $0.50.',
    retryable: false,
  },
  'amount_too_large': {
    code: PaymentErrorCode.AMOUNT_TOO_LARGE,
    message: 'The payment amount exceeds the maximum allowed. Please contact support.',
    retryable: false,
  },
  'invalid_amount': {
    code: PaymentErrorCode.INVALID_AMOUNT,
    message: 'The payment amount is invalid. Please check and try again.',
    retryable: false,
  },

  // Rate limiting
  'rate_limit': {
    code: PaymentErrorCode.RATE_LIMIT_EXCEEDED,
    message: 'Too many payment attempts. Please wait a few minutes and try again.',
    retryable: true,
  },

  // General errors
  'api_error': {
    code: PaymentErrorCode.SERVER_ERROR,
    message: 'A server error occurred. Please try again later.',
    retryable: true,
  },
  'invalid_request_error': {
    code: PaymentErrorCode.INVALID_REQUEST,
    message: 'Invalid payment request. Please check your information and try again.',
    retryable: false,
  },
};

/**
 * Sanitize payment errors for client consumption
 * Removes sensitive details and maps to user-friendly messages
 *
 * @param error - The error to sanitize
 * @param isDevelopment - Whether to include debug information
 * @returns Sanitized error object safe for client consumption
 */
export function sanitizePaymentError(
  error: unknown,
  isDevelopment: boolean = false
): SanitizedPaymentError {
  // Handle Stripe errors
  if (error instanceof Stripe.errors.StripeError) {
    const stripeError = error as Stripe.errors.StripeError;

    // Map Stripe error codes to sanitized errors
    const errorCode = stripeError.code || stripeError.type;
    const mappedError = STRIPE_ERROR_MAP[errorCode];

    if (mappedError) {
      return {
        code: mappedError.code,
        message: mappedError.message,
        retryable: mappedError.retryable,
      };
    }

    // Handle card errors specifically
    if (stripeError instanceof Stripe.errors.StripeCardError) {
      const declineCode = stripeError.decline_code;

      if (declineCode === 'insufficient_funds') {
        return STRIPE_ERROR_MAP['insufficient_funds'];
      }

      if (declineCode === 'lost_card' || declineCode === 'stolen_card') {
        return {
          code: PaymentErrorCode.CARD_DECLINED,
          message: 'Your card was declined. Please contact your bank or use a different payment method.',
          retryable: true,
        };
      }

      // Generic card declined
      return STRIPE_ERROR_MAP['card_declined'];
    }

    // Handle rate limit errors
    if (stripeError instanceof Stripe.errors.StripeRateLimitError) {
      return STRIPE_ERROR_MAP['rate_limit'];
    }

    // Handle authentication errors
    if (stripeError instanceof Stripe.errors.StripeAuthenticationError) {
      return {
        code: PaymentErrorCode.SERVER_ERROR,
        message: 'Payment service authentication error. Please contact support.',
        retryable: false,
      };
    }

    // Handle connection errors
    if (stripeError instanceof Stripe.errors.StripeConnectionError) {
      return {
        code: PaymentErrorCode.NETWORK_ERROR,
        message: 'Network error occurred. Please check your connection and try again.',
        retryable: true,
      };
    }

    // Handle invalid request errors
    if (stripeError instanceof Stripe.errors.StripeInvalidRequestError) {
      return STRIPE_ERROR_MAP['invalid_request_error'];
    }

    // Generic Stripe error
    return {
      code: PaymentErrorCode.SERVER_ERROR,
      message: 'An error occurred processing your payment. Please try again.',
      retryable: true,
    };
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    // Check for specific error messages
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        code: PaymentErrorCode.NETWORK_ERROR,
        message: 'Request timed out. Please try again.',
        retryable: true,
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        code: PaymentErrorCode.NETWORK_ERROR,
        message: 'Network error occurred. Please check your connection.',
        retryable: true,
      };
    }

    // In development, include error message for debugging
    if (isDevelopment) {
      return {
        code: PaymentErrorCode.SERVER_ERROR,
        message: `Server error: ${error.message}`,
        retryable: true,
      };
    }
  }

  // Unknown error - don't leak any information
  return {
    code: PaymentErrorCode.UNKNOWN_ERROR,
    message: 'An unexpected error occurred. Please try again or contact support.',
    retryable: true,
  };
}

/**
 * Log payment errors with structured context
 * Includes full error details for debugging while sanitizing client responses
 *
 * @param error - The error to log
 * @param context - Additional context for the error
 */
export function logPaymentError(error: unknown, context: PaymentErrorContext): void {
  const sanitized = sanitizePaymentError(error, true);

  // Build log metadata
  const logMetadata: Record<string, any> = {
    service: 'payments',
    operation: context.operation,
    errorCode: sanitized.code,
    retryable: sanitized.retryable,
    ...context,
  };

  // Add Stripe-specific details for debugging
  if (error instanceof Stripe.errors.StripeError) {
    logMetadata.stripeErrorType = error.type;
    logMetadata.stripeErrorCode = error.code;
    logMetadata.stripeRequestId = error.requestId;
    logMetadata.stripeStatusCode = error.statusCode;

    if (error instanceof Stripe.errors.StripeCardError) {
      logMetadata.stripeDeclineCode = error.decline_code;
    }
  }

  // Log at appropriate level based on error type
  if (sanitized.retryable) {
    logger.warn('Payment error (retryable)', logMetadata);
  } else {
    logger.error('Payment error (non-retryable)', error, logMetadata);
  }

  // Alert on critical errors
  if (sanitized.code === PaymentErrorCode.SERVER_ERROR) {
    logger.error('CRITICAL: Payment server error', error, logMetadata);
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryablePaymentError(error: unknown): boolean {
  const sanitized = sanitizePaymentError(error);
  return sanitized.retryable;
}

/**
 * Get user-friendly error message
 */
export function getPaymentErrorMessage(error: unknown): string {
  const sanitized = sanitizePaymentError(error);
  return sanitized.message;
}

/**
 * Create a standardized error response for API routes
 */
export function createPaymentErrorResponse(
  error: unknown,
  context: PaymentErrorContext
): { error: string; code: string; retryable: boolean; status: number } {
  // Log the error with full context
  logPaymentError(error, context);

  // Sanitize for client
  const sanitized = sanitizePaymentError(error, process.env.NODE_ENV === 'development');

  // Determine HTTP status code
  let status = 500;

  switch (sanitized.code) {
    case PaymentErrorCode.CARD_DECLINED:
    case PaymentErrorCode.INSUFFICIENT_FUNDS:
    case PaymentErrorCode.INVALID_CARD:
    case PaymentErrorCode.EXPIRED_CARD:
    case PaymentErrorCode.INCORRECT_CVC:
      status = 402; // Payment Required
      break;
    case PaymentErrorCode.AUTHENTICATION_REQUIRED:
      status = 401; // Unauthorized
      break;
    case PaymentErrorCode.RATE_LIMIT_EXCEEDED:
      status = 429; // Too Many Requests
      break;
    case PaymentErrorCode.INVALID_REQUEST:
    case PaymentErrorCode.INVALID_AMOUNT:
    case PaymentErrorCode.AMOUNT_TOO_SMALL:
    case PaymentErrorCode.AMOUNT_TOO_LARGE:
      status = 400; // Bad Request
      break;
    default:
      status = 500; // Internal Server Error
  }

  return {
    error: sanitized.message,
    code: sanitized.code,
    retryable: sanitized.retryable,
    status,
  };
}
