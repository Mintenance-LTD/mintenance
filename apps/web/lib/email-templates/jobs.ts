/**
 * Job lifecycle email templates
 *
 * Mint Editorial voice (2026-05-21 port): the `jobCompletedTemplate`
 * doubles as the review-nudge — when a contractor uploads after-photos
 * the homeowner gets this email with five one-tap star buttons that
 * land them on the review page with rating pre-selected.
 */
import { formatMoney } from '@/lib/utils/currency';
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
     <p><strong>${e(data.contractorName)}</strong> has started the job. The before photos are in the job thread.</p>
     <div class="note">When the work is done, compare the before and after photos. Payment release is subject to the review, cooling-off period and final checks.</div>
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
  const fmtAmount =
    typeof data.amount === 'number'
      ? formatMoney(data.amount)
      : null;

  // One-tap star picker. Each star is a separate anchor that lands the
  // homeowner on the review page with `?stars=N` so the rating is
  // pre-selected. Inline styles only — every mail client strips
  // ::before/::after pseudo-elements.
  const starBtn = (n: number) => `
    <a href="${e(data.viewUrl)}?stars=${n}" style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;background:${MINT_BRAND_GREEN};color:#fff;border-radius:8px;text-decoration:none;font-size:18px;margin:0 4px">★</a>`;
  const starsRow = [1, 2, 3, 4, 5].map(starBtn).join('');

  const subject = `How did ${data.contractorName} do?`;
  const preview = 'Review the completed work, evidence and payment timeline.';
  const reviewNote = 'Open the job for your review deadline. If you take no action, the work may be approved automatically. Payment release still depends on the cooling-off period and final checks.';

  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p><p><strong>${e(data.contractorName)}</strong> marked <strong>${e(data.jobTitle)}</strong> complete. ${
      fmtAmount
        ? `<strong>${fmtAmount}</strong> is held in escrow.`
        : `Payment is held in escrow.`
    }</p>
     <p>Review the work and leave a rating for <strong>${e(data.contractorName)}</strong>.</p>
     <div style="text-align:center;margin:18px 0">${starsRow}</div>
     <a href="${e(data.viewUrl)}" class="cta">Open the review →</a>
     <p style="font-size:12px;color:#888">${reviewNote}</p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} marked "${data.jobTitle}" complete. ${fmtAmount ?? 'Payment'} is held in escrow.\n\nReview the work: ${data.viewUrl}\n\n${reviewNote}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function locationSharingTemplate(
  data: LocationSharingData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const subject = `${data.contractorName} is on the way.`;
  const preview = `Open ${data.jobTitle} to see the contractor's live location.`;
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
  const fmtAmount = formatMoney(data.amount);
  const subject = `${data.homeownerName} approved ${data.jobTitle}.`;
  const preview =
    'Work approved. Payment release is subject to the cooling-off period and final checks.';
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p><strong>${e(data.homeownerName)}</strong> approved the work on <strong>${e(data.jobTitle)}</strong>. The escrow amount is <strong>${fmtAmount}</strong>.</p>
     <div class="note">Payment release is subject to the cooling-off period and final checks. Approval does not confirm that a transfer has been sent. Check the job for the current payment status.</div>
     <a href="${e(data.viewUrl)}" class="cta">See breakdown →</a>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.contractorName},\n\n${data.homeownerName} approved "${data.jobTitle}". The escrow amount is ${fmtAmount}. Payment release is subject to the cooling-off period and final checks. Approval does not confirm that a transfer has been sent.\n\nPayment status: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function changesRequestedTemplate(
  data: ChangesRequestedData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const subject = `${data.homeownerName} requested changes to ${data.jobTitle}.`;
  const preview = 'Read their note and upload new after photos when the changes are ready.';
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
