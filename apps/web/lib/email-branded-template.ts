/**
 * Branded Email Template Wrapper
 *
 * Provides a single, consistent Mintenance-branded shell for ALL outbound emails.
 * Replaces ad-hoc inline styles across individual email templates.
 *
 * Usage:
 *   import { brandedEmail } from '@/lib/email-branded-template';
 *   const html = brandedEmail({ title: 'Welcome!', body: '<p>Hello</p>' });
 */

const BRAND = {
  name: 'Mintenance',
  color: '#0d9488', // teal-600
  colorDark: '#0f766e', // teal-700
  colorLight: '#f0fdfa', // teal-50
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com',
  logo: '/assets/icon.png',
  year: new Date().getFullYear(),
  company: 'Mintenance Ltd',
  companyNo: '16542104',
  address: 'Suite 2 J2 Business Park, Bridge Hall Lane, Bury, BL9 7NY',
};

interface BrandedEmailOptions {
  /** Main heading shown in the teal header bar */
  title: string;
  /** Optional subtitle below the heading */
  subtitle?: string;
  /** HTML body content (goes inside the white content area) */
  body: string;
  /** Optional CTA button */
  cta?: { text: string; url: string };
  /** Optional preheader text (hidden preview text in email clients) */
  preheader?: string;
  /** Show unsubscribe link (default true) */
  showUnsubscribe?: boolean;
}

export function brandedEmail(options: BrandedEmailOptions): string {
  const {
    title,
    subtitle,
    body,
    cta,
    preheader,
    showUnsubscribe = true,
  } = options;

  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:${BRAND.colorLight};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>`
    : '';

  const ctaHtml = cta
    ? `<div style="text-align:center;margin:28px 0 8px;">
        <a href="${cta.url}" style="display:inline-block;background:${BRAND.color};color:#ffffff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:16px;">
          ${cta.text}
        </a>
      </div>`
    : '';

  const unsubscribeHtml = showUnsubscribe
    ? `<p style="margin-top:16px;">
        <a href="${BRAND.url}/settings/notifications" style="color:#9ca3af;text-decoration:underline;">Email preferences</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheaderHtml}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Email card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.color},${BRAND.colorDark});padding:32px 24px;text-align:center;">
              <img src="${BRAND.url}${BRAND.logo}" alt="${BRAND.name}" width="40" height="40" style="border-radius:8px;margin-bottom:12px;" />
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                ${title}
              </h1>
              ${subtitle ? `<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">${subtitle}</p>` : ''}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;font-size:16px;color:#374151;line-height:1.65;">
              ${body}
              ${ctaHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 24px 28px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;line-height:1.5;">
              <p style="margin:0 0 4px;">&copy; ${BRAND.year} ${BRAND.company}. Company No. ${BRAND.companyNo}.</p>
              <p style="margin:0 0 4px;">${BRAND.address}</p>
              ${unsubscribeHtml}
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain-text version from structured content.
 * Used as fallback for email clients that don't render HTML.
 */
export function brandedEmailText(options: {
  title: string;
  body: string;
  cta?: { text: string; url: string };
}): string {
  // Strip HTML tags for plain text
  const plainBody = options.body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();

  const ctaText = options.cta
    ? `\n${options.cta.text}: ${options.cta.url}\n`
    : '';

  return `${options.title}\n${'='.repeat(options.title.length)}\n\n${plainBody}${ctaText}\n\n---\n${BRAND.name} | ${BRAND.url}\n${BRAND.company}, ${BRAND.address}`;
}
