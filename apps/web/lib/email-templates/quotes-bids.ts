/**
 * Quote & Bid email templates
 */
import { escapeHtml, year, emailShell } from './shared';
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
  const color = '#10b981';
  const extra = `.button{display:inline-block;background-color:${color};color:white;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:20px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Bid on Your Job</h1>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has submitted a bid for your job: <strong>${e(data.jobTitle)}</strong></p>
     <p><strong>Bid Amount:</strong> £${data.bidAmount.toFixed(2)}</p>
     <p><strong>Proposal Preview:</strong></p>
     <p style="background:white;padding:15px;border-left:4px solid ${color};margin:15px 0">${e(data.proposalExcerpt)}...</p>
     <a href="${e(data.viewUrl)}" class="button">View Full Bid</a>
     <p style="margin-top:30px">Review the contractor's full proposal, ratings, and past work to make an informed decision.</p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has submitted a bid for your job: ${data.jobTitle}\n\nBid Amount: £${data.bidAmount.toFixed(2)}\n\nProposal Preview:\n${data.proposalExcerpt}...\n\nView the full bid here: ${data.viewUrl}\n\nReview the contractor's full proposal, ratings, and past work.\n\n© ${year()} Mintenance.`;
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
