/**
 * Email template data interfaces
 */

export interface QuoteEmailData {
  recipientName: string;
  contractorName: string;
  quoteNumber: string;
  totalAmount: number;
  viewUrl: string;
}

export interface BidEmailData {
  homeownerName: string;
  contractorName: string;
  jobTitle: string;
  bidAmount: number;
  proposalExcerpt: string;
  viewUrl: string;
}

export interface ConnectionRequestEmailData {
  recipientName: string;
  requesterName: string;
  requesterRole: string;
  acceptUrl: string;
}

export interface ContractNotificationData {
  homeownerName: string;
  contractorName: string;
  jobTitle: string;
  contractAmount: number;
  viewUrl: string;
}

export interface MessageNotificationData {
  recipientName: string;
  senderName: string;
  jobTitle: string;
  messagePreview: string;
  viewUrl: string;
}

export interface PaymentConfirmationData {
  homeownerName: string;
  jobTitle: string;
  amount: number;
  contractorName: string;
  viewUrl: string;
}

export interface PaymentReceivedData {
  contractorName: string;
  jobTitle: string;
  amount: number;
  homeownerName: string;
  viewUrl: string;
}

export interface BidAcceptedData {
  contractorName: string;
  homeownerName: string;
  jobTitle: string;
  bidAmount: number;
  viewUrl: string;
}

export interface ContractSignedData {
  recipientName: string;
  signerName: string;
  jobTitle: string;
  contractTitle: string;
  isFullyAccepted: boolean;
  viewUrl: string;
}

export interface JobStartedData {
  homeownerName: string;
  contractorName: string;
  jobTitle: string;
  viewUrl: string;
}

export interface JobCompletedData {
  homeownerName: string;
  contractorName: string;
  jobTitle: string;
  viewUrl: string;
  /** Amount sitting in escrow waiting for sign-off. Optional so legacy callers don't break. */
  amount?: number;
  /** Days until automatic release if homeowner doesn't act. Defaults to 7. */
  autoReleaseDays?: number;
}

export interface LocationSharingData {
  homeownerName: string;
  contractorName: string;
  jobTitle: string;
  viewUrl: string;
}

export interface WorkApprovedData {
  contractorName: string;
  homeownerName: string;
  jobTitle: string;
  amount: number;
  viewUrl: string;
}

export interface ChangesRequestedData {
  contractorName: string;
  homeownerName: string;
  jobTitle: string;
  comments: string;
  viewUrl: string;
}

export interface PaymentReleasedData {
  contractorName: string;
  jobTitle: string;
  amount: number;
  transactionId?: string;
  viewUrl: string;
}

export interface TenantInviteData {
  tenantName: string;
  propertyAddress: string;
  landlordName: string;
  inviteUrl: string;
}

/**
 * Friday cash-flow digest for contractors (R2 of the retention roadmap).
 * Payload is aggregated per week so the template stays pure-render.
 */
export interface CashFlowDigestData {
  contractorName: string;
  weekStart: string; // ISO date (Monday of the digest week)
  weekEnd: string; // ISO date (Sunday)
  earnedThisWeek: number;
  releasingNextWeek: number;
  jobsCompleted: number;
  activeEscrowCount: number;
  activeEscrowTotal: number;
  viewUrl: string;
}

export interface InvoiceNotificationData {
  clientName: string;
  contractorName: string;
  invoiceNumber: string;
  title: string;
  totalAmount: number;
  dueDate: string;
  viewUrl: string;
}

/**
 * Review nudge — sent to the homeowner after the contractor marks the
 * job complete. One-tap star buttons go straight to `${reviewUrl}?stars=N`
 * so the user lands on the review page with their rating pre-selected.
 *
 * `autoReleaseDays` is the SLA after which Mint releases escrow
 * automatically if the homeowner doesn't act (currently 7).
 */
export interface ReviewNudgeData {
  homeownerName: string;
  contractorName: string;
  jobTitle: string;
  amount: number;
  reviewUrl: string;
  autoReleaseDays: number;
}
