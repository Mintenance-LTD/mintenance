/**
 * Retention email templates — R5 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Keeps Annual Home MOT + post-job +90d nudge in one file so both
 * crons reuse the same shell + unsubscribe footer.
 *
 * Mint Editorial voice (2026-05-21 port): the prior copy was already
 * close to the locked voice ("Ninety days on", calm 5-minute check
 * framing). Mostly a shell + palette swap.
 */

import { escapeHtml, year, mintEmailShell } from './shared';

export interface AnnualHomeMOTData {
  homeownerName: string;
  propertyName: string;
  propertyAge: number | null; // years since year_built; null if unknown
  recommendedChecks: string[];
  viewUrl: string;
}

export interface PostJobNudgeData {
  homeownerName: string;
  jobTitle: string;
  completedDate: string;
  contractorName: string;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  nextSuggestions: string[];
  viewUrl: string;
}

export function annualHomeMOTTemplate(
  data: AnnualHomeMOTData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const ageLine = data.propertyAge
    ? `${data.propertyName} is around ${data.propertyAge} years old, so we've weighted the list toward what matters most at that age.`
    : `Here are the checks that matter for every UK home.`;

  const listHtml = data.recommendedChecks
    .map((item) => `<li>${e(item)}</li>`)
    .join('');

  const subject = `Annual home MOT for ${data.propertyName}.`;
  const preview = `Five-minute check, ${data.recommendedChecks.length} items. Catches the expensive ones early.`;

  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>${ageLine} A quick annual check keeps small problems from turning into expensive ones.</p>
     <div class="note">
       <strong>This year's checks</strong>
       <ul style="margin:8px 0 0;padding-left:20px;line-height:1.7">${listHtml}</ul>
     </div>
     <a href="${e(data.viewUrl)}" class="cta">Post one of these jobs →</a>
     <p style="font-size:12px;color:#888;margin-top:18px">You're getting this because it's the anniversary of the day you added this property. Switch annual reminders off in notification settings.</p>`,
    unsubscribeFooter
  );

  const text = `Hi ${data.homeownerName},\n\nAnnual home MOT for ${data.propertyName}.\n\n${ageLine}\n\nThis year's checks:\n${data.recommendedChecks.map((c) => `- ${c}`).join('\n')}\n\nPost one of these jobs: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;

  return { subject, html, text };
}

export function postJobNudgeTemplate(
  data: PostJobNudgeData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const completed = new Date(data.completedDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const photoRow =
    data.beforePhotoUrl && data.afterPhotoUrl
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr>
           <td style="padding-right:4px;width:50%"><img src="${e(data.beforePhotoUrl)}" alt="Before" style="width:100%;border-radius:8px;display:block"/></td>
           <td style="padding-left:4px;width:50%"><img src="${e(data.afterPhotoUrl)}" alt="After" style="width:100%;border-radius:8px;display:block"/></td>
         </tr></table>`
      : '';

  const suggestions = data.nextSuggestions
    .map((s) => `<li>${e(s)}</li>`)
    .join('');

  const subject = `Ninety days since "${data.jobTitle}" — what's next?`;
  const preview = `Most UK homes need a handful of small jobs a year. Here are a few worth thinking about.`;

  const html = mintEmailShell(
    subject,
    preview,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>90 days ago (${completed}) <strong>${e(data.contractorName)}</strong> finished <strong>${e(data.jobTitle)}</strong> for you. Here's the before/after as a reminder of the change:</p>
     ${photoRow}
     <p>Most UK homes need a handful of small jobs a year. A few to consider while you're here:</p>
     <ul style="margin:0;padding-left:20px;line-height:1.8">${suggestions}</ul>
     <a href="${e(data.viewUrl)}" class="cta">Post your next job →</a>`,
    unsubscribeFooter
  );

  const text = `Hi ${data.homeownerName},\n\n90 days ago (${completed}) ${data.contractorName} finished "${data.jobTitle}" for you.\n\nNext job ideas:\n${data.nextSuggestions.map((s) => `- ${s}`).join('\n')}\n\nPost your next: ${data.viewUrl}\n\n© ${year()} Mintenance Ltd.`;

  return { subject, html, text };
}
