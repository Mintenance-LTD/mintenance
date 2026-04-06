/**
 * Job lifecycle email templates
 */
import { escapeHtml, year, emailShell } from './shared';
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
  const color = '#7c3aed';
  const extra = `.review-note{background:#f5f3ff;border-left:4px solid ${color};padding:12px 16px;border-radius:4px;margin-top:20px;font-size:13px;color:#5b21b6}`;
  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Job Completed - Review Required</h1><p style="margin:8px 0 0;opacity:0.9">Your contractor has finished the work</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p><strong>${e(data.contractorName)}</strong> has completed work on "<strong>${e(data.jobTitle)}</strong>" and uploaded after photos for your review.</p>
     <div class="review-note"><strong>Action required:</strong> Please review the before and after photos using the comparison slider. If you're satisfied, approve the work to release payment. If changes are needed, you can request rework.</div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">Review Work Now</a></p>
     <p style="font-size:12px;color:#6b7280;margin-top:20px">If you don't respond within 7 days, payment will be automatically released to the contractor.</p>`,
    unsubscribeFooter
  );
  const text = `Hi ${data.homeownerName},\n\n${data.contractorName} has completed "${data.jobTitle}". Please review the before/after photos and approve or request changes.\n\nReview: ${data.viewUrl}\n\nNote: Payment auto-releases after 7 days if no response.\n\n© ${year()} Mintenance.`;
  return {
    subject: `Review Required - ${data.jobTitle} Completed`,
    html,
    text,
  };
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
