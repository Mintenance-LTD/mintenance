/**
 * Message notification email template
 *
 * Mint Editorial voice (2026-05-21 port): sender's name in the subject,
 * message preview is the body — matches WhatsApp/iMessage push UX.
 */
import { escapeHtml, year, mintEmailShell } from './shared';
import type { MessageNotificationData } from './types';

export function messageNotificationTemplate(data: MessageNotificationData): {
  subject: string;
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const subject = `${data.senderName} on ${data.jobTitle}`;
  const preview = data.messagePreview.slice(0, 100);
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.recipientName)},</p>
     <p><strong>${e(data.senderName)}</strong> sent you a message about <strong>${e(data.jobTitle)}</strong>:</p>
     <div class="note" style="white-space:pre-wrap">${e(data.messagePreview)}</div>
     <a href="${e(data.viewUrl)}" class="cta">Reply →</a>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>`
  );
  const text = `Hi ${data.recipientName},\n\n${data.senderName} on "${data.jobTitle}":\n\n"${data.messagePreview}"\n\nReply: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
