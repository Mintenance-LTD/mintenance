/**
 * Email Templates
 * HTML template generators for each email notification type.
 * Each exported function returns { subject, html, text? } ready for EmailService.sendEmail().
 */

/** Escape HTML special characters to prevent XSS in email templates */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const year = () => new Date().getFullYear();

/** Shared base CSS included in every template */
function baseCSS(headerColor: string, extraCSS = ''): string {
  return `body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .container{max-width:600px;margin:0 auto;padding:20px}
    .header{background-color:${headerColor};color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center}
    .content{background-color:#f9fafb;padding:30px;border-radius:0 0 12px 12px}
    .footer{text-align:center;margin-top:30px;color:#6b7280;font-size:14px}
    .cta{display:inline-block;background-color:${headerColor};color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;margin-top:20px}
    ${extraCSS}`;
}

/** Wrap content in the standard email shell */
function emailShell(
  headerColor: string,
  extraCSS: string,
  headerHtml: string,
  bodyHtml: string,
  footer: string
): string {
  return `<!DOCTYPE html><html><head><style>${baseCSS(headerColor, extraCSS)}</style></head><body>
  <div class="container">
    <div class="header">${headerHtml}</div>
    <div class="content">${bodyHtml}</div>
    ${footer}
  </div></body></html>`;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Template functions
// ---------------------------------------------------------------------------

export function quoteNotificationTemplate(data: QuoteEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const color = '#2563eb';
  const extra = `.button{display:inline-block;background-color:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:20px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Quote Received</h1>`,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has sent you a new quote.</p>
     <p><strong>Quote Number:</strong> ${e(data.quoteNumber)}</p>
     <p><strong>Total Amount:</strong> $${data.totalAmount.toFixed(2)}</p>
     <a href="${e(data.viewUrl)}" class="button">View Quote</a>
     <p style="margin-top:30px">Log in to your Mintenance account to review the full details and accept or decline the quote.</p>`,
    `<div class="footer"><p>&copy; ${year()} Mintenance. All rights reserved.</p></div>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.contractorName} has sent you a new quote.\n\nQuote Number: ${data.quoteNumber}\nTotal Amount: $${data.totalAmount.toFixed(2)}\n\nView your quote here: ${data.viewUrl}\n\nLog in to review the full details and accept or decline the quote.\n\n© ${year()} Mintenance.`;
  return {
    subject: `New Quote from ${data.contractorName} - ${data.quoteNumber}`,
    html,
    text,
  };
}

export function bidNotificationTemplate(data: BidEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const color = '#10b981';
  const extra = `.button{display:inline-block;background-color:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:20px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Bid on Your Job</h1>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has submitted a bid for your job: <strong>${e(data.jobTitle)}</strong></p>
     <p><strong>Bid Amount:</strong> $${data.bidAmount.toFixed(2)}</p>
     <p><strong>Proposal Preview:</strong></p>
     <p style="background:white;padding:15px;border-left:4px solid ${color};margin:15px 0">${e(data.proposalExcerpt)}...</p>
     <a href="${e(data.viewUrl)}" class="button">View Full Bid</a>
     <p style="margin-top:30px">Review the contractor's full proposal, ratings, and past work to make an informed decision.</p>`,
    `<div class="footer"><p>&copy; ${year()} Mintenance. All rights reserved.</p></div>`
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has submitted a bid for your job: ${data.jobTitle}\n\nBid Amount: $${data.bidAmount.toFixed(2)}\n\nProposal Preview:\n${data.proposalExcerpt}...\n\nView the full bid here: ${data.viewUrl}\n\nReview the contractor's full proposal, ratings, and past work.\n\n© ${year()} Mintenance.`;
  return {
    subject: `New Bid from ${data.contractorName} - ${data.jobTitle}`,
    html,
    text,
  };
}

export function connectionRequestTemplate(data: ConnectionRequestEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const color = '#8b5cf6';
  const extra = `.button{display:inline-block;background-color:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:20px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Connection Request</h1>`,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.requesterName)}</strong> (${e(data.requesterRole)}) wants to connect with you on Mintenance.</p>
     <a href="${e(data.acceptUrl)}" class="button">View Request</a>
     <p style="margin-top:30px">Building connections helps you grow your network and find more opportunities.</p>`,
    `<div class="footer"><p>&copy; ${year()} Mintenance. All rights reserved.</p></div>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.requesterName} (${data.requesterRole}) wants to connect with you on Mintenance.\n\nView the request here: ${data.acceptUrl}\n\nBuilding connections helps you grow your network.\n\n© ${year()} Mintenance.`;
  return {
    subject: `${data.requesterName} wants to connect with you`,
    html,
    text,
  };
}

export function quoteAcceptedTemplate(
  homeownerName: string,
  quoteNumber: string,
  amount: number
): { subject: string; html: string } {
  const e = escapeHtml;
  const color = '#10b981';
  const html = emailShell(
    color,
    '',
    `<h1>🎉 Quote Accepted!</h1>`,
    `<p>Great news!</p>
     <p><strong>${e(homeownerName)}</strong> has accepted your quote <strong>${e(quoteNumber)}</strong> for <strong>$${amount.toFixed(2)}</strong>.</p>
     <p>Log in to your Mintenance account to coordinate the next steps with your client.</p>`,
    `<div class="footer"><p>&copy; ${year()} Mintenance. All rights reserved.</p></div>`
  );
  return { subject: `Quote Accepted - ${quoteNumber}`, html };
}

export function contractNotificationTemplate(data: ContractNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const color = '#0d9488';
  const extra = `.amount{font-size:28px;font-weight:bold;color:${color};margin:15px 0}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Contract Ready for Review</h1>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has sent you a contract for your job "<strong>${e(data.jobTitle)}</strong>".</p>
     <p class="amount">&pound;${data.contractAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
     <p>Please review the contract details and sign it to proceed with the work.</p>
     <p><a href="${e(data.viewUrl)}" class="cta">Review &amp; Sign Contract</a></p>
     <p style="margin-top:20px;font-size:14px;color:#6b7280">Payment will be held securely in escrow by Mintenance until the work is completed and approved.</p>`,
    `<div class="footer"><p>&copy; ${year()} Mintenance. All rights reserved.</p></div>`
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has sent you a contract for "${data.jobTitle}" for £${data.contractAmount.toFixed(2)}.\n\nPlease review and sign: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `Contract Ready for Review - ${data.jobTitle}`,
    html,
    text,
  };
}

export function messageNotificationTemplate(data: MessageNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const color = '#0d9488';
  const extra = `.message-box{background:white;border-left:4px solid ${color};padding:15px;border-radius:4px;margin:15px 0}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Message</h1>`,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.senderName)}</strong> sent you a message about "<strong>${e(data.jobTitle)}</strong>":</p>
     <div class="message-box"><p style="margin:0;color:#374151">${e(data.messagePreview)}</p></div>
     <p><a href="${e(data.viewUrl)}" class="cta">Reply Now</a></p>`,
    `<div class="footer"><p>&copy; ${year()} Mintenance. All rights reserved.</p></div>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.senderName} sent you a message about "${data.jobTitle}":\n\n"${data.messagePreview}"\n\nReply: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `New message from ${data.senderName} - ${data.jobTitle}`,
    html,
    text,
  };
}

export function paymentConfirmationTemplate(
  data: PaymentConfirmationData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#0d9488';
  const fmtAmount = `£${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const extra = `.amount-box{background:white;border:2px solid ${color};border-radius:12px;padding:20px;text-align:center;margin:20px 0}
    .amount{font-size:32px;font-weight:bold;color:${color}}
    .detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px}
    .escrow-note{background:#f0fdfa;border-left:4px solid ${color};padding:12px 16px;border-radius:4px;margin-top:20px;font-size:13px;color:#115e59}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Payment Confirmed</h1><p style="margin:8px 0 0;opacity:0.9">Your funds are secured in escrow</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>Your payment has been successfully processed and the funds are now held securely in escrow.</p>
     <div class="amount-box">
       <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Amount Paid</div>
       <div class="amount">${fmtAmount}</div>
     </div>
     <div style="background:white;border-radius:8px;padding:16px;margin:16px 0">
       <div class="detail-row"><span style="color:#6b7280">Job</span><strong>${e(data.jobTitle)}</strong></div>
       <div class="detail-row"><span style="color:#6b7280">Contractor</span><strong>${e(data.contractorName)}</strong></div>
       <div class="detail-row" style="border:none"><span style="color:#6b7280">Status</span><strong style="color:${color}">Held in Escrow</strong></div>
     </div>
     <div class="escrow-note"><strong>How it works:</strong> Your payment is held safely until the contractor completes the work and you approve it. You're fully protected.</div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">View Payment Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\nYour payment of ${fmtAmount} for "${data.jobTitle}" has been confirmed.\n\nContractor: ${data.contractorName}\nStatus: Held in Escrow\n\nView details: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `Payment Confirmed - ${fmtAmount} for ${data.jobTitle}`,
    html,
    text,
  };
}

export function paymentReceivedTemplate(
  data: PaymentReceivedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#0d9488';
  const fmtAmount = `£${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const extra = `.amount-box{background:white;border:2px solid #059669;border-radius:12px;padding:20px;text-align:center;margin:20px 0}
    .amount{font-size:32px;font-weight:bold;color:#059669}
    .info-note{background:#f0fdf4;border-left:4px solid #059669;padding:12px 16px;border-radius:4px;margin-top:20px;font-size:13px;color:#166534}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Payment Secured</h1><p style="margin:8px 0 0;opacity:0.9">Funds are ready - you can start work</p>`,
    `<p>Hi ${e(data.contractorName)},</p>
     <p>Great news! <strong>${e(data.homeownerName)}</strong> has made a payment for your job. The funds are now held securely in escrow.</p>
     <div class="amount-box">
       <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Amount Secured</div>
       <div class="amount">${fmtAmount}</div>
       <div style="font-size:13px;color:#6b7280;margin-top:4px">for "${e(data.jobTitle)}"</div>
     </div>
     <div class="info-note"><strong>Next steps:</strong> You can now start work on this job. Upload before-photos and click "Start Job" when you're ready. Payment will be released once the homeowner approves the completed work.</div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">View Job Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} has made a payment of ${fmtAmount} for "${data.jobTitle}". Funds are held in escrow.\n\nYou can now start work. View details: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `Payment Secured - ${fmtAmount} for ${data.jobTitle}`,
    html,
    text,
  };
}

export function bidAcceptedTemplate(
  data: BidAcceptedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#059669';
  const fmtAmount = `£${data.bidAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const extra = `.amount-box{background:white;border:2px solid ${color};border-radius:12px;padding:20px;text-align:center;margin:20px 0}
    .amount{font-size:28px;font-weight:bold;color:${color}}
    .next-steps{background:#f0fdf4;border-left:4px solid ${color};padding:12px 16px;border-radius:4px;margin-top:20px;font-size:13px;color:#166534}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Your Bid Was Accepted!</h1><p style="margin:8px 0 0;opacity:0.9">Congratulations - you've won the job</p>`,
    `<p>Hi ${e(data.contractorName)},</p>
     <p>Great news! <strong>${e(data.homeownerName)}</strong> has accepted your bid for "<strong>${e(data.jobTitle)}</strong>".</p>
     <div class="amount-box">
       <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Accepted Bid</div>
       <div class="amount">${fmtAmount}</div>
     </div>
     <div class="next-steps"><strong>Next steps:</strong> Review and sign the contract, then coordinate with the homeowner to schedule the work. A message thread has been created for you to communicate directly.</div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">View Job Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} has accepted your bid of ${fmtAmount} for "${data.jobTitle}".\n\nNext: Review and sign the contract.\n\nView details: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `Bid Accepted - ${data.jobTitle}`, html, text };
}

export function contractSignedTemplate(
  data: ContractSignedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const statusText = data.isFullyAccepted
    ? 'Both parties have now signed — the contract is fully accepted!'
    : `${e(data.signerName)} has signed. Your signature is still required to proceed.`;
  const headerText = data.isFullyAccepted
    ? 'Contract Fully Signed'
    : 'Contract Signed - Action Required';
  const color = data.isFullyAccepted ? '#059669' : '#d97706';
  const ctaText = data.isFullyAccepted ? 'View Contract' : 'Review & Sign Now';
  const extra = `.status-box{background:white;border:2px solid ${color};border-radius:12px;padding:20px;text-align:center;margin:20px 0}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">${headerText}</h1>`,
    `<p>Hi ${e(data.recipientName)},</p>
     <div class="status-box"><p style="margin:0;font-size:15px">${statusText}</p></div>
     <div style="background:white;border-radius:8px;padding:16px;margin:16px 0">
       <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px"><span style="color:#6b7280">Contract</span><strong>${e(data.contractTitle)}</strong></div>
       <div style="padding:8px 0;font-size:14px"><span style="color:#6b7280">Job</span> <strong>${e(data.jobTitle)}</strong></div>
     </div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">${ctaText}</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.recipientName},\n\n${statusText}\n\nContract: ${data.contractTitle}\nJob: ${data.jobTitle}\n\n${data.isFullyAccepted ? 'View' : 'Sign'}: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `${headerText} - ${data.jobTitle}`, html, text };
}

export function jobStartedTemplate(
  data: JobStartedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#2563eb';
  const extra = `.info-note{background:#eff6ff;border-left:4px solid ${color};padding:12px 16px;border-radius:4px;margin-top:20px;font-size:13px;color:#1e40af}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Work Has Started</h1><p style="margin:8px 0 0;opacity:0.9">Your contractor is on the job</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has started work on "<strong>${e(data.jobTitle)}</strong>". Before photos have been uploaded and documented.</p>
     <div class="info-note"><strong>What happens next:</strong> Once the work is complete, your contractor will upload after photos. You'll be notified to review the before/after comparison and approve the work before payment is released.</div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">View Job Progress</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has started work on "${data.jobTitle}". Before photos have been documented.\n\nView progress: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `Work Started - ${data.jobTitle}`, html, text };
}

export function jobCompletedTemplate(
  data: JobCompletedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#7c3aed';
  const extra = `.review-note{background:#f5f3ff;border-left:4px solid ${color};padding:12px 16px;border-radius:4px;margin-top:20px;font-size:13px;color:#5b21b6}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Job Completed - Review Required</h1><p style="margin:8px 0 0;opacity:0.9">Your contractor has finished the work</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has completed work on "<strong>${e(data.jobTitle)}</strong>" and uploaded after photos for your review.</p>
     <div class="review-note"><strong>Action required:</strong> Please review the before and after photos using the comparison slider. If you're satisfied, approve the work to release payment. If changes are needed, you can request rework.</div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">Review Work Now</a></p>
     <p style="font-size:12px;color:#6b7280;margin-top:20px">If you don't respond within 7 days, payment will be automatically released to the contractor.</p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has completed "${data.jobTitle}". Please review the before/after photos and approve or request changes.\n\nReview: ${data.viewUrl}\n\nNote: Payment auto-releases after 7 days if no response.\n\n© ${year()} Mintenance.`;
  return {
    subject: `Review Required - ${data.jobTitle} Completed`,
    html,
    text,
  };
}

export function locationSharingTemplate(
  data: LocationSharingData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#0284c7';
  const html = emailShell(
    color,
    '',
    `<h1 style="margin:0">Contractor On The Way</h1><p style="margin:8px 0 0;opacity:0.9">Live location tracking is now available</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has enabled location sharing for "<strong>${e(data.jobTitle)}</strong>". You can now track their live location as they head to your property.</p>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">Track Location</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has enabled location sharing for "${data.jobTitle}". Track their location: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `Contractor On The Way - ${data.jobTitle}`, html, text };
}

export function workApprovedTemplate(
  data: WorkApprovedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const color = '#059669';
  const fmtAmount = `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const extra = `.amount-box{background:white;border:2px solid ${color};border-radius:12px;padding:20px;text-align:center;margin:20px 0}
    .amount{font-size:32px;font-weight:bold;color:${color}}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Work Approved - Payment Releasing</h1><p style="margin:8px 0 0;opacity:0.9">The homeowner is happy with your work</p>`,
    `<p>Hi ${data.contractorName},</p>
     <p><strong>${data.homeownerName}</strong> has approved the completed work on "<strong>${data.jobTitle}</strong>". Payment is now being released from escrow to your account.</p>
     <div class="amount-box">
       <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Payment Releasing</div>
       <div class="amount">${fmtAmount}</div>
     </div>
     <p style="text-align:center"><a href="${data.viewUrl}" class="cta">View Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} has approved your work on "${data.jobTitle}". Payment of ${fmtAmount} is being released.\n\nView: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `Work Approved - Payment Releasing for ${data.jobTitle}`,
    html,
    text,
  };
}

export function changesRequestedTemplate(
  data: ChangesRequestedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const color = '#d97706';
  const extra = `.comment-box{background:white;border-left:4px solid ${color};padding:15px;border-radius:4px;margin:20px 0}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Changes Requested</h1><p style="margin:8px 0 0;opacity:0.9">The homeowner needs some adjustments</p>`,
    `<p>Hi ${data.contractorName},</p>
     <p><strong>${data.homeownerName}</strong> has reviewed the work on "<strong>${data.jobTitle}</strong>" and is requesting some changes:</p>
     <div class="comment-box"><p style="margin:0;color:#374151;white-space:pre-wrap">${data.comments}</p></div>
     <p>The job has been reopened for rework. Once you've made the changes, upload new after photos to resubmit for review.</p>
     <p style="text-align:center"><a href="${data.viewUrl}" class="cta">View Job Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} is requesting changes on "${data.jobTitle}":\n\n"${data.comments}"\n\nThe job is reopened for rework. View: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `Changes Requested - ${data.jobTitle}`, html, text };
}

export function paymentReleasedTemplate(
  data: PaymentReleasedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const color = '#059669';
  const fmtAmount = `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const extra = `.amount-box{background:white;border:2px solid ${color};border-radius:12px;padding:20px;text-align:center;margin:20px 0}
    .amount{font-size:32px;font-weight:bold;color:${color}}
    .ref{font-size:12px;color:#6b7280;margin-top:8px}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Payment Released 🎉</h1><p style="margin:8px 0 0;opacity:0.9">Your funds are now available</p>`,
    `<p>Hi ${data.contractorName},</p>
     <p>Great news! The escrow funds for "<strong>${data.jobTitle}</strong>" have been released and are now on their way to your account.</p>
     <div class="amount-box">
       <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Amount Released</div>
       <div class="amount">${fmtAmount}</div>
       ${data.transactionId ? `<div class="ref">Ref: ${data.transactionId}</div>` : ''}
     </div>
     <p>Funds typically arrive within 1-2 business days depending on your bank. You can view the full payment breakdown in your dashboard.</p>
     <p style="text-align:center"><a href="${data.viewUrl}" class="cta">View Payment Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\nThe escrow funds for "${data.jobTitle}" have been released. ${fmtAmount} is now on its way to your account.\n\n${data.transactionId ? `Ref: ${data.transactionId}\n\n` : ''}View details: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `Payment Released - ${fmtAmount} for ${data.jobTitle}`,
    html,
    text,
  };
}
