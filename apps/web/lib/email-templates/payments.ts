/**
 * Payment email templates
 *
 * Mint Editorial voice (2026-05-21 port): factual subject lines that
 * carry the amount + counterparty name; calm body with one note and
 * one CTA. No emoji, no `🎉`, no gradient header bars.
 */
import { formatMoney } from '@/lib/utils/currency';
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
  const fmtAmount = formatMoney(data.amount);
  const credit = data.creditApplied ?? 0;
  const fundingNote =
    credit > 0
      ? `This includes ${formatMoney(data.amount - credit)} paid by you and ${formatMoney(credit)} of Mintenance credit.`
      : '';
  const subject = `${fmtAmount} held in escrow for ${data.jobTitle}.`;
  const preview = 'Your payment is held. Check the job for the current payment status.';
  const releaseNote = 'Review the work when it is ready and raise any issues from the job page. Release is subject to the review, cooling-off period and final checks.';
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>Your <strong>${fmtAmount}</strong> for <strong>${e(data.jobTitle)}</strong> is held in escrow. <strong>${e(data.contractorName)}</strong> can see that funding is confirmed.</p>
     ${fundingNote ? `<p>${e(fundingNote)}</p>` : ''}
     <div class="note">${releaseNote}</div>
     <a href="${e(data.viewUrl)}" class="cta">See payment details →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${fmtAmount} for "${data.jobTitle}" is held in escrow. ${data.contractorName} can see that funding is confirmed.\n\n${fundingNote ? `${fundingNote}\n\n` : ''}${releaseNote}\n\nView details: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function paymentReceivedTemplate(
  data: PaymentReceivedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = formatMoney(data.amount);
  const subject = `${data.homeownerName} funded ${fmtAmount} for ${data.jobTitle}.`;
  const preview = 'Funding is confirmed. Check the job to see when work can start.';
  const nextStep = 'Check the job before starting. When work can start, upload your before photos on site and select Start Job.';
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${e(data.homeownerName)}</strong> funded <strong>${fmtAmount}</strong> into escrow for <strong>${e(data.jobTitle)}</strong>.</p>
     <div class="note">${nextStep}</div>
     <a href="${e(data.viewUrl)}" class="cta">Open the job →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} funded ${fmtAmount} into escrow for "${data.jobTitle}".\n\n${nextStep}\n\nOpen the job: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function paymentReleasedTemplate(
  data: PaymentReleasedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = formatMoney(data.amount);
  const subject = `${fmtAmount} released for ${data.jobTitle}.`;
  const preview = 'Check payment details for transfer status and bank payout timing.';
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${fmtAmount}</strong> was released from escrow for <strong>${e(data.jobTitle)}</strong>. Check payment details for the current transfer and bank payout status.</p>
     ${data.transactionId ? `<p style="font-size:12px;color:#888">Ref: ${e(data.transactionId)}</p>` : ''}
     <a href="${e(data.viewUrl)}" class="cta">See breakdown →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${fmtAmount} was released from escrow for "${data.jobTitle}". Check payment details for the current transfer and bank payout status.\n\n${data.transactionId ? `Ref: ${data.transactionId}\n\n` : ''}Breakdown: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function invoiceNotificationTemplate(
  data: InvoiceNotificationData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = formatMoney(data.totalAmount);
  const formattedDue = new Date(data.dueDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const subject = `${fmtAmount} invoice for ${data.title}`;
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
     <p style="font-size:12px;color:#888">If something looks wrong, reply on the job thread before the due date.</p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.clientName},\n\n${data.contractorName} sent invoice ${data.invoiceNumber} for ${data.title}.\n\nAmount: ${fmtAmount}\nDue: ${formattedDue}\n\nReview & pay: ${data.viewUrl}\n\n\u00a9 ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
