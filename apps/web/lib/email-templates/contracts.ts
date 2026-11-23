/**
 * Contract email templates
 *
 * Mint Editorial voice (2026-05-21 port): contracts are an emotionally
 * loaded moment — homeowner is asked to sign a real payment commitment.
 * Tone is calm, names the protection up-front, no marketing language.
 */
import { formatMoney } from '@/lib/utils/currency';
import { escapeHtml, year, mintEmailShell } from './shared';
import type { ContractNotificationData, ContractSignedData } from './types';

export function contractNotificationTemplate(data: ContractNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const fmtAmount = formatMoney(data.contractAmount);
  const subject = `${data.contractorName} sent a ${fmtAmount} contract for ${data.jobTitle}.`;
  const preview = 'Review the agreement. Funding is a separate step after both parties sign.';
  const funding = 'Signing does not charge your account. After both parties sign, the payer can fund Protected Payment from the job page.';
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has sent a contract for <strong>${e(data.jobTitle)}</strong> at <strong>${fmtAmount}</strong>.</p>
     <p>${funding}</p>
     <a href="${e(data.viewUrl)}" class="cta">Review &amp; sign →</a>`,
    `<p>Mintenance · Home, taken care of.</p>
     <p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} sent a ${fmtAmount} contract for "${data.jobTitle}".\n\n${funding}\n\nReview & sign: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function contractSignedTemplate(
  data: ContractSignedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const subject = data.isFullyAccepted
    ? `Both parties signed: ${data.contractTitle}`
    : `${data.signerName} signed ${data.contractTitle}. Your signature is next.`;
  const preview = data.isFullyAccepted
    ? 'The agreement is signed. Check the job for the funding and start status.'
    : 'Review the agreement and sign when you are ready.';
  const nextStep = data.isFullyAccepted
    ? {
        contractor: 'The payer can now fund Protected Payment. Check the job for funding and confirmation that work can start.',
        homeowner: 'The designated payer can now fund Protected Payment. Check the job for the current payment status.',
        payer: 'You can now fund Protected Payment from the job page. Funds are held until the release checks are complete.',
      }[data.recipientRole]
    : 'Signing does not move any money. Funding is a separate step after both parties sign.';
  const jobContext = data.jobTitle !== data.contractTitle ? ` for ${data.jobTitle}` : '';
  const body = data.isFullyAccepted
    ? `<p>Hi ${e(data.recipientName)},</p>
       <p>Both parties have signed <strong>${e(data.contractTitle)}</strong>${e(jobContext)}.</p>
       <div class="note">${nextStep}</div>
       <a href="${e(data.viewUrl)}" class="cta">Open the contract →</a>`
    : `<p>Hi ${e(data.recipientName)},</p>
       <p><strong>${e(data.signerName)}</strong> has signed <strong>${e(data.contractTitle)}</strong>. Read the agreement and sign when you are ready.</p>
       <div class="note">${nextStep}</div>
       <a href="${e(data.viewUrl)}" class="cta">Review &amp; sign →</a>`;
  const html = mintEmailShell(subject, preview, body, unsubscribeFooter);
  const text = data.isFullyAccepted
    ? `Hi ${data.recipientName},\n\nBoth parties signed "${data.contractTitle}"${jobContext}.\n\n${nextStep}\n\nView: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`
    : `Hi ${data.recipientName},\n\n${data.signerName} signed "${data.contractTitle}". Your signature is next.\n\n${nextStep}\n\nReview & sign: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
