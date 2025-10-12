import type {
  PaymentIntent,
  EscrowTransaction,
  PaymentMethod,
  FeeCalculation
} from '@mintenance/types';

export type StripeBillingAddress = {
  line1?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

export type StripeBillingDetails = {
  name?: string;
  address?: StripeBillingAddress;
};

export type StripePaymentIntentPayload = {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  client_secret?: string;
  payment_intent_id?: string;
  [key: string]: unknown;
};

export type StripeConfirmResult = {
  error?: { message?: string };
  paymentIntent?: StripePaymentIntentPayload;
};

export type StripeCreatePaymentMethodParams = {
  type: string;
  card: {
    number: string;
    exp_month: number;
    exp_year: number;
    cvc: string;
  };
  billing_details?: StripeBillingDetails;
};

export type StripeApi = {
  confirmPayment: (options: {
    elements: unknown;
    clientSecret: string;
    confirmParams: { return_url: string };
  }) => Promise<StripeConfirmResult>;
  createPaymentMethod: (params: StripeCreatePaymentMethodParams) => Promise<{
    paymentMethod?: PaymentMethod;
    error?: { message?: string };
  }>;
};

export type StripeFactory = (publishableKey: string | undefined) => StripeApi;

export type SupabaseUserName = {
  first_name?: string | null;
  last_name?: string | null;
};

export type EscrowTransactionRow = {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  payment_intent_id?: string | null;
  released_at?: string | null;
  refunded_at?: string | null;
  job?: { title?: string | null; description?: string | null } | null;
  payer?: SupabaseUserName | null;
  payee?: SupabaseUserName | null;
};

declare global {
  interface Window {
    Stripe?: StripeFactory;
  }
}

export const asError = (error: unknown, fallbackMessage: string): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallbackMessage);
};
