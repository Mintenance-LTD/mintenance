import { env } from '../env';
import { escapeHtml, mintEmailShell } from './shared';

export type QuoteAmendmentEmailAction =
  | 'publish'
  | 'approve'
  | 'reject'
  | 'withdraw'
  | 'apply';
const copy: Record<QuoteAmendmentEmailAction, [string, string]> = {
  publish: [
    'Quote amendment ready for review',
    'Review the proposed pricing in your job. The accepted price has not changed.',
  ],
  approve: [
    'Quote amendment approved',
    'Customer approval is recorded. Review eligibility before applying the amendment. Approval is not a signature or payment.',
  ],
  reject: [
    'Quote amendment declined',
    'The customer declined the proposal. The accepted price has not changed.',
  ],
  withdraw: [
    'Quote amendment withdrawn',
    'The contractor withdrew the proposal. The accepted price has not changed.',
  ],
  apply: [
    'Revised quote pricing applied',
    'The unsigned contract is back in draft. Review it through the normal signing process. No money was moved.',
  ],
};

/** No prices, addresses, private notes or token-bearing approval links in email. */
export function quoteAmendmentTemplate(
  action: QuoteAmendmentEmailAction,
  jobId: string,
  unsubscribeToken?: string | null
) {
  if (
    !Object.prototype.hasOwnProperty.call(copy, action) ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(jobId)
  ) {
    throw new Error('Invalid amendment email context');
  }
  const origin = new URL(env.NEXT_PUBLIC_APP_URL || 'https://mintenance.com');
  if (
    !['https:', 'http:'].includes(origin.protocol) ||
    origin.username ||
    origin.password
  ) {
    throw new Error('Invalid amendment email origin');
  }
  const url = new URL(`/jobs/${jobId}/amendments`, origin).href;
  const preferences = new URL('/settings/notifications', origin).href;
  const unsubscribe =
    unsubscribeToken &&
    /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(unsubscribeToken)
      ? new URL(
          `/api/email/unsubscribe?token=${unsubscribeToken}&category=bid_notifications`,
          origin
        ).href
      : null;
  const [subject, detail] = copy[action];
  const instruction =
    'Sign in to review the latest status. This email does not approve or apply an amendment.';
  return {
    subject,
    text: `${subject}\n\n${detail}\n\n${instruction}\n${url}\n\nEmail preferences: ${preferences}${unsubscribe ? `\nUnsubscribe from quote emails: ${unsubscribe}` : ''}`,
    html: mintEmailShell(
      subject,
      detail,
      `<p>${escapeHtml(detail)}</p><p>${instruction}</p><a class="cta" href="${escapeHtml(url)}">Review amendment</a>`,
      `<p><a href="${escapeHtml(preferences)}">Notification preferences</a>${unsubscribe ? ` | <a href="${escapeHtml(unsubscribe)}">Unsubscribe from quote emails</a>` : ''}</p>`
    ),
  };
}
