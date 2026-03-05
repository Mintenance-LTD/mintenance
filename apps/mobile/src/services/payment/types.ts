export interface EscrowTransactionRow {
  id: string;
  job_id: string;
  homeowner_id: string;
  contractor_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed';
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  refunded_at: string | null;
  dispute_reason: string | null;
  platform_fee: number | null;
  contractor_payout: number | null;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  isDefault: boolean;
  createdAt: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret?: string;
  error?: string;
}

export interface CreateSetupIntentResponse {
  setupIntentClientSecret?: string;
  error?: string;
}
