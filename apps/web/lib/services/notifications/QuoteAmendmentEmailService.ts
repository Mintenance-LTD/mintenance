import { serverSupabase } from '@/lib/api/supabaseServer';
import { EmailService } from '@/lib/email-service';
import {
  quoteAmendmentTemplate,
  type QuoteAmendmentEmailAction,
} from '@/lib/email-templates/quote-amendment';
import { logger } from '@mintenance/shared';
import { shouldDeliverQuoteAmendment } from './QuoteAmendmentNotification';
import {
  loadPreferences,
  isTypeDisabled,
  nextQuietHoursEndUTC,
} from './NotificationPreferenceResolver';

interface EmailRow {
  amendment_id: string;
  version: number;
  job_id: string;
  user_id: string;
  action: QuoteAmendmentEmailAction;
  status: string;
  attempts: number;
  scheduled_for: string;
}
type Checkpoint = {
  status?: string;
  attempts?: number;
  scheduled_for?: string;
  sent_at?: string;
  error_code?: string | null;
};
const table = 'quote_amendment_email_outbox';

/** Compare-and-set every checkpoint so an expired worker cannot overwrite a new lease. */
async function checkpoint(row: EmailRow, values: Checkpoint): Promise<boolean> {
  const { data, error } = await serverSupabase
    .from(table)
    .update(values)
    .eq('amendment_id', row.amendment_id)
    .eq('version', row.version)
    .eq('status', row.status)
    .eq('scheduled_for', row.scheduled_for)
    .select('amendment_id')
    .maybeSingle();
  if (error) throw new Error('amendment_email_checkpoint_failed');
  if (!data) return false;
  Object.assign(row, values);
  return true;
}

export class QuoteAmendmentEmailService {
  static async process() {
    const result = { emailSent: 0, emailErrors: 0, emailNeedsReview: 0 };
    const deadline = Date.now() + 25_000;
    try {
      const { data, error } = await serverSupabase
        .from(table)
        .select('*')
        .in('status', ['pending', 'sending'])
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for')
        .limit(25);
      if (error) throw new Error('amendment_email_queue_unavailable');
      for (const row of (data || []) as EmailRow[]) {
        if (Date.now() >= deadline) break;
        let claimed = false;
        try {
          // A worker may have died after provider acceptance. Never auto-resend.
          if (row.status === 'sending') {
            if (
              await checkpoint(row, {
                status: 'needs_review',
                error_code: 'send_outcome_unknown',
              })
            )
              result.emailNeedsReview++;
            continue;
          }
          claimed = await checkpoint(row, {
            scheduled_for: new Date(Date.now() + 5 * 60_000).toISOString(),
          });
          if (!claimed) continue;
          if (
            !(await shouldDeliverQuoteAmendment(
              {
                quote_amendment_id: row.amendment_id,
                amendment_version: row.version,
              },
              row.user_id
            ))
          ) {
            await checkpoint(row, {
              status: 'cancelled',
              error_code: 'amendment_no_longer_current',
            });
            continue;
          }
          const prefs = await loadPreferences(row.user_id);
          if (
            !prefs.email_enabled ||
            isTypeDisabled(prefs, 'quote_amendment_update')
          ) {
            await checkpoint(row, {
              status: 'cancelled',
              error_code: 'email_disabled_by_user',
            });
            continue;
          }
          const quietUntil = nextQuietHoursEndUTC(prefs);
          if (quietUntil) {
            await checkpoint(row, { scheduled_for: quietUntil.toISOString() });
            continue;
          }
          // Honour legacy one-click email unsubscribe as well as current settings.
          const { data: emailPrefs, error: emailPrefsError } =
            await serverSupabase
              .from('email_preferences')
              .select('unsubscribed_all,bid_notifications,unsubscribe_token')
              .eq('user_id', row.user_id)
              .maybeSingle();
          if (emailPrefsError)
            throw new Error('amendment_email_preferences_unavailable');
          if (
            emailPrefs?.unsubscribed_all ||
            emailPrefs?.bid_notifications === false
          ) {
            await checkpoint(row, {
              status: 'cancelled',
              error_code: 'email_unsubscribed',
            });
            continue;
          }
          // Resolve the current verified account email; never use quote client_email
          // or user-editable profile email as an authority for the recipient.
          const { data: profile, error: profileError } = await serverSupabase
            .from('profiles')
            .select('deleted_at')
            .eq('id', row.user_id)
            .maybeSingle();
          if (profileError)
            throw new Error('amendment_email_recipient_unavailable');
          if (!profile || profile.deleted_at) {
            await checkpoint(row, {
              status: 'cancelled',
              error_code: 'recipient_unavailable',
            });
            continue;
          }
          const { data: account, error: accountError } =
            await serverSupabase.auth.admin.getUserById(row.user_id);
          if (accountError)
            throw new Error('amendment_email_account_unavailable');
          const user = account?.user;
          if (
            !user?.email ||
            !user.email_confirmed_at ||
            (user.banned_until && Date.parse(user.banned_until) > Date.now())
          ) {
            await checkpoint(row, {
              status: 'cancelled',
              error_code: 'recipient_unverified_or_disabled',
            });
            continue;
          }
          const content = quoteAmendmentTemplate(
            row.action,
            row.job_id,
            emailPrefs?.unsubscribe_token
          );
          if (row.attempts >= 6) {
            await checkpoint(row, {
              status: 'failed',
              error_code: 'retry_limit',
            });
            result.emailErrors++;
            continue;
          }
          // Persist intent before contacting the provider. A crash or failed final
          // checkpoint leaves `sending`, which expires to manual review, not retry.
          if (
            !(await checkpoint(row, {
              status: 'sending',
              attempts: row.attempts + 1,
              scheduled_for: new Date(Date.now() + 5 * 60_000).toISOString(),
              error_code: null,
            }))
          )
            continue;
          const outcome = await EmailService.sendEmailWithOutcome({
            to: user.email,
            ...content,
            timeoutMs: 8000,
          });
          if (outcome === 'sent') {
            if (
              await checkpoint(row, {
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
            )
              result.emailSent++;
          } else if (outcome === 'unknown') {
            await checkpoint(row, {
              status: 'needs_review',
              error_code: 'send_outcome_unknown',
            });
            result.emailNeedsReview++;
          } else {
            await checkpoint(row, {
              status:
                outcome === 'retryable' && row.attempts < 6
                  ? 'pending'
                  : 'failed',
              scheduled_for: new Date(
                Date.now() + 2 ** row.attempts * 60_000
              ).toISOString(),
              error_code:
                outcome === 'retryable'
                  ? 'provider_unavailable_or_rate_limited'
                  : 'provider_rejected',
            });
            result.emailErrors++;
          }
        } catch (error) {
          result.emailErrors++;
          logger.error('Quote amendment email processing failed', error, {
            service: 'quote-amendment-email',
            amendmentId: row.amendment_id,
            version: row.version,
          });
          // Pre-send failures are safe to retry. Sending failures retain their
          // checkpoint and will be surfaced as uncertain after the lease expires.
          if (claimed && row.status === 'pending') {
            try {
              await checkpoint(row, {
                attempts: Math.min(6, row.attempts + 1),
                status: row.attempts >= 5 ? 'failed' : 'pending',
                error_code: 'preflight_unavailable',
              });
            } catch {
              /* Keep the durable lease; next run will recover it. */
            }
          }
        }
      }
    } catch (error) {
      result.emailErrors++;
      logger.error('Quote amendment email queue failed', error, {
        service: 'quote-amendment-email',
      });
    }
    return result;
  }
}
