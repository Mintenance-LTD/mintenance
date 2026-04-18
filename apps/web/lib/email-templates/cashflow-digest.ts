/**
 * Friday cash-flow digest email — weekly summary for contractors.
 *
 * R2 #16 of docs/RETENTION_ROADMAP_2026.md. Reframes Mintenance as "the
 * platform that pays" per the source PDF §4.3 contractor mental model
 * "I'll never see the money".
 */

import { escapeHtml, year, emailShell } from './shared';
import type { CashFlowDigestData } from './types';

function fmtGBP(n: number): string {
  return `£${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
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
  const color = '#059669';
  const range = `${fmtShortDate(data.weekStart)} – ${fmtShortDate(data.weekEnd)}`;

  const extra = `.stat-card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:18px;text-align:center}
    .stat-value{font-size:22px;font-weight:700;color:${color};margin-bottom:2px}
    .stat-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#6b7280}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}
    .reassurance{background:#ecfdf5;border-left:4px solid ${color};padding:14px 18px;border-radius:6px;margin-top:20px;font-size:14px;color:#065f46}`;

  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Your week on Mintenance</h1>
     <p style="margin:8px 0 0;opacity:0.9">${range}</p>`,
    `<p>Hi ${e(data.contractorName)},</p>
     <p>Your cash-flow summary for the week — every number below is
        money already secured through Protected Payment, not an
        invoice you still need to chase.</p>

     <div class="grid-2">
       <div class="stat-card">
         <div class="stat-value">${fmtGBP(data.earnedThisWeek)}</div>
         <div class="stat-label">Earned this week</div>
       </div>
       <div class="stat-card">
         <div class="stat-value">${fmtGBP(data.releasingNextWeek)}</div>
         <div class="stat-label">Releasing next week</div>
       </div>
       <div class="stat-card">
         <div class="stat-value">${data.jobsCompleted}</div>
         <div class="stat-label">Jobs completed</div>
       </div>
       <div class="stat-card">
         <div class="stat-value">${fmtGBP(data.activeEscrowTotal)}</div>
         <div class="stat-label">${data.activeEscrowCount} job${
           data.activeEscrowCount === 1 ? '' : 's'
         } held &amp; protected</div>
       </div>
     </div>

     <p style="text-align:center">
       <a href="${e(data.viewUrl)}" class="cta">Open your payments dashboard</a>
     </p>

     <div class="reassurance">
       <strong>Protected Payment works for you too:</strong> homeowner
       funds are held before you arrive and released on approval (or
       automatically after the 7-day review window). No chasing invoices.
     </div>`,
    unsubscribeFooter
  );

  const text = `Hi ${data.contractorName},

Your week on Mintenance (${range}):
- Earned this week: ${fmtGBP(data.earnedThisWeek)}
- Releasing next week: ${fmtGBP(data.releasingNextWeek)}
- Jobs completed: ${data.jobsCompleted}
- Protected & held: ${fmtGBP(data.activeEscrowTotal)} across ${data.activeEscrowCount} job${
    data.activeEscrowCount === 1 ? '' : 's'
  }

Open your dashboard: ${data.viewUrl}

Protected Payment works for you too — homeowner funds are held before you arrive and released on approval (or automatically after the 7-day review window).

© ${year()} Mintenance.`;

  return {
    subject: `Your week on Mintenance: ${fmtGBP(data.earnedThisWeek)} earned`,
    html,
    text,
  };
}
