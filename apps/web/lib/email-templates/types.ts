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
