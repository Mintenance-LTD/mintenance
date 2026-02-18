// Payment types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status:
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'succeeded'
  | 'canceled';
  client_secret: string;
}

// Status values matching DB CHECK constraint on escrow_transactions
export type EscrowStatus = 'pending' | 'held' | 'release_pending' | 'released' | 'refunded'
  | 'awaiting_homeowner_approval' | 'pending_review' | 'failed' | 'cancelled';

export interface EscrowTransaction {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
  paymentIntentId?: string;
  releasedAt?: string;
  refundedAt?: string;
  // Database field aliases (snake_case)
  job_id?: string;
  payer_id?: string;
  payee_id?: string;
  payment_intent_id?: string;
  stripe_charge_id?: string; // DB: TEXT
  description?: string; // DB: TEXT
  metadata?: Record<string, unknown>; // DB: JSONB
  created_at?: string;
  updated_at?: string;
  released_at?: string;
  refunded_at?: string;
  // Populated fields
  job?: {
    title: string;
    description: string;
  };
  payer?: {
    first_name: string;
    last_name: string;
  };
  payee?: {
    first_name: string;
    last_name: string;
  };
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

export interface FeeCalculation {
  platformFee: number;
  stripeFee: number;
  contractorAmount: number;
  totalFees: number;
}

export interface ContractorPayoutAccount {
  id: string;
  contractorId: string;
  stripeAccountId: string;
  accountComplete: boolean;
  createdAt: string;
  updatedAt: string;
}
