/**
 * Email Templates - barrel export
 * HTML template generators for each email notification type.
 * Each exported function returns { subject, html, text? } ready for EmailService.sendEmail().
 */

export { escapeHtml } from './shared';

export type {
  QuoteEmailData,
  BidEmailData,
  ConnectionRequestEmailData,
  ContractNotificationData,
  MessageNotificationData,
  PaymentConfirmationData,
  PaymentReceivedData,
  BidAcceptedData,
  ContractSignedData,
  JobStartedData,
  JobCompletedData,
  LocationSharingData,
  WorkApprovedData,
  ChangesRequestedData,
  PaymentReleasedData,
  TenantInviteData,
  InvoiceNotificationData,
} from './types';

export {
  quoteNotificationTemplate,
  bidNotificationTemplate,
  connectionRequestTemplate,
  quoteAcceptedTemplate,
  bidAcceptedTemplate,
} from './quotes-bids';

export {
  contractNotificationTemplate,
  contractSignedTemplate,
} from './contracts';

export {
  paymentConfirmationTemplate,
  paymentReceivedTemplate,
  paymentReleasedTemplate,
  invoiceNotificationTemplate,
} from './payments';

export {
  jobStartedTemplate,
  jobCompletedTemplate,
  locationSharingTemplate,
  workApprovedTemplate,
  changesRequestedTemplate,
} from './jobs';

export { messageNotificationTemplate } from './messages';

export { newsletterWelcomeTemplate } from './newsletter';

export { tenantInviteTemplate, tenantJobNotificationTemplate } from './tenant';
