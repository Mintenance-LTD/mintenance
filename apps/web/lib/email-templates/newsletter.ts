/**
 * Newsletter welcome email template
 *
 * Mint Editorial voice (2026-05-21 port): direct, no decorative
 * lightning bolts. Three plain bullets, one explicit invitation.
 */
import { year, mintEmailShell } from './shared';

export function newsletterWelcomeTemplate(email: string): {
  subject: string;
  html: string;
  text: string;
} {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.co.uk';
  const subject = `You're on the Mintenance list.`;
  const preview = `Roughly fortnightly — what's new, tips for the right job at the right price.`;
  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi there,</p>
     <p>Thanks for joining the list. You'll hear from us roughly every two weeks — short, useful, and never marketing-y. Expect:</p>
     <ul style="color:#333;padding-left:20px;line-height:1.9">
       <li>What's actually new on the platform (no roadmap dumps)</li>
       <li>Practical guides: how to brief a job, how to read a quote, when to dispute</li>
       <li>UK trade-sector trends — boiler service prices by season, certificate windows, the rest</li>
     </ul>
     <p>While you're here:</p>
     <a href="${baseUrl}/try-mint-ai" class="cta">Try the photo-guidance tool →</a>
     <p style="margin-top:14px;font-size:13px"><a href="${baseUrl}/find-contractors" style="color:#0F4D3A;font-weight:600">Or browse local tradespeople</a></p>`,
    `<p>&copy; ${year()} Mintenance Ltd.</p>
     <p><a href="${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p>`
  );
  const text = `You're on the Mintenance list.\n\nRoughly every two weeks: what's new, practical guides, UK trade-sector trends. Short, useful, never marketing-y.\n\nWhile you're here:\nTry the photo-guidance tool — ${baseUrl}/try-mint-ai\nBrowse contractors — ${baseUrl}/find-contractors\n\nUnsubscribe: ${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}\n\n© ${year()} Mintenance Ltd.`;
  return { subject, html, text };
}
