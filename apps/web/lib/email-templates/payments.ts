/**
 * Payment email templates
 */
import { escapeHtml, year, emailShell } from './shared';
import type {
  PaymentConfirmationData,
  PaymentReceivedData,
  PaymentReleasedData,
} from './types';

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
