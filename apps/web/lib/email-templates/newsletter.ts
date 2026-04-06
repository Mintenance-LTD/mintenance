/**
 * Newsletter welcome email template
 */
import { year, emailShell } from './shared';

export function newsletterWelcomeTemplate(
  email: string
): { subject: string; html: string; text: string } {
  const color = '#0d9488';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.co.uk';
  const extra = `.feature-grid{margin:20px 0}
    .feature-item{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #f3f4f6}
    .feature-item:last-child{border-bottom:none}
    .feature-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .feature-label{font-weight:600;color:#1f2937;font-size:14px}
    .feature-desc{color:#6b7280;font-size:13px;margin-top:2px}`;
  const html = emailShell(
    color,
    extra,
    `<h1>Welcome to Mintenance</h1><p>You're on the list!</p>`,
    `<p>Hi there,</p>
     <p>Thanks for subscribing to the Mintenance newsletter. You'll be the first to hear about:</p>
     <div class="feature-grid">
       <div class="feature-item">
         <div class="feature-icon" style="background:#f0fdfa;color:#0d9488">&#9889;</div>
         <div><div class="feature-label">New Platform Features</div><div class="feature-desc">Be the first to know about updates</div></div>
       </div>
       <div class="feature-item">
         <div class="feature-icon" style="background:#fef3c7;color:#d97706">&#128161;</div>
         <div><div class="feature-label">Tips &amp; Guides</div><div class="feature-desc">Expert advice for homeowners &amp; contractors</div></div>
       </div>
       <div class="feature-item">
         <div class="feature-icon" style="background:#ede9fe;color:#7c3aed">&#128200;</div>
         <div><div class="feature-label">Industry Insights</div><div class="feature-desc">Trends and data from the UK trades sector</div></div>
       </div>
     </div>
     <p>In the meantime, explore what Mintenance can do for you:</p>
     <p style="text-align:center"><a href="${baseUrl}/try-mint-ai" class="cta">Try AI Assessment</a></p>
     <p style="margin-top:16px;text-align:center"><a href="${baseUrl}/discover" style="color:${color};font-weight:600;font-size:14px">Browse Contractors &rarr;</a></p>`,
    `<p>&copy; ${year()} Mintenance ltd. All rights reserved.</p>
     <p><a href="${baseUrl}/api/email/unsubscribe?email=${encodeURIComponent(email)}">Unsubscribe</a></p>`
  );
  const text = `Welcome to Mintenance!\n\nThanks for subscribing. You'll be the first to hear about new features, tips, and industry insights.\n\nTry our AI assessment: ${baseUrl}/try-mint-ai\nBrowse contractors: ${baseUrl}/discover\n\n© ${year()} Mintenance.`;
  return {
    subject: 'Welcome to Mintenance - You\'re on the list!',
    html,
    text,
  };
}
