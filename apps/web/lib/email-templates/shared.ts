/**
 * Shared email template utilities
 * Escape helpers, CSS base, and email shell wrapper used by all templates.
 *
 * 2026-05-21: started migrating to the Mint Editorial voice + palette
 * documented in the Claude Design redesign-v2 bundle. The legacy
 * `emailShell` is kept for backwards compatibility while individual
 * templates port over; new/ported templates should call `mintEmailShell`
 * which uses the canonical forest-mint brand colour and a serif heading
 * stack that degrades to Georgia in mail clients that strip web fonts.
 */

/** Escape HTML special characters to prevent XSS in email templates */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const year = () => new Date().getFullYear();

/** Mint Editorial — single canonical brand colour for every transactional email. */
export const MINT_BRAND_GREEN = '#0F4D3A';
/** Mint Editorial — secondary mid-mint used for soft accents (escrow note background tint). */
export const MINT_SOFT_BG = '#E9F1EB';
/** Mint Editorial — warm paper background, matches the in-app `me.bg`. */
export const MINT_PAPER_BG = '#F7F4EE';
/** Source Serif 4 → Georgia degradation for display headings. */
export const MINT_DISPLAY_STACK =
  "'Source Serif 4', 'Source Serif Pro', Georgia, 'Times New Roman', serif";

/** Shared base CSS included in every template */
function baseCSS(headerColor: string, extraCSS = ''): string {
  return `
    body{margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#1f2937;-webkit-font-smoothing:antialiased}
    .wrapper{width:100%;background-color:#f3f4f6;padding:40px 0}
    .container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07),0 2px 4px -2px rgba(0,0,0,0.05)}
    .logo-bar{padding:20px 30px;text-align:left;background:#ffffff;border-bottom:1px solid #e5e7eb}
    .logo-text{font-size:22px;font-weight:800;color:#0d9488;text-decoration:none;letter-spacing:-0.5px}
    .header{background:linear-gradient(135deg,${headerColor} 0%,${headerColor}dd 100%);color:white;padding:32px 30px;text-align:left}
    .header h1{margin:0;font-size:24px;font-weight:700;letter-spacing:-0.3px}
    .header p{margin:8px 0 0;opacity:0.85;font-size:15px}
    .content{padding:32px 30px;background:#ffffff}
    .content p{margin:0 0 16px;font-size:15px;color:#374151}
    .cta{display:inline-block;background-color:${headerColor};color:#ffffff !important;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;margin-top:8px;text-align:center}
    .footer-wrap{padding:24px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center}
    .footer-wrap p{margin:4px 0;font-size:12px;color:#9ca3af}
    .footer-wrap a{color:#6b7280;text-decoration:underline}
    ${extraCSS}`;
}

/** Wrap content in the standard email shell with Mintenance branding */
export function emailShell(
  headerColor: string,
  extraCSS: string,
  headerHtml: string,
  bodyHtml: string,
  footer: string
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCSS(headerColor, extraCSS)}</style></head><body>
  <div class="wrapper">
    <div class="container">
      <div class="logo-bar"><a href="https://mintenance.co.uk" class="logo-text">Mintenance</a></div>
      <div class="header">${headerHtml}</div>
      <div class="content">${bodyHtml}</div>
      <div class="footer-wrap">${footer}</div>
    </div>
  </div></body></html>`;
}

/**
 * Mint Editorial email shell — calm paper background, serif display
 * subject line set inside the body (no big gradient header bar), thin
 * mint-leaf brand row. Used by ported templates.
 *
 * `subject` is rendered inline as the leading H1 — the email client's
 * subject-line preview still comes from the caller's returned `subject`.
 */
export function mintEmailShell(
  subject: string,
  preview: string,
  bodyHtml: string,
  footer: string
): string {
  const baseCss = `
    body{margin:0;padding:0;background-color:${MINT_PAPER_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:1.6;color:#1F2A24;-webkit-font-smoothing:antialiased}
    .preview{display:none;font-size:1px;color:${MINT_PAPER_BG};line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden}
    .wrapper{width:100%;background-color:${MINT_PAPER_BG};padding:40px 0}
    .container{max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,42,36,0.06)}
    .from{padding:18px 24px;border-bottom:1px solid #eee;font-size:12px;color:#666}
    .from .brand{display:inline-block;width:20px;height:20px;background:${MINT_BRAND_GREEN};border-radius:5px;vertical-align:middle;margin-right:8px;line-height:20px;text-align:center;color:#fff;font-size:11px;font-weight:700}
    .from b{color:#1F2A24;font-weight:600}
    .subj{font-family:${MINT_DISPLAY_STACK};font-weight:500;font-size:24px;color:#1F2A24;padding:18px 24px 0;letter-spacing:-0.01em;line-height:1.2}
    .body{padding:14px 24px 28px;font-size:14px;color:#333;line-height:1.65}
    .body p{margin:0 0 14px}
    .body strong{color:#1F2A24}
    .note{background:${MINT_SOFT_BG};border-left:3px solid ${MINT_BRAND_GREEN};padding:12px 14px;border-radius:4px;margin:14px 0;font-size:13px;color:#1F3024}
    .cta{display:inline-block;background:${MINT_BRAND_GREEN};color:#fff !important;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;margin:8px 0 14px}
    .receipt-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #ddd;font-size:13px}
    .receipt-total{font-weight:700;font-size:15px;border-bottom:0;padding-top:14px}
    .footer-row{padding:18px 24px;background:${MINT_PAPER_BG};font-size:11px;color:#888;line-height:1.6}
    .footer-row a{color:#666}
  `;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>${baseCss}</style></head><body>
  <div class="preview">${preview}</div>
  <div class="wrapper">
    <div class="container">
      <div class="from"><span class="brand">m</span><b>Mintenance</b> &lt;hello@mintenance.co.uk&gt;</div>
      <div class="subj">${subject}</div>
      <div class="body">${bodyHtml}</div>
      <div class="footer-row">${footer}</div>
    </div>
  </div></body></html>`;
}
