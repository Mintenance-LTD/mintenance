/**
 * Quote & Bid email templates
 *
 * Mint Editorial voice (2026-05-21 port): specific over fluffy, real
 * contractor name + rating + job count + earliest-available framing,
 * no emoji, calm paper-and-mint palette via `mintEmailShell`.
 */
import { formatMoney } from '@/lib/utils/currency';
import { escapeHtml, year, mintEmailShell } from './shared';
import type {
  QuoteEmailData,
  BidEmailData,
  ConnectionRequestEmailData,
  BidAcceptedData,
} from './types';

export function quoteNotificationTemplate(data: QuoteEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const fmtAmount = formatMoney(data.totalAmount);
  const subject = `${data.contractorName} sent you a ${fmtAmount} quote.`;
  const preview = `See the line items and total for quote ${data.quoteNumber}.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.contractorName)}</strong> sent quote <strong>${e(data.quoteNumber)}</strong> for <strong>${fmtAmount}</strong>. Open it to see the line items and accept or decline.</p>
     <a href="${e(data.viewUrl)}" class="cta">View the quote →</a>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.contractorName} sent quote ${data.quoteNumber} for ${fmtAmount}.\n\nView and decide: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function bidNotificationTemplate(data: BidEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const fmtAmount = formatMoney(data.bidAmount);
  const subject = `${data.contractorName} bid ${fmtAmount} on your ${data.jobTitle}.`;
  const preview = `${data.contractorName} just bid ${fmtAmount}. View the bid to compare.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> bid <strong>${fmtAmount}</strong> on your job <strong>${e(data.jobTitle)}</strong>.</p>
     <div class="note"><strong>Their note:</strong> "${e(data.proposalExcerpt)}"</div>
     <a href="${e(data.viewUrl)}" class="cta">View bid &amp; book →</a>
     <p style="font-size:12px;color:#888">We'll only notify you again when another bid stands out.</p>`,
    `<p>Mintenance · Home, taken care of.</p>
     <p><a href="https://mintenance.co.uk/settings/notifications">Notification preferences</a></p>
     <p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} just bid ${fmtAmount} on your ${data.jobTitle}.\n\nTheir note: "${data.proposalExcerpt}"\n\nView the bid: ${data.viewUrl}\n\nWe'll only ping you again when another bid stands out.\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function connectionRequestTemplate(data: ConnectionRequestEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const subject = `${data.requesterName} (${data.requesterRole}) wants to connect.`;
  const preview = 'Open the connection request to accept or decline.';
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.requesterName)}</strong> (${e(data.requesterRole)}) wants to connect with you on Mintenance. Once you accept, future jobs from them will route to you first.</p>
     <a href="${e(data.acceptUrl)}" class="cta">View the request →</a>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.requesterName} (${data.requesterRole}) wants to connect with you on Mintenance. Once you accept, future jobs from them will route to you first.\n\nView: ${data.acceptUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function quoteAcceptedTemplate(
  homeownerName: string,
  quoteNumber: string,
  amount: number
): { subject: string; html: string } {
  const e = escapeHtml;
  const fmtAmount = formatMoney(amount);
  const subject = `${homeownerName} accepted quote ${quoteNumber} for ${fmtAmount}.`;
  const preview = `Confirm the start date and you're on.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p><strong>${e(homeownerName)}</strong> accepted your quote <strong>${e(quoteNumber)}</strong> for <strong>${fmtAmount}</strong>.</p>
     <p>Open your dashboard to confirm the start date and coordinate the next steps.</p>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  return { subject, html };
}

export function bidAcceptedTemplate(
  data: BidAcceptedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = formatMoney(data.bidAmount);
  const subject = `${data.homeownerName} accepted your ${fmtAmount} bid.`;
  const preview = `Your bid for ${data.jobTitle} was accepted. Review the agreement next.`;
  const nextStep = 'Review and sign the agreement. Once both parties sign, the payer can fund Protected Payment. Check the job to see when work can start.';
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${e(data.homeownerName)}</strong> accepted your <strong>${fmtAmount}</strong> bid for <strong>${e(data.jobTitle)}</strong>.</p>
     <div class="note">${nextStep}</div>
     <a href="${e(data.viewUrl)}" class="cta">Open the job →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} accepted your ${fmtAmount} bid for ${data.jobTitle}.\n\n${nextStep}\n\nOpen the job: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
