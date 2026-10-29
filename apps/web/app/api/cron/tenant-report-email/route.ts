import { withCronHandler } from '@/lib/cron-handler';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { EmailService } from '@/lib/email-service';
import { REPORT_ORIGIN } from '@/lib/reports/followup';
export const maxDuration = 60;
export const GET = withCronHandler('tenant-report-email', async () => {
  const { data, error } = await serverSupabase.rpc('claim_report_emails');
  if (error) throw error;
  let sent = 0,
    failed = 0;
  for (const item of data || []) {
    const access = await serverSupabase
      .from('report_email_access')
      .select('email,enabled,verified_at')
      .eq('report_id', item.report_id)
      .maybeSingle();
    if (access.error) throw access.error;
    const eligible = access.data?.enabled && access.data?.verified_at;
    const url = `${REPORT_ORIGIN}/maintenance/report-access?reportId=${item.report_id}`;
    const delivered =
      !eligible ||
      (await EmailService.sendEmail({
        to: access.data!.email,
        subject: 'Your maintenance report has an update',
        timeoutMs: 8000,
        text: `There is an update to your maintenance report. Open your saved private link, or recover access here: ${url}\nYou can turn off reply emails in your report conversation.`,
        html: `<p>There is an update to your maintenance report.</p><p>Open your saved private link, or <a href="${url}">recover access to your report</a>.</p><p>You can turn off reply emails in your report conversation.</p>`,
      }));
    if (delivered) {
      const ack = await serverSupabase
        .from('report_email_outbox')
        .update({ sent_at: new Date().toISOString() })
        .eq('message_id', item.message_id)
        .eq('lease_id', item.lease_id);
      if (ack.error) throw ack.error;
      if (eligible) sent++;
    } else failed++;
  }
  if (failed)
    throw new Error(
      `${failed} report email deliveries failed; queued for retry (maximum five attempts).`
    );
  return { sent };
});
