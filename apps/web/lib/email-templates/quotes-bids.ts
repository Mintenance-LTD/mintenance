/**
 * Quote & Bid email templates
 *
 * Mint Editorial voice (2026-05-21 port): specific over fluffy, real
 * contractor name + rating + job count + earliest-available framing,
 * no emoji, calm paper-and-mint palette via `mintEmailShell`.
 */
import { escapeHtml, year, emailShell, mintEmailShell } from './shared';
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
  const color = '#2563eb';
  const extra = `.button{display:inline-block;background-color:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:20px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Quote Received</h1>`,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has sent you a new quote.</p>
     <p><strong>Quote Number:</strong> ${e(data.quoteNumber)}</p>
     <p><strong>Total Amount:</strong> £${data.totalAmount.toFixed(2)}</p>
     <a href="${e(data.viewUrl)}" class="button">View Quote</a>
     <p style="margin-top:30px">Log in to your Mintenance account to review the full details and accept or decline the quote.</p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.contractorName} has sent you a new quote.\n\nQuote Number: ${data.quoteNumber}\nTotal Amount: £${data.totalAmount.toFixed(2)}\n\nView your quote here: ${data.viewUrl}\n\nLog in to review the full details and accept or decline the quote.\n\n© ${year()} Mintenance.`;
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
     <p><strong>${e(homeownerName)}</strong> has accepted your quote <strong>${e(quoteNumber)}</strong> for <strong>£${amount.toFixed(2)}</strong>.</p>
     <p>Log in to your Mintenance account to coordinate the next steps with your client.</p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
  );
  return { subject: `Quote Accepted - ${quoteNumber}`, html };
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
