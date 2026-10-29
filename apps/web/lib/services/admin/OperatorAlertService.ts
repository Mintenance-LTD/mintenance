import { serverSupabase } from '@/lib/api/supabaseServer';
import { EmailService } from '@/lib/email-service';
import { escapeHtml } from '@/lib/email-templates';

/** Durable operational email, independent of end-user notification preferences. */
export class OperatorAlertService {
  static async enqueue(jobName: string, runId: string | null): Promise<void> {
    // Bound both content and dedupe cardinality. Never email exception payloads,
    // customer information, payment secrets, or provider responses.
    if (!/^[a-z0-9-]{1,100}$/.test(jobName))
      throw new Error('Invalid alert job');
    const hour = new Date().toISOString().slice(0, 13);
    const { error } = await serverSupabase.from('operator_alerts').upsert(
      {
        dedupe_key: `${jobName}:${hour}`,
        job_name: jobName,
        run_id: runId,
      },
      { onConflict: 'dedupe_key', ignoreDuplicates: true }
    );
    if (error) throw new Error('Operator alert could not be queued');
  }

  static async deliverPending(): Promise<{ sent: number; failed: number }> {
    const result = { sent: 0, failed: 0 };
    const { data: setting, error } = await serverSupabase
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_email')
      .maybeSingle();
    if (error) throw new Error('Operator recipient could not be loaded');
    const recipient = setting?.setting_value || process.env.ADMIN_EMAIL;
    if (
      typeof recipient !== 'string' ||
      !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(recipient)
    ) {
      throw new Error('Operator email is not configured');
    }
    // At most 3 emails / 24 seconds, leaving room for cron tracking overhead.
    for (let i = 0; i < 3; i++) {
      const { data: alert, error: claimError } = await serverSupabase.rpc(
        'claim_operator_alert'
      );
      if (claimError) throw new Error('Operator alert could not be claimed');
      if (!alert) break;
      const subject = `[Mintenance operator] ${alert.job_name} needs attention`;
      const text = `An operational job failed: ${alert.job_name}.\nRun: ${alert.run_id || 'tracking unavailable'}\nAlert: ${alert.id}\nReview the cron run and reconciliation records in the admin tools. Delivery may be repeated after a provider timeout.\nNo customer or payment details are included in this alert.`;
      const sent = await EmailService.sendEmail({
        to: recipient,
        subject,
        text,
        html: `<pre>${escapeHtml(text)}</pre>`,
        timeoutMs: 8000,
      });
      const { data: acknowledged, error: finishError } =
        await serverSupabase.rpc('finish_operator_alert', {
          p_id: alert.id,
          p_token: alert.lease_token,
          p_sent: sent,
        });
      if (finishError || !acknowledged)
        throw new Error('Operator delivery acknowledgement failed');
      if (sent) result.sent++;
      else result.failed++;
    }
    return result;
  }
}
