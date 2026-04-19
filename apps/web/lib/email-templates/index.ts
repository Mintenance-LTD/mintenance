/**
 * Email Templates - barrel export
 * HTML template generators for each email notification type.
 * Each exported function returns { subject, html, text? } ready for EmailService.sendEmail().
 */

export { escapeHtml } from './shared';

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

export { cashFlowDigestTemplate } from './cashflow-digest';

export { annualHomeMOTTemplate, postJobNudgeTemplate } from './retention';
