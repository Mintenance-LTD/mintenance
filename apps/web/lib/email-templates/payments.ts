/**
 * Payment email templates
 *
 * Mint Editorial voice (2026-05-21 port): factual subject lines that
 * carry the amount + counterparty name; calm body with one note and
 * one CTA. No emoji, no `🎉`, no gradient header bars.
 */
import { escapeHtml, year, mintEmailShell } from './shared';
import type {
  PaymentConfirmationData,
  PaymentReceivedData,
  PaymentReleasedData,
  InvoiceNotificationData,
} from './types';

export function paymentConfirmationTemplate(
  data: PaymentConfirmationData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${fmtAmount} held in escrow for ${data.jobTitle}.`;
  const preview = `Your payment is safe — released to ${data.contractorName} only after you approve the work.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>Your <strong>${fmtAmount}</strong> for <strong>${e(data.jobTitle)}</strong> is now sitting in escrow. <strong>${e(data.contractorName)}</strong> can see the funds are good and will start the work.</p>
     <div class="note">We release the money to ${e(data.contractorName)} the moment you approve the finished job. If something isn't right, you flag it instead — money stays put until we sort it.</div>
     <a href="${e(data.viewUrl)}" class="cta">See payment details →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${fmtAmount} for "${data.jobTitle}" is now held in escrow. ${data.contractorName} can see the funds and will start work.\n\nWe release it the moment you approve the finished job. Flag any issue and the money stays put.\n\nView details: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function paymentReceivedTemplate(
  data: PaymentReceivedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${data.homeownerName} funded ${fmtAmount} — you're cleared to start.`;
  const preview = `Escrow is good. Upload before-photos and tap Start Job when you're on site.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${e(data.homeownerName)}</strong> has paid <strong>${fmtAmount}</strong> into escrow for <strong>${e(data.jobTitle)}</strong>. The money is locked against the job — you'll receive it once the homeowner signs off.</p>
     <div class="note"><strong>Next:</strong> Take your before-photos on site, then tap Start Job to log the time-on-tools.</div>
     <a href="${e(data.viewUrl)}" class="cta">Open the job →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} funded ${fmtAmount} into escrow for "${data.jobTitle}". You'll receive it once they sign off.\n\nNext: before-photos on site, then Start Job.\n\nOpen the job: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function paymentReleasedTemplate(
  data: PaymentReleasedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${fmtAmount} released to your account for ${data.jobTitle}.`;
  const preview = `Funds typically land in 1–2 business days. Reference inside.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p>The escrow for <strong>${e(data.jobTitle)}</strong> has released — <strong>${fmtAmount}</strong> is on its way to your account. Most banks show it within 1–2 business days.</p>
     ${data.transactionId ? `<p style="font-size:12px;color:#888">Ref: ${e(data.transactionId)}</p>` : ''}
     <a href="${e(data.viewUrl)}" class="cta">See breakdown →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${fmtAmount} for "${data.jobTitle}" has released from escrow and is on the way. Banks typically show it within 1–2 business days.\n\n${data.transactionId ? `Ref: ${data.transactionId}\n\n` : ''}Breakdown: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function invoiceNotificationTemplate(
  data: InvoiceNotificationData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = `\u00a3${data.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const formattedDue = new Date(data.dueDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const subject = `${fmtAmount} invoice \u2014 ${data.title}`;
  const preview = `${data.invoiceNumber} from ${data.contractorName} \u00b7 due ${formattedDue}.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.clientName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has sent invoice <strong>${e(data.invoiceNumber)}</strong> for <strong>${e(data.title)}</strong>:</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0">
       <tr><td style="padding:6px 0;color:#666;font-size:13px">Amount</td><td style="padding:6px 0;text-align:right;font-weight:600">${fmtAmount}</td></tr>
       <tr><td style="padding:6px 0;color:#666;font-size:13px">Due</td><td style="padding:6px 0;text-align:right;font-weight:600">${formattedDue}</td></tr>
     </table>
     <a href="${e(data.viewUrl)}" class="cta">Review &amp; pay \u2192</a>
     <p style="font-size:12px;color:#888">If something doesn't look right, reply on the job thread before the due date \u2014 easier to sort early.</p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.clientName},\n\n${data.contractorName} sent invoice ${data.invoiceNumber} for ${data.title}.\n\nAmount: ${fmtAmount}\nDue: ${formattedDue}\n\nReview & pay: ${data.viewUrl}\n\n\u00a9 ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
