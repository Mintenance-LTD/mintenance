/**
 * Shared email template utilities
 * Escape helpers, CSS base, and email shell wrapper used by all templates.
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
