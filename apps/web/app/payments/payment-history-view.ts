import { paymentAmounts } from '@/lib/payments/payment-amounts';

export interface Transaction {
  id: string;
  amount: number;
  remainingAmount?: number;
  refundNeedsReview?: boolean;
  status:
    | 'pending'
    | 'held'
    | 'release_pending'
    | 'released'
    | 'refunded'
    | 'disputed'
    | 'completed';
  type: 'payment' | 'refund' | 'escrow';
  created_at: string;
  updated_at: string;
  job_title?: string;
  job_id?: string;
  job_status?: string;
  contractor_name?: string;
  contractor_id?: string;
  release_reason?: string;
  refund_reason?: string;
  platformFee?: number;
  processingFee?: number;
  subtotal?: number;
  /**
   * Whether the homeowner has already approved the work. Drives whether the
   * action reads "Release" or "Approve & Release" — releasing an unapproved
   * escrow requires the homeowner to also waive the 48-hour cooling-off
   * window, which needs its own confirmation copy.
   */
  homeowner_approval?: boolean;
  /** End of an active 48-hour cooling-off window, if one is running. */
  cooling_off_ends_at?: string;
}

export interface PaymentData {
  id: string;
  amount: number;
  remainingAmount?: number;
  refundNeedsReview?: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobId?: string;
  jobStatus?: string;
  payerId?: string;
  payeeId?: string;
  job?: { title: string; description?: string } | null;
  payer?: {
    first_name: string;
    last_name: string;
    company_name?: string;
  } | null;
  payee?: {
    first_name: string;
    last_name: string;
    company_name?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
  job_id?: string;
  job_title?: string;
  contractor_name?: string;
  contractor_id?: string;
  transaction_type?: string;
  release_reason?: string;
  refund_reason?: string;
  platformFee?: number;
  stripeProcessingFee?: number;
  homeownerApproval?: boolean;
  coolingOffEndsAt?: string;
}

export function toTransaction(t: PaymentData): Transaction {
  const amount = Number(t.amount) || 0;
  const platformFee = t.platformFee;
  const processingFee = t.stripeProcessingFee;

  // Prefer the trading name; fall back to the person's name.
  const contractorName =
    t.contractor_name ||
    t.payee?.company_name ||
    (t.payee
      ? `${t.payee.first_name || ''} ${t.payee.last_name || ''}`.trim()
      : undefined);

  const jobTitle = t.job_title || t.job?.title;

  return {
    id: t.id,
    amount,
    remainingAmount: t.remainingAmount,
    refundNeedsReview: t.refundNeedsReview,
    status: t.status as Transaction['status'],
    type: (t.transaction_type || 'payment') as Transaction['type'],
    created_at: t.created_at || t.createdAt,
    updated_at: t.updated_at || t.updatedAt,
    job_title: jobTitle,
    job_id: t.job_id || t.jobId,
    job_status: t.jobStatus,
    contractor_name: contractorName || undefined,
    contractor_id: t.contractor_id || t.payeeId,
    release_reason: t.release_reason,
    refund_reason: t.refund_reason,
    platformFee,
    processingFee,
    homeowner_approval: t.homeownerApproval ?? false,
    cooling_off_ends_at: t.coolingOffEndsAt,
  };
}

export function paymentHistoryCsv(transactions: Transaction[]) {
  const csvHeaders = [
    'Date',
    'Description',
    'Amount (GBP)',
    'Refunded (GBP)',
    'Amount after refunds (GBP)',
    'Status',
  ];
  const csvRows = transactions.map((t) => {
    const date = new Date(t.created_at).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const title = t.job_title || 'Payment';
    const asText = /^\s*[=+@-]|^[\t\r\n]/.test(title) ? `'${title}` : title;
    const description = asText.replace(/"/g, '""');
    // Escrow amounts are stored in pounds.
    const amount = t.amount.toFixed(2);
    const amounts = paymentAmounts(t);
    const status = t.status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return `"${date}","${description}","${amount}","${amounts.refunded.toFixed(2)}","${amounts.remaining.toFixed(2)}","${status}"`;
  });
  return [csvHeaders.join(','), ...csvRows].join('\n');
}
