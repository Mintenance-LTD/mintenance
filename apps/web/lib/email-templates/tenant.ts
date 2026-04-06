/**
 * Tenant email templates
 */
import { escapeHtml, year, emailShell } from './shared';
import type { TenantInviteData } from './types';

export function tenantInviteTemplate(
  data: TenantInviteData
): { subject: string; html: string; text: string } {
  const color = '#0d9488';
  const html = emailShell(
    color,
    '',
    `<h1>You've Been Invited</h1><p>Join Mintenance to manage your home maintenance</p>`,
    `<p>Hi ${escapeHtml(data.tenantName)},</p>
     <p><strong>${escapeHtml(data.landlordName)}</strong> has added you as a tenant at:</p>
     <div style="background:#f0fdfa;border-left:4px solid ${color};padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0">
       <p style="margin:0;font-weight:700;color:#1f2937">${escapeHtml(data.propertyAddress)}</p>
     </div>
     <p>Create your free Mintenance account to:</p>
     <ul style="color:#374151;padding-left:20px;line-height:2">
       <li><strong>Submit maintenance requests</strong> directly to your landlord</li>
       <li><strong>Track repairs</strong> from request to completion</li>
       <li><strong>Get notified</strong> when work is scheduled</li>
       <li><strong>Message contractors</strong> working on your property</li>
     </ul>
     <p style="text-align:center;margin-top:24px"><a href="${escapeHtml(data.inviteUrl)}" class="cta">Accept Invitation</a></p>
     <p style="margin-top:16px;font-size:13px;color:#6b7280;text-align:center">This invitation link is unique to you. If you didn't expect this, you can safely ignore it.</p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
  );
  const text = `Hi ${data.tenantName},\n\n${data.landlordName} has added you as a tenant at ${data.propertyAddress}.\n\nCreate your free Mintenance account to submit maintenance requests, track repairs, and get notified when work is scheduled.\n\nAccept invitation: ${data.inviteUrl}\n\n© ${year()} Mintenance ltd.`;
  return {
    subject: `${data.landlordName} invited you to Mintenance`,
    html,
    text,
  };
}

export function tenantJobNotificationTemplate(
  data: { tenantName: string; propertyAddress: string; jobTitle: string; status: string; viewUrl: string }
): { subject: string; html: string; text: string } {
  const color = '#0d9488';
  const statusLabels: Record<string, string> = {
    assigned: 'A contractor has been assigned',
    in_progress: 'Work has started',
    completed: 'Work has been completed',
  };
  const statusMsg = statusLabels[data.status] || `Status updated to: ${data.status}`;
  const html = emailShell(
    color,
    '',
    `<h1>Maintenance Update</h1><p>${escapeHtml(data.propertyAddress)}</p>`,
    `<p>Hi ${escapeHtml(data.tenantName)},</p>
     <p>There's an update on a maintenance request at your property:</p>
     <div style="background:#f0fdfa;border-left:4px solid ${color};padding:16px 20px;border-radius:0 8px 8px 0;margin:16px 0">
       <p style="margin:0 0 4px;font-weight:700;color:#1f2937">${escapeHtml(data.jobTitle)}</p>
       <p style="margin:0;color:#0d9488;font-weight:600">${statusMsg}</p>
     </div>
     <p style="text-align:center"><a href="${escapeHtml(data.viewUrl)}" class="cta">View Details</a></p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
  );
  const text = `Hi ${data.tenantName},\n\nUpdate on "${data.jobTitle}" at ${data.propertyAddress}: ${statusMsg}.\n\nView: ${data.viewUrl}\n\n© ${year()} Mintenance ltd.`;
  return {
    subject: `Maintenance Update - ${data.jobTitle}`,
    html,
    text,
  };
}
