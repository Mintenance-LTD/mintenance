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
import { escapeHtml, year, mintEmailShell, MINT_BRAND_GREEN } from './shared';
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
  const subject = `${data.contractorName} has started work on ${data.jobTitle}.`;
  const preview = `Before-photos are filed. You'll get the after-photos to approve once it's done.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> is on the job — before-photos are filed in the job thread, so there's a clean record of what was there.</p>
     <div class="note">When the work's done, you'll get the after-photos with a slider to compare. Approve the work and we release the funds.</div>
     <a href="${e(data.viewUrl)}" class="cta">See progress →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has started work on "${data.jobTitle}". Before-photos are filed.\n\nWhen the work's done you'll get after-photos to compare and approve.\n\nProgress: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
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
  const subject = `${data.contractorName} is on the way.`;
  const preview = `Live location for ${data.jobTitle} — open the job to follow them in.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> is heading over for <strong>${e(data.jobTitle)}</strong>. They've shared their location so you can see when they'll arrive.</p>
     <a href="${e(data.viewUrl)}" class="cta">Open the job →</a>
     <p style="font-size:12px;color:#888">Location sharing stops automatically when they arrive on-site.</p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} is on the way to "${data.jobTitle}" and is sharing their live location.\n\nOpen the job: ${data.viewUrl}\n\nLocation sharing stops when they arrive.\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function workApprovedTemplate(
  data: WorkApprovedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const fmtAmount = `£${data.amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const subject = `${data.homeownerName} signed off — ${fmtAmount} releasing.`;
  const preview = `${data.jobTitle} approved. Funds typically land in 1–2 business days.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${e(data.homeownerName)}</strong> approved the work on <strong>${e(data.jobTitle)}</strong>. Your <strong>${fmtAmount}</strong> is releasing from escrow now.</p>
     <div class="note">Funds typically reach your bank in 1–2 business days. You'll get a second email with the full receipt once Stripe confirms the transfer.</div>
     <a href="${e(data.viewUrl)}" class="cta">See breakdown →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} signed off on "${data.jobTitle}". ${fmtAmount} is releasing from escrow — typically lands in 1–2 business days.\n\nBreakdown: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function changesRequestedTemplate(
  data: ChangesRequestedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const subject = `${data.jobTitle} — ${data.homeownerName} asked for a tweak.`;
  const preview = `Their note is inside. The job's reopened — upload new after-photos when ready.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${e(data.homeownerName)}</strong> has reviewed <strong>${e(data.jobTitle)}</strong> and asked for a tweak before they sign off:</p>
     <div class="note" style="white-space:pre-wrap">${e(data.comments)}</div>
     <p>The job's reopened. Make the change, upload new after-photos, and they'll get the review email again.</p>
     <a href="${e(data.viewUrl)}" class="cta">Open the job →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} asked for a tweak on "${data.jobTitle}":\n\n"${data.comments}"\n\nThe job's reopened. Upload new after-photos when ready.\n\nOpen the job: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
