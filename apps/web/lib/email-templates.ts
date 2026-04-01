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
  return `
    body{margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#1f2937;-webkit-font-smoothing:antialiased}
    .wrapper{width:100%;background-color:#f3f4f6;padding:40px 0}
    .container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)}
    .logo-bar{padding:20px 30px;text-align:left;background:#ffffff;border-bottom:1px solid #e5e7eb}
    .logo-text{font-size:22px;font-weight:800;color:#0d9488;text-decoration:none;letter-spacing:-0.5px}
    .header{background:linear-gradient(135deg,${headerColor} 0%,${headerColor}dd 100%);color:white;padding:32px 30px;text-align:left}
    .header h1{margin:0;font-size:24px;font-weight:700;letter-spacing:-0.3px}
    .header p{margin:8px 0 0;opacity:0.85;font-size:15px}
    .content{padding:32px 30px;background:#ffffff}
    .content p{margin:0 0 16px;font-size:15px;color:#374151}
    .cta{display:inline-block;background-color:${headerColor};color:#ffffff !important;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-top:8px;text-align:center}
    .footer-wrap{padding:24px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center}
    .footer-wrap p{margin:4px 0;font-size:12px;color:#9ca3af}
    .footer-wrap a{color:#6b7280;text-decoration:underline}
    ${extraCSS}`;
}

/** Wrap content in the standard email shell with Mintenance branding */
function emailShell(
  headerColor: string,
  extraCSS: string,
  headerHtml: string,
  bodyHtml: string,
  footer: string
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCSS(headerColor, extraCSS)}</style></head><body>
  <div class="wrapper">
    <div class="container">
      <div class="logo-bar"><a href="https://mintenance.co.uk" class="logo-text">Mintenance</a></div>
      <div class="header">${headerHtml}</div>
      <div class="content">${bodyHtml}</div>
      <div class="footer-wrap">${footer}</div>
    </div>
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
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
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
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
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
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
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
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
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
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
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
  const extra = `.message-box{background:#f0fdfa;border-left:4px solid ${color};padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0}
    .sender-badge{display:inline-block;background:#e0f2fe;color:#0369a1;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;margin-bottom:12px}
    .job-ref{font-size:13px;color:#6b7280;margin-top:4px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Message</h1><p>You have a new message on Mintenance</p>`,
    `<p>Hi ${e(data.recipientName)},</p>
     <div class="sender-badge">${e(data.senderName)}</div>
     <p style="margin-bottom:4px"><strong>${e(data.senderName)}</strong> sent you a message about:</p>
     <p class="job-ref" style="margin-top:0"><strong>${e(data.jobTitle)}</strong></p>
     <div class="message-box"><p style="margin:0;color:#374151;font-style:italic;white-space:pre-wrap">${e(data.messagePreview)}</p></div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">Reply Now</a></p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
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

export function newsletterWelcomeTemplate(
  email: string
): { subject: string; html: string; text: string } {
  const color = '#0d9488';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.co.uk';
  const extra = `.feature-grid{margin:20px 0}
    .feature-item{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6}
    .feature-item:last-child{border-bottom:none}
    .feature-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .feature-label{font-weight:600;color:#1f2937;font-size:14px}
    .feature-desc{color:#6b7280;font-size:13px;margin-top:2px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>Welcome to Mintenance</h1><p>You're on the list!</p>`,
    `<p>Hi there,</p>
     <p>Thanks for subscribing to the Mintenance newsletter. You'll be the first to hear about:</p>
     <div class="feature-grid">
       <div class="feature-item">
         <div class="feature-icon" style="background:#f0fdfa;color:#0d9488">&#9889;</div>
         <div><div class="feature-label">New Platform Features</div><div class="feature-desc">Be the first to know about updates</div></div>
       </div>
       <div class="feature-item">
         <div class="feature-icon" style="background:#fef3c7;color:#d97706">&#128161;</div>
         <div><div class="feature-label">Tips &amp; Guides</div><div class="feature-desc">Expert advice for homeowners &amp; contractors</div></div>
       </div>
       <div class="feature-item">
         <div class="feature-icon" style="background:#ede9fe;color:#7c3aed">&#128200;</div>
         <div><div class="feature-label">Industry Insights</div><div class="feature-desc">Trends and data from the UK trades sector</div></div>
       </div>
     </div>
     <p>In the meantime, explore what Mintenance can do for you:</p>
     <p style="text-align:center"><a href="${baseUrl}/try-mint-ai" class="cta">Try AI Assessment</a></p>
     <p style="margin-top:16px;text-align:center"><a href="${baseUrl}/discover" style="color:${color};font-weight:600;font-size:14px">Browse Contractors &rarr;</a></p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>
     <p><a href="${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p>`
  );
  const text = `Welcome to Mintenance!\n\nThanks for subscribing. You'll be the first to hear about new features, tips, and industry insights.\n\nTry our AI assessment: ${baseUrl}/try-mint-ai\nBrowse contractors: ${baseUrl}/discover\n\n© ${year()} Mintenance.`;
  return {
    subject: 'Welcome to Mintenance - You\'re on the list!',
    html,
    text,
  };
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
