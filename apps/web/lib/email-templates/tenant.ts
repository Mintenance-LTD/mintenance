/**
 * Tenant email templates
 *
 * Mint Editorial voice (2026-05-21 port): tenants are the most
 * unfamiliar audience — keep promises concrete (what they can do)
 * and reassure that the landlord pays.
 */
import { escapeHtml, year, mintEmailShell } from './shared';
import type { TenantInviteData } from './types';

export function tenantInviteTemplate(data: TenantInviteData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const subject = `${data.landlordName} invited you to Mintenance.`;
  const preview = `Link your verified account to ${data.propertyAddress}.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.tenantName)},</p>
     <p><strong>${e(data.landlordName)}</strong> added you as a tenant at <strong>${e(data.propertyAddress)}</strong>. Accept this invitation to:</p>
     <ul style="color:#333;padding-left:20px;line-height:1.9">
       <li>Link your verified email to this property</li>
       <li>View your linked property details</li>
       <li>Confirm your account to your property manager</li>
     </ul>
     <div class="note">For maintenance requests, ask your property manager for their reporting link or use your usual contact channel.</div>
     <a href="${e(data.inviteUrl)}" class="cta">Accept invitation →</a>
     <p style="font-size:12px;color:#888">This link is unique to you. If you weren't expecting it, just ignore it.</p>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.tenantName},\n\n${data.landlordName} added you as a tenant at ${data.propertyAddress} on Mintenance.\n\nUse your invited email address, verify it, and accept to view your linked property details. For maintenance requests, ask your property manager for their reporting link or use your usual contact channel.\n\nAccept: ${data.inviteUrl}\n\nIf you weren't expecting this, ignore it.\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}

export function tenantJobNotificationTemplate(data: {
  tenantName: string;
  propertyAddress: string;
  jobTitle: string;
  status: string;
  viewUrl: string;
}): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const statusLine: Record<string, string> = {
    assigned: `Your landlord found someone for "${data.jobTitle}" — they'll be in touch about timing.`,
    in_progress: `Work has started on "${data.jobTitle}". You'll get an update when it's done.`,
    completed: `"${data.jobTitle}" is done. Anything not right? Reply on the job thread and we'll sort it.`,
  };
  const statusSubject: Record<string, string> = {
    assigned: `Contractor assigned for ${data.jobTitle}`,
    in_progress: `Work has started on ${data.jobTitle}`,
    completed: `${data.jobTitle} is done`,
  };
  const subject = statusSubject[data.status] || `${data.jobTitle} — update`;
  const message =
    statusLine[data.status] ||
    `Status updated to ${data.status} on "${data.jobTitle}".`;
  const html = mintEmailShell(
    subject,
    `${data.propertyAddress}`,
    `<p>Hi ${e(data.tenantName)},</p>
     <p>${e(message)}</p>
     <a href="${e(data.viewUrl)}" class="cta">Open the job →</a>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.tenantName},\n\n${message}\n\nView: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
