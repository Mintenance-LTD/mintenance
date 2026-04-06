/**
 * Contract email templates
 */
import { escapeHtml, year, emailShell } from './shared';
import type { ContractNotificationData, ContractSignedData } from './types';

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
