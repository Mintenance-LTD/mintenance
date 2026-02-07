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

export interface EscrowTransaction {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string;
  amount: number;
  status: 'pending' | 'held' | 'released' | 'refunded';
  createdAt: string;
  updatedAt: string;
  paymentIntentId?: string;
  releasedAt?: string;
  refundedAt?: string;
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
