import { serverSupabase as db } from '@/lib/api/supabaseServer';
import { env } from '@/lib/env';
import { NotificationService } from '@/lib/services/notifications/NotificationService';
import { loadPreferences } from '@/lib/services/notifications/NotificationPreferenceResolver';
import { escapeHtml } from '@/lib/email-templates';

export async function drainCustomerCommunications() {
  const deadline = Date.now() + 22000;
  const stale = await db
    .from('customer_communication_outbox')
    .update({
      status: 'needs_review',
      last_error: 'Interrupted send: check provider before retrying',
    })
    .eq('status', 'sending')
    .lt('claimed_at', new Date(Date.now() - 10 * 60000).toISOString());
  if (stale.error) throw new Error('Could not recover communication attempts');
  const { data: rows, error } = await db
    .from('customer_communication_outbox')
    .select('*')
    .eq('status', 'pending')
    .order('created_at')
    .limit(15);
  if (error) throw new Error('Could not load communication queue');
  let accepted = 0;
  let review = 0;
  for (const row of rows || []) {
    if (Date.now() > deadline) break;
    const { data: claim, error: claimError } = await db
      .from('customer_communication_outbox')
      .update({
        status: 'sending',
        claimed_at: new Date().toISOString(),
        attempts: row.attempts + 1,
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (claimError) throw new Error('Could not claim communication');
    if (!claim) continue;
    let status = 'accepted';
    let providerId: string | null = null;
    let failure: string | null = null;
    try {
      if (row.channel === 'email') {
        if (!env.BREVO_API_KEY) {
          status = 'failed';
          failure = 'Brevo is not configured';
        } else {
          // Announcements respect email preferences. Agreements and support replies
          // are requested service records and remain available regardless of marketing choices.
          const prefs =
            row.event_key.startsWith('campaign:') && row.recipient_id
              ? await loadPreferences(row.recipient_id)
              : null;
          if (prefs?.email_enabled === false) {
            status = 'accepted';
            failure = 'Suppressed by recipient email preference';
          } else {
            const r = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              signal: AbortSignal.timeout(8000),
              headers: {
                'api-key': env.BREVO_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sender: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM },
                replyTo: {
                  email: 'admin@mintenance.co.uk',
                  name: 'Mintenance support',
                },
                to: [{ email: row.recipient_email }],
                subject: row.subject,
                textContent: row.body,
                htmlContent: `<div style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(row.body)}</div>`,
                tags: ['customer-service'],
                headers: { 'X-Mintenance-Delivery-Id': row.id },
              }),
            });
            if (r.ok) {
              const result = await r.json();
              providerId =
                typeof result.messageId === 'string' ? result.messageId : null;
              if (!providerId) {
                status = 'needs_review';
                failure = 'Provider accepted without a message reference';
              }
            } else {
              status = r.status >= 500 ? 'needs_review' : 'failed';
              failure = `Brevo returned HTTP ${r.status}`;
            }
          }
        }
      } else {
        providerId = await NotificationService.createNotification({
          userId: row.recipient_id,
          type: 'system',
          title: row.subject,
          message: row.body,
          actionUrl: row.action_url,
          inAppOnly: row.channel === 'in_app',
          throwOnError: true,
          metadata: { customerCommunicationId: row.id },
        });
        if (!providerId)
          failure = 'Suppressed by recipient notification preferences';
      }
    } catch {
      status = 'needs_review';
      failure =
        'Delivery outcome is uncertain; check provider logs before retrying';
    }
    const result = await db
      .from('customer_communication_outbox')
      .update({
        status,
        provider_id: providerId,
        last_error: failure,
        completed_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('status', 'sending');
    if (result.error)
      throw new Error('Communication result requires reconciliation');
    if (status === 'accepted') accepted++;
    else review++;
  }
  return { accepted, needsReview: review };
}

/** Reconcile provider events; provider acceptance alone never means delivery. */
export async function reconcileCustomerEmails() {
  if (!env.BREVO_API_KEY) return { reconciled: 0 };
  const { data: rows, error } = await db
    .from('customer_communication_outbox')
    .select('id,provider_id,recipient_email')
    .eq('channel', 'email')
    .eq('status', 'accepted')
    .not('provider_id', 'is', null)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(5);
  if (error) throw new Error('Could not load delivery reconciliation');
  let reconciled = 0;
  for (const row of rows || []) {
    const url = new URL('https://api.brevo.com/v3/smtp/statistics/events');
    url.searchParams.set('messageId', row.provider_id);
    url.searchParams.set('limit', '100');
    url.searchParams.set('sort', 'desc');
    const response = await fetch(url, {
      headers: { 'api-key': env.BREVO_API_KEY },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok)
      throw new Error('Brevo delivery reconciliation unavailable');
    const data = await response.json();
    const events = (Array.isArray(data.events) ? data.events : []).filter(
      (e: { messageId?: string; email?: string }) =>
        e.messageId === row.provider_id &&
        e.email?.toLowerCase() === row.recipient_email.toLowerCase()
    );
    const delivered = events.some(
      (e: { event?: string }) => e.event === 'delivered'
    );
    const failed = events.some((e: { event?: string }) =>
      ['hardBounces', 'hard_bounce', 'blocked', 'invalid', 'error'].includes(
        e.event || ''
      )
    );
    const { error: saveError } = await db
      .from('customer_communication_outbox')
      .update({
        last_checked_at: new Date().toISOString(),
        ...(delivered
          ? { status: 'delivered', last_error: null }
          : failed
            ? {
                status: 'failed',
                last_error:
                  'Provider reported delivery failure; review recipient and provider logs',
              }
            : {}),
      })
      .eq('id', row.id)
      .eq('status', 'accepted');
    if (saveError) throw new Error('Could not retain delivery events');
    if (delivered || failed) reconciled++;
  }
  return { reconciled };
}
