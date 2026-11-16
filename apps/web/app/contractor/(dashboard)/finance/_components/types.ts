export interface Transaction {
  id: string;
  jobId: string;
  jobTitle: string;
  client: string;
  amount: number;
  status:
    | 'pending'
    | 'held'
    | 'release_pending'
    | 'released'
    | 'completed'
    | 'refunded'
    | 'failed'
    | 'cancelled'
    | 'awaiting_homeowner_approval'
    | 'pending_review'
    | 'disputed';
  date: string;
  platformFee: number;
  processingFee: number;
  netAmount: number;
  // True once the escrow has been released and real fees are stored.
  // Pending/held rows have no computed fee breakdown yet.
  feesFinalized: boolean;
  feeRate?: number;
  remainingAmount?: number;
}

// API response type from escrow transactions endpoint
export interface EscrowTransaction {
  id: string;
  jobId?: string;
  job_id?: string;
  payerId: string;
  payeeId: string;
  amount: number;
  status: Transaction['status'];
  remainingAmount?: number;
  createdAt?: string;
  releasedAt?: string;
  created_at?: string;
  // Real fee breakdown, populated at escrow release.
  platformFee?: number;
  contractorPayout?: number;
  stripeProcessingFee?: number;
  job?: {
    title: string;
  };
  payer?: {
    first_name?: string;
    last_name?: string;
  };
}
