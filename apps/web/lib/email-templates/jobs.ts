/**
 * Job lifecycle email templates
 *
 * Mint Editorial voice (2026-05-21 port): the `jobCompletedTemplate`
 * doubles as the review-nudge — when a contractor uploads after-photos
 * the homeowner gets this email with five one-tap star buttons that
 * land them on the review page with rating pre-selected. The 7-day
 * auto-release SLA is called out explicitly so the homeowner knows
 * inaction is fine.
 */
import {
  escapeHtml,
  year,
  emailShell,
  mintEmailShell,
  MINT_BRAND_GREEN,
} from './shared';
import type {
  JobStartedData,
  JobCompletedData,
  LocationSharingData,
  WorkApprovedData,
  ChangesRequestedData,
} from './types';

export function jobStartedTemplate(
  data: JobStartedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#2563eb';
  const extra = `.info-note{background:#eff6ff;border-left:4px solid ${color};padding:12px 16px;border-radius:4px;margin-top:20px;font-size:13px;color:#1e40af}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Work Has Started</h1><p style="margin:8px 0 0;opacity:0.9">Your contractor is on the job</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has started work on "<strong>${e(data.jobTitle)}</strong>". Before photos have been uploaded and documented.</p>
     <div class="info-note"><strong>What happens next:</strong> Once the work is complete, your contractor will upload after photos. You'll be notified to review the before/after comparison and approve the work before payment is released.</div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">View Job Progress</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has started work on "${data.jobTitle}". Before photos have been documented.\n\nView progress: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `Work Started - ${data.jobTitle}`, html, text };
}

export function jobCompletedTemplate(
  data: JobCompletedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const slaDays = data.autoReleaseDays ?? 7;
  const fmtAmount =
    typeof data.amount === 'number'
      ? `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
      : null;

  // One-tap star picker. Each star is a separate anchor that lands the
  // homeowner on the review page with `?stars=N` so the rating is
  // pre-selected. Inline styles only — every mail client strips
  // ::before/::after pseudo-elements.
  const starBtn = (n: number) => `
    <a href="${e(data.viewUrl)}?stars=${n}" style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;background:${MINT_BRAND_GREEN};color:#fff;border-radius:8px;text-decoration:none;font-size:18px;margin:0 4px">★</a>`;
  const starsRow = [1, 2, 3, 4, 5].map(starBtn).join('');

  const subject = `How did ${data.contractorName} do?`;
  const preview = fmtAmount
    ? `One tap to release ${fmtAmount} to ${data.contractorName} →`
    : `One tap to release payment to ${data.contractorName} →`;

  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)} — your <strong>${e(data.jobTitle)}</strong> is done. ${
      fmtAmount
        ? `<strong>${fmtAmount}</strong> is sitting in escrow waiting for you to release it.`
        : `Payment is sitting in escrow waiting for you to release it.`
    }</p>
     <p>Two taps to leave a review and pay <strong>${e(data.contractorName)}</strong>:</p>
     <div style="text-align:center;margin:18px 0">${starsRow}</div>
     <a href="${e(data.viewUrl)}" class="cta">Open the review →</a>
     <p style="font-size:12px;color:#888">If you don't act within ${slaDays} days, we release automatically — fair to ${e(data.contractorName)}, no chasing for you.</p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName} — your ${data.jobTitle} is done. ${fmtAmount ? `${fmtAmount} ` : ''}is sitting in escrow waiting for you to release it.\n\nLeave a review and release: ${data.viewUrl}\n\nIf you don't act within ${slaDays} days, we release automatically.\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function locationSharingTemplate(
  data: LocationSharingData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#0284c7';
  const html = emailShell(
    color,
    '',
    `<h1 style="margin:0">Contractor On The Way</h1><p style="margin:8px 0 0;opacity:0.9">Live location tracking is now available</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has enabled location sharing for "<strong>${e(data.jobTitle)}</strong>". You can now track their live location as they head to your property.</p>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">Track Location</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has enabled location sharing for "${data.jobTitle}". Track their location: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `Contractor On The Way - ${data.jobTitle}`, html, text };
}

export function workApprovedTemplate(
  data: WorkApprovedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const color = '#059669';
  const fmtAmount = `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const extra = `.amount-box{background:white;border:2px solid ${color};border-radius:12px;padding:20px;text-align:center;margin:20px 0}
    .amount{font-size:32px;font-weight:bold;color:${color}}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Work Approved - Payment Releasing</h1><p style="margin:8px 0 0;opacity:0.9">The homeowner is happy with your work</p>`,
    `<p>Hi ${data.contractorName},</p>
     <p><strong>${data.homeownerName}</strong> has approved the completed work on "<strong>${data.jobTitle}</strong>". Payment is now being released from escrow to your account.</p>
     <div class="amount-box">
       <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:4px">Payment Releasing</div>
       <div class="amount">${fmtAmount}</div>
     </div>
     <p style="text-align:center"><a href="${data.viewUrl}" class="cta">View Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} has approved your work on "${data.jobTitle}". Payment of ${fmtAmount} is being released.\n\nView: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `Work Approved - Payment Releasing for ${data.jobTitle}`,
    html,
    text,
  };
}

export function changesRequestedTemplate(
  data: ChangesRequestedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const color = '#d97706';
  const extra = `.comment-box{background:white;border-left:4px solid ${color};padding:15px;border-radius:4px;margin:20px 0}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Changes Requested</h1><p style="margin:8px 0 0;opacity:0.9">The homeowner needs some adjustments</p>`,
    `<p>Hi ${data.contractorName},</p>
     <p><strong>${data.homeownerName}</strong> has reviewed the work on "<strong>${data.jobTitle}</strong>" and is requesting some changes:</p>
     <div class="comment-box"><p style="margin:0;color:#374151;white-space:pre-wrap">${data.comments}</p></div>
     <p>The job has been reopened for rework. Once you've made the changes, upload new after photos to resubmit for review.</p>
     <p style="text-align:center"><a href="${data.viewUrl}" class="cta">View Job Details</a></p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} is requesting changes on "${data.jobTitle}":\n\n"${data.comments}"\n\nThe job is reopened for rework. View: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return { subject: `Changes Requested - ${data.jobTitle}`, html, text };
}
