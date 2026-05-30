/**
 * Contract email templates
 *
 * Mint Editorial voice (2026-05-21 port): contracts are an emotionally
 * loaded moment — homeowner is asked to sign a real payment commitment.
 * Tone is calm, names the protection up-front, no marketing language.
 */
import { escapeHtml, year, mintEmailShell } from './shared';
import type { ContractNotificationData, ContractSignedData } from './types';

export function contractNotificationTemplate(data: ContractNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const fmtAmount = `£${data.contractAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${data.contractorName} sent a ${fmtAmount} contract for ${data.jobTitle}.`;
  const preview = `Review and sign — payment stays in escrow until you approve the finished work.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has sent a contract for <strong>${e(data.jobTitle)}</strong> at <strong>${fmtAmount}</strong>. Once you sign, the money moves into escrow — they don't see a penny until you approve the finished work.</p>
     <a href="${e(data.viewUrl)}" class="cta">Review &amp; sign →</a>
     <p style="font-size:12px;color:#888">No payment leaves your account at signing — that happens at the escrow step, after you've read the contract.</p>`,
    `<p>Mintenance · Home, taken care of.</p>
     <p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} sent a ${fmtAmount} contract for "${data.jobTitle}".\n\nOnce you sign, the money goes into escrow — they don't see it until you approve the finished work.\n\nReview & sign: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function contractSignedTemplate(
  data: ContractSignedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const subject = data.isFullyAccepted
    ? `${data.contractTitle} — both sides signed.`
    : `${data.signerName} signed ${data.contractTitle} — your turn.`;
  const preview = data.isFullyAccepted
    ? `Contract's live. Escrow funding is the next step.`
    : `Two-minute read, one tap to sign. Money only moves once you approve the finished work.`;
  const body = data.isFullyAccepted
    ? `<p>Hi ${e(data.recipientName)},</p>
       <p>Both parties have signed <strong>${e(data.contractTitle)}</strong> for <strong>${e(data.jobTitle)}</strong> — the contract is live.</p>
       <div class="note">Next: payment moves into escrow. The contractor sees the funds are good and starts work; you approve at the end to release them.</div>
       <a href="${e(data.viewUrl)}" class="cta">Open the contract →</a>`
    : `<p>Hi ${e(data.recipientName)},</p>
       <p><strong>${e(data.signerName)}</strong> has signed <strong>${e(data.contractTitle)}</strong>. It's a two-minute read; your signature is the last step before this becomes binding.</p>
       <div class="note">Signing doesn't move any money — that only happens at the escrow step, and only the moment you confirm.</div>
       <a href="${e(data.viewUrl)}" class="cta">Review &amp; sign →</a>`;
  const html = mintEmailShell(subject, preview, body, unsubscribeFooter);
  const text = data.isFullyAccepted
    ? `Hi ${data.recipientName},\n\nBoth sides signed "${data.contractTitle}" for "${data.jobTitle}". The contract is live.\n\nNext: escrow funding.\n\nView: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`
    : `Hi ${data.recipientName},\n\n${data.signerName} signed "${data.contractTitle}". Your signature is next.\n\nNo money moves at signing — that happens at the escrow step.\n\nReview & sign: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
