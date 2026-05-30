/**
 * Friday cash-flow digest email — weekly summary for contractors.
 *
 * R2 #16 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Mint Editorial voice (2026-05-21 port): reframe the digest around the
 * contractor's mental model ("when do I see the money") — every figure
 * is money already secured, not an invoice waiting to be chased.
 */

import { escapeHtml, year, mintEmailShell, MINT_BRAND_GREEN } from './shared';
import type { CashFlowDigestData } from './types';

function fmtGBP(n: number): string {
  return `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function cashFlowDigestTemplate(
  data: CashFlowDigestData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const range = `${fmtShortDate(data.weekStart)} – ${fmtShortDate(data.weekEnd)}`;
  const subject = `${fmtGBP(data.earnedThisWeek)} earned · ${range}`;
  const preview = `${fmtGBP(data.releasingNextWeek)} releasing next week, ${fmtGBP(data.activeEscrowTotal)} held against active jobs.`;

  const statCard = (value: string, label: string) => `
    <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:16px;text-align:center">
      <div style="font-family:'Source Serif 4',Georgia,serif;font-size:22px;font-weight:600;color:${MINT_BRAND_GREEN};letter-spacing:-0.01em">${value}</div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#888;margin-top:4px">${label}</div>
    </div>`;

  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.contractorName)},</p>
     <p>Your week on Mintenance — every number below is money already secured. No invoices to chase.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0">
       <tr>
         <td style="padding:6px;width:50%">${statCard(fmtGBP(data.earnedThisWeek), 'Earned this week')}</td>
         <td style="padding:6px;width:50%">${statCard(fmtGBP(data.releasingNextWeek), 'Releasing next week')}</td>
       </tr>
       <tr>
         <td style="padding:6px;width:50%">${statCard(String(data.jobsCompleted), 'Jobs completed')}</td>
         <td style="padding:6px;width:50%">${statCard(fmtGBP(data.activeEscrowTotal), `${data.activeEscrowCount} held in escrow`)}</td>
       </tr>
     </table>
     <a href="${e(data.viewUrl)}" class="cta">Open your payments →</a>
     <div class="note">Escrow holds the money before you arrive and releases it on approval — or automatically after 7 days if the homeowner doesn't act. That's it.</div>`,
    unsubscribeFooter
  );

  const text = `Hi ${data.contractorName},\n\nYour week on Mintenance (${range}):\n- Earned this week: ${fmtGBP(data.earnedThisWeek)}\n- Releasing next week: ${fmtGBP(data.releasingNextWeek)}\n- Jobs completed: ${data.jobsCompleted}\n- Held in escrow: ${fmtGBP(data.activeEscrowTotal)} across ${data.activeEscrowCount} job${data.activeEscrowCount === 1 ? '' : 's'}\n\nEvery number is money already secured. No invoices to chase.\n\nOpen your payments: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;

  return { subject, html, text };
}
