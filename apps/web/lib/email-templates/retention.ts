/**
 * Retention email templates — R5 of docs/RETENTION_ROADMAP_2026.md.
 *
 * Keeps Annual Home MOT + post-job +90d nudge in one file so both
 * crons reuse the same shell + unsubscribe footer.
 */

import { escapeHtml, year, emailShell } from './shared';

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
  const color = '#0d9488';
  const ageLine = data.propertyAge
    ? `Your home is around ${data.propertyAge} years old, so we've weighted the list toward the checks that matter most at that age.`
    : 'Here are the checks that matter for every UK home.';

  const extra = `.mot-card{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:18px;margin:20px 0}
    .mot-list{margin:0;padding-left:20px}
    .mot-list li{margin:6px 0;color:#374151;font-size:14px}`;

  const listHtml = data.recommendedChecks
    .map((item) => `<li>${e(item)}</li>`)
    .join('');

  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Your Annual Home MOT</h1>
     <p style="margin:8px 0 0;opacity:0.9">${e(data.propertyName)}</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>${ageLine} A quick 5-minute annual check keeps small problems from becoming expensive ones.</p>

     <div class="mot-card">
       <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:10px">
         This year's checks
       </div>
       <ul class="mot-list">${listHtml}</ul>
     </div>

     <p style="text-align:center">
       <a href="${e(data.viewUrl)}" class="cta">Post one of these jobs</a>
     </p>

     <p style="font-size:13px;color:#6b7280;margin-top:20px">
       You're getting this because it's the anniversary of the day you added
       this property to Mintenance. You can switch annual reminders off in
       your notification settings.
     </p>`,
    unsubscribeFooter
  );

  const text = `Hi ${data.homeownerName},

Your Annual Home MOT for ${data.propertyName}.

${ageLine} Here's this year's list:

${data.recommendedChecks.map((c) => `- ${c}`).join('\n')}

Post one of these jobs: ${data.viewUrl}

© ${year()} Mintenance.`;

  return {
    subject: `Your Annual Home MOT — ${data.propertyName}`,
    html,
    text,
  };
}

export function postJobNudgeTemplate(
  data: PostJobNudgeData,
  unsubscribeFooter: string
): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const color = '#0d9488';
  const completed = new Date(data.completedDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const photoRow =
    data.beforePhotoUrl && data.afterPhotoUrl
      ? `<div style="display:flex;gap:8px;margin:18px 0">
           <img src="${e(data.beforePhotoUrl)}" alt="Before" style="flex:1;border-radius:8px;max-width:48%"/>
           <img src="${e(data.afterPhotoUrl)}" alt="After" style="flex:1;border-radius:8px;max-width:48%"/>
         </div>`
      : '';

  const suggestions = data.nextSuggestions
    .map((s) => `<li>${e(s)}</li>`)
    .join('');

  const extra = `.mot-list{margin:0;padding-left:20px}
    .mot-list li{margin:6px 0;color:#374151;font-size:14px}`;

  const html = emailShell(
    color,
    extra,
    `<h1 style="margin:0">Ninety days on</h1>
     <p style="margin:8px 0 0;opacity:0.9">${e(data.jobTitle)}</p>`,
    `<p>Hi ${e(data.homeownerName)},</p>
     <p>90 days ago (${completed}) ${e(data.contractorName)} finished
        &ldquo;${e(data.jobTitle)}&rdquo; for you. Here's the before/after
        as a reminder of the change:</p>
     ${photoRow}
     <p>Most UK homes need a handful of small jobs a year. A few to
        consider while you're here:</p>
     <ul class="mot-list">${suggestions}</ul>
     <p style="text-align:center">
       <a href="${e(data.viewUrl)}" class="cta">Post your next job</a>
     </p>`,
    unsubscribeFooter
  );

  const text = `Hi ${data.homeownerName},

90 days ago (${completed}) ${data.contractorName} finished "${data.jobTitle}" for you.

Next job ideas:
${data.nextSuggestions.map((s) => `- ${s}`).join('\n')}

Post your next: ${data.viewUrl}

© ${year()} Mintenance.`;

  return {
    subject: `Ninety days since "${data.jobTitle}" — what's next?`,
    html,
    text,
  };
}
