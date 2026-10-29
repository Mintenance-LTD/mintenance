import { createHash } from 'crypto';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { ForbiddenError } from '@/lib/errors/api-error';
import { EmailService } from '@/lib/email-service';

export const REPORT_ORIGIN = 'https://www.mintenance.co.uk';
export const hashSecret = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export async function requireReceipt(reportId: string, receipt: string | null) {
  if (!receipt || !/^[a-f0-9]{64}$/.test(receipt))
    throw new ForbiddenError('Report unavailable');
  // Reuse the conversation's ownership/deleted-property checks for uploads and email enrolment.
  const authorization = await serverSupabase.rpc('report_conversation', {
    p_report: reportId,
    p_actor: null,
    p_hash: hashSecret(receipt),
    p_message: null,
    p_body: null,
    p_offset: 0,
  });
  if (authorization.error?.code === '42501')
    throw new ForbiddenError('Report unavailable');
  if (authorization.error) throw authorization.error;
  const { data, error } = await serverSupabase
    .from('anonymous_reports')
    .select('id,reporter_email')
    .eq('id', reportId)
    .eq('conversation_key_hash', hashSecret(receipt))
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ForbiddenError('Report unavailable');
  return data;
}
export async function sendAccessEmail(
  email: string,
  reportId: string,
  token: string
) {
  const url = `${REPORT_ORIGIN}/maintenance/report-access#${reportId}:${token}`;
  return EmailService.sendEmail({
    to: email,
    subject: 'Confirm your maintenance report email',
    timeoutMs: 8000,
    text: `Open this link to confirm your email and access your maintenance report: ${url}\nThis link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.`,
    html: `<p>Confirm your email to access your maintenance report and receive reply notifications.</p><p><a href="${url}">Confirm email and open report</a></p><p>This link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.</p>`,
  });
}
export async function reportPhotos(reportId: string) {
  const bucket = serverSupabase.storage.from('tenant-report-photos');
  const { data, error } = await bucket.list(reportId, { limit: 5 });
  if (error) throw error;
  const paths = (data || [])
    .filter((file) => /^[1-5]\.jpg$/.test(file.name))
    .map((file) => `${reportId}/${file.name}`);
  if (!paths.length) return [];
  const signed = await bucket.createSignedUrls(paths, 300);
  if (signed.error) throw signed.error;
  return (signed.data || [])
    .filter((item) => item.signedUrl)
    .map((item) => ({
      url: item.signedUrl,
      slot: Number(item.path?.split('/').pop()?.[0]),
    }));
}
