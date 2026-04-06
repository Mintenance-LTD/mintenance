/**
 * Message notification email template
 */
import { escapeHtml, year, emailShell } from './shared';
import type { MessageNotificationData } from './types';

export function messageNotificationTemplate(data: MessageNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const color = '#0d9488';
  const extra = `.message-box{background:#f0fdfa;border-left:4px solid ${color};padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0}
    .sender-badge{display:inline-block;background:#e0f2fe;color:#0369a1;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;margin-bottom:12px}
    .job-ref{font-size:13px;color:#6b7280;margin-top:4px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>New Message</h1><p>You have a new message on Mintenance</p>`,
    `<p>Hi ${e(data.recipientName)},</p>
     <div class="sender-badge">${e(data.senderName)}</div>
     <p style="margin-bottom:4px"><strong>${e(data.senderName)}</strong> sent you a message about:</p>
     <p class="job-ref" style="margin-top:0"><strong>${e(data.jobTitle)}</strong></p>
     <div class="message-box"><p style="margin:0;color:#374151;font-style:italic;white-space:pre-wrap">${e(data.messagePreview)}</p></div>
     <p style="text-align:center"><a href="${e(data.viewUrl)}" class="cta">Reply Now</a></p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.senderName} sent you a message about "${data.jobTitle}":\n\n"${data.messagePreview}"\n\nReply: ${data.viewUrl}\n\n© ${year()} Mintenance.`;
  return {
    subject: `New message from ${data.senderName} - ${data.jobTitle}`,
    html,
    text,
  };
}
