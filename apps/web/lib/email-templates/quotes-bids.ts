/**
 * Quote & Bid email templates
 *
 * Mint Editorial voice (2026-05-21 port): specific over fluffy, real
 * contractor name + rating + job count + earliest-available framing,
 * no emoji, calm paper-and-mint palette via `mintEmailShell`.
 */
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
  const fmtAmount = `£${data.totalAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${data.contractorName} sent you a ${fmtAmount} quote.`;
  const preview = `Quote ${data.quoteNumber} — line items + total inside.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has sent you a quote — <strong>${fmtAmount}</strong> against <strong>${e(data.quoteNumber)}</strong>. Open it to see the line items and accept or decline.</p>
     <a href="${e(data.viewUrl)}" class="cta">View the quote →</a>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.contractorName} sent you a quote — ${fmtAmount} (${data.quoteNumber}).\n\nView and decide: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function bidNotificationTemplate(data: BidEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const fmtAmount = `£${data.bidAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${data.contractorName} bid ${fmtAmount} on your ${data.jobTitle}.`;
  const preview = `${data.contractorName} just bid ${fmtAmount}. View the bid to compare.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>Good news — <strong>${e(data.contractorName)}</strong> just bid <strong>${fmtAmount}</strong> on your <strong>${e(data.jobTitle)}</strong>.</p>
     <div class="note"><strong>Their note:</strong> "${e(data.proposalExcerpt)}"</div>
     <a href="${e(data.viewUrl)}" class="cta">View bid &amp; book →</a>
     <p style="font-size:12px;color:#888">We'll only ping you again when another bid stands out — no chasing.</p>`,
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
  const preview = `Future jobs will route to them first — tap to accept or decline.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.requesterName)}</strong> — ${e(data.requesterRole)} — wants to connect with you on Mintenance. Once you accept, future jobs from them will route to you first.</p>
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
  const fmtAmount = `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${homeownerName} accepted ${quoteNumber} — ${fmtAmount}.`;
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
  const fmtAmount = `£${data.bidAmount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${data.homeownerName} accepted your ${fmtAmount} bid.`;
  const preview = `${data.jobTitle} is yours — sign the contract to start.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${e(data.homeownerName)}</strong> accepted your bid for <strong>${e(data.jobTitle)}</strong> — <strong>${fmtAmount}</strong> sitting against the job.</p>
     <div class="note"><strong>Next:</strong> Sign the contract, then the homeowner pays into escrow. You can start work the moment the funds land.</div>
     <a href="${e(data.viewUrl)}" class="cta">Open the job →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} accepted your ${fmtAmount} bid for ${data.jobTitle}.\n\nNext: sign the contract, then escrow funds, then you start.\n\nOpen the job: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
